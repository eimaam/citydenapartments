import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking } from '../bookings/booking.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Branch } from '../branches/branch.schema';
import { BreakfastLog } from '../breakfast/breakfast-log.schema';
import { User } from '../users/user.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';
import { startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(BreakfastLog.name) private breakfastModel: Model<BreakfastLog>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly redis: RedisService,
  ) {}

  async getSummary(branchId?: string) {
    const cacheKey = branchId
      ? `${CACHE_KEYS.DASHBOARD_SUMMARY}:${branchId}`
      : CACHE_KEYS.DASHBOARD_SUMMARY;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

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
            checkedIn: { $sum: { $cond: [{ $eq: ['$bookingStatus', 'Checked_In'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$bookingStatus', 'Confirmed'] }, 1, 0] } },
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
                $cond: [{ $ne: ['$bookingStatus', 'Cancelled'] }, '$totalAmountPaid', 0],
              },
            },
          },
        },
      ]),

      this.bookingModel.aggregate([
        { $match: { bookingStatus: 'Checked_In', ...branchMatch } },
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
      this.userModel.countDocuments(),
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
                    cond: { $ne: ['$$b.bookingStatus', 'Cancelled'] },
                  },
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$b.totalAmountPaid'] },
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
    return summary;
  }
}