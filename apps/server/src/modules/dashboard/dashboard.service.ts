import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from '../bookings/booking.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Branch } from '../branches/branch.schema';
import { User } from '../users/user.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';
import { format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly redis: RedisService,
  ) {}

  async getSummary() {
    const cached = await this.redis.get(CACHE_KEYS.DASHBOARD_SUMMARY);
    if (cached) return JSON.parse(cached);

    const [rooms, bookings, branches, users] = await Promise.all([
      this.roomModel.find().lean(),
      this.bookingModel.find().lean(),
      this.branchModel.find().lean(),
      this.userModel.countDocuments(),
    ]);

    const totalRevenue = bookings
      .filter((b) => b.bookingStatus !== 'Cancelled')
      .reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0);

    const checkedIn = bookings.filter((b) => b.bookingStatus === 'Checked_In').length;
    const pending = bookings.filter((b) => b.bookingStatus === 'Confirmed').length;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayArrivals = bookings.filter((b) => b.checkInDate ? format(new Date(b.checkInDate as any), 'yyyy-MM-dd') === today : false).length;

    const occupancy = rooms.length > 0
      ? Math.round((rooms.filter((r) => (r.status as string) === RoomStatusEnum.OCCUPIED).length / rooms.length) * 100)
      : 0;

    const byBranch = branches.map((branch) => {
      const branchId = branch._id.toString();
      const branchRooms = rooms.filter((r) => r.branchId?.toString() === branchId);
      const branchBookings = bookings.filter((b) => b.branchId?.toString() === branchId);
      const branchRevenue = branchBookings
        .filter((b) => b.bookingStatus !== 'Cancelled')
        .reduce((s, b) => s + (b.totalAmountPaid || 0), 0);
      const branchOccupied = branchRooms.filter((r) => (r.status as string) === RoomStatusEnum.OCCUPIED).length;

      return {
        branchId,
        name: branch.name,
        code: branch.code,
        rooms: branchRooms.length,
        occupied: branchOccupied,
        bookings: branchBookings.length,
        revenue: branchRevenue,
        occupancyRate: branchRooms.length > 0 ? Math.round((branchOccupied / branchRooms.length) * 100) : 0,
      };
    });

    const summary = {
      overview: { totalRevenue, occupancyRate: occupancy, totalRooms: rooms.length, totalBookings: bookings.length, activeUsers: users, checkedInGuests: checkedIn, pendingCheckIns: pending, todayArrivals },
      byBranch,
    };

    await this.redis.set(CACHE_KEYS.DASHBOARD_SUMMARY, JSON.stringify(summary), CACHE_TTL.ONE_MINUTE);
    return summary;
  }
}
