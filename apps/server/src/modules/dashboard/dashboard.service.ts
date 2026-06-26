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
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';

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
    private readonly redis: RedisService,
  ) {}

  async getSummary(branchId?: string, role?: string) {
    const cacheKey = branchId
      ? `${CACHE_KEYS.DASHBOARD_SUMMARY}:${branchId}`
      : CACHE_KEYS.DASHBOARD_SUMMARY;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Summary served from cache ${branchId ? `(branch: ${branchId})` : ''}`);
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayStr = format(now, 'yyyy-MM-dd');

    const branchMatch = branchId
      ? { branchId: new Types.ObjectId(branchId) }
      : {};

    const [
      roomResult,
      bookingResult,
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
        { $match: branchMatch },
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
    const breakfast = breakfastResult[0] || { total: 0, served: 0 };

    const occupancyRate = rooms.total > 0
      ? Math.round((rooms.occupied / rooms.total) * 100)
      : 0;

    const summary: Record<string, any> = {
      overview: {
        totalRevenue: bookings.revenue,
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
        overview: {
          occupancyRate: summary.overview.occupancyRate,
          checkedInGuests: summary.overview.checkedInGuests,
          pendingCheckIns: summary.overview.pendingCheckIns,
          todayArrivals: summary.overview.todayArrivals,
          roomCounts: summary.overview.roomCounts,
        },
        breakfast: summary.breakfast,
        branch: summary.branch,
      };
    }

    return summary;
  }

  async getAccountingSummary(branchId?: string) {
    const cacheKey = `${CACHE_KEYS.DASHBOARD_SUMMARY}:accounting${branchId ? `:${branchId}` : ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Accounting summary served from cache ${branchId ? `(branch: ${branchId})` : ''}`);
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const branchMatch = branchId
      ? { branchId: new Types.ObjectId(branchId) }
      : {};

    const activeBookingMatch = {
      ...branchMatch,
      bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] },
    };

    const [
      revenueResult,
      todayRevenueResult,
      monthRevenueResult,
      discountResult,
      bookingCountsResult,
      dailyRevenueResult,
      inventoryCountResult,
      inventoryAggResult,
    ] = await Promise.all([
      this.bookingModel.aggregate([
        { $match: { bookingStatus: { $in: [BookingStatus.Checked_In, BookingStatus.Checked_Out] }, ...branchMatch } },
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
        { $match: activeBookingMatch },
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
            totalValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$costPrice', 0] }] } },
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
    ]);

    const byPayment: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCount = 0;
    for (const r of revenueResult) {
      byPayment[r._id] = r.total;
      totalRevenue += r.total;
      totalCount += r.count;
    }

    const todayRev = todayRevenueResult[0]?.revenue || 0;
    const monthData = monthRevenueResult[0] || { revenue: 0, count: 0, discountSum: 0, discountCount: 0, discountPctSum: 0 };
    const discData = discountResult[0] || { totalDiscount: 0, discountCount: 0, discountPctSum: 0 };

    const bookingCounts: Record<string, number> = { reserved: 0, confirmed: 0, checked_in: 0, checked_out: 0, cancelled: 0 };
    for (const b of bookingCountsResult) {
      bookingCounts[b._id] = b.count;
    }

    const accounting = {
      revenue: {
        total: totalRevenue,
        byPaymentMethod: {
          cash: byPayment['cash'] || 0,
          pos_card: byPayment['pos_card'] || 0,
          bank_transfer: byPayment['bank_transfer'] || 0,
        },
        today: todayRev,
        thisMonth: monthData.revenue,
        averagePerBooking: totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0,
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
}