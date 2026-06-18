import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { subDays, addDays, differenceInDays } from 'date-fns';
import { User } from '../users/user.schema';
import { Branch } from '../branches/branch.schema';
import { RoomType } from '../room-types/room-type.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Booking } from '../bookings/booking.schema';
import { InventoryItem } from '../inventory/inventory-item.schema';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { Employee } from '../employees/employee.schema';

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

const genders = ['male', 'female'];

const cities = ['Abuja', 'Kaduna', 'Lagos', 'Port Harcourt', 'Enugu', 'Kano', 'Ibadan', 'Maiduguri', 'Jos', 'Calabar'];

const states = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];

const occupations = ['Civil Servant', 'Business Owner', 'Teacher', 'Engineer', 'Doctor', 'Lawyer', 'Accountant', 'Student', 'Trader', 'Journalist', 'Nurse', 'Driver', 'NGO Worker', 'IT Professional', 'Military', 'Police', 'Consultant', 'Artist', 'Farmer', 'Pastor'];

const paymentMethods: Array<'cash' | 'pos_card' | 'bank_transfer'> = ['cash', 'pos_card', 'bank_transfer'];
const bookingSources: Array<'walk_in' | 'phone' | 'online'> = ['walk_in', 'phone', 'online'];

// ── scenario presets: [status, checkInOffset, checkOutOffset, nights] ─
type Scenario = [string, number, number, number];

const scenarios: Scenario[] = [
  // Reserved — future call-in reservations, no payment, room stays available
  ['reserved', 1, 3, 2],
  ['reserved', 2, 5, 3],
  ['reserved', 4, 7, 3],
  ['reserved', 3, 5, 2],
  ['reserved', 0, 2, 2],
  ['reserved', 1, 4, 3],

  // Checked_In — paid = checked in. Future or past.
  ['checked_in', 0, 2, 2],
  ['checked_in', 1, 3, 2],
  ['checked_in', 2, 5, 3],
  ['checked_in', 5, 8, 3],
  ['checked_in', 0, 1, 1],
  ['checked_in', 3, 5, 2],
  ['checked_in', 7, 10, 3],
  ['checked_in', 1, 4, 3],

  // Checked_In — check-in in the past, check-out in the future
  ['checked_in', -1, 2, 3],
  ['checked_in', -2, 1, 3],
  ['checked_in', -3, 2, 5],
  ['checked_in', 0, 3, 3],
  ['checked_in', -1, 0, 1],
  ['checked_in', -4, 1, 5],
  ['checked_in', -2, 3, 5],
  ['checked_in', -1, 4, 5],

  // Checked_Out — both dates in the past
  ['checked_out', -5, -3, 2],
  ['checked_out', -7, -5, 2],
  ['checked_out', -10, -7, 3],
  ['checked_out', -3, -1, 2],
  ['checked_out', -14, -12, 2],
  ['checked_out', -8, -6, 2],
  ['checked_out', -6, -3, 3],
  ['checked_out', -2, 0, 2],

  // Cancelled — various offsets
  ['cancelled', 2, 4, 2],
  ['cancelled', -3, 1, 4],
  ['cancelled', 5, 8, 3],
  ['cancelled', -1, 2, 3],
  ['cancelled', 10, 12, 2],
  ['cancelled', -6, -4, 2],
];

