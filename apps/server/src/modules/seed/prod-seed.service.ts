import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.schema';
import { Branch } from '../branches/branch.schema';
import { RoomType } from '../room-types/room-type.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { Employee } from '../employees/employee.schema';
import { Department } from '../departments/department.schema';

const BUCKET = 'https://bucket.citydenapartments.com';

const img = (slug: string, room: string, n: number, ext: string) =>
  `${BUCKET}/abj/room-types/${slug}/${room}%20(${n}).${ext}`;

const range = (room: string, slug: string, count: number, ext = 'JPG') =>
  Array.from({ length: count }, (_, i) => img(slug, room, i + 1, ext));

const abjRoomImages: Record<string, string[]> = {
  'A101': [img('business-suite', 'A101', 1, 'jpg'), ...range('A101', 'business-suite', 10, 'JPG')],
  'A105': range('A105', 'deluxe-suite', 18),
  'A204': range('A204', 'deluxe-suite', 6),
  'A001': range('A001', 'executive-suite', 5),
  'A002': range('A002', 'executive-suite', 5),
  'A003': range('A003', 'executive-suite', 5),
  'A102': range('A102', 'presidential-suite', 5),
  'A103': range('A103', 'presidential-suite', 5),
  'A104': range('A104', 'presidential-suite', 5),
};

