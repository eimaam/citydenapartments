import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from './customer.schema';
import { Booking } from '../bookings/booking.schema';
import { LaundryBill } from '../laundry/laundry-bill.schema';
import { Branch } from '../branches/branch.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { escapeRegex } from '../../common/utils/escape-regex';
import { CustomerTimelineEvent, CustomerGuestLedgerSummary } from '@citydenapartments/shared';

import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(LaundryBill.name) private laundryBillModel: Model<LaundryBill>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    private readonly auditLogService: AuditLogService,
  ) {}


  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.customerModel.find(filter).sort({ lastVisitDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.customerModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async searchByPhone(phone: string) {
    const escaped = escapeRegex(phone);
    const customers = await this.customerModel
      .find({ phone: { $regex: escaped, $options: 'i' } })
      .sort({ lastVisitDate: -1 })
      .limit(10)
      .lean();
    return customers;
  }

  async findById(id: string) {
    const customer = await this.customerModel.findById(id).lean();
    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.customerModel.findOne({ phone: dto.phone });
    if (existing) {
      this.logger.log(`Customer already exists — ${dto.name} (${dto.phone}), updating...`);
      Object.assign(existing, {
        name: dto.name,
        email: dto.email,
        address: dto.address,
        nationality: dto.nationality,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        phone2: dto.phone2,
        comingFrom: dto.comingFrom,
        stateOfOrigin: dto.stateOfOrigin,
        occupation: dto.occupation,
        nextDestination: dto.nextDestination,
        gender: dto.gender,
        religion: dto.religion,
      });
      return existing.save();
    }

    const customer = await this.customerModel.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      nationality: dto.nationality,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      phone2: dto.phone2,
      comingFrom: dto.comingFrom,
      stateOfOrigin: dto.stateOfOrigin,
      occupation: dto.occupation,
      nextDestination: dto.nextDestination,
      gender: dto.gender,
      religion: dto.religion,
      firstBranchId: dto.firstBranchId,
    });

    this.logger.log(`Customer created — ${customer.name} (${customer.phone})`);
    return customer;
  }

  async updateBranchDiscount(params: {
    customerId: string;
    branchId: string;
    percentage: number;
    reason?: string;
    performedBy: string;
  }) {
    const { customerId, branchId, percentage, reason, performedBy } = params;
    const customer = await this.customerModel.findById(customerId);
    if (!customer) throw new NotFoundException('Customer not found.');

    if (!customer.branchLifetimeDiscounts) {
      customer.branchLifetimeDiscounts = [];
    }

    const existingIdx = customer.branchLifetimeDiscounts.findIndex(
      (b) => b.branchId.toString() === branchId,
    );
    const oldPercentage = existingIdx >= 0 ? customer.branchLifetimeDiscounts[existingIdx].percentage : 0;

    if (percentage > 0) {
      if (existingIdx >= 0) {
        customer.branchLifetimeDiscounts[existingIdx].percentage = percentage;
        customer.branchLifetimeDiscounts[existingIdx].updatedBy = performedBy as any;
        customer.branchLifetimeDiscounts[existingIdx].updatedAt = new Date();
        customer.branchLifetimeDiscounts[existingIdx].reason = reason;
      } else {
        customer.branchLifetimeDiscounts.push({
          branchId: branchId as any,
          percentage,
          updatedBy: performedBy as any,
          updatedAt: new Date(),
          reason,
        });
      }
    } else {
      if (existingIdx >= 0) {
        customer.branchLifetimeDiscounts.splice(existingIdx, 1);
      }
    }

    await customer.save();

    const action = percentage > 0 ? 'SET_VIP_LIFETIME_DISCOUNT' : 'REMOVE_VIP_LIFETIME_DISCOUNT';
    const description = percentage > 0
      ? `Set VIP lifetime discount of ${percentage}% for customer ${customer.name} (${customer.phone})`
      : `Removed VIP lifetime discount for customer ${customer.name} (${customer.phone})`;

    await this.auditLogService.log({
      entityType: 'Customer',
      entityId: customer._id.toString(),
      action,
      description,
      performedBy,
      branchId,
      details: {
        customerName: customer.name,
        customerPhone: customer.phone,
        oldPercentage,
        newPercentage: percentage,
        reason,
      },
      persistForever: true,
    });

    return customer;
  }

  async getTimeline(customerId: string, query: { startDate?: string; endDate?: string; eventType?: string }) {
    const customer = await this.customerModel.findById(customerId).lean();
    if (!customer) throw new NotFoundException('Customer not found.');

    const now = new Date();
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined = query.endDate ? new Date(query.endDate) : undefined;

    if (query.startDate === 'all') {
      startDateObj = undefined;
    } else if (query.startDate) {
      startDateObj = new Date(query.startDate);
    } else {
      // Default to last 90 days (3 months)
      startDateObj = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Fetch branches for name mapping
    const branches = await this.branchModel.find({}).lean();
    const branchMap = new Map<string, string>();
    branches.forEach((b) => branchMap.set(b._id.toString(), b.name));

    // Fetch all bookings for customer to compute lifetime visit metrics & timelines
    const allBookings = await this.bookingModel
      .find({
        $or: [
          { customerId: customer._id },
          { 'guestDetails.phone': customer.phone },
        ],
      })
      .populate('bookedBy', 'name email role')
      .populate('checkedInBy', 'name email role')
      .populate('checkedOutBy', 'name email role')
      .populate('rooms.roomId', 'roomNumber name')
      .populate('rooms.roomTypeId', 'name')
      .sort({ checkInDate: 1, createdAt: 1 })
      .lean();

    // Fetch laundry bills for customer
    const laundryBills = await this.laundryBillModel
      .find({
        $or: [
          { customerId: customer._id },
          { 'walkIn.phone': customer.phone },
        ],
      })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    const events: CustomerTimelineEvent[] = [];

    // 1. Profile Creation event
    const createdAtDate = new Date((customer as any).createdAt || Date.now());
    const firstBranchName = customer.firstBranchId ? branchMap.get(customer.firstBranchId.toString()) : undefined;

    events.push({
      id: `profile-${customer._id}`,
      eventType: 'profile_created',
      timestamp: createdAtDate.toISOString(),
      title: 'Customer Profile Registered',
      description: `Guest profile created for ${customer.name} (${customer.phone}).`,
      branchName: firstBranchName,
      details: {
        isFirstVisit: true,
      },
    });

    // 2. VIP Lifetime Discount events
    if (customer.branchLifetimeDiscounts && customer.branchLifetimeDiscounts.length > 0) {
      customer.branchLifetimeDiscounts.forEach((disc, idx) => {
        const branchName = branchMap.get(disc.branchId.toString());
        events.push({
          id: `vip-disc-${idx}`,
          eventType: 'vip_discount_updated',
          timestamp: disc.updatedAt ? new Date(disc.updatedAt).toISOString() : createdAtDate.toISOString(),
          title: `VIP Lifetime Discount Updated`,
          description: `Assigned ${disc.percentage}% lifetime discount at ${branchName || 'Branch'}${disc.reason ? `: "${disc.reason}"` : ''}.`,
          branchName,
          details: {
            newPercentage: disc.percentage,
            discountReason: disc.reason,
          },
        });
      });
    }

    // 3. Process Bookings
    let visitCounter = 0;
    let totalBilledBookings = 0;
    let totalPaidBookings = 0;
    let totalDiscountsBookings = 0;

    allBookings.forEach((b: any) => {
      const isCancelled = b.bookingStatus === 'cancelled';
      if (!isCancelled) {
        visitCounter += 1;
        totalBilledBookings += (b.baseRoomTotal || 0) + (b.vatAmount || 0) + (b.serviceChargeAmount || 0);
        totalPaidBookings += b.totalAmountPaid || 0;
        totalDiscountsBookings += b.discount || 0;
      }

      const branchName = branchMap.get(b.branchId?.toString());
      const roomNumbers = (b.rooms || []).map((r: any) => r.roomId?.roomNumber || 'Room').filter(Boolean);
      const roomTypes = (b.rooms || []).map((r: any) => r.roomTypeId?.name || 'Standard').filter(Boolean);

      const checkInDate = new Date(b.checkInDate);
      const checkOutDate = new Date(b.checkOutDate);
      const diffMs = Math.max(0, checkOutDate.getTime() - checkInDate.getTime());
      const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      const bookingStaff = b.bookedBy ? { id: b.bookedBy._id?.toString(), name: b.bookedBy.name, role: b.bookedBy.role } : undefined;
      const checkedInStaff = b.checkedInBy ? { id: b.checkedInBy._id?.toString(), name: b.checkedInBy.name, role: b.checkedInBy.role } : undefined;
      const checkedOutStaff = b.checkedOutBy ? { id: b.checkedOutBy._id?.toString(), name: b.checkedOutBy.name, role: b.checkedOutBy.role } : undefined;

      const commonBookingDetails = {
        bookingId: b._id.toString(),
        bookingReference: b.bookingReference,
        roomNumbers,
        roomTypes,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        nights,
        baseRoomTotal: b.baseRoomTotal || 0,
        discountType: b.discountType,
        discountPercentage: b.discountPercentage || 0,
        discountAmount: b.discount || 0,
        discountReason: b.discountReason,
        discountCode: b.discountCode,
        vatAmount: b.vatAmount || 0,
        serviceChargeAmount: b.serviceChargeAmount || 0,
        totalAmountPaid: b.totalAmountPaid || 0,
        paymentMethod: b.paymentMethod,
        paymentReference: b.paymentReference,
        bookingStatus: b.bookingStatus,
        isFirstVisit: visitCounter === 1,
        isReturnVisit: visitCounter > 1,
        visitNumber: visitCounter,
      };

      // Booking Reserved event
      events.push({
        id: `bk-created-${b._id}`,
        eventType: 'booking_created',
        timestamp: new Date(b.createdAt || b.checkInDate).toISOString(),
        title: `Booking Reserved (${b.bookingReference})`,
        description: `Reserved ${roomNumbers.join(', ')} for ${nights} night${nights > 1 ? 's' : ''} via ${b.bookingSource || 'Walk-in'}.`,
        branchName,
        performedBy: bookingStaff,
        details: commonBookingDetails,
      });

      // Checked In event
      if (b.bookingStatus === 'checked_in' || b.bookingStatus === 'checked_out') {
        const checkedInTimestamp = b.checkedInAt ? new Date(b.checkedInAt).toISOString() : checkInDate.toISOString();
        events.push({
          id: `bk-checkin-${b._id}`,
          eventType: 'checked_in',
          timestamp: checkedInTimestamp,
          title: `Checked In — Visit #${visitCounter} (${b.bookingReference})`,
          description: `Guest checked into ${roomNumbers.join(', ')} at ${branchName || 'Branch'}.`,
          branchName,
          performedBy: checkedInStaff || bookingStaff,
          details: {
            ...commonBookingDetails,
            actualCheckedInAt: checkedInTimestamp,
          },
        });
      }

      // Checked Out event
      if (b.bookingStatus === 'checked_out') {
        const checkedOutTimestamp = b.checkedOutAt ? new Date(b.checkedOutAt).toISOString() : checkOutDate.toISOString();
        events.push({
          id: `bk-checkout-${b._id}`,
          eventType: 'checked_out',
          timestamp: checkedOutTimestamp,
          title: `Checked Out (${b.bookingReference})`,
          description: `Completed stay for ${roomNumbers.join(', ')} at ${branchName || 'Branch'}.`,
          branchName,
          performedBy: checkedOutStaff || bookingStaff,
          details: {
            ...commonBookingDetails,
            actualCheckedOutAt: checkedOutTimestamp,
          },
        });
      }

      // Cancelled event
      if (b.bookingStatus === 'cancelled') {
        events.push({
          id: `bk-cancel-${b._id}`,
          eventType: 'booking_cancelled',
          timestamp: new Date(b.updatedAt || b.createdAt).toISOString(),
          title: `Booking Cancelled (${b.bookingReference})`,
          description: `Booking ${b.bookingReference} was cancelled.`,
          branchName,
          performedBy: bookingStaff,
          details: commonBookingDetails,
        });
      }
    });

    // 4. Process Laundry Bills
    let totalLaundryBilled = 0;
    let totalLaundryPaid = 0;

    laundryBills.forEach((lb: any) => {
      totalLaundryBilled += lb.total || 0;
      if (lb.status === 'paid') totalLaundryPaid += lb.total || 0;

      const branchName = branchMap.get(lb.branchId?.toString());
      const staff = lb.createdBy ? { id: lb.createdBy._id?.toString(), name: lb.createdBy.name, role: lb.createdBy.role } : undefined;

      events.push({
        id: `laundry-${lb._id}`,
        eventType: 'laundry_bill',
        timestamp: new Date(lb.createdAt).toISOString(),
        title: `Laundry Bill ${lb.billNumber}`,
        description: `Service bill total ₦${(lb.total || 0).toLocaleString()} (${lb.lines?.length || 0} item${(lb.lines?.length || 0) !== 1 ? 's' : ''}).`,
        branchName,
        performedBy: staff,
        details: {
          billNumber: lb.billNumber,
          laundryTotal: lb.total || 0,
          laundryItemsCount: lb.lines?.length || 0,
          laundryStatus: lb.status,
        },
      });
    });

    // Filter events by query date range
    let filteredEvents = events;
    if (startDateObj) {
      filteredEvents = filteredEvents.filter((ev) => new Date(ev.timestamp) >= startDateObj!);
    }
    if (endDateObj) {
      filteredEvents = filteredEvents.filter((ev) => new Date(ev.timestamp) <= endDateObj!);
    }
    if (query.eventType && query.eventType !== 'all') {
      filteredEvents = filteredEvents.filter((ev) => ev.eventType === query.eventType);
    }

    // Sort timeline events descending by timestamp
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Summary calculation
    const firstVisit = allBookings[0] ? new Date(allBookings[0].checkInDate).toISOString() : (customer as any).createdAt ? new Date((customer as any).createdAt).toISOString() : undefined;
    const lastVisit = allBookings.length > 0 ? new Date(allBookings[allBookings.length - 1].checkInDate).toISOString() : undefined;

    const summary: CustomerGuestLedgerSummary = {
      totalVisits: visitCounter,
      totalSpent: totalPaidBookings + totalLaundryPaid,
      totalBilled: totalBilledBookings + totalLaundryBilled,
      totalPaid: totalPaidBookings + totalLaundryPaid,
      totalDiscountsSaved: totalDiscountsBookings,
      firstVisitDate: firstVisit,
      lastVisitDate: lastVisit,
      activeVipDiscounts: (customer.branchLifetimeDiscounts || []).map((disc) => ({
        branchId: disc.branchId.toString(),
        branchName: branchMap.get(disc.branchId.toString()),
        percentage: disc.percentage,
      })),
    };

    return {
      customer,
      summary,
      events: filteredEvents,
      queryWindow: {
        startDate: startDateObj ? startDateObj.toISOString() : undefined,
        endDate: endDateObj ? endDateObj.toISOString() : undefined,
        totalEvents: filteredEvents.length,
      },
    };
  }
}