@Injectable()
export class SeedService  {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(InventoryItem.name) private inventoryItemModel: Model<InventoryItem>,
    @InjectModel(InventoryTransaction.name) private inventoryTxModel: Model<InventoryTransaction>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
  ) {}

  async seed() {
    this.logger.log('Seed started');

    const db = this.connection.db;
    if (!db) throw new Error('Database connection not available');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (!col.name.startsWith('system.')) await db.collection(col.name).drop();
    }
    this.logger.log('All collections dropped');

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
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000 (or equivalent in Dollars (USD). Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary continental breakfast served from 7:00 AM to 10:30 AM',
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
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000 (or equivalent in Dollars (USD). Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary continental breakfast served from 7:00 AM to 10:30 AM',
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
            'Smoking is strictly prohibited in all rooms. Default attracts a fine of ₦200,000 (or equivalent in Dollars (USD). Designated smoking areas are available.',
            'Guests must have deposit at the front office before bills can be charged to room.',
            'The Hotel will not be liable for loss of valuables left in the rooms or public area of the Hotel.',
            'Children and babies are allowed in the rooms.',
            'Visitors must register at the front desk.',
            'Quiet hours from 10:00 PM to 7:00 AM.',
            'Guests are responsible for any damage to hotel property.',
          ],
          paymentInfo: 'Cash and card payments are accepted. A security deposit is required at check-in.',
          breakfastInfo: 'Complimentary breakfast served from 7:00 AM to 10:30 AM',
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
      { branchId: branches[0]._id, name: 'King Suite', basePrice: 60000, minPriceAllowed: 50000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Deluxe Suite', basePrice: 70000, minPriceAllowed: 60000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Executive Suite', basePrice: 80000, minPriceAllowed: 70000, amenities: ['King Bed', 'AC', 'WiFi', 'Work Desk', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Penthouse Suite', basePrice: 120000, minPriceAllowed: 100000, amenities: ['King Bed', 'Living Room', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Royal Suite', basePrice: 150000, minPriceAllowed: 130000, amenities: ['King Bed', 'Living Room', 'Kitchenette', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Business Suite', basePrice: 160000, minPriceAllowed: 140000, amenities: ['King Bed', 'Living Room', 'Work Desk', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Presidential Suite', basePrice: 400000, minPriceAllowed: 350000, amenities: ['King Bed', 'Living Room', 'Dining', 'Jacuzzi', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const kadunaRT = await this.roomTypeModel.create([
      { branchId: branches[1]._id, name: 'King Suite', basePrice: 70000, minPriceAllowed: 55000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Standard Room', basePrice: 40000, minPriceAllowed: 32000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const maiRT = await this.roomTypeModel.create([
      { branchId: branches[2]._id, name: 'Deluxe Suite', basePrice: 50000, minPriceAllowed: 40000, amenities: ['Queen Bed', 'AC', 'WiFi'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Standard Room', basePrice: 30000, minPriceAllowed: 25000, amenities: ['Queen Bed', 'AC'], createdBy: admin._id, updatedBy: admin._id },
    ]);

    this.logger.log(`Seed — room types created: ${abujaRT.length} Abuja + ${kadunaRT.length} Kaduna + ${maiRT.length} Maiduguri`);

    // ── rooms (references for seeding bookings) ──
    const roomDefs = [
      // Abuja — King Suite (rt 0)
      { branch: 0, rt: 0, num: 'B104', max: 2 }, { branch: 0, rt: 0, num: 'B203', max: 2 },
      // Abuja — Deluxe Suite (rt 1)
      { branch: 0, rt: 1, num: 'A105', max: 2 }, { branch: 0, rt: 1, num: 'A204', max: 2 },
      { branch: 0, rt: 1, num: 'B102', max: 2 }, { branch: 0, rt: 1, num: 'B103', max: 2 },
      { branch: 0, rt: 1, num: 'B201', max: 2 }, { branch: 0, rt: 1, num: 'B204', max: 2 },
      // Abuja — Executive Suite (rt 2)
      { branch: 0, rt: 2, num: 'A001', max: 2 }, { branch: 0, rt: 2, num: 'A002', max: 2 },
      { branch: 0, rt: 2, num: 'A003', max: 2 },
      // Abuja — Penthouse Suite (rt 3)
      { branch: 0, rt: 3, num: 'B202', max: 3 },
      // Abuja — Royal Suite (rt 4)
      { branch: 0, rt: 4, num: 'B101', max: 3 },
      // Abuja — Business Suite (rt 5)
      { branch: 0, rt: 5, num: 'A101', max: 3 },
      // Abuja — Presidential Suite (rt 6)
      { branch: 0, rt: 6, num: 'A102', max: 4 }, { branch: 0, rt: 6, num: 'A103', max: 4 },
      { branch: 0, rt: 6, num: 'A104', max: 4 },
      // Kaduna
      { branch: 1, rt: 0, num: 'KS-101', max: 2 }, { branch: 1, rt: 0, num: 'KS-102', max: 2 },
      { branch: 1, rt: 1, num: 'SR-201', max: 2 }, { branch: 1, rt: 1, num: 'SR-202', max: 2 },
      // Maiduguri
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
      { email: 'housekeeper@cityden.com', password: hashedPassword, name: 'Mama Bisi', role: 'HouseKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true },
      { email: 'frontoffice@cityden.com', password: hashedPassword, name: 'Tunde FrontOffice', role: 'FrontOfficeManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true },
      { email: 'accountant@cityden.com', password: hashedPassword, name: 'Ngozi Accountant', role: 'Accountant', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true },
      { email: 'it@cityden.com', password: hashedPassword, name: 'Chidi IT', role: 'IT', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true },
      { email: 'fm-abuja@cityden.com', password: hashedPassword, name: 'Chidi Facility Manager', role: 'FacilityManager', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true },
      { email: 'fm-kaduna@cityden.com', password: hashedPassword, name: 'Fatima Facility Manager', role: 'FacilityManager', allowedBranches: [branches[1]._id], activeBranchId: branches[1]._id, isActive: true },
      { email: 'fm-maiduguri@cityden.com', password: hashedPassword, name: 'Ibrahim Facility Manager', role: 'FacilityManager', allowedBranches: [branches[2]._id], activeBranchId: branches[2]._id, isActive: true },
    ]);

    // ── Group GM ──
    await this.userModel.create({
      email: 'groupgm@cityden.com', password: hashedPassword, name: 'Dr. Okafor Group GM',
      role: 'GroupGM', allowedBranches: branches.map((b) => b._id), activeBranchId: null, isActive: true,
    });

    // ── store staff ──
    const storeKeeper = await this.userModel.create({
      email: 'storekeeper@cityden.com', password: hashedPassword, name: 'Emeka Store',
      role: 'StoreKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true,
    });
    await this.userModel.create({
      email: 'storemanager@cityden.com', password: hashedPassword, name: 'Ngozi Store',
      role: 'StoreManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true,
    });

    this.logger.log(`Seed — users created: 1 admin + 1 group gm + 3 facility managers + 1 front office + 1 accountant + 1 it + 2 store staff + kitchen + reception + housekeeper`);

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

    const costPrices: Record<string, number> = {
      'Bar Soap': 350, 'Shampoo': 1200, 'Toilet Paper': 2500, 'Hand Towels': 1800,
      'Bleach': 900, 'Floor Detergent': 1500, 'Light Bulbs': 800, 'Trash Bags': 600,
      'Dishwashing Liquid': 1100, 'Bottled Water': 2400,
    };

    const inventoryItems: Array<Record<string, unknown>> = [];
    for (const branch of branches) {
      for (const def of itemDefs) {
        const stock = 20 + Math.floor(Math.random() * 80);
        const reorder = 5 + Math.floor(Math.random() * 15);
        const hasExpiry = Math.random() > 0.4;
        const expDays = hasExpiry ? Math.random() > 0.2 ? randInt(30, 365) : randInt(-30, 29) : undefined;
        inventoryItems.push({
          name: def.name,
          category: def.category,
          unit: def.unit,
          currentStock: stock,
          reorderLevel: reorder,
          costPrice: costPrices[def.name] || 500,
          expiryDate: expDays != null ? daysFromNow(expDays) : undefined,
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

    // ── employees ────────────────────────────────────────────────────
    const employeeData: Array<Record<string, unknown>> = [];

    const staffByBranch: Array<{ branchIdx: number; staff: Array<{ name: string; email: string; phone: string; department: string; position: string }> }> = [
      {
        branchIdx: 0, // Abuja
        staff: [
          { name: 'Adebayo Olamide', email: 'adebayo.olamide@cityden.com', phone: '08031234567', department: 'Front Office', position: 'Senior Receptionist' },
          { name: 'Nkechi Okoro', email: 'nkechi.okoro@cityden.com', phone: '08031234568', department: 'Front Office', position: 'Receptionist' },
          { name: 'Samuel Eze', email: 'samuel.eze@cityden.com', phone: '08031234569', department: 'Front Office', position: 'Receptionist' },
          { name: 'Mariam Bello', email: 'mariam.bello@cityden.com', phone: '08031234570', department: 'Housekeeping', position: 'Head Housekeeper' },
          { name: 'Grace John', email: 'grace.john@cityden.com', phone: '08031234571', department: 'Housekeeping', position: 'Housekeeper' },
          { name: 'Patience Ali', email: 'patience.ali@cityden.com', phone: '08031234572', department: 'Housekeeping', position: 'Housekeeper' },
          { name: 'Hauwa Yusuf', email: 'hauwa.yusuf@cityden.com', phone: '08031234573', department: 'Housekeeping', position: 'Housekeeper' },
          { name: 'Michael Okafor', email: 'michael.okafor@cityden.com', phone: '08031234574', department: 'Kitchen', position: 'Head Chef' },
          { name: 'Kelechi Nwosu', email: 'kelechi.nwosu@cityden.com', phone: '08031234575', department: 'Kitchen', position: 'Line Cook' },
          { name: 'Favour Sunday', email: 'favour.sunday@cityden.com', phone: '08031234576', department: 'Kitchen', position: 'Kitchen Assistant' },
          { name: 'Musa Ibrahim', email: 'musa.ibrahim@cityden.com', phone: '08031234577', department: 'Maintenance', position: 'Technician' },
          { name: 'Chinedu Obi', email: 'chinedu.obi@cityden.com', phone: '08031234578', department: 'Maintenance', position: 'Electrician' },
          { name: 'Ahmed Suleiman', email: 'ahmed.suleiman@cityden.com', phone: '08031234579', department: 'Store', position: 'Store Keeper' },
          { name: 'Ruth David', email: 'ruth.david@cityden.com', phone: '08031234580', department: 'Store', position: 'Store Assistant' },
          { name: 'Danjuma Garba', email: 'danjuma.garba@cityden.com', phone: '08031234581', department: 'Security', position: 'Security Officer' },
          { name: 'Bashir Umar', email: 'bashir.umar@cityden.com', phone: '08031234582', department: 'Security', position: 'Security Officer' },
        ],
      },
      {
        branchIdx: 1, // Kaduna
        staff: [
          { name: 'Zainab Abubakar', email: 'zainab.abubakar@cityden.com', phone: '08031234583', department: 'Front Office', position: 'Receptionist' },
          { name: 'Joseph Audu', email: 'joseph.audu@cityden.com', phone: '08031234584', department: 'Front Office', position: 'Receptionist' },
          { name: 'Lami Musa', email: 'lami.musa@cityden.com', phone: '08031234585', department: 'Housekeeping', position: 'Head Housekeeper' },
          { name: 'Rahila Yakubu', email: 'rahila.yakubu@cityden.com', phone: '08031234586', department: 'Housekeeping', position: 'Housekeeper' },
          { name: 'Emmanuel Silas', email: 'emmanuel.silas@cityden.com', phone: '08031234587', department: 'Kitchen', position: 'Chef' },
          { name: 'Paulina Ishaya', email: 'paulina.ishaya@cityden.com', phone: '08031234588', department: 'Kitchen', position: 'Kitchen Assistant' },
          { name: 'Sani Abdullahi', email: 'sani.abdullahi@cityden.com', phone: '08031234589', department: 'Maintenance', position: 'Handyman' },
          { name: 'Hassan Bello', email: 'hassan.bello@cityden.com', phone: '08031234590', department: 'Store', position: 'Store Keeper' },
          { name: 'Nuhu Mohammed', email: 'nuhu.mohammed@cityden.com', phone: '08031234591', department: 'Security', position: 'Security Officer' },
        ],
      },
      {
        branchIdx: 2, // Maiduguri
        staff: [
          { name: 'Amina Bukar', email: 'amina.bukar@cityden.com', phone: '08031234592', department: 'Front Office', position: 'Receptionist' },
          { name: 'Falmata Kyari', email: 'falmata.kyari@cityden.com', phone: '08031234593', department: 'Housekeeping', position: 'Head Housekeeper' },
          { name: 'Yagana Usman', email: 'yagana.usman@cityden.com', phone: '08031234594', department: 'Housekeeping', position: 'Housekeeper' },
          { name: 'Babagana Modu', email: 'babagana.modu@cityden.com', phone: '08031234595', department: 'Kitchen', position: 'Chef' },
          { name: 'Tijjani Goni', email: 'tijjani.goni@cityden.com', phone: '08031234596', department: 'Maintenance', position: 'Technician' },
          { name: 'Abba Mustapha', email: 'abba.mustapha@cityden.com', phone: '08031234597', department: 'Store', position: 'Store Keeper' },
          { name: 'Umar Kaka', email: 'umar.kaka@cityden.com', phone: '08031234598', department: 'Security', position: 'Security Officer' },
        ],
      },
    ];

    for (const { branchIdx, staff } of staffByBranch) {
      for (const s of staff) {
        employeeData.push({
          name: s.name,
          email: s.email,
          phone: s.phone,
          department: s.department,
          position: s.position,
          branchId: branches[branchIdx]._id,
          isActive: true,
        });
      }
    }

    await this.employeeModel.create(employeeData);
    this.logger.log(`Seed — employees created: ${employeeData.length} across ${branches.length} branches`);

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
      const discountPct = Math.random() > 0.7 ? randInt(5, 30) : 0;
      const discount = Math.round(pricePerNight * nights * discountPct / 100);
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
          comingFrom: pick(cities),
          stateOfOrigin: pick(states),
          occupation: pick(occupations),
          nextDestination: pick(cities),
          gender: pick(genders),
          ...(hasEmail ? { email: `${guestName.toLowerCase().replace(/\s/g, '.')}@email.com` } : {}),
        },
        numberOfGuests: randInt(1, room.maxGuests),
        checkInDate: ci,
        checkOutDate: co,
        actualPricePerNight: pricePerNight,
        discount: discount,
        discountPercentage: discountPct,
        totalAmountPaid: total,
        paymentMethod: pick(paymentMethods),
        paymentReference: Math.random() > 0.5 ? `TXN-${Date.now().toString(36)}-${i}` : undefined,
        bookingStatus: status,
        bookingSource: pick(bookingSources),
        bookedBy: admin._id,
        bookingReference: `CDA-${branch.code}-${String(i + 1).padStart(3, '0')}`,
      });

      // track room status — last booking per room wins
      if (status === 'checked_out') {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.DIRTY;
      } else if (status === 'checked_in' && roomsToUpdate[room._id.toString()] !== RoomStatusEnum.DIRTY) {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.OCCUPIED;
      } else if (status === 'reserved' && !roomsToUpdate[room._id.toString()]) {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.AVAILABLE;
      } else if (status === 'cancelled' && !roomsToUpdate[room._id.toString()]) {
        roomsToUpdate[room._id.toString()] = RoomStatusEnum.AVAILABLE;
      }
    }

    await this.bookingModel.create(bookingData);

    this.logger.log(`Seed — bookings created: ${bookingData.length}`);

    // Update room statuses
    for (const [roomId, status] of Object.entries(roomsToUpdate)) {
      await this.roomModel.findByIdAndUpdate(roomId, { status });
    }

    this.logger.log(`Seed completed — users: 14, employees: ${employeeData.length}, branches: ${branches.length}, roomTypes: ${abujaRT.length + kadunaRT.length + maiRT.length}, rooms: ${rooms.length}, bookings: ${bookingData.length}`);

    return {
      message: 'System seeded successfully',
      credentials: {
        admin: 'admin@cityden.com / admin123',
        reception: 'reception@cityden.com / admin123',
        kitchen: 'kitchen@cityden.com / admin123',
        housekeeper: 'housekeeper@cityden.com / admin123',
        'frontoffice': 'frontoffice@cityden.com / admin123',
        accountant: 'accountant@cityden.com / admin123',
        it: 'it@cityden.com / admin123',
        'groupgm': 'groupgm@cityden.com / admin123',
        'fm-abuja': 'fm-abuja@cityden.com / admin123',
        'fm-kaduna': 'fm-kaduna@cityden.com / admin123',
        'fm-maiduguri': 'fm-maiduguri@cityden.com / admin123',
        storekeeper: 'storekeeper@cityden.com / admin123',
        storemanager: 'storemanager@cityden.com / admin123',
      },
      stats: {
        users: 14,
        employees: employeeData.length,
        branches: 3,
        roomTypes: abujaRT.length + kadunaRT.length + maiRT.length,
        rooms: rooms.length,
        bookings: bookingData.length,
      },
    };
  }

  // async onModuleInit(){
  //   try {
  //     await this.seed()
  //     this.logger.log("seeding done ✅")
  //   } catch (error) {
  //     this.logger.error("error seeding")
  //   }
  // }
}
