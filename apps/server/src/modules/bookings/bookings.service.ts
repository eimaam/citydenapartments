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
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';
import { BookingStatus, BookingSource, Gender, getMaxManualDiscount } from '@citydenapartments/shared';
import { BreakfastLog } from '../breakfast/breakfast-log.schema';
import { isPastBreakfastCutoff } from '../breakfast/breakfast.constants';
import { DiscountCodesService } from '../discount-codes/discount-codes.service';
import { CustomersService } from '../customers/customers.service';
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
    private readonly customersService: CustomersService,
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
    let totalServiceCharge = 0;
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
      serviceCharge: number;
      rateCharged: number;
      amountPaid: number;
      outstandingBalance: number;
    }> = [];

    let sn = 1;
    for (const b of bookings) {
      const guestName = b.guestDetails?.name || 'Unspecified Guest';
      totalGuestCount += b.numberOfGuests || 1;

      const totalBookingDiscount = b.discount || 0;
      const totalBookingVat = b.vatAmount || 0;
      const totalBookingServiceCharge = b.serviceChargeAmount || 0;
      const totalBookingRateCharged = b.totalAmountPaid || 0;
      const totalBookingPaid = (b.bookingStatus === BookingStatus.Checked_In || b.bookingStatus === BookingStatus.Checked_Out) ? totalBookingRateCharged : 0;

      const rooms = b.rooms || [];
      const numRooms = rooms.length || 1;
      const bookingSubtotal = rooms.reduce((sum, r) => sum + (Number(r.totalForRoom) || 0), 0) || (b.baseRoomTotal || 0);

      rooms.forEach((r) => {
        totalOccupiedRooms++;
        const roomObj = r.roomId as any;
        const roomNo = roomObj?.roomNumber ? `Rm ${roomObj.roomNumber}` : '';
        const roomTypeName = roomObj?.roomTypeId?.name || 'Standard Room';
        const roomLabel = roomNo ? `${roomTypeName} (${roomNo})` : roomTypeName;

        const roomSubtotal = Number(r.totalForRoom) || (bookingSubtotal / numRooms);
        const ratio = bookingSubtotal > 0 ? roomSubtotal / bookingSubtotal : (1 / numRooms);

        const roomDiscount = Math.round(totalBookingDiscount * ratio);
        const roomVat = Math.round(totalBookingVat * ratio);
        const roomServiceCharge = Math.round(totalBookingServiceCharge * ratio);
        const roomRateCharged = Math.round(totalBookingRateCharged * ratio);
        const roomBaseRate = Math.max(0, roomRateCharged + roomDiscount - roomVat - roomServiceCharge);
        const roomPaid = Math.round(totalBookingPaid * ratio);
        const roomOutstanding = Math.max(0, roomRateCharged - roomPaid);

        totalRoomRevenue += roomBaseRate;
        totalDiscount += roomDiscount;
        totalVat += roomVat;
        totalServiceCharge += roomServiceCharge;
        totalRateCharged += roomRateCharged;
        totalAmountPaid += roomPaid;
        totalOutstandingBalance += roomOutstanding;

        rows.push({
          sn: sn++,
          roomType: roomLabel,
          guestName,
          roomRate: roomBaseRate,
          discount: roomDiscount,
          vat: roomVat,
          serviceCharge: roomServiceCharge,
          rateCharged: roomRateCharged,
          amountPaid: roomPaid,
          outstandingBalance: roomOutstanding,
        });
      });
    }

    return {
      date: format(startOfDay, 'dd MMMM yyyy'),
      metrics: {
        totalOccupiedRooms,
        totalGuestCount,
        totalRoomRevenue,
        totalDiscount,
        totalVat,
        totalServiceCharge,
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
      .populate('extensionHistory.extendedBy', 'firstName lastName')
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

      const netFreshSpent = Math.max(0, dto.totalAmountPaid - (dto.walletAmountApplied || 0));
      await this.customerModel.updateOne(
        { _id: customerId },
        {
          $inc: { totalVisits: 1, totalSpent: netFreshSpent },
          $set: { lastVisitDate: new Date() },
        },
      ).session(session);

      if (dto.walletAmountApplied && dto.walletAmountApplied > 0 && customerId) {
        await this.customersService.debitWallet({
          customerId: customerId.toString(),
          branchId,
          bookingId: newBooking._id.toString(),
          amount: dto.walletAmountApplied,
          reason: `Applied wallet balance to Booking #${newBooking.bookingReference}`,
          performedBy: actorId,
          session,
        });
      }

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
      const now = new Date();
      const schedCheckIn = new Date(booking.checkInDate).getTime();
      const schedCheckOut = new Date(booking.checkOutDate).getTime();
      const msPerDay = 86400000;

      const scheduledNights = Math.max(1, Math.ceil((schedCheckOut - schedCheckIn) / msPerDay));
      const actualNights = Math.max(1, Math.min(scheduledNights, Math.ceil((now.getTime() - schedCheckIn) / msPerDay)));

      let unusedCredit = 0;
      let unusedNights = 0;
      if (actualNights < scheduledNights && booking.totalAmountPaid > 0) {
        unusedNights = scheduledNights - actualNights;
        const dailyRate = booking.totalAmountPaid / scheduledNights;
        unusedCredit = Math.max(0, Math.floor(unusedNights * dailyRate));
        booking.checkOutDate = now;
      }

      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Checked_Out,
        changedBy: actorId as any,
        changedAt: now,
      });
      booking.bookingStatus = BookingStatus.Checked_Out;
      booking.checkedOutBy = actorId as any;
      booking.checkedOutAt = now;
      await booking.save({ session });

      for (const room of rooms) {
        room.status = RoomStatusEnum.DIRTY as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      if (unusedCredit > 0 && booking.customerId) {
        await this.customersService.creditWallet({
          customerId: booking.customerId.toString(),
          branchId,
          bookingId: id,
          amount: unusedCredit,
          reason: `Early check-out credit (${unusedNights} unused night(s)) for Booking #${booking.bookingReference}`,
          performedBy: actorId,
          session,
        });
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Check-out — #${booking.bookingReference} | ${rooms.length} room(s) | Guest ${booking.guestDetails.name} | Early Credit: ₦${unusedCredit} | by ${actorId}`);
      await this.auditLog.log({
        entityType: 'booking',
        entityId: id,
        action: 'check_out',
        description: `Check-out: #${booking.bookingReference} — ${booking.guestDetails.name}${unusedCredit > 0 ? ` (Wallet credited: ₦${unusedCredit.toLocaleString()})` : ''}`,
        performedBy: actorId,
        branchId,
        details: { bookingReference: booking.bookingReference, rooms: rooms.length, unusedCredit },
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

  async extendStay(
    id: string,
    dto: ExtendBookingDto,
    actorId: string,
    branchId: string,
    actorRole?: string,
  ) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (
      booking.bookingStatus !== BookingStatus.Checked_In &&
      booking.bookingStatus !== BookingStatus.Confirmed &&
      booking.bookingStatus !== BookingStatus.Reserved
    ) {
      throw new BadRequestException(
        `Cannot extend a booking with status "${booking.bookingStatus}". Only active bookings can be extended.`,
      );
    }

    const currentCheckOut = new Date(booking.checkOutDate);
    const newCheckOut = new Date(dto.newCheckOutDate);

    if (newCheckOut <= currentCheckOut) {
      throw new BadRequestException('New check-out date must be after the current check-out date.');
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const extraNights = Math.ceil((newCheckOut.getTime() - currentCheckOut.getTime()) / msPerDay);
    if (extraNights < 1) {
      throw new BadRequestException('Extension must be for at least 1 additional night.');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Check room conflict for all rooms in this booking between currentCheckOut and newCheckOut
      for (const r of booking.rooms) {
        const conflict = await this.bookingModel
          .findOne({
            _id: { $ne: booking._id },
            'rooms.roomId': r.roomId,
            bookingStatus: { $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In] },
            checkInDate: { $lt: newCheckOut },
            checkOutDate: { $gt: currentCheckOut },
          })
          .session(session);

        if (conflict) {
          const roomDoc = await this.roomModel.findById(r.roomId).session(session);
          const roomNo = roomDoc ? roomDoc.roomNumber : r.roomId.toString();
          throw new ConflictException(
            `Room ${roomNo} conflict detected. Another reservation exists between ${format(currentCheckOut, 'dd/MM/yyyy')} and ${format(newCheckOut, 'dd/MM/yyyy')}.`,
          );
        }
      }

      // 2. Compute incremental room rates
      let extraBaseTotal = 0;
      for (const r of booking.rooms) {
        const roomExtraTotal = r.actualPricePerNight * extraNights;
        r.totalForRoom = (r.totalForRoom || 0) + roomExtraTotal;
        extraBaseTotal += roomExtraTotal;
      }

      // 3. Discount calculation on extra stay
      let pct = dto.discountPercentage ?? (dto.discountType === 'percentage' ? (booking.discountPercentage || 0) : 0);
      if (pct > 0) {
        const maxAllowedManual = getMaxManualDiscount(actorRole);
        if (pct > maxAllowedManual) {
          throw new BadRequestException(
            `Role "${actorRole || 'User'}" cannot apply a manual discount of ${pct}%. Maximum allowed direct manual discount for your role is ${maxAllowedManual}%.`,
          );
        }
      }

      let effectiveDiscountAmount = 0;
      if (dto.discountType === 'fixed' || (dto.discountAmount !== undefined && dto.discountAmount > 0 && !dto.discountPercentage)) {
        effectiveDiscountAmount = Math.min(extraBaseTotal, dto.discountAmount || 0);
        pct = extraBaseTotal > 0 ? Math.min(100, Math.round((effectiveDiscountAmount / extraBaseTotal) * 100)) : 0;
      } else {
        effectiveDiscountAmount = Math.round((extraBaseTotal * pct) / 100);
      }

      const netExtraSubtotal = Math.max(0, extraBaseTotal - effectiveDiscountAmount);

      const includeVat = dto.includeVat ?? booking.includeVat ?? false;
      const includeServiceCharge = dto.includeServiceCharge ?? booking.includeServiceCharge ?? false;
      const vatRate = 7.5;
      const scRate = 10;
      const computedVat = includeVat ? Math.round((netExtraSubtotal * vatRate) / 100) : 0;
      const computedSc = includeServiceCharge ? Math.round((netExtraSubtotal * scRate) / 100) : 0;
      const computedExtraTotal = netExtraSubtotal + computedVat + computedSc;

      if (Math.abs(dto.additionalAmountPaid - computedExtraTotal) > 1) {
        throw new BadRequestException(
          `Extension price mismatch. Expected ₦${computedExtraTotal} (extra subtotal ₦${extraBaseTotal}${effectiveDiscountAmount > 0 ? ` − ₦${effectiveDiscountAmount} discount` : ''}${includeVat ? ` + ₦${computedVat} VAT` : ''}${includeServiceCharge ? ` + ₦${computedSc} service charge` : ''}), got ₦${dto.additionalAmountPaid}`,
        );
      }

      // 4. Update Booking Document
      const extensionIndex = (booking.extensionHistory?.length || 0) + 1;
      const extensionRecord = {
        extensionIndex,
        previousCheckOutDate: currentCheckOut,
        newCheckOutDate: newCheckOut,
        additionalNights: extraNights,
        additionalBaseTotal: extraBaseTotal,
        additionalDiscount: effectiveDiscountAmount,
        additionalVat: computedVat,
        additionalServiceCharge: computedSc,
        additionalAmountPaid: dto.additionalAmountPaid,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        walletAmountApplied: dto.walletAmountApplied || 0,
        notes: dto.notes,
        extendedBy: actorId as any,
        extendedAt: new Date(),
      };

      booking.extensionHistory.push(extensionRecord as any);
      booking.checkOutDate = newCheckOut;
      booking.baseRoomTotal = (booking.baseRoomTotal || 0) + extraBaseTotal;
      booking.discount = (booking.discount || 0) + effectiveDiscountAmount;
      booking.vatAmount = (booking.vatAmount || 0) + computedVat;
      booking.serviceChargeAmount = (booking.serviceChargeAmount || 0) + computedSc;
      booking.totalAmountPaid = (booking.totalAmountPaid || 0) + dto.additionalAmountPaid;

      await booking.save({ session });

      // 5. Update Customer stats & wallet
      const netFreshSpent = Math.max(0, dto.additionalAmountPaid - (dto.walletAmountApplied || 0));
      if (booking.customerId) {
        await this.customerModel.updateOne(
          { _id: booking.customerId },
          {
            $inc: { totalSpent: netFreshSpent },
            $set: { lastVisitDate: new Date() },
          },
        ).session(session);

        if (dto.walletAmountApplied && dto.walletAmountApplied > 0) {
          await this.customersService.debitWallet({
            customerId: booking.customerId.toString(),
            branchId,
            bookingId: booking._id.toString(),
            amount: dto.walletAmountApplied,
            reason: `Applied wallet balance to Stay Extension #${extensionIndex} for Booking #${booking.bookingReference}`,
            performedBy: actorId,
            session,
          });
        }
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);

      this.logger.log(
        `Stay extended — Booking #${booking.bookingReference} | +${extraNights} night(s) to ${format(newCheckOut, 'yyyy-MM-dd')} | Paid ₦${dto.additionalAmountPaid} | by ${actorId}`,
      );

      await this.auditLog.log({
        entityType: 'booking',
        entityId: booking._id.toString(),
        action: 'extend_stay',
        description: `Stay extended: #${booking.bookingReference} (+${extraNights} night(s) to ${format(newCheckOut, 'd MMM yyyy')}) — ₦${dto.additionalAmountPaid.toLocaleString()}`,
        performedBy: actorId,
        branchId,
        details: {
          bookingReference: booking.bookingReference,
          extensionIndex,
          additionalNights: extraNights,
          newCheckOutDate: newCheckOut,
          additionalAmountPaid: dto.additionalAmountPaid,
        },
        persistForever: true,
      });

      // Send updated receipt email if guest email is present
      if (booking.guestDetails?.email) {
        try {
          const [branch, populatedRooms] = await Promise.all([
            this.branchModel.findById(branchId).lean(),
            this.roomModel.find({ _id: { $in: booking.rooms.map((r) => r.roomId) } }).populate<{ roomTypeId: { name: string } }>('roomTypeId', 'name').lean(),
          ]);

          const totalNights = Math.ceil(
            (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / msPerDay,
          );

          this.emailService.sendEmail(
            booking.guestDetails.email,
            `Stay Extended — Booking #${booking.bookingReference}`,
            BookingReceiptEmail({
              guestName: booking.guestDetails.name,
              guestEmail: booking.guestDetails.email,
              guestPhone: booking.guestDetails.phone,
              bookingReference: booking.bookingReference,
              branchName: branch?.name || 'City Den Apartments',
              checkInDate: booking.checkInDate.toString(),
              checkOutDate: booking.checkOutDate.toString(),
              rooms: booking.rooms.map((re) => {
                const room = populatedRooms.find((r) => r._id.toString() === re.roomId.toString());
                return {
                  roomNumber: room?.roomNumber || re.roomId.toString(),
                  roomType: (room as any)?.roomTypeId?.name || 'Room',
                  nights: totalNights,
                  pricePerNight: re.actualPricePerNight,
                  total: re.totalForRoom,
                };
              }),
              numberOfGuests: booking.numberOfGuests,
              subtotal: booking.baseRoomTotal,
              discount: booking.discount,
              discountPercentage: booking.discountPercentage,
              vatAmount: booking.vatAmount,
              serviceChargeAmount: booking.serviceChargeAmount,
              totalPaid: booking.totalAmountPaid,
              paymentMethod: dto.paymentMethod,
              paymentReference: dto.paymentReference || undefined,
              bookingStatus: booking.bookingStatus,
              bookingDate: new Date().toISOString(),
            }),
          );
        } catch (emailErr: any) {
          this.logger.error(`Failed to send extension receipt to ${booking.guestDetails.email}: ${emailErr.message}`);
        }
      }

      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