const abjRTImages: Record<string, string[]> = {
  'Deluxe Suite':      [...abjRoomImages['A105'], ...abjRoomImages['A204']],
  'Executive Suite':   [...abjRoomImages['A001'], ...abjRoomImages['A002'], ...abjRoomImages['A003']],
  'Business Suite':    abjRoomImages['A101'],
  'Presidential Suite': [...abjRoomImages['A102'], ...abjRoomImages['A103'], ...abjRoomImages['A104']],
};

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
  ],
  'Super Luxury': [
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.21%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.27%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.27%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.28%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.28%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.28%20AM%20(2).jpeg`,
  ],
  'Executive Luxury': [
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.53%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.56%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.56%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.56%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.56%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-luxury/WhatsApp%20Image%202026-05-13%20at%2011.09.56%20AM%20(4).jpeg`,
  ],
  'Super Deluxe Suite': [
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(4).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(5).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(6).jpeg`,
    `${BUCKET}/kaduna/room-types/super-deluxe-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.05%20AM%20(7).jpeg`,
  ],
  'Executive Suite': [
    `${BUCKET}/kaduna/room-types/executive-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.14%20AM.jpeg`,
    `${BUCKET}/kaduna/room-types/executive-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.14%20AM%20(1).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.14%20AM%20(2).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.14%20AM%20(3).jpeg`,
    `${BUCKET}/kaduna/room-types/executive-suite/WhatsApp%20Image%202026-05-13%20at%2011.10.14%20AM%20(4).jpeg`,
  ],
};

const staffByBranch: Array<{ branchIdx: number; staff: Array<{ name: string; email: string; phone: string; position: string; deptName: string }> }> = [
  {
    branchIdx: 0,
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
    branchIdx: 1,
    staff: [],
  },
  {
    branchIdx: 2,
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

@Injectable()
export class ProdSeedService {
  private readonly logger = new Logger(ProdSeedService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  async seedProd() {
    this.logger.log('Prod seed started');

    const db = this.connection.db;
    if (!db) throw new Error('Database connection not available');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (!col.name.startsWith('system.')) await db.collection(col.name).drop();
    }
    this.logger.log('All collections dropped');

    const hashedPassword = await bcrypt.hash('admin123', 12);

    // branches─────────────────────────────────────────────────
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
        name: 'Maiduguri', code: 'MAI', address: 'No 3 Abu Zar Algiffari Road, Off Muhammed Goni Street (Agoja), Old GRA, Maiduguri', isActive: true,
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
          contactPhone: '0806 110 5548',
          contactEmail: 'maiduguri@citydenapartments.com',
          additionalNotes: 'Free WiFi is available throughout the property.',
        },
      },
    ]);
    this.logger.log(`Prod seed — branches created: ${branches.length}`);

    // admin────────────────────────────────────────────────────
    const admin = await this.userModel.create({
      email: 'admin@cityden.com', password: hashedPassword, name: 'Super Admin',
      role: 'SuperAdmin', allowedBranches: branches.map((b) => b._id),
      activeBranchId: null, isActive: true, passwordChangedAt: new Date(),
    });

    // room types───────────────────────────────────────────────
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
      { branchId: branches[2]._id, name: 'Executive Suite', description: 'Premium executive accommodation with king-size bed and luxury amenities.', basePrice: 80000, minPriceAllowed: 70000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'VIP Suite', description: 'Exclusive VIP accommodation with premium furnishings and personalized service.', basePrice: 150000, minPriceAllowed: 130000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar', 'Jacuzzi'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Luxury Double', description: 'Spacious double room with modern amenities for a comfortable stay.', basePrice: 60000, minPriceAllowed: 50000, amenities: ['Queen Bed', 'AC', 'WiFi', 'Smart TV'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Classic Suite', description: 'Classic suite with elegant furnishings and essential amenities.', basePrice: 70000, minPriceAllowed: 60000, amenities: ['Queen Bed', 'AC', 'WiFi'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Diplomatic Suite', description: 'Diplomatic-grade suite with premium amenities and spacious living area.', basePrice: 120000, minPriceAllowed: 100000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar', 'Sitting Area'], images: [], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Charlet Suite', description: 'Charming suite with unique character and cozy atmosphere.', basePrice: 100000, minPriceAllowed: 85000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar'], images: [], createdBy: admin._id, updatedBy: admin._id },
    ]);
    this.logger.log(`Prod seed — room types created: ${abujaRT.length} Abuja + ${kadunaRT.length} Kaduna + ${maiRT.length} Maiduguri`);

    // rooms────────────────────────────────────────────────────
    const roomDefs = [
      { branch: 0, rt: 0, num: 'B104', max: 2 }, { branch: 0, rt: 0, num: 'B203', max: 2 },
      { branch: 0, rt: 1, num: 'A105', max: 2 }, { branch: 0, rt: 1, num: 'A204', max: 2 },
      { branch: 0, rt: 1, num: 'B102', max: 2 }, { branch: 0, rt: 1, num: 'B103', max: 2 },
      { branch: 0, rt: 1, num: 'B201', max: 2 }, { branch: 0, rt: 1, num: 'B204', max: 2 },
      { branch: 0, rt: 2, num: 'A001', max: 2 }, { branch: 0, rt: 2, num: 'A002', max: 2 },
      { branch: 0, rt: 2, num: 'A003', max: 2 },
      { branch: 0, rt: 3, num: 'B202', max: 3 },
      { branch: 0, rt: 4, num: 'B101', max: 3 },
      { branch: 0, rt: 5, num: 'A101', max: 3 },
      { branch: 0, rt: 6, num: 'A102', max: 4 }, { branch: 0, rt: 6, num: 'A103', max: 4 },
      { branch: 0, rt: 6, num: 'A104', max: 4 },
      { branch: 1, rt: 0, num: 'B002', max: 2 }, { branch: 1, rt: 0, num: 'C002', max: 2 },
      { branch: 1, rt: 1, num: 'B001', max: 2 }, { branch: 1, rt: 1, num: 'B101', max: 2 },
      { branch: 1, rt: 1, num: 'B102', max: 2 }, { branch: 1, rt: 1, num: 'C001', max: 2 },
      { branch: 1, rt: 1, num: 'C101', max: 2 }, { branch: 1, rt: 1, num: 'C102', max: 2 },
      { branch: 1, rt: 2, num: 'A101', max: 2 }, { branch: 1, rt: 2, num: 'A102', max: 2 },
      { branch: 1, rt: 2, num: 'A103', max: 2 },
      { branch: 1, rt: 3, num: 'A1', max: 3 }, { branch: 1, rt: 3, num: 'B1', max: 3 },
      { branch: 1, rt: 3, num: 'C1', max: 3 },
      { branch: 1, rt: 4, num: 'B2', max: 3 }, { branch: 1, rt: 4, num: 'B3', max: 3 },
      { branch: 1, rt: 4, num: 'C2', max: 3 }, { branch: 1, rt: 4, num: 'C3', max: 3 },
      { branch: 2, rt: 0, num: 'Room 1', max: 2 }, { branch: 2, rt: 0, num: 'Room 2', max: 2 }, { branch: 2, rt: 0, num: 'Room 3', max: 2 },
      { branch: 2, rt: 1, num: 'Room 1', max: 2 },
      { branch: 2, rt: 2, num: 'Room 1', max: 2 }, { branch: 2, rt: 2, num: 'Room 2', max: 2 }, { branch: 2, rt: 2, num: 'Room 3', max: 2 }, { branch: 2, rt: 2, num: 'Room 4', max: 2 }, { branch: 2, rt: 2, num: 'Room 5', max: 2 },
      { branch: 2, rt: 3, num: 'Room 1', max: 2 }, { branch: 2, rt: 3, num: 'Room 2', max: 2 },
      { branch: 2, rt: 4, num: 'Room 1', max: 2 }, { branch: 2, rt: 4, num: 'Room 2', max: 2 }, { branch: 2, rt: 4, num: 'Room 3', max: 2 },
      { branch: 2, rt: 5, num: 'Room 1', max: 2 },
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
    this.logger.log(`Prod seed — rooms created: ${rooms.length}`);

    // departments───────────────────────────────────────────────
    const departments = await this.departmentModel.create(
      deptDefs.map((d) => ({
        name: d.name,
        description: d.description,
        branchId: branches[d.branchIdx]._id,
        createdBy: admin._id,
        updatedBy: admin._id,
      })),
    );
    this.logger.log(`Prod seed — departments created: ${departments.length}`);

    const deptsByBranch: Record<number, Record<string, string>> = {};
    for (const d of departments) {
      const branchIdx = branches.findIndex((b) => b._id.toString() === d.branchId.toString());
      if (!deptsByBranch[branchIdx]) deptsByBranch[branchIdx] = {};
      deptsByBranch[branchIdx][d.name] = d._id.toString();
    }

    // employees────────────────────────────────────────────────
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
    this.logger.log(`Prod seed — employees created: ${employeeData.length}`);

    // user accounts────────────────────────────────────────────
    const liveUsers: Array<Record<string, unknown>> = [];
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
      }
    }
    await this.userModel.create(liveUsers);
    this.logger.log(`Prod seed — user accounts created: ${liveUsers.length}`);

    this.logger.log('Prod seed completed');
    return {
      message: 'Production seed completed successfully',
      stats: {
        branches: branches.length,
        roomTypes: abujaRT.length + kadunaRT.length + maiRT.length,
        rooms: rooms.length,
        departments: departments.length,
        employees: employeeData.length,
        userAccounts: liveUsers.length,
      },
    };
  }
}