import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookingStatus } from '@citydenapartments/shared';
import { Booking } from '../bookings/booking.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Branch } from '../branches/branch.schema';
import { BreakfastLog } from '../breakfast/breakfast-log.schema';
import { User } from '../users/user.schema';
import { InventoryItem } from '../inventory/inventory-item.schema';
import { DepartmentExpense } from '../department-expenses/department-expense.schema';
import { RevenueLog } from '../revenue-logs/revenue-log.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';
import { startOfDay, endOfDay, format, subDays, startOfMonth, subMonths } from 'date-fns';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(BreakfastLog.name) private breakfastModel: Model<BreakfastLog>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(InventoryItem.name) private inventoryModel: Model<InventoryItem>,
    @InjectModel(DepartmentExpense.name) private expenseModel: Model<DepartmentExpense>,
    @InjectModel(RevenueLog.name) private revenueLogModel: Model<RevenueLog>,
    private readonly redis: RedisService,
  ) {}

  private parseDateRange(params: { period?: string; fromDate?: string; toDate?: string }) {
    const now = new Date();
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    let label = 'Today';

    if (params.fromDate && params.toDate) {
      fromDate = startOfDay(new Date(params.fromDate));
      toDate = endOfDay(new Date(params.toDate));
      label = `${format(fromDate, 'dd MMM yyyy')} — ${format(toDate, 'dd MMM yyyy')}`;
    } else if (params.period) {
      switch (params.period) {
        case 'daily':
        case 'today':
          fromDate = startOfDay(now);
          toDate = endOfDay(now);
          label = `Today (${format(now, 'dd MMM yyyy')})`;
          break;
        case 'week':
          fromDate = startOfDay(subDays(now, 7));
          toDate = endOfDay(now);
          label = 'Last 7 Days';
          break;
        case 'month':
          fromDate = startOfMonth(now);
          toDate = endOfDay(now);
          label = `This Month (${format(now, 'MMM yyyy')})`;
          break;
        case '3months':
          fromDate = startOfDay(subMonths(now, 3));
          toDate = endOfDay(now);
          label = 'Last 3 Months';
          break;
        case '6months':
          fromDate = startOfDay(subMonths(now, 6));
          toDate = endOfDay(now);
          label = 'Last 6 Months';
          break;
        case 'all':
          fromDate = undefined;
          toDate = undefined;
          label = 'All Time';
          break;
        default:
          fromDate = startOfDay(now);
          toDate = endOfDay(now);
          label = `Today (${format(now, 'dd MMM yyyy')})`;
      }
    } else {
      fromDate = startOfDay(now);
      toDate = endOfDay(now);
      label = `Today (${format(now, 'dd MMM yyyy')})`;
    }

    return {
      fromDate,
      toDate,
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      label,
      key: params.period || (params.fromDate && params.toDate ? 'custom' : 'daily'),
    };
  }

  async getSummary(
    opts?: { branchId?: string; role?: string; period?: string; fromDate?: string; toDate?: string } | string,
    legacyRole?: string,
  ) {
    let branchId: string | undefined;
    let role: string | undefined;
    let period: string | undefined;
    let fromDate: string | undefined;
    let toDate: string | undefined;

    if (typeof opts === 'object' && opts !== null) {
      branchId = opts.branchId;
      role = opts.role;
      period = opts.period;
      fromDate = opts.fromDate;
      toDate = opts.toDate;
    } else {
      branchId = opts;
      role = legacyRole;
    }

    const range = this.parseDateRange({ period, fromDate, toDate });

    const cacheKey = `${CACHE_KEYS.DASHBOARD_SUMMARY}:${branchId || 'all'}:${range.key}:${range.from || ''}:${range.to || ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Summary served from cache ${branchId ? `(branch: ${branchId})` : ''}`);
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayStr = format(now, 'yyyy-MM-dd');

    const branchMatch = branchId ? { branchId: new Types.ObjectId(branchId) } : {};

    const bookingDateMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      bookingDateMatch.createdAt = {};
      if (range.fromDate) bookingDateMatch.createdAt.$gte = range.fromDate;
      if (range.toDate) bookingDateMatch.createdAt.$lte = range.toDate;
    }

    const revLogDateMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      revLogDateMatch.revenueDate = {};
      if (range.fromDate) revLogDateMatch.revenueDate.$gte = range.fromDate;
      if (range.toDate) revLogDateMatch.revenueDate.$lte = range.toDate;
    }

    const [
      roomResult,
      bookingResult,
      revenueLogResult,
      breakfastResult,
      branch,
      activeUsers,
    ] = await Promise.all([
      this.roomModel.aggregate([
        { $match: branchMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            available: { $sum: { $cond: [{ $eq: ['$status', RoomStatusEnum.AVAILABLE] }, 1, 0] } },
            occupied: { $sum: { $cond: [{ $eq: ['$status', RoomStatusEnum.OCCUPIED] }, 1, 0] } },
            dirty: { $sum: { $cond: [{ $eq: ['$status', RoomStatusEnum.DIRTY] }, 1, 0] } },
            maintenance: { $sum: { $cond: [{ $eq: ['$status', RoomStatusEnum.MAINTENANCE] }, 1, 0] } },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: bookingDateMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.Checked_In] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.Confirmed] }, 1, 0] } },
            todayArrivals: {
              $sum: {
                $cond: [
                  { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$checkInDate' } }, todayStr] },
                  1, 0,
                ],
              },
            },
            revenue: {
              $sum: {
                $cond: [{ $in: ['$bookingStatus', [BookingStatus.Checked_In, BookingStatus.Checked_Out]] }, '$totalAmountPaid', 0],
              },
            },
          },
        },
      ]),

      this.revenueLogModel.aggregate([
        { $match: revLogDateMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            cash: { $sum: '$cashAmount' },
            pos: { $sum: '$posAmount' },
            transfer: { $sum: '$transferAmount' },
            other: { $sum: '$otherAmount' },
            count: { $sum: 1 },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: { bookingStatus: BookingStatus.Checked_In, ...branchMatch } },
        {
          $lookup: {
            from: 'breakfastlogs',
            let: { bId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$bookingId', '$$bId'] },
                      { $gte: ['$dateServed', todayStart] },
                      { $lte: ['$dateServed', todayEnd] },
                    ],
                  },
                },
              },
            ],
            as: 'servingRecord',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            served: { $sum: { $cond: [{ $gt: [{ $size: '$servingRecord' }, 0] }, 1, 0] } },
          },
        },
      ]),

      branchId ? this.branchModel.findById(branchId).lean() : null,
      this.userModel.countDocuments({ isActive: true }),
    ]);

    const rooms = roomResult[0] || { total: 0, available: 0, occupied: 0, dirty: 0, maintenance: 0 };
    const bookings = bookingResult[0] || { total: 0, checkedIn: 0, pending: 0, todayArrivals: 0, revenue: 0 };
    const revLogs = revenueLogResult[0] || { total: 0, cash: 0, pos: 0, transfer: 0, other: 0, count: 0 };
    const breakfast = breakfastResult[0] || { total: 0, served: 0 };

    const occupancyRate = rooms.total > 0
      ? Math.round((rooms.occupied / rooms.total) * 100)
      : 0;

    const summary: Record<string, any> = {
      period: range,
      overview: {
        totalRevenue: bookings.revenue + revLogs.total,
        bookingRevenue: bookings.revenue,
        departmentRevenue: revLogs.total,
        occupancyRate,
        totalRooms: rooms.total,
        totalBookings: bookings.total,
        activeUsers,
        checkedInGuests: bookings.checkedIn,
        pendingCheckIns: bookings.pending,
        todayArrivals: bookings.todayArrivals,
        roomCounts: {
          total: rooms.total,
          available: rooms.available,
          occupied: rooms.occupied,
          dirty: rooms.dirty,
          maintenance: rooms.maintenance,
        },
      },
      departmentRevenueBreakdown: revLogs,
      breakfast: {
        total: breakfast.total,
        served: breakfast.served,
        pending: breakfast.total - breakfast.served,
      },
      branch: branch ? { id: branch._id, name: branch.name, code: branch.code } : null,
    };

    if (!branchId) {
      summary.byBranch = await this.branchModel.aggregate([
        {
          $lookup: {
            from: 'rooms',
            localField: '_id',
            foreignField: 'branchId',
            as: 'branchRooms',
          },
        },
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'branchId',
            as: 'branchBookings',
          },
        },
        {
          $project: {
            name: 1,
            code: 1,
            rooms: { $size: '$branchRooms' },
            occupied: {
              $size: {
                $filter: {
                  input: '$branchRooms',
                  as: 'r',
                  cond: { $eq: ['$$r.status', RoomStatusEnum.OCCUPIED] },
                },
              },
            },
            bookings: { $size: '$branchBookings' },
            revenue: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$branchBookings',
                    as: 'b',
                    cond: { $in: ['$$b.bookingStatus', [BookingStatus.Checked_In, BookingStatus.Checked_Out]] },
                  },
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.totalAmountPaid'] },
              },
            },
          },
        },
        {
          $addFields: {
            branchId: { $toString: '$_id' },
            occupancyRate: {
              $cond: [
                { $gt: ['$rooms', 0] },
                { $round: [{ $multiply: [{ $divide: ['$occupied', '$rooms'] }, 100] }] },
                0,
              ],
            },
          },
        },
        { $project: { branchRooms: 0, branchBookings: 0 } },
      ]);
    }

    await this.redis.set(cacheKey, JSON.stringify(summary), CACHE_TTL.ONE_MINUTE);
    this.logger.log(`Summary computed and cached ${branchId ? `(branch: ${branchId})` : ''}`);

    if (role === 'Reception') {
      return {
        period: range,
        overview: {
          totalRevenue: summary.overview.totalRevenue,
          bookingRevenue: summary.overview.bookingRevenue,
          departmentRevenue: summary.overview.departmentRevenue,
          occupancyRate: summary.overview.occupancyRate,
          checkedInGuests: summary.overview.checkedInGuests,
          pendingCheckIns: summary.overview.pendingCheckIns,
          todayArrivals: summary.overview.todayArrivals,
          roomCounts: summary.overview.roomCounts,
        },
        departmentRevenueBreakdown: revLogs,
        breakfast: summary.breakfast,
        branch: summary.branch,
      };
    }

    return summary;
  }

  async getAccountingSummary(
    opts?: { branchId?: string; period?: string; fromDate?: string; toDate?: string } | string,
  ) {
    let branchId: string | undefined;
    let period: string | undefined;
    let fromDate: string | undefined;
    let toDate: string | undefined;

    if (typeof opts === 'object' && opts !== null) {
      branchId = opts.branchId;
      period = opts.period;
      fromDate = opts.fromDate;
      toDate = opts.toDate;
    } else {
      branchId = opts;
    }

    const range = this.parseDateRange({ period, fromDate, toDate });

    const cacheKey = `${CACHE_KEYS.DASHBOARD_SUMMARY}:accounting:${branchId || 'all'}:${range.key}:${range.from || ''}:${range.to || ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Accounting summary served from cache ${branchId ? `(branch: ${branchId})` : ''}`);
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const branchMatch = branchId ? { branchId: new Types.ObjectId(branchId) } : {};

    const activeBookingMatch = {
      ...branchMatch,
      bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] },
    };

    const periodBookingMatch: any = { ...activeBookingMatch };
    if (range.fromDate || range.toDate) {
      periodBookingMatch.createdAt = {};
      if (range.fromDate) periodBookingMatch.createdAt.$gte = range.fromDate;
      if (range.toDate) periodBookingMatch.createdAt.$lte = range.toDate;
    }

    const periodRevLogMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      periodRevLogMatch.revenueDate = {};
      if (range.fromDate) periodRevLogMatch.revenueDate.$gte = range.fromDate;
      if (range.toDate) periodRevLogMatch.revenueDate.$lte = range.toDate;
    }

    const [
      revenueResult,
      todayRevenueResult,
      monthRevenueResult,
      discountResult,
      bookingCountsResult,
      dailyRevenueResult,
      inventoryCountResult,
      inventoryAggResult,
      revenueLogAggResult,
    ] = await Promise.all([
      this.bookingModel.aggregate([
        { $match: periodBookingMatch },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$totalAmountPaid' },
            count: { $sum: 1 },
          },
        },
      ]),

      this.bookingModel.aggregate([
        {
          $match: {
            ...activeBookingMatch,
            createdAt: { $gte: todayStart },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmountPaid' },
          },
        },
      ]),

      this.bookingModel.aggregate([
        {
          $match: {
            ...activeBookingMatch,
            createdAt: { $gte: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmountPaid' },
            count: { $sum: 1 },
            discountSum: { $sum: '$discount' },
            discountCount: { $sum: { $cond: [{ $gt: ['$discount', 0] }, 1, 0] } },
            discountPctSum: { $sum: '$discountPercentage' },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: periodBookingMatch },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: '$discount' },
            discountCount: { $sum: { $cond: [{ $gt: ['$discount', 0] }, 1, 0] } },
            discountPctSum: { $sum: '$discountPercentage' },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: branchMatch },
        {
          $group: {
            _id: '$bookingStatus',
            count: { $sum: 1 },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: activeBookingMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$totalAmountPaid' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 14 },
      ]),

      this.inventoryModel.countDocuments({ isActive: true, ...branchMatch }),

      this.inventoryModel.aggregate([
        { $match: { isActive: true, ...branchMatch } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$unitPrice', { $ifNull: ['$costPrice', 0] }] }] } },
            expiringCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ['$expiryDate', null] },
                    { $lte: ['$expiryDate', new Date(Date.now() + 30 * 86400000)] },
                    { $gt: ['$expiryDate', new Date()] },
                  ]},
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      this.revenueLogModel.aggregate([
        { $match: periodRevLogMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            cash: { $sum: '$cashAmount' },
            pos: { $sum: '$posAmount' },
            transfer: { $sum: '$transferAmount' },
            other: { $sum: '$otherAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byPayment: Record<string, number> = {};
    let roomRevenue = 0;
    let totalCount = 0;
    for (const r of revenueResult) {
      byPayment[r._id] = r.total;
      roomRevenue += r.total;
      totalCount += r.count;
    }

    const extAgg = revenueLogAggResult[0] || { total: 0, cash: 0, pos: 0, transfer: 0, other: 0, count: 0 };
    const todayRev = todayRevenueResult[0]?.revenue || 0;
    const monthData = monthRevenueResult[0] || { revenue: 0, count: 0, discountSum: 0, discountCount: 0, discountPctSum: 0 };
    const discData = discountResult[0] || { totalDiscount: 0, discountCount: 0, discountPctSum: 0 };

    const bookingCounts: Record<string, number> = { reserved: 0, confirmed: 0, checked_in: 0, checked_out: 0, cancelled: 0 };
    for (const b of bookingCountsResult) {
      bookingCounts[b._id] = b.count;
    }

    const combinedGrossRevenue = roomRevenue + extAgg.total;

    const accounting = {
      period: range,
      revenue: {
        total: combinedGrossRevenue,
        roomBookingRevenue: roomRevenue,
        byPaymentMethod: {
          cash: (byPayment['cash'] || 0) + extAgg.cash,
          pos_card: (byPayment['pos_card'] || 0) + extAgg.pos,
          bank_transfer: (byPayment['bank_transfer'] || 0) + extAgg.transfer,
          other: extAgg.other,
        },
        today: todayRev,
        thisMonth: monthData.revenue,
        averagePerBooking: totalCount > 0 ? Math.round(roomRevenue / totalCount) : 0,
        departmentRevenue: {
          total: extAgg.total,
          cash: extAgg.cash,
          pos: extAgg.pos,
          transfer: extAgg.transfer,
          other: extAgg.other,
          count: extAgg.count,
        },
        externalRevenue: {
          total: extAgg.total,
          cash: extAgg.cash,
          pos: extAgg.pos,
          transfer: extAgg.transfer,
          other: extAgg.other,
        },
        combinedGrossRevenue,
      },
      discounts: {
        totalGiven: discData.totalDiscount,
        averagePercentage: discData.discountCount > 0
          ? Math.round(discData.discountPctSum / discData.discountCount)
          : 0,
        totalBookingsWithDiscount: discData.discountCount,
        thisMonth: {
          totalGiven: monthData.discountSum,
          averagePercentage: monthData.discountCount > 0
            ? Math.round(monthData.discountPctSum / monthData.discountCount)
            : 0,
          bookingsWithDiscount: monthData.discountCount,
        },
      },
      bookings: {
        total: totalCount,
        ...bookingCounts,
      },
      inventory: {
        totalItems: inventoryCountResult,
        totalValue: inventoryAggResult[0]?.totalValue || 0,
        expiringItems: inventoryAggResult[0]?.expiringCount || 0,
      },
      dailyRevenue: dailyRevenueResult.map((d) => ({
        date: d._id,
        revenue: d.revenue,
        count: d.count,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(accounting), CACHE_TTL.ONE_MINUTE);
    this.logger.log(`Accounting summary computed and cached ${branchId ? `(branch: ${branchId})` : ''}`);
    return accounting;
  }

  async getRevenue(params: {
    branchId?: string;
    fromDate?: string;
    toDate?: string;
    period?: string;
  }) {
    const range = this.parseDateRange(params);
    const { branchId } = params;

    const branchMatch = branchId ? { branchId: new Types.ObjectId(branchId) } : {};

    const bookingDateMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      bookingDateMatch.createdAt = {};
      if (range.fromDate) bookingDateMatch.createdAt.$gte = range.fromDate;
      if (range.toDate) bookingDateMatch.createdAt.$lte = range.toDate;
    }

    const expenseDateMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      expenseDateMatch.fromDate = {};
      if (range.fromDate) expenseDateMatch.fromDate.$gte = range.fromDate;
      if (range.toDate) expenseDateMatch.fromDate.$lte = range.toDate;
    }

    const revLogDateMatch: any = { ...branchMatch };
    if (range.fromDate || range.toDate) {
      revLogDateMatch.revenueDate = {};
      if (range.fromDate) revLogDateMatch.revenueDate.$gte = range.fromDate;
      if (range.toDate) revLogDateMatch.revenueDate.$lte = range.toDate;
    }

    const [bookingRevenue, bookingCount, expenseResult, vatScResult, departmentRevResult] = await Promise.all([
      this.bookingModel.aggregate([
        {
          $match: {
            ...bookingDateMatch,
            bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmountPaid' },
          },
        },
      ]),

      this.bookingModel.countDocuments({
        ...bookingDateMatch,
        bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] },
      }),

      this.expenseModel.aggregate([
        { $match: expenseDateMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      this.bookingModel.aggregate([
        {
          $match: {
            ...bookingDateMatch,
            bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] },
          },
        },
        {
          $group: {
            _id: null,
            vatTotal: { $sum: '$vatAmount' },
            serviceChargeTotal: { $sum: '$serviceChargeAmount' },
            vatCount: { $sum: { $cond: ['$includeVat', 1, 0] } },
            scCount: { $sum: { $cond: ['$includeServiceCharge', 1, 0] } },
          },
        },
      ]),

      this.revenueLogModel.aggregate([
        { $match: revLogDateMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            cash: { $sum: '$cashAmount' },
            pos: { $sum: '$posAmount' },
            transfer: { $sum: '$transferAmount' },
            other: { $sum: '$otherAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const bookingRev = bookingRevenue[0]?.total || 0;
    const expenseTotal = expenseResult[0]?.total || 0;
    const expenseCount = expenseResult[0]?.count || 0;
    const vatData = vatScResult[0] || { vatTotal: 0, serviceChargeTotal: 0, vatCount: 0, scCount: 0 };
    const deptRevData = departmentRevResult[0] || { total: 0, cash: 0, pos: 0, transfer: 0, other: 0, count: 0 };

    const grossRevenue = bookingRev + deptRevData.total;
    const netRevenue = grossRevenue - expenseTotal;

    return {
      period: range,
      bookingRevenue: bookingRev,
      bookingCount,
      departmentRevenue: deptRevData.total,
      departmentRevenueCount: deptRevData.count,
      departmentRevenueBreakdown: {
        cash: deptRevData.cash,
        pos: deptRevData.pos,
        transfer: deptRevData.transfer,
        other: deptRevData.other,
      },
      departmentExpenses: expenseTotal,
      expenseCount,
      vatCollected: vatData.vatTotal,
      vatCount: vatData.vatCount,
      serviceChargeCollected: vatData.serviceChargeTotal,
      serviceChargeCount: vatData.scCount,
      grossRevenue,
      netRevenue,
      totalRevenue: grossRevenue,
    };
  }
}