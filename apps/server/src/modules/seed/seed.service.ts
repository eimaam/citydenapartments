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
import { Department } from '../departments/department.schema';
import { Customer } from '../customers/customer.schema';

// random helpers────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randNaira = (min: number, max: number) => randInt(min / 1000, max / 1000) * 1000;

function daysAgo(n: number) { return subDays(new Date(), n); }
function daysFromNow(n: number) { return addDays(new Date(), n); }
function ref(prefix: string, n: number) { return `${prefix}-${String(n).padStart(3, '0')}`; }

// data pools─────────────────────────────────────────────────
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

// R2 bucket URLs for Abuja room images────────────────────────
const BUCKET = 'https://bucket.citydenapartments.com';

const img = (slug: string, room: string, n: number, ext: string) =>
  `${BUCKET}/abj/room-types/${slug}/${room}%20(${n}).${ext}`;

const range = (room: string, slug: string, count: number, ext = 'JPG') =>
  Array.from({ length: count }, (_, i) => img(slug, room, i + 1, ext));

// Room → image URLs (Abuja only)
const abjRoomImages: Record<string, string[]> = {
  // Business Suite (A101 — 11 images, first is .jpg rest .JPG)
  'A101': [
    img('business-suite', 'A101', 1, 'jpg'),
    ...range('A101', 'business-suite', 10, 'JPG'),
  ],
  // Deluxe Suite (A105 — 18 images, A204 — 6 images)
  'A105': range('A105', 'deluxe-suite', 18),
  'A204': range('A204', 'deluxe-suite', 6),
  // Executive Suite (A001, A002, A003)
  'A001': range('A001', 'executive-suite', 5),
  'A002': range('A002', 'executive-suite', 5),
  'A003': range('A003', 'executive-suite', 5),
  // Presidential Suite (A102, A103, A104)
  'A102': range('A102', 'presidential-suite', 5),
  'A103': range('A103', 'presidential-suite', 5),
  'A104': range('A104', 'presidential-suite', 5),
};

// Room type → all images for that type (aggregated across rooms)
const abjRTImages: Record<string, string[]> = {
  'Deluxe Suite':      [...abjRoomImages['A105'], ...abjRoomImages['A204']],
  'Executive Suite':   [...abjRoomImages['A001'], ...abjRoomImages['A002'], ...abjRoomImages['A003']],
  'Business Suite':    abjRoomImages['A101'],
  'Presidential Suite': [...abjRoomImages['A102'], ...abjRoomImages['A103'], ...abjRoomImages['A104']],
};

// ── Kaduna image URLs ────────────────────────────────────────────
const kadRTImages: Record<string, string[]> = {
  'Luxury Standard': [
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.41%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(4).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(5).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.09.43%20AM%20(6).jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.11.42%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/luxury-standard/WhatsApp%20Image%202026-05-13%20at%2011.11.43%20AM%20(1).jpeg`,
  ],
  'Super Luxury': [
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.10%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.10%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.10%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.10%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.11%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.11%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.11%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.16.11%20AM%20(3).jpeg`,
  ],
  'Executive Luxury': [
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.57%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.57%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.57%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.57%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.58%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.58%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.17.58%20AM%20(2).jpeg`,
  ],
  'Super Deluxe Suite': [
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.21.03%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.21.03%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.21.03%20AM%20-%20Copy.jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.21.03%20AM%20(1)%20-%20Copy.jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.21.04%20AM%20-%20Copy.jpeg`,
  ],
  'Executive Suite': [
    `${BUCKET}/kaduna/room-types/executive-suite/3f02b5dd-b297-40a6-8426-b6f0553c32de.JPG`,
    `${BUCKET}/kaduna/room-types/executive-suite/428e56f6-199f-48a0-87af-f03c89d67051.JPG`,
    `${BUCKET}/kaduna/room-types/executive-suite/600fffad-ac61-45dd-9435-cdf58acb9472.JPG`,
    `${BUCKET}/kaduna/room-types/executive-suite/6b26d6d1-e719-4dfc-8fa5-2e32b1a4b0e8.JPG`,
    `${BUCKET}/kaduna/room-types/executive-suite/73da6b6f-6619-4052-9384-2b32fb285eac.JPG`,
    `${BUCKET}/kaduna/room-types/executive-suite/88ec2349-4ae6-41cc-85bb-d6c46ae0e149.JPG`,
  ],
};

