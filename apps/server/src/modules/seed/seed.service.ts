import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { subDays, addDays, differenceInDays } from 'date-fns';
import { User } from '../users/user.schema';
import { Branch } from '../branches/branch.schema';
import { RoomType } from '../room-types/room-type.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Booking } from '../bookings/booking.schema';
import { InventoryItem } from '../inventory/inventory-item.schema';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';

// ── random helpers ──────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randNaira = (min: number, max: number) => randInt(min / 1000, max / 1000) * 1000;

function daysAgo(n: number) { return subDays(new Date(), n); }
function daysFromNow(n: number) { return addDays(new Date(), n); }
function ref(prefix: string, n: number) { return `${prefix}-${String(n).padStart(3, '0')}`; }

// ── data pools ───────────────────────────────────────────────────
const firstNames = [
  'Chidi', 'Amara', 'Ngozi', 'Obinna', 'Fatima', 'Ibrahim', 'Zainab', 'Tunde',
  'Chioma', 'Emeka', 'Bolanle', 'Yusuf', 'Aisha', 'Musa', 'Halima', 'Olumide',
  'Ifeanyi', 'Adaeze', 'Chukwudi', 'Nneka', 'Uche', 'Temitope', 'Kelechi', 'Folake',
  'Azeez', 'Efe', 'Eno', 'Dayo', 'Sade', 'Bayo',
];

const lastNames = [
  'Okonkwo', 'Okafor', 'Mohammed', 'Adebayo', 'Bello', 'Nwachukwu', 'Abubakar',
  'Olawale', 'Eze', 'Suleiman', 'Adegoke', 'Obi', 'Danladi', 'Alabi', 'Ibe',
  'Taiwo', 'Onyeka', 'Idris', 'Ojo', 'Balogun', 'Nwosu', 'Yakubu', 'Ogunleye',
];

const paymentMethods: Array<'Cash' | 'POS_Card' | 'Bank_Transfer'> = ['Cash', 'POS_Card', 'Bank_Transfer'];
const bookingSources: Array<'WalkIn' | 'Phone' | 'Online'> = ['WalkIn', 'Phone', 'Online'];

// ── scenario presets: [status, checkInOffset, checkOutOffset, nights] ─
type Scenario = [string, number, number, number];

