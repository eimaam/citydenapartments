import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Booking } from './booking.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { RoomType } from '../room-types/room-type.schema';
import { Branch } from '../branches/branch.schema';
import { Customer } from '../customers/customer.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';
import { BookingStatus, BookingSource, Gender, getMaxManualDiscount } from '@citydenapartments/shared';
import { BreakfastLog } from '../breakfast/breakfast-log.schema';
import { isPastBreakfastCutoff } from '../breakfast/breakfast.constants';
import { DiscountCodesService } from '../discount-codes/discount-codes.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { BookingReceiptEmail } from '@citydenapartments/email';
import { format } from 'date-fns';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
    private readonly discountCodesService: DiscountCodesService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  private readonly logger = new Logger(BookingsService.name);

  async exportOccupancyReport(branchId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    const bookings = await this.bookingModel.find({
      branchId: new Types.ObjectId(branchId),
      bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Reserved] },
      checkInDate: { $lte: endOfDay },
      checkOutDate: { $gte: startOfDay },
    })
      .populate({
        path: 'rooms.roomId',
        select: 'roomNumber roomTypeId',
        populate: { path: 'roomTypeId', select: 'name' },
      })
      .sort({ checkInDate: -1 })
      .lean();

    let totalOccupiedRooms = 0;
    let totalGuestCount = 0;
    let totalRoomRevenue = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let totalRateCharged = 0;
    let totalAmountPaid = 0;
    let totalOutstandingBalance = 0;

    const rows: Array<{
      sn: number;
      roomType: string;
      guestName: string;
      roomRate: number;
      discount: number;
      vat: number;
      rateCharged: number;
      amountPaid: number;
      outstandingBalance: number;
    }> = [];

    let sn = 1;
    for (const b of bookings) {
      const guestName = b.guestDetails?.name || 'Unspecified Guest';
      totalGuestCount += b.numberOfGuests || 1;

      const discount = b.discount || 0;
      const vat = b.vatAmount || 0;
      const rateCharged = b.totalAmountPaid || 0;
      const roomRate = Math.max(0, rateCharged + discount - vat - (b.serviceChargeAmount || 0));
      const amountPaid = (b.bookingStatus === BookingStatus.Checked_In || b.bookingStatus === BookingStatus.Checked_Out) ? rateCharged : 0;
      const outstandingBalance = Math.max(0, rateCharged - amountPaid);

      totalRoomRevenue += roomRate;
      totalDiscount += discount;
      totalVat += vat;
      totalRateCharged += rateCharged;
      totalAmountPaid += amountPaid;
      totalOutstandingBalance += outstandingBalance;

      for (const r of b.rooms || []) {
        totalOccupiedRooms++;
        const roomObj = r.roomId as any;
        const roomNo = roomObj?.roomNumber ? `Rm ${roomObj.roomNumber}` : '';
        const roomTypeName = roomObj?.roomTypeId?.name || 'Standard Room';
        const roomLabel = roomNo ? `${roomTypeName} (${roomNo})` : roomTypeName;

        rows.push({
          sn: sn++,
          roomType: roomLabel,
          guestName,
          roomRate,
          discount,
          vat,
          rateCharged,
          amountPaid,
          outstandingBalance,
        });
      }
    }

    return {
      date: format(startOfDay, 'dd MMMM yyyy'),
      metrics: {
        totalOccupiedRooms,
        totalGuestCount,
        totalRoomRevenue,
        totalDiscount,
        totalVat,
        totalRateCharged,
        totalAmountPaid,
        totalOutstandingBalance,
      },
      rows,
    };
  }

  private async expireBreakfastIfNeeded(booking: Booking, actorId: string) {
    const hasDiscount = (booking.discountPercentage || 0) >= 5;
    const pastCutoff = isPastBreakfastCutoff();
    if (!hasDiscount && !pastCutoff) return;

    this.logger.log(
      `Breakfast expired — Booking #${booking.bookingReference} | reason: ${hasDiscount ? 'discount>=5%' : ''}${hasDiscount && pastCutoff ? ' + ' : ''}${pastCutoff ? 'past cutoff' : ''}`,
    );

    await this.breakfastLogModel.create({
      branchId: booking.branchId,
      bookingId: booking._id,
      roomId: booking.rooms[0].roomId,
      guestName: booking.guestDetails.name,
      dateServed: new Date(),
      servingsClaimed: 0,
      servedBy: actorId,
      status: 'expired',
    });
  }

  async getCalendar(branchId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [rooms, bookings] = await Promise.all([
      this.roomModel
        .find({ branchId, isActive: true })
        .populate('roomTypeId', 'name amenities')
        .sort({ roomNumber: 1 })
        .lean(),
      this.bookingModel
        .find({
          branchId,
          bookingStatus: {
            $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In, BookingStatus.Checked_Out],
          },
          checkInDate: { $lt: endOfMonth },
          checkOutDate: { $gt: startOfMonth },
        })
        .populate('rooms.roomId')
        .lean(),
    ]);

    return { rooms, bookings };
  }

  async findAll(params: {
    branchId: string;
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { branchId, page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { branchId };
    if (status) filter.bookingStatus = status;

    if (search) {
      const escaped = escapeRegex(search);
      const regex = { $regex: escaped, $options: 'i' };
      filter.$or = [
        { bookingReference: regex },
        { 'guestDetails.name': regex },
        { 'guestDetails.phone': regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate('rooms.roomId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, branchId: string) {
    return this.bookingModel
      .findOne({ _id: id, branchId })
      .populate('rooms.roomId')
      .populate('bookedBy', 'firstName lastName')
      .populate('checkedInBy', 'firstName lastName')
      .populate('checkedOutBy', 'firstName lastName')
      .populate('cancelledBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean();
  }

  async createWalkInBooking(dto: CreateBookingDto, actorId: string, branchId: string, actorRole?: string) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date.');
    }
    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past.');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      let discountCodeDoc: { _id: any; code: string; percentage: number } | null = null;
      if (dto.discountCode) {
        discountCodeDoc = await this.discountCodesService.validate(dto.discountCode, branchId);
      }

      let customerLifetimeDiscount = 0;
      if (dto.customerId || dto.customerPhone) {
        const customerFilter: any = dto.customerId ? { _id: dto.customerId } : { phone: dto.customerPhone };
        const customerDoc = await this.customerModel.findOne(customerFilter).session(session);
        if (customerDoc && customerDoc.branchLifetimeDiscounts) {
          const match = customerDoc.branchLifetimeDiscounts.find(
            (b) => b.branchId.toString() === branchId,
          );
          if (match) {
            customerLifetimeDiscount = match.percentage;
          }
        }
      }

      let pct = dto.discountPercentage || 0;
      if (discountCodeDoc) {
        if (!pct) {
          pct = discountCodeDoc.percentage;
        } else if (pct !== discountCodeDoc.percentage) {
          throw new BadRequestException(
            `Discount percentage mismatch. Discount code ${discountCodeDoc.code} provides ${discountCodeDoc.percentage}% discount.`,
          );
        }
      } else if (pct > 0) {
        const maxAllowedManual = getMaxManualDiscount(actorRole);
        if (pct > customerLifetimeDiscount && pct > maxAllowedManual) {
          throw new BadRequestException(
            `Role "${actorRole || 'User'}" cannot apply a manual discount of ${pct}%. Maximum allowed direct manual discount for your role is ${maxAllowedManual}%. Use a valid discount code for higher discounts.`,
          );
        }
      }

      if (pct < 0 || pct > 100) {
        throw new BadRequestException('Discount percentage must be between 0 and 100.');
      }

      const targetStatus = dto.bookingStatus || BookingStatus.Checked_In;
      const isImmediateCheckIn = targetStatus === BookingStatus.Checked_In;

      const nights = Math.ceil(
        (new Date(dto.checkOutDate).getTime() - new Date(dto.checkInDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (nights < 1) {
        throw new BadRequestException('Stay must be at least 1 night.');
      }

      const roomEntries: Array<{
        roomId: Types.ObjectId;
        roomTypeId: Types.ObjectId;
        actualPricePerNight: number;
        totalForRoom: number;
        maxGuests: number;
        minPriceAllowed: number;
      }> = [];

      for (const roomDto of dto.rooms) {
        const room = await this.roomModel.findById(roomDto.roomId).session(session);
        if (!room || !room.isActive) {
          this.logger.warn(`Room not found or inactive — roomId: ${roomDto.roomId}`);
          throw new BadRequestException(`Room ${roomDto.roomId} not found or inactive.`);
        }

        if (isImmediateCheckIn) {
          if ((room.status as string) !== RoomStatusEnum.AVAILABLE) {
            this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot book`);
            throw new BadRequestException(`Room ${room.roomNumber} is currently "${room.status}" — cannot book.`);
          }
        } else if ((room.status as string) === RoomStatusEnum.MAINTENANCE) {
          this.logger.warn(`Room ${room.roomNumber} is under maintenance, cannot reserve`);
          throw new BadRequestException(`Room ${room.roomNumber} is under maintenance — cannot book.`);
        }

        const typeConfig = await this.roomTypeModel.findById(room.roomTypeId).session(session);
        if (!typeConfig) {
          throw new BadRequestException('Room type configuration not found.');
        }

        if (roomDto.actualPricePerNight < typeConfig.minPriceAllowed) {
          throw new BadRequestException(
            `Price violation for room ${room.roomNumber}. Minimum floor limit: ₦${typeConfig.minPriceAllowed}`,
          );
        }
        if (roomDto.actualPricePerNight > typeConfig.basePrice) {
          throw new BadRequestException(
            `Price violation for room ${room.roomNumber}. Maximum allowed: ₦${typeConfig.basePrice}`,
          );
        }

        const dateConflict = await this.bookingModel
          .findOne({
            'rooms.roomId': roomDto.roomId,
            bookingStatus: { $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In] },
            $or: [
              { checkInDate: { $lt: new Date(dto.checkOutDate) }, checkOutDate: { $gt: new Date(dto.checkInDate) } },
            ],
          })
          .session(session);

        if (dateConflict) {
          this.logger.warn(`Booking conflict — Room ${room.roomNumber} already booked for these dates`);
          throw new ConflictException(`Room ${room.roomNumber} conflict detected. This room is already reserved.`);
        }

        roomEntries.push({
          roomId: room._id as any,
          roomTypeId: room.roomTypeId as any,
          actualPricePerNight: roomDto.actualPricePerNight,
          totalForRoom: roomDto.actualPricePerNight * nights,
          maxGuests: roomDto.maxGuests,
          minPriceAllowed: typeConfig.minPriceAllowed,
        });

        if (roomDto.maxGuests > room.maxGuests) {
          throw new BadRequestException(
            `Room ${room.roomNumber} max capacity is ${room.maxGuests} guests, but ${roomDto.maxGuests} specified.`,
          );
        }
      }

      const subtotal = roomEntries.reduce((sum, r) => sum + r.totalForRoom, 0);

      let effectiveDiscountAmount = 0;
      if (dto.discountType === 'fixed' || (dto.discountAmount !== undefined && dto.discountAmount > 0 && !dto.discountPercentage)) {
        effectiveDiscountAmount = Math.min(subtotal, dto.discountAmount || 0);
        pct = subtotal > 0 ? Math.min(100, Math.round((effectiveDiscountAmount / subtotal) * 100)) : 0;
      } else {
        effectiveDiscountAmount = Math.round((subtotal * pct) / 100);
      }

      const netSubtotal = Math.max(0, subtotal - effectiveDiscountAmount);

      const includeVat = dto.includeVat || false;
      const includeServiceCharge = dto.includeServiceCharge || false;
      const vatRate = 7.5;
      const scRate = 10;
      const computedVat = includeVat ? Math.round((netSubtotal * vatRate) / 100) : 0;
      const computedSc = includeServiceCharge ? Math.round((netSubtotal * scRate) / 100) : 0;

      const computedTotal = netSubtotal + computedVat + computedSc;

      if (includeVat && Math.abs((dto.vatAmount || 0) - computedVat) > 1) {
        throw new BadRequestException(
          `VAT mismatch. Expected ₦${computedVat} (${vatRate}% of net subtotal ₦${netSubtotal}), got ₦${dto.vatAmount}`,
        );
      }
      if (includeServiceCharge && Math.abs((dto.serviceChargeAmount || 0) - computedSc) > 1) {
        throw new BadRequestException(
          `Service charge mismatch. Expected ₦${computedSc} (${scRate}% of net subtotal ₦${netSubtotal}), got ₦${dto.serviceChargeAmount}`,
        );
      }

      if (Math.abs(dto.totalAmountPaid - computedTotal) > 1) {
        throw new BadRequestException(
          `Price mismatch. Expected ₦${computedTotal} (subtotal ₦${subtotal}${effectiveDiscountAmount > 0 ? ` − ₦${effectiveDiscountAmount} discount` : ''}${includeVat ? ` + ₦${computedVat} VAT` : ''}${includeServiceCharge ? ` + ₦${computedSc} service charge` : ''}), got ₦${dto.totalAmountPaid}`,
        );
      }

      const ref = `CDA-${branchId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      let customerId: string | undefined = dto.customerId;
      let guestDetails: {
        name: string; phone: string; email?: string; address: string;
        nationality: string; dob?: Date; phone2?: string;
        comingFrom: string; stateOfOrigin: string; occupation: string;
        nextDestination: string; gender: string; religion?: string;
      };

      if (customerId) {
        const customer = await this.customerModel.findById(customerId).session(session);
        if (!customer) throw new BadRequestException('Customer not found.');
        guestDetails = {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          nationality: customer.nationality,
          dob: customer.dob,
          phone2: customer.phone2,
          comingFrom: customer.comingFrom,
          stateOfOrigin: customer.stateOfOrigin,
          occupation: customer.occupation,
          nextDestination: customer.nextDestination,
          gender: customer.gender,
          religion: customer.religion,
        };
      } else {
        const phone = dto.customerPhone || dto.guestPhone;
        const existing = await this.customerModel.findOne({ phone }).session(session);
        if (existing) {
          customerId = existing._id.toString();
          guestDetails = {
            name: existing.name,
            phone: existing.phone,
            email: existing.email,
            address: existing.address,
            nationality: existing.nationality,
            dob: existing.dob,
            phone2: existing.phone2,
            comingFrom: existing.comingFrom,
            stateOfOrigin: existing.stateOfOrigin,
            occupation: existing.occupation,
            nextDestination: existing.nextDestination,
            gender: existing.gender,
            religion: existing.religion,
          };
        } else {
          const [created] = await this.customerModel.create([{
            name: dto.guestName,
            phone,
            email: dto.guestEmail,
            address: dto.guestAddress,
            nationality: dto.guestNationality,
            dob: dto.guestDob ? new Date(dto.guestDob) : undefined,
            phone2: dto.guestPhone2,
            comingFrom: dto.guestComingFrom,
            stateOfOrigin: dto.guestStateOfOrigin,
            occupation: dto.guestOccupation,
            nextDestination: dto.guestNextDestination,
            gender: dto.guestGender,
            religion: dto.guestReligion,
            firstBranchId: branchId,
          }], { session });
          this.logger.log(`Customer created from booking — ${created.name} (${phone})`);
          customerId = created._id.toString();
          guestDetails = {
            name: created.name,
            phone: created.phone,
            email: created.email,
            address: created.address,
            nationality: created.nationality,
            dob: created.dob,
            phone2: created.phone2,
            comingFrom: created.comingFrom,
            stateOfOrigin: created.stateOfOrigin,
            occupation: created.occupation,
            nextDestination: created.nextDestination,
            gender: created.gender,
            religion: created.religion,
          };
        }
      }

      const [newBooking] = await this.bookingModel.create(
        [
          {
            bookingReference: ref,
            branchId,
            rooms: roomEntries,
            customerId,
            guestDetails,
            numberOfGuests: dto.numberOfGuests || 1,
            checkInDate: new Date(dto.checkInDate),
            checkOutDate: new Date(dto.checkOutDate),
            discount: effectiveDiscountAmount,
            discountType: dto.discountType || (dto.discountAmount ? 'fixed' : 'percentage'),
            discountPercentage: pct,
            discountReason: dto.discountReason,
            totalAmountPaid: dto.totalAmountPaid,
            baseRoomTotal: subtotal,
            includeVat,
            includeServiceCharge,
            vatAmount: computedVat,
            serviceChargeAmount: computedSc,
            paymentMethod: dto.paymentMethod,
            paymentReference: dto.paymentReference,
            bookingStatus: targetStatus,
            bookingSource: dto.bookingSource || BookingSource.WalkIn,
            bookedBy: actorId,
            checkedInBy: isImmediateCheckIn ? actorId : undefined,
            checkedInAt: isImmediateCheckIn ? new Date() : undefined,
            statusHistory: [{
              fromStatus: targetStatus,
              toStatus: targetStatus,
              changedBy: actorId,
              changedAt: new Date(),
            }],
            discountCodeId: discountCodeDoc?._id,
            discountCode: discountCodeDoc?.code,
          },
        ],
        { session },
      );

      if (isImmediateCheckIn) {
        for (const entry of roomEntries) {
          await this.roomModel.updateOne(
            { _id: entry.roomId },
            { $set: { status: RoomStatusEnum.OCCUPIED, updatedBy: actorId } },
          ).session(session);
        }
      }

      await this.customerModel.updateOne(
        { _id: customerId },
        {
          $inc: { totalVisits: 1, totalSpent: dto.totalAmountPaid },
          $set: { lastVisitDate: new Date() },
        },
      ).session(session);

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);

      if (isImmediateCheckIn) {
        await this.expireBreakfastIfNeeded(newBooking, actorId);
      }

      if (discountCodeDoc) {
        await this.discountCodesService.consume(discountCodeDoc._id);
      }

      this.logger.log(`Booking created — #${newBooking.bookingReference} | ${roomEntries.length} room(s) | Guest ${guestDetails.name} | by ${actorId}`);
      await this.auditLog.log({
        entityType: 'booking',
        entityId: newBooking._id.toString(),
        action: 'create',
        description: `Booking created: #${newBooking.bookingReference} — ${guestDetails.name}`,
        performedBy: actorId,
        branchId,
        details: { bookingReference: newBooking.bookingReference, guestName: guestDetails.name, rooms: roomEntries.length },
        persistForever: true,
      });

      if (guestDetails.email) {
        try {
          const [branch, populatedRooms] = await Promise.all([
            this.branchModel.findById(branchId).lean(),
            this.roomModel.find({ _id: { $in: roomEntries.map(r => r.roomId) } }).populate<{ roomTypeId: { name: string } }>('roomTypeId', 'name').lean(),
          ]);

          this.emailService.sendEmail(
            guestDetails.email,
            `Booking Confirmed — #${newBooking.bookingReference}`,
            BookingReceiptEmail({
              guestName: guestDetails.name,
              guestEmail: guestDetails.email,
              guestPhone: guestDetails.phone,
              bookingReference: newBooking.bookingReference,
              branchName: branch?.name || 'City Den Apartments',
              checkInDate: newBooking.checkInDate.toString(),
              checkOutDate: newBooking.checkOutDate.toString(),
              rooms: roomEntries.map((re) => {
                const room = populatedRooms.find((r) => r._id.toString() === re.roomId.toString());
                return {
                  roomNumber: room?.roomNumber || re.roomId.toString(),
                  roomType: (room as any)?.roomTypeId?.name || 'Room',
                  nights: Math.ceil(
                    (new Date(dto.checkOutDate).getTime() - new Date(dto.checkInDate).getTime()) / (1000 * 60 * 60 * 24),
                  ),
                  pricePerNight: re.actualPricePerNight,
                  total: re.totalForRoom,
                };
              }),
              numberOfGuests: newBooking.numberOfGuests,
              subtotal,
              discount: effectiveDiscountAmount,
              discountPercentage: pct,
              vatAmount: computedVat,
              serviceChargeAmount: computedSc,
              totalPaid: newBooking.totalAmountPaid,
              paymentMethod: newBooking.paymentMethod,
              paymentReference: newBooking.paymentReference || undefined,
              bookingStatus: newBooking.bookingStatus,
              bookingDate: (newBooking as any).createdAt?.toString() || new Date().toISOString(),
            }),
          );
        } catch (emailErr: any) {
          this.logger.error(`Failed to send booking receipt to ${guestDetails.email}: ${emailErr.message}`);
        }
      }

      return newBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkIn(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Check-in failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus !== BookingStatus.Reserved && booking.bookingStatus !== BookingStatus.Confirmed) {
      this.logger.warn(`Check-in failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot check in`);
      throw new BadRequestException(`Cannot check in a ${booking.bookingStatus} booking.`);
    }

    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const checkInStart = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const checkOutStart = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());

    if (todayStart < checkInStart || todayStart >= checkOutStart) {
      this.logger.warn(`Check-in failed — booking #${booking.bookingReference} date range [${booking.checkInDate} — ${booking.checkOutDate}] does not include today`);
      throw new BadRequestException('Booking check-in date does not match today. Cannot check in outside the booking date range.');
    }

    const roomIds = booking.rooms.map(r => r.roomId);
    const rooms = await this.roomModel.find({ _id: { $in: roomIds } });
    if (rooms.length !== roomIds.length) {
      this.logger.warn(`Some rooms not found for booking ${id}`);
      throw new BadRequestException('One or more rooms not found.');
    }
    for (const room of rooms) {
      if (room.status as string !== RoomStatusEnum.AVAILABLE) {
        this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot check in`);
        throw new BadRequestException(`Room ${room.roomNumber} is currently "${room.status}" — cannot check in.`);
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Checked_In,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Checked_In;
      booking.checkedInBy = actorId as any;
      booking.checkedInAt = new Date();
      await booking.save({ session });

      for (const room of rooms) {
        room.status = RoomStatusEnum.OCCUPIED as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);

      await this.expireBreakfastIfNeeded(booking, actorId);

      this.logger.log(`Check-in — #${booking.bookingReference} | ${rooms.length} room(s) | Guest ${booking.guestDetails.name} | by ${actorId}`);
      await this.auditLog.log({
        entityType: 'booking',
        entityId: id,
        action: 'check_in',
        description: `Check-in: #${booking.bookingReference} — ${booking.guestDetails.name}`,
        performedBy: actorId,
        branchId,
        details: { bookingReference: booking.bookingReference, rooms: rooms.length },
        persistForever: true,
      });
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkOut(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Check-out failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus !== BookingStatus.Checked_In) {
      this.logger.warn(`Check-out failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot check out`);
      throw new BadRequestException(`Cannot check out a ${booking.bookingStatus} booking.`);
    }

    const roomIds = booking.rooms.map(r => r.roomId);
    const rooms = await this.roomModel.find({ _id: { $in: roomIds } });
    if (rooms.length !== roomIds.length) {
      this.logger.warn(`Some rooms not found for booking ${id}`);
      throw new BadRequestException('One or more rooms not found.');
    }
    for (const room of rooms) {
      if (room.status as string !== RoomStatusEnum.OCCUPIED) {
        this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot check out`);
        throw new BadRequestException(`Room ${room.roomNumber} is currently "${room.status}" — cannot check out.`);
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Checked_Out,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Checked_Out;
      booking.checkedOutBy = actorId as any;
      booking.checkedOutAt = new Date();
      await booking.save({ session });

      for (const room of rooms) {
        room.status = RoomStatusEnum.DIRTY as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Check-out — #${booking.bookingReference} | ${rooms.length} room(s) | Guest ${booking.guestDetails.name} | by ${actorId}`);
      await this.auditLog.log({
        entityType: 'booking',
        entityId: id,
        action: 'check_out',
        description: `Check-out: #${booking.bookingReference} — ${booking.guestDetails.name}`,
        performedBy: actorId,
        branchId,
        details: { bookingReference: booking.bookingReference, rooms: rooms.length },
        persistForever: true,
      });
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancel(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Cancel failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus === BookingStatus.Checked_Out || booking.bookingStatus === BookingStatus.Cancelled) {
      this.logger.warn(`Cancel failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot cancel`);
      throw new BadRequestException(`Cannot cancel a ${booking.bookingStatus} booking.`);
    }

    const wasCheckedIn = booking.bookingStatus === BookingStatus.Checked_In;
    let rooms: Room[] = [];
    if (wasCheckedIn) {
      const roomIds = booking.rooms.map(r => r.roomId);
      rooms = await this.roomModel.find({ _id: { $in: roomIds } });
      if (rooms.length !== roomIds.length) {
        this.logger.warn(`Some rooms not found for booking ${id}`);
        throw new BadRequestException('One or more rooms not found.');
      }
      for (const room of rooms) {
        if (room.status as string !== RoomStatusEnum.OCCUPIED) {
          this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot release`);
          throw new BadRequestException(`Room ${room.roomNumber} is currently "${room.status}" — cannot release.`);
        }
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Cancelled,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Cancelled;
      booking.cancelledBy = actorId as any;
      booking.checkedOutBy = actorId as any;
      await booking.save({ session });

      if (wasCheckedIn) {
        for (const room of rooms) {
          room.status = RoomStatusEnum.AVAILABLE as any;
          room.updatedBy = actorId as any;
          await room.save({ session });
        }
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      const roomNums = rooms.map(r => r.roomNumber).join(', ') || 'N/A';
      this.logger.log(`Booking cancelled — #${booking.bookingReference} | Room(s) ${roomNums} | Guest ${booking.guestDetails.name} | by ${actorId}`);
      await this.auditLog.log({
        entityType: 'booking',
        entityId: id,
        action: 'cancel',
        description: `Booking cancelled: #${booking.bookingReference} — ${booking.guestDetails.name}`,
        performedBy: actorId,
        branchId,
        details: { bookingReference: booking.bookingReference, rooms: roomNums },
        persistForever: true,
      });
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