// scenario presets: [status, checkInOffset, checkOutOffset, nights] ─
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
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
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

    // branches
    const branches = await this.branchModel.create([
      {
        name: 'Abuja', code: 'ABJ', address: 'No 5 Audu Ogbe Street, Jabi Abuja.', isActive: true,
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
          contactPhone: '0810 704 3924',
          contactEmail: 'abuja@citydenapartments.com',
          additionalNotes: 'Free WiFi is available throughout the property.',
        },
      },
      {
        name: 'Kaduna', code: 'KAD', address: 'Plot 24, 26 & 28 Turunku Road, off Inuwa Wada Road, Ungwan Rimi, Kaduna', isActive: true,
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
          contactPhone: '0701 124 0957',
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

    // admin
    const admin = await this.userModel.create({
      email: 'admin@cityden.com', password: hashedPassword, name: 'Super Admin',
      role: 'SuperAdmin', allowedBranches: branches.map((b) => b._id),
      activeBranchId: null, isActive: true, passwordChangedAt: new Date(),
    });

    // room types
    const abujaRT = await this.roomTypeModel.create([
      { branchId: branches[0]._id, name: 'King Suite', description: 'An intimate layout with sculpted light, tactile finishes, and a calm palette for effortless daily rhythm.', basePrice: 60000, minPriceAllowed: 50000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Deluxe Suite', description: 'Enhanced comfort featuring premium materials and a spacious layout designed for extended relaxation.', basePrice: 70000, minPriceAllowed: 60000, amenities: ['Queen Bed', 'AC', 'WiFi'], images: abjRTImages['Deluxe Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Executive Suite', description: 'Sophisticated design meets functional luxury, perfect for the modern traveler seeking a refined work-life balance.', basePrice: 80000, minPriceAllowed: 70000, amenities: ['King Bed', 'AC', 'WiFi', 'Work Desk', 'TV'], images: abjRTImages['Executive Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Penthouse Suite', description: 'Unrivaled views and expansive living spaces defined by high ceilings and bespoke interior craftsmanship.', basePrice: 120000, minPriceAllowed: 100000, amenities: ['King Bed', 'Living Room', 'AC', 'WiFi', 'TV'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Royal Suite', description: 'Palatial living with grand architectural details and curated art pieces for a truly majestic experience.', basePrice: 150000, minPriceAllowed: 130000, amenities: ['King Bed', 'Living Room', 'Kitchenette', 'AC', 'WiFi', 'TV'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Business Suite', description: 'An efficient yet elegant environment equipped with cutting-edge technology and a streamlined aesthetic.', basePrice: 160000, minPriceAllowed: 140000, amenities: ['King Bed', 'Living Room', 'Work Desk', 'AC', 'WiFi', 'TV'], images: abjRTImages['Business Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Presidential Suite', description: 'The pinnacle of luxury, offering ultimate privacy, 360-degree views, and personalized world-class service.', basePrice: 400000, minPriceAllowed: 350000, amenities: ['King Bed', 'Living Room', 'Dining', 'Jacuzzi', 'AC', 'WiFi', 'TV'], images: abjRTImages['Presidential Suite'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const kadunaRT = await this.roomTypeModel.create([
      { branchId: branches[1]._id, name: 'Luxury Standard', description: 'Designed for travelers seeking a refined urban sanctuary with essential comforts.', basePrice: 53750, minPriceAllowed: 43000, amenities: ['Queen Bed', 'AC', 'WiFi', 'TV'], images: kadRTImages['Luxury Standard'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Super Luxury', description: 'Premium comfort with king-size amenities and superior finishes throughout.', basePrice: 75250, minPriceAllowed: 60000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], images: kadRTImages['Super Luxury'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Executive Luxury', description: 'Sophisticated design with dedicated workspace and premium comfort for the discerning traveler.', basePrice: 86000, minPriceAllowed: 68800, amenities: ['King Bed', 'AC', 'WiFi', 'Work Desk', 'TV'], images: kadRTImages['Executive Luxury'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Super Deluxe Suite', description: 'Expansive living spaces with separate lounge area and premium finishes.', basePrice: 161250, minPriceAllowed: 129000, amenities: ['King Bed', 'Living Room', 'AC', 'WiFi', 'TV'], images: kadRTImages['Super Deluxe Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[1]._id, name: 'Executive Suite', description: 'The pinnacle of Kaduna residence, offering unrivaled space and executive-level amenities.', basePrice: 193500, minPriceAllowed: 154800, amenities: ['King Bed', 'Living Room', 'Work Desk', 'AC', 'WiFi', 'TV'], images: kadRTImages['Executive Suite'], createdBy: admin._id, updatedBy: admin._id },
    ]);
    const maiRT = await this.roomTypeModel.create([
      { branchId: branches[2]._id, name: 'Deluxe Suite', description: 'Comfortable queen-size accommodation with modern amenities for a relaxing stay.', basePrice: 50000, minPriceAllowed: 40000, amenities: ['Queen Bed', 'AC', 'WiFi'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Standard Room', description: 'Clean, comfortable, and affordable accommodation with essential amenities.', basePrice: 30000, minPriceAllowed: 25000, amenities: ['Queen Bed', 'AC'], images: [], createdBy: admin._id, updatedBy: admin._id },
    ]);

    this.logger.log(`Seed — room types created: ${abujaRT.length} Abuja + ${kadunaRT.length} Kaduna + ${maiRT.length} Maiduguri`);

    // rooms (references for seeding bookings)
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
      // Kaduna — Luxury Standard (rt 0)
      { branch: 1, rt: 0, num: 'B002', max: 2 }, { branch: 1, rt: 0, num: 'C002', max: 2 },
      // Kaduna — Super Luxury (rt 1)
      { branch: 1, rt: 1, num: 'B001', max: 2 }, { branch: 1, rt: 1, num: 'B101', max: 2 },
      { branch: 1, rt: 1, num: 'B102', max: 2 }, { branch: 1, rt: 1, num: 'C001', max: 2 },
      { branch: 1, rt: 1, num: 'C101', max: 2 }, { branch: 1, rt: 1, num: 'C102', max: 2 },
      // Kaduna — Executive Luxury (rt 2)
      { branch: 1, rt: 2, num: 'A101', max: 2 }, { branch: 1, rt: 2, num: 'A102', max: 2 },
      { branch: 1, rt: 2, num: 'A103', max: 2 },
      // Kaduna — Super Deluxe Suite (rt 3)
      { branch: 1, rt: 3, num: 'A1', max: 3 }, { branch: 1, rt: 3, num: 'B1', max: 3 },
      { branch: 1, rt: 3, num: 'C1', max: 3 },
      // Kaduna — Executive Suite (rt 4)
      { branch: 1, rt: 4, num: 'B2', max: 3 }, { branch: 1, rt: 4, num: 'B3', max: 3 },
      { branch: 1, rt: 4, num: 'C2', max: 3 }, { branch: 1, rt: 4, num: 'C3', max: 3 },
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
        images: r.branch === 0 ? (abjRoomImages[r.num] || []) : [],
        createdBy: admin._id,
        updatedBy: admin._id,
      })),
    );

    this.logger.log(`Seed — rooms created: ${rooms.length}`);

    // staff
    const now = new Date();
    await this.userModel.create([
      { email: 'reception@cityden.com', password: hashedPassword, name: 'Amara Reception', role: 'Reception', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'kitchen@cityden.com', password: hashedPassword, name: 'Chef Ibrahim', role: 'KitchenStaff', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'housekeeper@cityden.com', password: hashedPassword, name: 'Mama Bisi', role: 'HouseKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'frontoffice@cityden.com', password: hashedPassword, name: 'Tunde FrontOffice', role: 'FrontOfficeManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'accountant@cityden.com', password: hashedPassword, name: 'Ngozi Accountant', role: 'Accountant', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'it@cityden.com', password: hashedPassword, name: 'Chidi IT', role: 'IT', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'fm-abuja@cityden.com', password: hashedPassword, name: 'Chidi Facility Manager', role: 'FacilityManager', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now },
      { email: 'fm-kaduna@cityden.com', password: hashedPassword, name: 'Fatima Facility Manager', role: 'FacilityManager', allowedBranches: [branches[1]._id], activeBranchId: branches[1]._id, isActive: true, passwordChangedAt: now },
      { email: 'fm-maiduguri@cityden.com', password: hashedPassword, name: 'Ibrahim Facility Manager', role: 'FacilityManager', allowedBranches: [branches[2]._id], activeBranchId: branches[2]._id, isActive: true, passwordChangedAt: now },
    ]);

    // Group GM
    await this.userModel.create({
      email: 'groupgm@cityden.com', password: hashedPassword, name: 'Dr. Okafor Group GM',
      role: 'GroupGM', allowedBranches: branches.map((b) => b._id), activeBranchId: null, isActive: true, passwordChangedAt: now,
    });

    // store staff
    const storeKeeper = await this.userModel.create({
      email: 'storekeeper@cityden.com', password: hashedPassword, name: 'Emeka Store',
      role: 'StoreKeeper', allowedBranches: [branches[0]._id], activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now,
    });
    await this.userModel.create({
      email: 'storemanager@cityden.com', password: hashedPassword, name: 'Ngozi Store',
      role: 'StoreManager', allowedBranches: branches.map((b) => b._id), activeBranchId: branches[0]._id, isActive: true, passwordChangedAt: now,
    });

    this.logger.log(`Seed — users created: 1 admin + 1 group gm + 3 facility managers + 1 front office + 1 accountant + 1 it + 2 store staff + kitchen + reception + housekeeper`);

    // inventory items───────────────────────────────────────
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

    // departments────────────────────────────────────────────────
    const deptDefs = [
      { branchIdx: 0, name: 'Management', description: 'Branch management and administration' },
      { branchIdx: 0, name: 'Front Desk', description: 'Reception and guest services' },
      { branchIdx: 0, name: 'Housekeeping', description: 'Room cleaning and maintenance' },
      { branchIdx: 0, name: 'Laundry', description: 'Laundry and linen services' },
      { branchIdx: 0, name: 'Kitchen', description: 'Food preparation and cooking' },
      { branchIdx: 0, name: 'F & B', description: 'Food and beverage service' },
      { branchIdx: 0, name: 'Store', description: 'Inventory and supplies management' },
      { branchIdx: 0, name: 'IT', description: 'Information technology support' },
      { branchIdx: 1, name: 'Management', description: 'Branch management and administration' },
      { branchIdx: 1, name: 'Front Desk', description: 'Reception and guest services' },
      { branchIdx: 1, name: 'Housekeeping', description: 'Room cleaning and maintenance' },
      { branchIdx: 1, name: 'Kitchen', description: 'Food preparation and cooking' },
      { branchIdx: 1, name: 'Store', description: 'Inventory and supplies management' },
      { branchIdx: 2, name: 'Management', description: 'Branch management and administration' },
      { branchIdx: 2, name: 'Front Desk', description: 'Reception and guest services' },
      { branchIdx: 2, name: 'Housekeeping', description: 'Room cleaning, gardening and maintenance' },
      { branchIdx: 2, name: 'Laundry', description: 'Laundry and linen services' },
      { branchIdx: 2, name: 'Kitchen', description: 'Food preparation, cooking and service' },
      { branchIdx: 2, name: 'Store', description: 'Inventory and supplies management' },
    ];

    const departments = await this.departmentModel.create(
      deptDefs.map((d) => ({
        name: d.name,
        description: d.description,
        branchId: branches[d.branchIdx]._id,
        createdBy: admin._id,
        updatedBy: admin._id,
      })),
    );
    this.logger.log(`Seed — departments created: ${departments.length} across ${branches.length} branches`);
    const deptsByBranch: Record<number, Record<string, string>> = {};
    for (const d of departments) {
      const branchIdx = branches.findIndex((b) => b._id.toString() === d.branchId.toString());
      if (!deptsByBranch[branchIdx]) deptsByBranch[branchIdx] = {};
      deptsByBranch[branchIdx][d.name] = d._id.toString();
    }

    // employees──────────────────────────────────────────────────
    const staffByBranch: Array<{ branchIdx: number; staff: Array<{ name: string; email: string; phone: string; position: string; deptName: string }> }> = [
      {
        branchIdx: 0, // Abuja
        staff: [
          { name: 'DR. SINI KWABE', email: 'sini.kwabe@citydenapartments.com', phone: '08039686719', position: 'Principal Consultant/Group GM', deptName: 'Management' },
          { name: 'IBU VINCENT ANTHONY', email: 'ibu.anthony@citydenapartments.com', phone: '08039686719', position: 'Facility Manager', deptName: 'Management' },
          { name: 'DIVINELOVE OLUCHI CHIKEZIE', email: 'divinelove.chikezie@citydenapartments.com', phone: '08039686719', position: 'Front Office Manager/HR', deptName: 'Management' },
          { name: 'KENNETH USHIE', email: 'kenneth.ushie@citydenapartments.com', phone: '08039686719', position: 'Accountant/Internal Auditor', deptName: 'Management' },
          { name: 'GABRIEL OMANG OGAR', email: 'gabriel.ogar@citydenapartments.com', phone: '08039686719', position: 'Executive Housekeeper', deptName: 'Management' },
          { name: 'OJIH ELIZABETH ADAH', email: 'ojih.adah@citydenapartments.com', phone: '08063269302', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'FATIMA ELIZABETH DAVID', email: 'fatima.david@citydenapartments.com', phone: '09166818195', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'JOEL AJINU', email: 'joel.ajinu@citydenapartments.com', phone: '07063542501', position: 'Porter', deptName: 'Front Desk' },
          { name: 'ABUBAKAR MUSA GBEDAKO', email: 'abubakar.gbedako@citydenapartments.com', phone: '07073767344', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'ABDALLAH SAEED ADAM', email: 'abdallah.adam@citydenapartments.com', phone: '09131571180', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'SAMSON INALEGWU GABRIEL', email: 'samson.gabriel@citydenapartments.com', phone: '07034165082', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'HASSAN SEDIK', email: 'hassan.sedik@citydenapartments.com', phone: '08100662213', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'JEREMIAH HOPE', email: 'jeremiah.hope@citydenapartments.com', phone: '08036740067', position: 'Laundry Operative', deptName: 'Laundry' },
          { name: 'TAWO LEONARD', email: 'tawo.leonard@citydenapartments.com', phone: '07067171793', position: 'Chef', deptName: 'Kitchen' },
          { name: 'MARYAM GANIU', email: 'maryam.ganiu@citydenapartments.com', phone: '07064909810', position: 'Cook', deptName: 'Kitchen' },
          { name: 'VERONICA UBAH', email: 'veronica.ubah@citydenapartments.com', phone: '09021625954', position: 'Steward', deptName: 'Kitchen' },
          { name: 'EMMANUEL YOMLA', email: 'emmanuel.yomla@citydenapartments.com', phone: '08034760483', position: 'Head Waiter', deptName: 'F & B' },
          { name: 'SOLOMON ZACHARIAH', email: 'solomon.zachariah@citydenapartments.com', phone: '09064888529', position: 'Store Keeper', deptName: 'Store' },
          { name: 'JONAH WANNAH KOLOMI', email: 'jonah.kolomi@citydenapartments.com', phone: '08133089344', position: 'IT', deptName: 'IT' },
          { name: 'ZURUQ MOHAMMED', email: 'zuruq.mohammed@citydenapartments.com', phone: '07025275360', position: 'IT', deptName: 'IT' },
        ],
      },
      {
        branchIdx: 1, // Kaduna
        staff: [],
      },
      {
        branchIdx: 2, // Maiduguri
        staff: [
          { name: 'Mohammed Tahiru', email: 'mtjibirn44@gmail.com', phone: '08039686749', position: 'General Manager', deptName: 'Management' },
          { name: 'Markus John', email: 'markusjoh691@gmail.com', phone: '07068257253', position: 'Front Office Supervisor', deptName: 'Front Desk' },
          { name: 'Hauwaa Ratgak', email: 'harunarotgak825@gmail.com', phone: '08039780483', position: 'Chef', deptName: 'Kitchen' },
          { name: 'Makoi Cynthia', email: 'mikecynthia272@gmail.com', phone: '09166818195', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'Aziz Hayatu Dzarma', email: 'azizhayatu7@gmail.com', phone: '09131270580', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'Emmanuel Friday', email: 'emmanuelfridaylove@gmail.com', phone: '08139626388', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'Dorcas Musa Wala', email: 'musawabadorcas@gmail.com', phone: '08063269302', position: 'Receptionist', deptName: 'Front Desk' },
          { name: 'Usman Adamu', email: 'usmanadamu24@gmail.com', phone: '08100662213', position: 'H/k Supervisor', deptName: 'Housekeeping' },
          { name: 'David Monday', email: 'davidmonday2022@gmail.com', phone: '07034165082', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'Ames Charles', email: 'amoscharls21@gmail.com', phone: '07131571180', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'Ibrahim Dauda', email: 'ibrahimdauda4322@gmail.com', phone: '07073767344', position: 'Housekeeper', deptName: 'Housekeeping' },
          { name: 'Halima Saleh', email: 'halimasaleh641@gmail.com', phone: '08133089344', position: 'Kitchen Asst.', deptName: 'Kitchen' },
          { name: 'Bilah Musa', email: 'bilamusa6@gmail.com', phone: '09068911160', position: 'Kitchen Asst.', deptName: 'Kitchen' },
          { name: 'James Asura', email: 'kassidee55@gmail.com', phone: '07064909810', position: 'Laundry', deptName: 'Laundry' },
          { name: 'Ladi Baita', email: 'ladibata033@gmail.com', phone: '07019885313', position: 'Waitress / Porter', deptName: 'Kitchen' },
          { name: 'Flora Musa Wala', email: 'musaflora6@gmail.com', phone: '09068911160', position: 'Waitress / Porter', deptName: 'Kitchen' },
          { name: 'Barka Boniface', email: 'bonifaeebarka55555@gmail.com', phone: '09021625954', position: 'Waiter / Porter', deptName: 'Kitchen' },
          { name: 'Nala Musa Dzakwo', email: 'malamusadzakwa@gmail.com', phone: '09016267092', position: 'Laundry', deptName: 'Laundry' },
          { name: 'Alhaji Modu Goni', email: 'alhajimodu265@gmail.com', phone: '08036740067', position: 'Environmental Gardener', deptName: 'Housekeeping' },
          { name: 'Kolomi Alhaji Fam', email: 'alhajikolomitar@gmail.com', phone: '08127703424', position: 'Environmental Gardener', deptName: 'Housekeeping' },
        ],
      },
    ];

    const employeeData: Array<Record<string, unknown>> = [];
    for (const { branchIdx, staff } of staffByBranch) {
      for (const s of staff) {
        employeeData.push({
          name: s.name,
          email: s.email,
          phone: s.phone,
          position: s.position,
          departmentId: deptsByBranch[branchIdx]?.[s.deptName] || undefined,
          department: s.deptName,
          branchId: branches[branchIdx]._id,
          isActive: true,
        });
      }
    }

    await this.employeeModel.create(employeeData);
    this.logger.log(`Seed — employees created: ${employeeData.length} across ${branches.length} branches`);

    // live user accounts for real staff──────────────────────────
    const positionRoleMap: Record<string, string> = {
      'Principal Consultant/Group GM': 'GroupGM',
      'General Manager': 'GroupGM',
      'Facility Manager': 'FacilityManager',
      'Front Office Manager/HR': 'FrontOfficeManager',
      'Front Office Supervisor': 'Reception',
      'Accountant/Internal Auditor': 'Accountant',
      'Executive Housekeeper': 'HouseKeeper',
      'H/k Supervisor': 'HouseKeeper',
      'Receptionist': 'Reception',
      'Housekeeper': 'HouseKeeper',
      'Chef': 'KitchenStaff',
      'Cook': 'KitchenStaff',
      'Steward': 'KitchenStaff',
      'Senior Chef': 'KitchenStaff',
      'Kitchen Asst.': 'KitchenStaff',
      'Potter': 'KitchenStaff',
      'Waiter': 'KitchenStaff',
      'Waitress / Porter': 'KitchenStaff',
      'Waiter / Porter': 'KitchenStaff',
      'Porter': 'HouseKeeper',
      'Head Waiter': 'KitchenStaff',
      'Store Keeper': 'StoreKeeper',
      'IT': 'IT',
      'Laundry': 'HouseKeeper',
      'Laundry Operative': 'HouseKeeper',
      'Environmental Gardener': 'HouseKeeper',
      'Gardener': 'HouseKeeper',
    };

    const liveUsers: Array<Record<string, unknown>> = [];
    const liveCredentials: Array<{ label: string; email: string; password: string; role: string }> = [];
    for (const { branchIdx, staff } of staffByBranch) {
      for (const s of staff) {
        const role = positionRoleMap[s.position];
        if (!role) continue;
        liveUsers.push({
          email: s.email,
          password: await bcrypt.hash(s.phone, 12),
          name: s.name,
          role,
          allowedBranches: [branches[branchIdx]._id],
          activeBranchId: branches[branchIdx]._id,
          isActive: true,
          passwordChangedAt: null,
        });
        liveCredentials.push({ label: `${role} (${branches[branchIdx].name}) — ${s.name}`, email: s.email, password: s.phone, role });
      }
    }
    await this.userModel.create(liveUsers);
    this.logger.log(`Seed — live user accounts created: ${liveUsers.length}`);

    // customers──────────────────────────────────────────────────
    const customerData: Array<Record<string, unknown>> = [];
    const customerPhones: string[] = [];
    for (let i = 0; i < 20; i++) {
      const phone = `0803${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
      customerPhones.push(phone);
      const gender = pick(genders);
      customerData.push({
        name: `${pick(firstNames)} ${pick(lastNames)}`,
        phone,
        email: Math.random() > 0.3 ? `guest${i}@email.com` : undefined,
        address: pick(['12 Ahmadu Bello Way', 'Plot 5 Lugard Avenue', '23 Tafawa Balewa Road', '8 Yakubu Gowon Crescent', '45 Obafemi Awolowo Street']),
        nationality: 'Nigeria',
        comingFrom: pick(cities),
        stateOfOrigin: pick(states),
        occupation: pick(occupations),
        nextDestination: pick(cities),
        gender,
        totalVisits: randInt(0, 5),
        totalSpent: randNaira(0, 500000),
        lastVisitDate: Math.random() > 0.3 ? daysAgo(randInt(1, 60)) : undefined,
        firstBranchId: pick(branches)._id,
      });
    }
    await this.customerModel.create(customerData);
    this.logger.log(`Seed — customers created: ${customerData.length}`);

    // 30 bookings───────────────────────────────────────────────
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
      const guestPhone = Math.random() > 0.6 ? pick(customerPhones) : `0803${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
      const hasEmail = Math.random() > 0.5;

      const totalForRoom = Math.max(0, pricePerNight * nights);

      bookingData.push({
        branchId: room.branchId,
        rooms: [{
          roomId: room._id,
          roomTypeId: room.roomTypeId,
          actualPricePerNight: pricePerNight,
          totalForRoom,
          maxGuests: room.maxGuests,
        }],
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

    const totalUsers = 14 + liveUsers.length; // 14 dummy accounts + live accounts

    this.logger.log(`Seed completed — users: ${totalUsers}, customers: ${customerData.length}, employees: ${employeeData.length}, branches: ${branches.length}, roomTypes: ${abujaRT.length + kadunaRT.length + maiRT.length}, rooms: ${rooms.length}, bookings: ${bookingData.length}`);

    const creds: Record<string, string> = {
      admin: 'admin@cityden.com / admin123',
      reception: 'reception@cityden.com / admin123',
      kitchen: 'kitchen@cityden.com / admin123',
      housekeeper: 'housekeeper@cityden.com / admin123',
      frontoffice: 'frontoffice@cityden.com / admin123',
      accountant: 'accountant@cityden.com / admin123',
      it: 'it@cityden.com / admin123',
      groupgm: 'groupgm@cityden.com / admin123',
      'fm-abuja': 'fm-abuja@cityden.com / admin123',
      'fm-kaduna': 'fm-kaduna@cityden.com / admin123',
      'fm-maiduguri': 'fm-maiduguri@cityden.com / admin123',
      storekeeper: 'storekeeper@cityden.com / admin123',
      storemanager: 'storemanager@cityden.com / admin123',
    };
    for (const c of liveCredentials) {
      creds[c.label] = `${c.email} / ${c.password}`;
    }

    return {
      message: 'System seeded successfully',
      credentials: creds,
      stats: {
        users: totalUsers,
        customers: customerData.length,
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