const scenarios: Scenario[] = [
  // Checked_In — paid = checked in. Future or past.
  ['Checked_In', 0, 2, 2],
  ['Checked_In', 1, 3, 2],
  ['Checked_In', 2, 5, 3],
  ['Checked_In', 5, 8, 3],
  ['Checked_In', 0, 1, 1],
  ['Checked_In', 3, 5, 2],
  ['Checked_In', 7, 10, 3],
  ['Checked_In', 1, 4, 3],

  // Checked_In — check-in in the past, check-out in the future
  ['Checked_In', -1, 2, 3],
  ['Checked_In', -2, 1, 3],
  ['Checked_In', -3, 2, 5],
  ['Checked_In', 0, 3, 3],
  ['Checked_In', -1, 0, 1],
  ['Checked_In', -4, 1, 5],
  ['Checked_In', -2, 3, 5],
  ['Checked_In', -1, 4, 5],

  // Checked_Out — both dates in the past
  ['Checked_Out', -5, -3, 2],
  ['Checked_Out', -7, -5, 2],
  ['Checked_Out', -10, -7, 3],
  ['Checked_Out', -3, -1, 2],
  ['Checked_Out', -14, -12, 2],
  ['Checked_Out', -8, -6, 2],
  ['Checked_Out', -6, -3, 3],
  ['Checked_Out', -2, 0, 2],

  // Cancelled — various offsets
  ['Cancelled', 2, 4, 2],
  ['Cancelled', -3, 1, 4],
  ['Cancelled', 5, 8, 3],
  ['Cancelled', -1, 2, 3],
  ['Cancelled', 10, 12, 2],
  ['Cancelled', -6, -4, 2],
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(InventoryItem.name) private inventoryItemModel: Model<InventoryItem>,
    @InjectModel(InventoryTransaction.name) private inventoryTxModel: Model<InventoryTransaction>,
  ) {}

  async seed() {
    this.logger.log('Seed started');

    const existingAdmin = await this.userModel.findOne({ email: 'admin@cityden.com' });
    if (existingAdmin) {
      return { message: 'System already seeded. Use POST /api/v1/auth/register to add users.' };
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    // ── branches ──
    const branches = await this.branchModel.create([
      {
        name: 'Abuja', code: 'ABJ', address: 'Plot 123, Central Business District, Abuja', isActive: true,
        policies: {
          checkInTime: '14:00', checkOutTime: '12:00',
          earlyCheckIn: 'Early check-in is subject to availability and may incur additional charges.',
          lateCheckOut: 'Late check-out is subject to availability. A fee may apply for check-out after 12:00 PM.',
          cancellation: 'Cancellations made by guests for reserved dates: refunds cannot be issued; however, the payment will be credited to the guests account for use towards a future reservation.',
          houseRules: [
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000. Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary continental breakfast served from 7:00 AM to 10:30 AM in the dining area.',
          contactPhone: '+234 809 000 1234',
          contactEmail: 'abuja@citydenapartments.com',
          additionalNotes: 'Free WiFi is available throughout the property.',
        },
      },
      {
        name: 'Kaduna', code: 'KAD', address: 'No 45, Ahmadu Bello Way, Kaduna', isActive: true,
        policies: {
          checkInTime: '14:00', checkOutTime: '12:00',
          earlyCheckIn: 'Early check-in is subject to availability and may incur additional charges.',
          lateCheckOut: 'Late check-out is subject to availability. A fee may apply for check-out after 12:00 PM.',
          cancellation: 'Cancellations made by guests for reserved dates: refunds cannot be issued; however, the payment will be credited to the guests account for use towards a future reservation.',
          houseRules: [
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000. Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary continental breakfast served from 7:00 AM to 10:30 AM in the dining area.',
          contactPhone: '+234 809 000 5678',
          contactEmail: 'kaduna@citydenapartments.com',
          additionalNotes: 'Free WiFi is available throughout the property.',
        },
      },
      {
        name: 'Maiduguri', code: 'MAI', address: '15 Damaturu Road, Maiduguri', isActive: true,
        policies: {
          checkInTime: '14:00', checkOutTime: '12:00',
          earlyCheckIn: 'Early check-in is subject to availability and may incur additional charges.',
          lateCheckOut: 'Late check-out is subject to availability. A fee may apply for check-out after 12:00 PM.',
          cancellation: 'Cancellations made by guests for reserved dates: refunds cannot be issued; however, the payment will be credited to the guests account for use towards a future reservation.',
          houseRules: [
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000. Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary breakfast served from 7:00 AM to 10:30 AM in the dining area.',
          contactPhone: '+234 809 000 9012',
          contactEmail: 'maiduguri@citydenapartments.com',
          additionalNotes: 'Free WiFi is available throughout the property.',
        },
      },
    ]);

    this.logger.log(`Seed — branches created: ${branches.length}`);

    // ── admin ──
    const admin = await this.userModel.create({
      email: 'admin@cityden.com', password: hashedPassword, name: 'Super Admin',
      role: 'SuperAdmin', allowedBranches: branches.map((b) => b._id),
      activeBranchId: null, isActive: true,
    });

    // ── room types ──
    const abujaRT = await this.roomTypeModel.create([
      { branchId: branches[0]._id, name: 'King Suite', basePrice: 80000, minPriceAllowed: 65000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Deluxe Suite', basePrice: 55000, minPriceAllowed: 45000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Presidential Suite', basePrice: 150000, minPriceAllowed: 120000, amenities: ['King Bed', 'Living Room', 'Jacuzzi', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const kadunaRT = await this.roomTypeModel.create([
      { branchId: branches[1]._id, name: 'King Suite', basePrice: 70000, minPriceAllowed: 55000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Standard Room', basePrice: 40000, minPriceAllowed: 32000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const maiRT = await this.roomTypeModel.create([
      { branchId: branches[2]._id, name: 'Deluxe Suite', basePrice: 50000, minPriceAllowed: 40000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Standard Room', basePrice: 30000, minPriceAllowed: 25000, amenities: ['Queen Bed', 'AC'], createdBy: admin._id, updatedBy: admin._id },
    ]);

    this.logger.log(`Seed — room types created: ${abujaRT.length + kadunaRT.length + maiRT.length}`);

    // ── rooms (references for seeding bookings) ──
    const roomDefs = [
      { branch: 0, rt: 0, num: 'KS-101', max: 2 }, { branch: 0, rt: 0, num: 'KS-102', max: 2 },
      { branch: 0, rt: 1, num: 'DS-201', max: 3 }, { branch: 0, rt: 1, num: 'DS-202', max: 3 },
      { branch: 0, rt: 1, num: 'DS-203', max: 3 }, { branch: 0, rt: 2, num: 'PS-301', max: 4 },
      { branch: 1, rt: 0, num: 'KS-101', max: 2 }, { branch: 1, rt: 0, num: 'KS-102', max: 2 },
      { branch: 1, rt: 1, num: 'SR-201', max: 2 }, { branch: 1, rt: 1, num: 'SR-202', max: 2 },
      { branch: 2, rt: 0, num: 'DS-101', max: 3 }, { branch: 2, rt: 0, num: 'DS-102', max: 3 },
      { branch: 2, rt: 1, num: 'SR-201', max: 2 },
    ];

    const allRT = [abujaRT, kadunaRT, maiRT];
    const rooms = await this.roomModel.create(
      roomDefs.map((r) => ({
        branchId: branches[r.branch]._id,
        roomTypeId: allRT[r.branch][r.rt]._id,
        roomNumber: r.num,
        maxGuests: r.max,
        status: RoomStatusEnum.AVAILABLE,
        createdBy: admin._id,
        updatedBy: admin._id,
      })),
    );

    this.logger.log(`Seed — rooms created: ${rooms.length}`);

    // ── staff ──
    await this.userModel.create([
      { email: 'reception@cityden.com', password: hashedPassword, name: 'Amara Reception', role: 'Reception', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true },
      { email: 'kitchen@cityden.com', password: hashedPassword, name: 'Chef Ibrahim', role: 'KitchenStaff', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true },
      { email: 'media@cityden.com', password: hashedPassword, name: 'Zara Media', role: 'SocialMediaManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true },
      { email: 'housekeeper@cityden.com', password: hashedPassword, name: 'Mama Bisi', role: 'HouseKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true },
      { email: 'manager-abuja@cityden.com', password: hashedPassword, name: 'Chidi Manager', role: 'BranchManager', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true },
      { email: 'manager-kaduna@cityden.com', password: hashedPassword, name: 'Fatima Manager', role: 'BranchManager', allowedBranches: [branches[1]._id], activeBranchId: branches[1]._id, isActive: true },
      { email: 'manager-maiduguri@cityden.com', password: hashedPassword, name: 'Ibrahim Manager', role: 'BranchManager', allowedBranches: [branches[2]._id], activeBranchId: branches[2]._id, isActive: true },
    ]);

    // ── store staff ──
    const storeKeeper = await this.userModel.create({
      email: 'storekeeper@cityden.com', password: hashedPassword, name: 'Emeka Store',
      role: 'StoreKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true,
    });
    await this.userModel.create({
      email: 'storemanager@cityden.com', password: hashedPassword, name: 'Ngozi Store',
      role: 'StoreManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true,
    });

    this.logger.log(`Seed — users created: 1 admin + 4 staff + 3 branch managers + 2 store staff`);

    // ── inventory items ─────────────────────────────────────────
    const itemDefs = [
      { name: 'Bar Soap', category: 'Toiletries', unit: 'pcs' },
      { name: 'Shampoo', category: 'Toiletries', unit: 'bottles' },
      { name: 'Toilet Paper', category: 'Cleaning', unit: 'rolls' },
      { name: 'Hand Towels', category: 'Linen', unit: 'pcs' },
      { name: 'Bleach', category: 'Cleaning', unit: 'litres' },
      { name: 'Floor Detergent', category: 'Cleaning', unit: 'litres' },
      { name: 'Light Bulbs', category: 'Maintenance', unit: 'pcs' },
      { name: 'Trash Bags', category: 'Cleaning', unit: 'packs' },
      { name: 'Dishwashing Liquid', category: 'Kitchen', unit: 'bottles' },
      { name: 'Bottled Water', category: 'Kitchen', unit: 'cartons' },
    ];

    const inventoryItems: Array<Record<string, unknown>> = [];
    for (const branch of branches) {
      for (const def of itemDefs) {
        const stock = 20 + Math.floor(Math.random() * 80);
        const reorder = 5 + Math.floor(Math.random() * 15);
        inventoryItems.push({
          name: def.name,
          category: def.category,
          unit: def.unit,
          currentStock: stock,
          reorderLevel: reorder,
          branchId: branch._id,
          isActive: true,
          createdBy: storeKeeper._id,
          updatedBy: storeKeeper._id,
        });
      }
    }
    const createdItems = await this.inventoryItemModel.create(inventoryItems);

    // initial stock transactions
    const txns = createdItems.map((item) => ({
      itemId: item._id,
      type: 'restock',
      quantity: item.currentStock,
      previousStock: 0,
      newStock: item.currentStock,
      notes: 'Initial stock on setup',
      performedBy: storeKeeper._id,
      branchId: item.branchId,
    }));
    await this.inventoryTxModel.create(txns);

    this.logger.log(`Seed — inventory items created: ${createdItems.length} across ${branches.length} branches`);

    // ── 30 bookings ─────────────────────────────────────────────────
    const bookingData: Array<Record<string, unknown>> = [];
    const roomsToUpdate: Record<string, string> = {}; // roomId -> status

    for (let i = 0; i < 30; i++) {
      const [status, ciOff, coOff] = scenarios[i % scenarios.length];
      const room = rooms[i % rooms.length];
      const branch = branches.find((b) => b._id.toString() === room.branchId.toString())!;
      const rt = allRT.flat().find((t) => t._id.toString() === room.roomTypeId.toString());

      const ci = ciOff >= 0 ? daysFromNow(ciOff) : daysAgo(Math.abs(ciOff));
      let co = coOff >= 0 ? daysFromNow(coOff) : daysAgo(Math.abs(coOff));

      if (co <= ci) co = addDays(ci, 1);

      const nights = Math.max(1, differenceInDays(co, ci));
      const pricePerNight = rt ? randNaira(rt.minPriceAllowed, rt.basePrice) : randNaira(25000, 80000);
      const discount = Math.random() > 0.7 ? randInt(0, 10000) : 0;
      const total = Math.max(0, pricePerNight * nights - discount);

      const guestName = `${pick(firstNames)} ${pick(lastNames)}`;
      const guestPhone = `0803${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
      const hasEmail = Math.random() > 0.5;

      bookingData.push({
        branchId: room.branchId,
        roomId: room._id,
        guestDetails: {
          name: guestName,
          phone: guestPhone,
          address: pick(['12 Ahmadu Bello Way', 'Plot 5 Lugard Avenue', '23 Tafawa Balewa Road', '8 Yakubu Gowon Crescent', '45 Obafemi Awolowo Street']),
          nationality: 'Nigeria',
          ...(hasEmail ? { email: `${guestName.toLowerCase().replace(/\s/g, '.')}@email.com` } : {}),
        },
        numberOfGuests: randInt(1, room.maxGuests),
        checkInDate: ci,
        checkOutDate: co,
        actualPricePerNight: pricePerNight,
        discount,
        totalAmountPaid: total,
        paymentMethod: pick(paymentMethods),
        paymentReference: Math.random() > 0.5 ? `TXN-${Date.now().toString(36)}-${i}` : undefined,
        bookingStatus: status,
        bookingSource: pick(bookingSources),
        bookedBy: admin._id,
        bookingReference: `CDA-${branch.code}-${String(i + 1).padStart(3, '0')}`,
      });

      // track room status — last booking per room wins
      if (status === 'Checked_Out') {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.DIRTY;
      } else if (status === 'Checked_In' && roomsToUpdate[room._id.toString()] !== RoomStatusEnum.DIRTY) {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.OCCUPIED;
      } else if (status === 'Cancelled' && !roomsToUpdate[room._id.toString()]) {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.AVAILABLE;
      }
    }

    await this.bookingModel.create(bookingData);

    this.logger.log(`Seed — bookings created: ${bookingData.length}`);

    // Update room statuses
    for (const [roomId, status] of Object.entries(roomsToUpdate)) {
      await this.roomModel.findByIdAndUpdate(roomId, { status });
    }

    this.logger.log(`Seed completed — users: 10, branches: ${branches.length}, roomTypes: 7, rooms: ${rooms.length}, bookings: ${bookingData.length}`);

    return {
      message: 'System seeded successfully',
      credentials: {
        admin: 'admin@cityden.com / admin123',
        reception: 'reception@cityden.com / admin123',
        kitchen: 'kitchen@cityden.com / admin123',
        media: 'media@cityden.com / admin123',
        housekeeper: 'housekeeper@cityden.com / admin123',
        'manager-abuja': 'manager-abuja@cityden.com / admin123',
        'manager-kaduna': 'manager-kaduna@cityden.com / admin123',
        'manager-maiduguri': 'manager-maiduguri@cityden.com / admin123',
        'storekeeper': 'storekeeper@cityden.com / admin123',
        'storemanager': 'storemanager@cityden.com / admin123',
      },
      stats: {
        users: 10,
        branches: 3,
        roomTypes: 7,
        rooms: rooms.length,
        bookings: bookingData.length,
      },
    };
  }
}
