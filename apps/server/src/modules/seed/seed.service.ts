import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
import { MenuCategory } from '../restaurant-menu/schemas/menu-category.schema';
import { MenuItem } from '../restaurant-menu/schemas/menu-item.schema';
import { RestaurantBanner } from '../restaurant-menu/schemas/restaurant-banner.schema';
import { DeliveryLocation } from '../restaurant-delivery/schemas/delivery-location.schema';
import { OptionSelectionType, BannerType } from '@citydenapartments/shared';
import { AppConfig } from '../../config/app.config';

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

// R2 bucket URLs for room images────────────────────────
const BUCKET = 'https://bucket.citydenapartments.com';

const enc = (path: string) => path.split('/').map(encodeURIComponent).join('/');
const r2Url = (key: string) => `${BUCKET}/${enc(key)}`;

// Room → image URLs (Abuja)
const abjRoomImages: Record<string, string[]> = {
  // Business Suite (A101 — 11 images: 1 is .jpg, 2-11 are .JPG)
  'A101': [
    r2Url('abj/room-types/business-suite/A101 (1).jpg'),
    ...Array.from({ length: 10 }, (_, i) => r2Url(`abj/room-types/business-suite/A101 (${i + 2}).JPG`)),
  ],
  // Deluxe Suite (A105 — 18 images, A204 — 6 images)
  'A105': Array.from({ length: 18 }, (_, i) => r2Url(`abj/room-types/deluxe-suite/A105 (${i + 1}).JPG`)),
  'A204': Array.from({ length: 6 }, (_, i) => r2Url(`abj/room-types/deluxe-suite/A204 (${i + 1}).JPG`)),
  // Executive Suite (A001, A002, A003)
  'A001': Array.from({ length: 15 }, (_, i) => r2Url(`abj/room-types/executive-suite/A001&A002 (${i + 1}).JPG`)),
  'A002': Array.from({ length: 16 }, (_, i) => r2Url(`abj/room-types/executive-suite/A001&A002 (${i + 16}).JPG`)),
  'A003': Array.from({ length: 8 }, (_, i) => r2Url(`abj/room-types/executive-suite/A003 (${i + 1}).JPG`)),
  // Presidential Suite (A102, A103, A104)
  'A102': [
    ...Array.from({ length: 4 }, (_, i) => r2Url(`abj/room-types/presidential-suite/A102 (${i + 1}).jpg`)),
    ...Array.from({ length: 14 }, (_, i) => r2Url(`abj/room-types/presidential-suite/A102 (${i + 5}).JPG`)),
  ],
  'A103': Array.from({ length: 13 }, (_, i) => r2Url(`abj/room-types/presidential-suite/A103 (${i + 1}).JPG`)),
  'A104': [
    r2Url('abj/room-types/presidential-suite/A104 (1).jpg'),
    ...Array.from({ length: 12 }, (_, i) => r2Url(`abj/room-types/presidential-suite/A104 (${i + 2}).JPG`)),
  ],
  // Penthouse Suite
  'B202': [
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.19 PM (1).jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.19 PM.jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.20 PM (1).jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.20 PM (2).jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.20 PM (3).jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.20 PM.jpeg'),
    r2Url('abj/room-types/penthouse-suite/WhatsApp Image 2026-07-21 at 1.38.21 PM.jpeg'),
  ],
  // Royal Suite
  'B101': [
    r2Url('abj/room-types/royal-suite/Business_A101 (1).jpg'),
    r2Url('abj/room-types/royal-suite/Business_A101 (5).JPG'),
    r2Url('abj/room-types/royal-suite/Business_A101 (7).JPG'),
    r2Url('abj/room-types/royal-suite/Business_A101 (8).JPG'),
    r2Url('abj/room-types/royal-suite/Business_A101 (9).JPG'),
  ],
  // King Suite
  'B104': [
    r2Url('abj/room-types/king-suite/A202 (32King.JPG'),
    r2Url('abj/room-types/king-suite/A203 King.JPG'),
  ],
  'B203': [
    r2Url('abj/room-types/king-suite/A202 (32King.JPG'),
    r2Url('abj/room-types/king-suite/A203 King.JPG'),
  ],
};

// Room type → all images for that type (Abuja)
const abjRTImages: Record<string, string[]> = {
  'King Suite': [
    r2Url('abj/room-types/king-suite/A202 (32King.JPG'),
    r2Url('abj/room-types/king-suite/A203 King.JPG'),
  ],
  'Deluxe Suite':      [...abjRoomImages['A105'], ...abjRoomImages['A204']],
  'Executive Suite':   [...abjRoomImages['A001'], ...abjRoomImages['A002'], ...abjRoomImages['A003']],
  'Penthouse Suite':   abjRoomImages['B202'],
  'Royal Suite':       abjRoomImages['B101'],
  'Business Suite':    abjRoomImages['A101'],
  'Presidential Suite': [...abjRoomImages['A102'], ...abjRoomImages['A103'], ...abjRoomImages['A104']],
};

// ── Kaduna image URLs ────────────────────────────────────────────
const kadRTImages: Record<string, string[]> = {
  'Luxury Standard': [
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.41 AM.jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM.jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (1).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (2).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (3).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (4).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (5).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.09.43 AM (6).jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.11.42 AM.jpeg'),
    r2Url('kaduna/room-types/luxury-standard/WhatsApp Image 2026-05-13 at 11.11.43 AM (1).jpeg'),
  ],
  'Super Luxury': [
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.10 AM.jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.10 AM (1).jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.10 AM (2).jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.10 AM (3).jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.11 AM.jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.11 AM (1).jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.11 AM (2).jpeg'),
    r2Url('kaduna/room-types/super-luxury/WhatsApp Image 2026-05-13 at 11.16.11 AM (3).jpeg'),
  ],
  'Executive Luxury': [
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.57 AM.jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.57 AM (1).jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.57 AM (2).jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.57 AM (3).jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.58 AM.jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.58 AM (1).jpeg'),
    r2Url('kaduna/room-types/executive-luxury/WhatsApp Image 2026-05-13 at 11.17.58 AM (2).jpeg'),
  ],
  'Super Deluxe Suite': [
    r2Url('kaduna/room-types/super-deluxe-suite/WhatsApp Image 2026-05-13 at 11.21.03 AM.jpeg'),
    r2Url('kaduna/room-types/super-deluxe-suite/WhatsApp Image 2026-05-13 at 11.21.03 AM (1).jpeg'),
    r2Url('kaduna/room-types/super-deluxe-suite/WhatsApp Image 2026-05-13 at 11.21.03 AM - Copy.jpeg'),
    r2Url('kaduna/room-types/super-deluxe-suite/WhatsApp Image 2026-05-13 at 11.21.03 AM (1) - Copy.jpeg'),
    r2Url('kaduna/room-types/super-deluxe-suite/WhatsApp Image 2026-05-13 at 11.21.04 AM - Copy.jpeg'),
  ],
  'Executive Suite': [
    r2Url('kaduna/room-types/executive-suite/3f02b5dd-b297-40a6-8426-b6f0553c32de.JPG'),
    r2Url('kaduna/room-types/executive-suite/428e56f6-199f-48a0-87af-f03c89d67051.JPG'),
    r2Url('kaduna/room-types/executive-suite/600fffad-ac61-45dd-9435-cdf58acb9472.JPG'),
    r2Url('kaduna/room-types/executive-suite/6b26d6d1-e719-4dfc-8fa5-2e32b1a4b0e8.JPG'),
    r2Url('kaduna/room-types/executive-suite/73da6b6f-6619-4052-9384-2b32fb285eac.JPG'),
    r2Url('kaduna/room-types/executive-suite/88ec2349-4ae6-41cc-85bb-d6c46ae0e149.JPG'),
  ],
};

// ── Maiduguri image URLs (from R2 bucket) ─────────────────────────
const maiRTImages: Record<string, string[]> = {
  'Executive Suite': [
    r2Url('maiduguri/room-types/executive-suite/IMG_2368 - Copy.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2369 - Copy.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2370 - Copy.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2371 - Copy.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2373.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2374.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2375.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2376.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2377.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2378.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2379.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2380.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2381.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2382.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2383(1).png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2383.png'),
    r2Url('maiduguri/room-types/executive-suite/IMG_2384.png'),
  ],
  'VIP Suite': [
    r2Url('maiduguri/room-types/vip-suites/IMG_2383.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2384.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2387.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2388.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2389.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2392.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2393.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2394.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2397.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2398.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2401.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2402.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2403.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2404.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2405.png'),
    r2Url('maiduguri/room-types/vip-suites/IMG_2407.png'),
  ],
  'Luxury Double': [
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2379.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2380.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2389.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2392.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2393.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2394.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2403.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2404.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2405.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2407.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2408.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2409.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2483(1).png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2483.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2488(1).png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2488.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2489.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2490.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2491.png'),
    r2Url('maiduguri/room-types/luxury-doubles/IMG_2492.png'),
  ],
  'Classic Suite': [
    r2Url('maiduguri/room-types/classic-suite/IMG_2479(1).png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2479.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2480(1).png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2480.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2481.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2482.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2483(1).png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2483.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2488(1).png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2488.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2489.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2490.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2491.png'),
    r2Url('maiduguri/room-types/classic-suite/IMG_2492.png'),
  ],
  'Diplomatic Suite': [
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2373.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2374.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2379.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2458.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2460.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2461.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2474.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2475.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2478.png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2479(1).png'),
    r2Url('maiduguri/room-types/diplomatic-suite/IMG_2479.png'),
  ],
  'Charlet Suite': [
    r2Url('maiduguri/room-types/charlet-suite/IMG_2368.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2369.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2370.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2371.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2372.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2379.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2380.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2389.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2392.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2393.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2411.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2412.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2439(1).png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2439.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2442(1).png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2442.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2443(1).png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2443.png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2444(1).png'),
    r2Url('maiduguri/room-types/charlet-suite/IMG_2444.png'),
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
    @InjectModel(MenuCategory.name) private menuCategoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(RestaurantBanner.name) private bannerModel: Model<RestaurantBanner>,
    @InjectModel(DeliveryLocation.name) private deliveryLocationModel: Model<DeliveryLocation>,
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

    this.logger.log(`Seed — branches created: ${branches.length}`);

    // admin
    const admin = await this.userModel.create({
      email: 'admin@cityden.com', password: hashedPassword, name: 'Super Admin',
      role: 'SuperAdmin', allowedBranches: branches.map((b) => b._id),
      activeBranchId: null, isActive: true, passwordChangedAt: new Date(),
    });

    // room types
    const abujaRT = await this.roomTypeModel.create([
      { branchId: branches[0]._id, name: 'King Suite', description: 'An intimate layout with sculpted light, tactile finishes, and a calm palette for effortless daily rhythm.', basePrice: 60000, minPriceAllowed: 50000, amenities: ['King Bed', 'AC', 'WiFi', 'TV'], images: abjRTImages['King Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Deluxe Suite', description: 'Enhanced comfort featuring premium materials and a spacious layout designed for extended relaxation.', basePrice: 70000, minPriceAllowed: 60000, amenities: ['Queen Bed', 'AC', 'WiFi'], images: abjRTImages['Deluxe Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Executive Suite', description: 'Sophisticated design meets functional luxury, perfect for the modern traveler seeking a refined work-life balance.', basePrice: 80000, minPriceAllowed: 70000, amenities: ['King Bed', 'AC', 'WiFi', 'Work Desk', 'TV'], images: abjRTImages['Executive Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Penthouse Suite', description: 'Unrivaled views and expansive living spaces defined by high ceilings and bespoke interior craftsmanship.', basePrice: 120000, minPriceAllowed: 100000, amenities: ['King Bed', 'Living Room', 'AC', 'WiFi', 'TV'], images: abjRTImages['Penthouse Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[0]._id, name: 'Royal Suite', description: 'Palatial living with grand architectural details and curated art pieces for a truly majestic experience.', basePrice: 150000, minPriceAllowed: 130000, amenities: ['King Bed', 'Living Room', 'Kitchenette', 'AC', 'WiFi', 'TV'], images: abjRTImages['Royal Suite'], createdBy: admin._id, updatedBy: admin._id },
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
      { branchId: branches[2]._id, name: 'Executive Suite', description: 'Premium executive accommodation with king-size bed and luxury amenities.', basePrice: 80000, minPriceAllowed: 70000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar'], images: maiRTImages['Executive Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'VIP Suite', description: 'Exclusive VIP accommodation with premium furnishings and personalized service.', basePrice: 150000, minPriceAllowed: 130000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar', 'Jacuzzi'], images: maiRTImages['VIP Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Luxury Double', description: 'Spacious double room with modern amenities for a comfortable stay.', basePrice: 60000, minPriceAllowed: 50000, amenities: ['Queen Bed', 'AC', 'WiFi', 'Smart TV'], images: maiRTImages['Luxury Double'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Classic Suite', description: 'Classic suite with elegant furnishings and essential amenities.', basePrice: 70000, minPriceAllowed: 60000, amenities: ['Queen Bed', 'AC', 'WiFi'], images: maiRTImages['Classic Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Diplomatic Suite', description: 'Diplomatic-grade suite with premium amenities and spacious living area.', basePrice: 120000, minPriceAllowed: 100000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar', 'Sitting Area'], images: maiRTImages['Diplomatic Suite'], createdBy: admin._id, updatedBy: admin._id },
      { branchId: branches[2]._id, name: 'Charlet Suite', description: 'Charming suite with unique character and cozy atmosphere.', basePrice: 100000, minPriceAllowed: 85000, amenities: ['King Bed', 'AC', 'WiFi', 'Smart TV', 'Mini Bar'], images: maiRTImages['Charlet Suite'], createdBy: admin._id, updatedBy: admin._id },
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
      // Maiduguri — Executive Suite (rt 0)
      { branch: 2, rt: 0, num: 'Room 1', max: 2 }, { branch: 2, rt: 0, num: 'Room 2', max: 2 }, { branch: 2, rt: 0, num: 'Room 3', max: 2 },
      // Maiduguri — VIP Suite (rt 1)
      { branch: 2, rt: 1, num: 'Room 1', max: 2 },
      // Maiduguri — Luxury Double (rt 2)
      { branch: 2, rt: 2, num: 'Room 1', max: 2 }, { branch: 2, rt: 2, num: 'Room 2', max: 2 }, { branch: 2, rt: 2, num: 'Room 3', max: 2 }, { branch: 2, rt: 2, num: 'Room 4', max: 2 }, { branch: 2, rt: 2, num: 'Room 5', max: 2 },
      // Maiduguri — Classic Suite (rt 3)
      { branch: 2, rt: 3, num: 'Room 1', max: 2 }, { branch: 2, rt: 3, num: 'Room 2', max: 2 },
      // Maiduguri — Diplomatic Suite (rt 4)
      { branch: 2, rt: 4, num: 'Room 1', max: 2 }, { branch: 2, rt: 4, num: 'Room 2', max: 2 }, { branch: 2, rt: 4, num: 'Room 3', max: 2 },
      // Maiduguri — Charlet Suite (rt 5)
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

    this.logger.log(`Seed — rooms created: ${rooms.length}`);
    this.logger.log(`Seed completed — branches: ${branches.length}, roomTypes: ${abujaRT.length + kadunaRT.length + maiRT.length}, rooms: ${rooms.length}`);

    // // inventory items───────────────────────────────────────
    // const itemDefs = [
    //   { name: 'Bar Soap', category: 'Toiletries', unit: 'pcs' },
    //   { name: 'Shampoo', category: 'Toiletries', unit: 'bottles' },
    //   { name: 'Toilet Paper', category: 'Cleaning', unit: 'rolls' },
    //   { name: 'Hand Towels', category: 'Linen', unit: 'pcs' },
    //   { name: 'Bleach', category: 'Cleaning', unit: 'litres' },
    //   { name: 'Floor Detergent', category: 'Cleaning', unit: 'litres' },
    //   { name: 'Light Bulbs', category: 'Maintenance', unit: 'pcs' },
    //   { name: 'Trash Bags', category: 'Cleaning', unit: 'packs' },
    //   { name: 'Dishwashing Liquid', category: 'Kitchen', unit: 'bottles' },
    //   { name: 'Bottled Water', category: 'Kitchen', unit: 'cartons' },
    // ];

    // const costPrices: Record<string, number> = {
    //   'Bar Soap': 350, 'Shampoo': 1200, 'Toilet Paper': 2500, 'Hand Towels': 1800,
    //   'Bleach': 900, 'Floor Detergent': 1500, 'Light Bulbs': 800, 'Trash Bags': 600,
    //   'Dishwashing Liquid': 1100, 'Bottled Water': 2400,
    // };

    // const inventoryItems: Array<Record<string, unknown>> = [];
    // for (const branch of branches) {
    //   for (const def of itemDefs) {
    //     const stock = 20 + Math.floor(Math.random() * 80);
    //     const reorder = 5 + Math.floor(Math.random() * 15);
    //     const hasExpiry = Math.random() > 0.4;
    //     const expDays = hasExpiry ? Math.random() > 0.2 ? randInt(30, 365) : randInt(-30, 29) : undefined;
    //     inventoryItems.push({
    //       name: def.name,
    //       category: def.category,
    //       unit: def.unit,
    //       currentStock: stock,
    //       reorderLevel: reorder,
    //       costPrice: costPrices[def.name] || 500,
    //       expiryDate: expDays != null ? daysFromNow(expDays) : undefined,
    //       branchId: branch._id,
    //       isActive: true,
    //       createdBy: storeKeeper._id,
    //       updatedBy: storeKeeper._id,
    //     });
    //   }
    // }
    // const createdItems = await this.inventoryItemModel.create(inventoryItems);

    // initial stock transactions
    // const txns = createdItems.map((item) => ({
    //   itemId: item._id,
    //   type: 'restock',
    //   quantity: item.currentStock,
    //   previousStock: 0,
    //   newStock: item.currentStock,
    //   notes: 'Initial stock on setup',
    //   performedBy: storeKeeper._id,
    //   branchId: item.branchId,
    // }));
    // await this.inventoryTxModel.create(txns);

    // this.logger.log(`Seed — inventory items created: ${createdItems.length} across ${branches.length} branches`);

    // departments────────────────────────────────────────────────
    // const deptDefs = [
    //   { branchIdx: 0, name: 'Management', description: 'Branch management and administration' },
    //   { branchIdx: 0, name: 'Front Desk', description: 'Reception and guest services' },
    //   { branchIdx: 0, name: 'Housekeeping', description: 'Room cleaning and maintenance' },
    //   { branchIdx: 0, name: 'Laundry', description: 'Laundry and linen services' },
    //   { branchIdx: 0, name: 'Kitchen', description: 'Food preparation and cooking' },
    //   { branchIdx: 0, name: 'F & B', description: 'Food and beverage service' },
    //   { branchIdx: 0, name: 'Store', description: 'Inventory and supplies management' },
    //   { branchIdx: 0, name: 'IT', description: 'Information technology support' },
    //   { branchIdx: 1, name: 'Management', description: 'Branch management and administration' },
    //   { branchIdx: 1, name: 'Front Desk', description: 'Reception and guest services' },
    //   { branchIdx: 1, name: 'Housekeeping', description: 'Room cleaning and maintenance' },
    //   { branchIdx: 1, name: 'Kitchen', description: 'Food preparation and cooking' },
    //   { branchIdx: 1, name: 'Store', description: 'Inventory and supplies management' },
    //   { branchIdx: 2, name: 'Management', description: 'Branch management and administration' },
    //   { branchIdx: 2, name: 'Front Desk', description: 'Reception and guest services' },
    //   { branchIdx: 2, name: 'Housekeeping', description: 'Room cleaning, gardening and maintenance' },
    //   { branchIdx: 2, name: 'Laundry', description: 'Laundry and linen services' },
    //   { branchIdx: 2, name: 'Kitchen', description: 'Food preparation, cooking and service' },
    //   { branchIdx: 2, name: 'Store', description: 'Inventory and supplies management' },
    // ];

    // const departments = await this.departmentModel.create(
    //   deptDefs.map((d) => ({
    //     name: d.name,
    //     description: d.description,
    //     branchId: branches[d.branchIdx]._id,
    //     createdBy: admin._id,
    //     updatedBy: admin._id,
    //   })),
    // );
    // this.logger.log(`Seed — departments created: ${departments.length} across ${branches.length} branches`);
    // const deptsByBranch: Record<number, Record<string, string>> = {};
    // for (const d of departments) {
    //   const branchIdx = branches.findIndex((b) => b._id.toString() === d.branchId.toString());
    //   if (!deptsByBranch[branchIdx]) deptsByBranch[branchIdx] = {};
    //   deptsByBranch[branchIdx][d.name] = d._id.toString();
    // }

    // employees──────────────────────────────────────────────────
    // const staffByBranch: Array<{ branchIdx: number; staff: Array<{ name: string; email: string; phone: string; position: string; deptName: string }> }> = [
    //   {
    //     branchIdx: 0, // Abuja
    //     staff: [
    //       { name: 'DR. SINI KWABE', email: 'sini.kwabe@citydenapartments.com', phone: '08039686719', position: 'Principal Consultant/Group GM', deptName: 'Management' },
    //       { name: 'IBU VINCENT ANTHONY', email: 'ibu.anthony@citydenapartments.com', phone: '08039686719', position: 'Facility Manager', deptName: 'Management' },
    //       { name: 'DIVINELOVE OLUCHI CHIKEZIE', email: 'divinelove.chikezie@citydenapartments.com', phone: '08039686719', position: 'Front Office Manager/HR', deptName: 'Management' },
    //       { name: 'KENNETH USHIE', email: 'kenneth.ushie@citydenapartments.com', phone: '08039686719', position: 'Accountant/Internal Auditor', deptName: 'Management' },
    //       { name: 'GABRIEL OMANG OGAR', email: 'gabriel.ogar@citydenapartments.com', phone: '08039686719', position: 'Executive Housekeeper', deptName: 'Management' },
    //       { name: 'OJIH ELIZABETH ADAH', email: 'ojih.adah@citydenapartments.com', phone: '08063269302', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'FATIMA ELIZABETH DAVID', email: 'fatima.david@citydenapartments.com', phone: '09166818195', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'JOEL AJINU', email: 'joel.ajinu@citydenapartments.com', phone: '07063542501', position: 'Porter', deptName: 'Front Desk' },
    //       { name: 'ABUBAKAR MUSA GBEDAKO', email: 'abubakar.gbedako@citydenapartments.com', phone: '07073767344', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'ABDALLAH SAEED ADAM', email: 'abdallah.adam@citydenapartments.com', phone: '09131571180', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'SAMSON INALEGWU GABRIEL', email: 'samson.gabriel@citydenapartments.com', phone: '07034165082', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'HASSAN SEDIK', email: 'hassan.sedik@citydenapartments.com', phone: '08100662213', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'JEREMIAH HOPE', email: 'jeremiah.hope@citydenapartments.com', phone: '08036740067', position: 'Laundry Operative', deptName: 'Laundry' },
    //       { name: 'TAWO LEONARD', email: 'tawo.leonard@citydenapartments.com', phone: '07067171793', position: 'Chef', deptName: 'Kitchen' },
    //       { name: 'MARYAM GANIU', email: 'maryam.ganiu@citydenapartments.com', phone: '07064909810', position: 'Cook', deptName: 'Kitchen' },
    //       { name: 'VERONICA UBAH', email: 'veronica.ubah@citydenapartments.com', phone: '09021625954', position: 'Steward', deptName: 'Kitchen' },
    //       { name: 'EMMANUEL YOMLA', email: 'emmanuel.yomla@citydenapartments.com', phone: '08034760483', position: 'Head Waiter', deptName: 'F & B' },
    //       { name: 'SOLOMON ZACHARIAH', email: 'solomon.zachariah@citydenapartments.com', phone: '09064888529', position: 'Store Keeper', deptName: 'Store' },
    //       { name: 'JONAH WANNAH KOLOMI', email: 'jonah.kolomi@citydenapartments.com', phone: '08133089344', position: 'IT', deptName: 'IT' },
    //       { name: 'ZURUQ MOHAMMED', email: 'zuruq.mohammed@citydenapartments.com', phone: '07025275360', position: 'IT', deptName: 'IT' },
    //     ],
    //   },
    //   {
    //     branchIdx: 1, // Kaduna
    //     staff: [],
    //   },
    //   {
    //     branchIdx: 2, // Maiduguri
    //     staff: [
    //       { name: 'Mohammed Tahiru', email: 'mtjibirn44@gmail.com', phone: '08039686749', position: 'General Manager', deptName: 'Management' },
    //       { name: 'Markus John', email: 'markusjoh691@gmail.com', phone: '07068257253', position: 'Front Office Supervisor', deptName: 'Front Desk' },
    //       { name: 'Hauwaa Ratgak', email: 'harunarotgak825@gmail.com', phone: '08039780483', position: 'Chef', deptName: 'Kitchen' },
    //       { name: 'Makoi Cynthia', email: 'mikecynthia272@gmail.com', phone: '09166818195', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'Aziz Hayatu Dzarma', email: 'azizhayatu7@gmail.com', phone: '09131270580', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'Emmanuel Friday', email: 'emmanuelfridaylove@gmail.com', phone: '08139626388', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'Dorcas Musa Wala', email: 'musawabadorcas@gmail.com', phone: '08063269302', position: 'Receptionist', deptName: 'Front Desk' },
    //       { name: 'Usman Adamu', email: 'usmanadamu24@gmail.com', phone: '08100662213', position: 'H/k Supervisor', deptName: 'Housekeeping' },
    //       { name: 'David Monday', email: 'davidmonday2022@gmail.com', phone: '07034165082', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'Ames Charles', email: 'amoscharls21@gmail.com', phone: '07131571180', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'Ibrahim Dauda', email: 'ibrahimdauda4322@gmail.com', phone: '07073767344', position: 'Housekeeper', deptName: 'Housekeeping' },
    //       { name: 'Halima Saleh', email: 'halimasaleh641@gmail.com', phone: '08133089344', position: 'Kitchen Asst.', deptName: 'Kitchen' },
    //       { name: 'Bilah Musa', email: 'bilamusa6@gmail.com', phone: '09068911160', position: 'Kitchen Asst.', deptName: 'Kitchen' },
    //       { name: 'James Asura', email: 'kassidee55@gmail.com', phone: '07064909810', position: 'Laundry', deptName: 'Laundry' },
    //       { name: 'Ladi Baita', email: 'ladibata033@gmail.com', phone: '07019885313', position: 'Waitress / Porter', deptName: 'Kitchen' },
    //       { name: 'Flora Musa Wala', email: 'musaflora6@gmail.com', phone: '09068911160', position: 'Waitress / Porter', deptName: 'Kitchen' },
    //       { name: 'Barka Boniface', email: 'bonifaeebarka55555@gmail.com', phone: '09021625954', position: 'Waiter / Porter', deptName: 'Kitchen' },
    //       { name: 'Nala Musa Dzakwo', email: 'malamusadzakwa@gmail.com', phone: '09016267092', position: 'Laundry', deptName: 'Laundry' },
    //       { name: 'Alhaji Modu Goni', email: 'alhajimodu265@gmail.com', phone: '08036740067', position: 'Environmental Gardener', deptName: 'Housekeeping' },
    //       { name: 'Kolomi Alhaji Fam', email: 'alhajikolomitar@gmail.com', phone: '08127703424', position: 'Environmental Gardener', deptName: 'Housekeeping' },
    //     ],
    //   },
    // ];

    // const employeeData: Array<Record<string, unknown>> = [];
    // for (const { branchIdx, staff } of staffByBranch) {
    //   for (const s of staff) {
    //     employeeData.push({
    //       name: s.name,
    //       email: s.email,
    //       phone: s.phone,
    //       position: s.position,
    //       departmentId: deptsByBranch[branchIdx]?.[s.deptName] || undefined,
    //       department: s.deptName,
    //       branchId: branches[branchIdx]._id,
    //       isActive: true,
    //     });
    //   }
    // }

    // await this.employeeModel.create(employeeData);
    // this.logger.log(`Seed — employees created: ${employeeData.length} across ${branches.length} branches`);

    // // live user accounts for real staff──────────────────────────
    // const positionRoleMap: Record<string, string> = {
    //   'Principal Consultant/Group GM': 'GroupGM',
    //   'General Manager': 'GroupGM',
    //   'Facility Manager': 'FacilityManager',
    //   'Front Office Manager/HR': 'FrontOfficeManager',
    //   'Front Office Supervisor': 'Reception',
    //   'Accountant/Internal Auditor': 'Accountant',
    //   'Executive Housekeeper': 'HouseKeeper',
    //   'H/k Supervisor': 'HouseKeeper',
    //   'Receptionist': 'Reception',
    //   'Housekeeper': 'HouseKeeper',
    //   'Chef': 'KitchenStaff',
    //   'Cook': 'KitchenStaff',
    //   'Steward': 'KitchenStaff',
    //   'Senior Chef': 'KitchenStaff',
    //   'Kitchen Asst.': 'KitchenStaff',
    //   'Potter': 'KitchenStaff',
    //   'Waiter': 'KitchenStaff',
    //   'Waitress / Porter': 'KitchenStaff',
    //   'Waiter / Porter': 'KitchenStaff',
    //   'Porter': 'HouseKeeper',
    //   'Head Waiter': 'KitchenStaff',
    //   'Store Keeper': 'StoreKeeper',
    //   'IT': 'IT',
    //   'Laundry': 'HouseKeeper',
    //   'Laundry Operative': 'HouseKeeper',
    //   'Environmental Gardener': 'HouseKeeper',
    //   'Gardener': 'HouseKeeper',
    // };

    // const liveUsers: Array<Record<string, unknown>> = [];
    // const liveCredentials: Array<{ label: string; email: string; password: string; role: string }> = [];
    // for (const { branchIdx, staff } of staffByBranch) {
    //   for (const s of staff) {
    //     const role = positionRoleMap[s.position];
    //     if (!role) continue;
    //     liveUsers.push({
    //       email: s.email,
    //       password: await bcrypt.hash(s.phone, 12),
    //       name: s.name,
    //       role,
    //       allowedBranches: [branches[branchIdx]._id],
    //       activeBranchId: branches[branchIdx]._id,
    //       isActive: true,
    //       passwordChangedAt: null,
    //     });
    //     liveCredentials.push({ label: `${role} (${branches[branchIdx].name}) — ${s.name}`, email: s.email, password: s.phone, role });
    //   }
    // }
    // await this.userModel.create(liveUsers);
    // this.logger.log(`Seed — live user accounts created: ${liveUsers.length}`);

    // // customers──────────────────────────────────────────────────
    // const customerData: Array<Record<string, unknown>> = [];
    // const customerPhones: string[] = [];
    // for (let i = 0; i < 20; i++) {
    //   const phone = `0803${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
    //   customerPhones.push(phone);
    //   const gender = pick(genders);
    //   customerData.push({
    //     name: `${pick(firstNames)} ${pick(lastNames)}`,
    //     phone,
    //     email: Math.random() > 0.3 ? `guest${i}@email.com` : undefined,
    //     address: pick(['12 Ahmadu Bello Way', 'Plot 5 Lugard Avenue', '23 Tafawa Balewa Road', '8 Yakubu Gowon Crescent', '45 Obafemi Awolowo Street']),
    //     nationality: 'Nigeria',
    //     comingFrom: pick(cities),
    //     stateOfOrigin: pick(states),
    //     occupation: pick(occupations),
    //     nextDestination: pick(cities),
    //     gender,
    //     totalVisits: randInt(0, 5),
    //     totalSpent: randNaira(0, 500000),
    //     lastVisitDate: Math.random() > 0.3 ? daysAgo(randInt(1, 60)) : undefined,
    //     firstBranchId: pick(branches)._id,
    //   });
    // }
    // await this.customerModel.create(customerData);
    // this.logger.log(`Seed — customers created: ${customerData.length}`);

    // // 30 bookings───────────────────────────────────────────────
    // const bookingData: Array<Record<string, unknown>> = [];
    // const roomsToUpdate: Record<string, string> = {}; // roomId -> status

    // for (let i = 0; i < 30; i++) {
    //   const [status, ciOff, coOff] = scenarios[i % scenarios.length];
    //   const room = rooms[i % rooms.length];
    //   const branch = branches.find((b) => b._id.toString() === room.branchId.toString())!;
    //   const rt = allRT.flat().find((t) => t._id.toString() === room.roomTypeId.toString());

    //   const ci = ciOff >= 0 ? daysFromNow(ciOff) : daysAgo(Math.abs(ciOff));
    //   let co = coOff >= 0 ? daysFromNow(coOff) : daysAgo(Math.abs(coOff));

    //   if (co <= ci) co = addDays(ci, 1);

    //   const nights = Math.max(1, differenceInDays(co, ci));
    //   const pricePerNight = rt ? randNaira(rt.minPriceAllowed, rt.basePrice) : randNaira(25000, 80000);
    //   const discountPct = Math.random() > 0.7 ? randInt(5, 30) : 0;
    //   const discount = Math.round(pricePerNight * nights * discountPct / 100);
    //   const total = Math.max(0, pricePerNight * nights - discount);

    //   const guestName = `${pick(firstNames)} ${pick(lastNames)}`;
    //   const guestPhone = Math.random() > 0.6 ? pick(customerPhones) : `0803${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
    //   const hasEmail = Math.random() > 0.5;

    //   const totalForRoom = Math.max(0, pricePerNight * nights);

    //   bookingData.push({
    //     branchId: room.branchId,
    //     rooms: [{
    //       roomId: room._id,
    //       roomTypeId: room.roomTypeId,
    //       actualPricePerNight: pricePerNight,
    //       totalForRoom,
    //       maxGuests: room.maxGuests,
    //     }],
    //     guestDetails: {
    //       name: guestName,
    //       phone: guestPhone,
    //       address: pick(['12 Ahmadu Bello Way', 'Plot 5 Lugard Avenue', '23 Tafawa Balewa Road', '8 Yakubu Gowon Crescent', '45 Obafemi Awolowo Street']),
    //       nationality: 'Nigeria',
    //       comingFrom: pick(cities),
    //       stateOfOrigin: pick(states),
    //       occupation: pick(occupations),
    //       nextDestination: pick(cities),
    //       gender: pick(genders),
    //       ...(hasEmail ? { email: `${guestName.toLowerCase().replace(/\s/g, '.')}@email.com` } : {}),
    //     },
    //     numberOfGuests: randInt(1, room.maxGuests),
    //     checkInDate: ci,
    //     checkOutDate: co,
    //     discount: discount,
    //     discountPercentage: discountPct,
    //     totalAmountPaid: total,
    //     paymentMethod: pick(paymentMethods),
    //     paymentReference: Math.random() > 0.5 ? `TXN-${Date.now().toString(36)}-${i}` : undefined,
    //     bookingStatus: status,
    //     bookingSource: pick(bookingSources),
    //     bookedBy: admin._id,
    //     bookingReference: `CDA-${branch.code}-${String(i + 1).padStart(3, '0')}`,
    //   });

    //   // track room status — last booking per room wins
    //   if (status === 'checked_out') {
    //     roomsToUpdate[room._id.toString()] = RoomStatusEnum.DIRTY;
    //   } else if (status === 'checked_in' && roomsToUpdate[room._id.toString()] !== RoomStatusEnum.DIRTY) {
    //     roomsToUpdate[room._id.toString()] = RoomStatusEnum.OCCUPIED;
    //   } else if (status === 'reserved' && !roomsToUpdate[room._id.toString()]) {
    //     roomsToUpdate[room._id.toString()] = RoomStatusEnum.AVAILABLE;
    //   } else if (status === 'cancelled' && !roomsToUpdate[room._id.toString()]) {
    //     roomsToUpdate[room._id.toString()] = RoomStatusEnum.AVAILABLE;
    //   }
    // }

    // await this.bookingModel.create(bookingData);

    // this.logger.log(`Seed — bookings created: ${bookingData.length}`);

    // // Update room statuses
    // for (const [roomId, status] of Object.entries(roomsToUpdate)) {
    //   await this.roomModel.findByIdAndUpdate(roomId, { status });
    // }

    // const totalUsers = 14 + liveUsers.length; // 14 dummy accounts + live accounts

    // this.logger.log(`Seed completed — users: ${totalUsers}, customers: ${customerData.length}, employees: ${employeeData.length}, branches: ${branches.length}, roomTypes: ${abujaRT.length + kadunaRT.length + maiRT.length}, rooms: ${rooms.length}, bookings: ${bookingData.length}`);

    // const creds: Record<string, string> = {
    //   admin: 'admin@cityden.com / admin123',
    //   reception: 'reception@cityden.com / admin123',
    //   kitchen: 'kitchen@cityden.com / admin123',
    //   housekeeper: 'housekeeper@cityden.com / admin123',
    //   frontoffice: 'frontoffice@cityden.com / admin123',
    //   accountant: 'accountant@cityden.com / admin123',
    //   it: 'it@cityden.com / admin123',
    //   groupgm: 'groupgm@cityden.com / admin123',
    //   'fm-abuja': 'fm-abuja@cityden.com / admin123',
    //   'fm-kaduna': 'fm-kaduna@cityden.com / admin123',
    //   'fm-maiduguri': 'fm-maiduguri@cityden.com / admin123',
    //   storekeeper: 'storekeeper@cityden.com / admin123',
    //   storemanager: 'storemanager@cityden.com / admin123',
    // };
    // for (const c of liveCredentials) {
    //   creds[c.label] = `${c.email} / ${c.password}`;
    // }


    return {
      message: 'System seeded successfully',
      stats: {
        branches: 3,
        roomTypes: abujaRT.length + kadunaRT.length + maiRT.length,
        rooms: rooms.length,
      },
    };
  }

  // ── Image sync from R2 bucket ──────────────────────────────────
  async syncRoomTypeImages() {
    this.logger.log('Syncing room type images from R2 bucket...');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: AppConfig.R2_ENDPOINT,
      credentials: {
        accessKeyId: AppConfig.R2_ACCESS_KEY_ID,
        secretAccessKey: AppConfig.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const branchPrefixMap: Record<string, string> = {
      ABJ: 'abj',
      KAD: 'kaduna',
      MAI: 'maiduguri',
    };

    const branches = await this.branchModel.find({ isActive: true }).lean();
    const updated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const branch of branches) {
      const code = (branch as any).code?.toUpperCase();
      const branchFolder = branchPrefixMap[code] || (branch as any).name?.toLowerCase();
      if (!branchFolder) continue;

      const roomTypes = await this.roomTypeModel.find({ branchId: branch._id, isActive: true }).lean();

      for (const rt of roomTypes) {
        const slug = (rt as any).name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        let prefix = `${branchFolder}/room-types/${slug}/`;

        try {
          let command = new ListObjectsV2Command({
            Bucket: AppConfig.R2_BUCKET_NAME,
            Prefix: prefix,
          });

          let response = await s3.send(command);
          let objects = (response.Contents || [])
            .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith('/'))
            .sort((a, b) => ((b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)));

          // If not found, try plural/singular variant (e.g. luxury-doubles vs luxury-double)
          if (objects.length === 0) {
            const altSlug = slug.endsWith('s') ? slug.slice(0, -1) : `${slug}s`;
            const altPrefix = `${branchFolder}/room-types/${altSlug}/`;
            command = new ListObjectsV2Command({
              Bucket: AppConfig.R2_BUCKET_NAME,
              Prefix: altPrefix,
            });
            response = await s3.send(command);
            objects = (response.Contents || [])
              .filter((obj) => obj.Key && obj.Key !== altPrefix && !obj.Key.endsWith('/'))
              .sort((a, b) => ((b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)));
          }

          let imageUrls = objects.map((obj) => `${AppConfig.R2_PUBLIC_URL}/${obj.Key!.split('/').map(encodeURIComponent).join('/')}`);

          if (imageUrls.length === 0) {
            // Check if predefined static mappings exist
            if (code === 'MAI' && maiRTImages[(rt as any).name]) {
              imageUrls = maiRTImages[(rt as any).name];
            } else if (code === 'ABJ' && abjRTImages[(rt as any).name]) {
              imageUrls = abjRTImages[(rt as any).name];
            } else if (code === 'KAD' && kadRTImages[(rt as any).name]) {
              imageUrls = kadRTImages[(rt as any).name];
            }
          }

          if (imageUrls.length === 0) {
            skipped.push(`${branchFolder}/${slug} — no images found`);
            this.logger.warn(`  ⚠ ${branchFolder}/${slug} — no images in bucket or fallback`);
            continue;
          }

          await this.roomTypeModel.findByIdAndUpdate(rt._id, { images: imageUrls });

          updated.push(`${branchFolder}/${slug} — ${imageUrls.length} images`);
          this.logger.log(`  ✓ ${branchFolder}/${slug} — ${imageUrls.length} images synced`);
        } catch (err) {
          const msg = `${branchFolder}/${slug} — ${(err as Error).message}`;
          errors.push(msg);
          this.logger.error(`  ✗ ${msg}`);
        }
      }
    }

    // Also sync room images for branches that have room-level images
    const allRooms = await this.roomModel.find({ isActive: true }).lean();
    let roomImagesSynced = 0;
    for (const room of allRooms) {
      const branch = branches.find((b) => b._id.toString() === (room as any).branchId.toString());
      if (!branch) continue;
      const code = (branch as any).code?.toUpperCase();
      const branchFolder = branchPrefixMap[code] || (branch as any).name?.toLowerCase();
      const rt = await this.roomTypeModel.findById((room as any).roomTypeId).lean();
      if (!rt) continue;
      const slug = (rt as any).name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const prefix = `${branchFolder}/room-types/${slug}/`;

      try {
        const command = new ListObjectsV2Command({
          Bucket: AppConfig.R2_BUCKET_NAME,
          Prefix: prefix,
        });
        const response = await s3.send(command);
        const objects = (response.Contents || [])
          .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith('/'))
          .sort((a, b) => ((b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)));

        if (objects.length > 0) {
          const imageUrls = objects.map((obj) => `${AppConfig.R2_PUBLIC_URL}/${obj.Key!.split('/').map(encodeURIComponent).join('/')}`);
          const roomNumber = (room as any).roomNumber;
          const matching = roomNumber
            ? imageUrls.filter((url) => decodeURIComponent(url).includes(roomNumber))
            : imageUrls;
          if (matching.length > 0) {
            await this.roomModel.findByIdAndUpdate(room._id, { images: matching });
            roomImagesSynced++;
          }
        }
      } catch {
        // skip room-level errors
      }
    }

    this.logger.log(`Sync complete — ${updated.length} room types updated, ${roomImagesSynced} rooms updated, ${skipped.length} skipped, ${errors.length} errors`);

    return {
      message: 'Room type images synced successfully',
      stats: {
        roomTypesUpdated: updated.length,
        roomsUpdated: roomImagesSynced,
        skipped: skipped.length,
        errors: errors.length,
      },
      details: { updated, skipped, errors },
    };
  }

  // ── Staff seed: departments + employees + user accounts ──────────
  async seedStaff() {
    this.logger.log('Staff seed started — departments, employees, user accounts');

    const branches = await this.branchModel.find({ isActive: true }).lean();
    if (branches.length === 0) throw new Error('No branches found — run full seed first');

    const admin = await this.userModel.findOne({ role: 'SuperAdmin' }).lean();
    if (!admin) throw new Error('Admin user not found — run full seed first');

    // ── departments ──────────────────────────────────────────────
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

    await this.departmentModel.deleteMany({});
    const departments = await this.departmentModel.create(
      deptDefs.map((d) => ({
        name: d.name,
        description: d.description,
        branchId: branches[d.branchIdx]._id,
        createdBy: admin._id,
        updatedBy: admin._id,
      })),
    );
    this.logger.log(`Departments created: ${departments.length}`);

    const deptsByBranch: Record<number, Record<string, string>> = {};
    for (const d of departments) {
      const branchIdx = branches.findIndex((b) => b._id.toString() === d.branchId.toString());
      if (!deptsByBranch[branchIdx]) deptsByBranch[branchIdx] = {};
      deptsByBranch[branchIdx][d.name] = d._id.toString();
    }

    // ── employees ────────────────────────────────────────────────
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

    await this.employeeModel.deleteMany({});
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
    this.logger.log(`Employees created: ${employeeData.length}`);

    // ── user accounts ────────────────────────────────────────────
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
    await this.userModel.deleteMany({ role: { $nin: ['SuperAdmin'] } });
    await this.userModel.create(liveUsers);
    this.logger.log(`User accounts created: ${liveUsers.length}`);

    this.logger.log('Staff seed completed');
    return {
      message: 'Departments, employees, and user accounts seeded successfully',
      stats: {
        departments: departments.length,
        employees: employeeData.length,
        userAccounts: liveUsers.length,
      },
    };
  }

  // ── Restaurant Seed: Categories, Dishes, Delivery Locations, Banners ──
  async seedRestaurant() {
    this.logger.log('Restaurant seed started');
    const branches = await this.branchModel.find().lean();
    if (branches.length === 0) {
      throw new Error('No branches found. Please run main seed first.');
    }

    // Clear existing restaurant data
    await this.menuCategoryModel.deleteMany({});
    await this.menuItemModel.deleteMany({});
    await this.deliveryLocationModel.deleteMany({});
    await this.bannerModel.deleteMany({});
    this.logger.log('Existing restaurant collections cleared');

    // Category Blueprint
    const categoryTemplates = [
      { name: 'Breakfast & Morning Bites', slug: 'breakfast-morning-bites', icon: '🍳', description: 'Freshly made eggs, morning platters, hot beverages and breakfast bowls', sortOrder: 1 },
      { name: 'Northern & Hausa Specialties', slug: 'northern-specialties', icon: '🍲', description: 'Authentic Masa, Miyan Taushe, tender goat meat and seasoned delicacies', sortOrder: 2 },
      { name: 'Continental & Grills', slug: 'continental-grills', icon: '🥩', description: 'Smoky party jollof, grilled quarter chicken, croaker fish and steaks', sortOrder: 3 },
      { name: 'Soups & Swallows', slug: 'soups-swallows', icon: '🥣', description: 'Egusi, Afang, Ogbono, and Native Soups served with freshly pounded swallows', sortOrder: 4 },
      { name: 'Fast Food & Finger Bites', slug: 'fast-food-finger-bites', icon: '🍔', description: 'Triple club sandwiches, seasoned wings, crispy chips and finger bites', sortOrder: 5 },
      { name: 'Fresh Juices & Cold Drinks', slug: 'juices-beverages', icon: '🍹', description: 'Homemade tiger nut milk, iced zobo punch and natural fruit juices', sortOrder: 6 },
    ];

    let totalCategories = 0;
    let totalItems = 0;
    let totalLocations = 0;

    for (const branch of branches) {
      // 1. Create Categories for this branch
      const createdCategories: Record<string, any> = {};
      for (const tpl of categoryTemplates) {
        const cat = await this.menuCategoryModel.create({
          branchId: branch._id,
          name: tpl.name,
          slug: tpl.slug,
          icon: tpl.icon,
          description: tpl.description,
          sortOrder: tpl.sortOrder,
          isActive: true,
        });
        createdCategories[tpl.slug] = cat;
        totalCategories++;
      }

      // 2. Create Rich Dishes for this branch
      const itemsToSeed = [
        // Category 1: Breakfast
        {
          categoryId: createdCategories['breakfast-morning-bites']._id,
          name: 'City Den Royal English Breakfast',
          description: 'Two sunny-side eggs, grilled sausage links, baked beans, toasted brioche, grilled tomatoes, and sautéed mushrooms.',
          images: ['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80'],
          basePrice: 6000,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Egg Preparation',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Sunny Side Up', extraPrice: 0, isAvailable: true },
                { name: 'Scrambled Eggs', extraPrice: 0, isAvailable: true },
                { name: 'Well-Done Fried', extraPrice: 0, isAvailable: true },
                { name: 'Boiled Eggs (2 pcs)', extraPrice: 0, isAvailable: true },
              ],
            },
            {
              name: 'Morning Hot Drink',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Freshly Brewed Coffee', extraPrice: 0, isAvailable: true },
                { name: 'English Breakfast Tea', extraPrice: 0, isAvailable: true },
                { name: 'Rich Hot Cocoa & Milk', extraPrice: 500, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 15,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['breakfast', 'popular', 'chef-special'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['breakfast-morning-bites']._id,
          name: 'Akara (Crispy Bean Cakes) & Creamy Custard',
          description: 'Golden fried seasoned bean cakes served with hot vanilla custard sweetened with honey and creamy evaporated milk.',
          images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'],
          basePrice: 3500,
          hasSizes: true,
          sizes: [
            { name: 'Regular Bowl (6 Pcs Akara)', price: 3500, isDefault: true },
            { name: 'Executive Bowl (10 Pcs Akara)', price: 5000, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Base Choice',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Vanilla Custard & Milk', extraPrice: 0, isAvailable: true },
                { name: 'Hot Spiced Pap (Akamu)', extraPrice: 0, isAvailable: true },
                { name: 'Warm Rolled Oats', extraPrice: 500, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 15,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['breakfast', 'traditional'],
          sortOrder: 2,
        },

        // Category 2: Northern Specialties
        {
          categoryId: createdCategories['northern-specialties']._id,
          name: 'Masa with Spiced Shredded Beef & Suya Yaji',
          description: 'Golden fermented rice cakes lightly browned and served with tender shredded beef in traditional soup and fiery Yaji spice.',
          images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'],
          basePrice: 4500,
          hasSizes: true,
          sizes: [
            { name: 'Regular (4 Pcs)', price: 4500, isDefault: true },
            { name: 'Large (8 Pcs)', price: 8000, isDefault: false },
            { name: 'Sharing Platter (12 Pcs)', price: 11500, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Choice of Soup',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Miyan Taushe (Pumpkin & Peanut)', extraPrice: 0, isAvailable: true },
                { name: 'Miyan Kuka (Baobab Leaf)', extraPrice: 0, isAvailable: true },
                { name: 'Miyan Geda (Groundnut Soup)', extraPrice: 500, isAvailable: true },
              ],
            },
            {
              name: 'Extra Toppings',
              required: false,
              minSelections: 0,
              maxSelections: 3,
              selectionType: OptionSelectionType.MultiSelect,
              options: [
                { name: 'Extra Spiced Shredded Beef', extraPrice: 1500, isAvailable: true },
                { name: 'Boiled Egg (2 pcs)', extraPrice: 500, isAvailable: true },
                { name: 'Extra Suya Yaji Pepper Sauce', extraPrice: 300, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 20,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['popular', 'hausa', 'chef-special'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['northern-specialties']._id,
          name: 'Slow-Cooked Goat Meat Pepper Soup',
          description: 'Aromatic, spicy herbal broth cooked with tender, fresh cuts of goat meat and traditional African peppersoup spices.',
          images: ['https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'],
          basePrice: 5500,
          hasSizes: true,
          sizes: [
            { name: 'Single Bowl', price: 5500, isDefault: true },
            { name: 'Family Sharing Pot', price: 14000, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Spice Level',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Medium Heat', extraPrice: 0, isAvailable: true },
                { name: 'Extra Spicy Fire', extraPrice: 0, isAvailable: true },
                { name: 'Mild & Light', extraPrice: 0, isAvailable: true },
              ],
            },
            {
              name: 'Side Starch Pairing',
              required: false,
              minSelections: 0,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Boiled Yam Chunks', extraPrice: 1200, isAvailable: true },
                { name: 'Steamed White Rice', extraPrice: 1000, isAvailable: true },
                { name: 'Warm Agidi / Eko', extraPrice: 800, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 20,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['peppersoup', 'spicy', 'goat-meat'],
          sortOrder: 2,
        },
        {
          categoryId: createdCategories['northern-specialties']._id,
          name: 'Special Beef Kilishi & Suya Platter',
          description: 'Finely sliced sun-dried beef crisps tossed in peanut chili rub, paired with skewered suya beef, red onions and cabbage.',
          images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
          basePrice: 7000,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Suya Meat Selection',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Prime Beef Suya', extraPrice: 0, isAvailable: true },
                { name: 'Gizzard & Chicken Suya', extraPrice: 500, isAvailable: true },
                { name: 'Mixed Deluxe Suya', extraPrice: 1500, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 15,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['suya', 'kilishi', 'grills'],
          sortOrder: 3,
        },

        // Category 3: Continental & Grills
        {
          categoryId: createdCategories['continental-grills']._id,
          name: 'City Den Party Jollof with Quarter Grilled Chicken',
          description: 'Smoky firewood-style Nigerian party jollof rice served with seasoned grilled quarter chicken, fried sweet plantains (dodo), and coleslaw.',
          images: ['https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'],
          basePrice: 6500,
          hasSizes: true,
          sizes: [
            { name: 'Standard Plate', price: 6500, isDefault: true },
            { name: 'Executive Jumbo Plate', price: 9500, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Choice of Protein',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Quarter Grilled Chicken', extraPrice: 0, isAvailable: true },
                { name: 'Crispy Fried Fish Cut', extraPrice: 500, isAvailable: true },
                { name: 'Tender Braised Beef (2 pcs)', extraPrice: 500, isAvailable: true },
                { name: 'Jumbo Grilled Turkey Wing', extraPrice: 2000, isAvailable: true },
              ],
            },
            {
              name: 'Extra Sides',
              required: false,
              minSelections: 0,
              maxSelections: 3,
              selectionType: OptionSelectionType.MultiSelect,
              options: [
                { name: 'Extra Sweet Fried Plantains (Dodo)', extraPrice: 1000, isAvailable: true },
                { name: 'Steamed Moi-Moi with Egg', extraPrice: 1200, isAvailable: true },
                { name: 'Fresh Coleslaw Salad', extraPrice: 500, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 25,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['jollof', 'popular', 'grilled-chicken'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['continental-grills']._id,
          name: 'Char-Grilled Whole Croaker Fish with Yam Chips',
          description: 'Fresh whole croaker fish marinated in spicy garlic ginger herb butter, char-grilled to perfection and served with crispy yam fries.',
          images: ['https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=800&q=80'],
          basePrice: 12500,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Basting Sauce Glaze',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Fiery Pepper Herb Sauce', extraPrice: 0, isAvailable: true },
                { name: 'Sweet BBQ Glaze', extraPrice: 0, isAvailable: true },
                { name: 'Lemon Garlic Butter', extraPrice: 500, isAvailable: true },
              ],
            },
            {
              name: 'Starch Accompaniment',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Crispy Yam Fries', extraPrice: 0, isAvailable: true },
                { name: 'Golden Potato French Fries', extraPrice: 0, isAvailable: true },
                { name: 'Seasoned Fried Rice', extraPrice: 1000, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 35,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['seafood', 'grilled-fish', 'premium'],
          sortOrder: 2,
        },

        // Category 4: Soups & Swallows
        {
          categoryId: createdCategories['soups-swallows']._id,
          name: 'Lumpy Egusi Soup with Assorted Meats',
          description: 'Savory ground melon seed soup enriched with spinach, stockfish chunks, kpomo, shaki, and tender beef cuts.',
          images: ['https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80'],
          basePrice: 7000,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Choice of Swallow',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Pounded Yam', extraPrice: 0, isAvailable: true },
                { name: 'Semovita', extraPrice: 0, isAvailable: true },
                { name: 'Wheat Swallow', extraPrice: 0, isAvailable: true },
                { name: 'Yellow Garri (Eba)', extraPrice: 0, isAvailable: true },
              ],
            },
            {
              name: 'Extra Proteins',
              required: false,
              minSelections: 0,
              maxSelections: 2,
              selectionType: OptionSelectionType.MultiSelect,
              options: [
                { name: 'Fried Goat Meat Cut', extraPrice: 2000, isAvailable: true },
                { name: 'Stockfish Head Chunk', extraPrice: 2500, isAvailable: true },
                { name: 'Tender Cow Foot', extraPrice: 1200, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 25,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['soup', 'egusi', 'swallow'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['soups-swallows']._id,
          name: 'Calabar Afang Soup with Smoked Catfish',
          description: 'Finely shredded afang leaves, fresh waterleaves, periwinkles, smoked catfish, dried prawns, and assorted beef.',
          images: ['https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'],
          basePrice: 8000,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Choice of Swallow',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Pounded Yam', extraPrice: 0, isAvailable: true },
                { name: 'Semovita', extraPrice: 0, isAvailable: true },
                { name: 'Wheat Swallow', extraPrice: 0, isAvailable: true },
                { name: 'Yellow Garri (Eba)', extraPrice: 0, isAvailable: true },
              ],
            },
            {
              name: 'Seafood Additions',
              required: false,
              minSelections: 0,
              maxSelections: 2,
              selectionType: OptionSelectionType.MultiSelect,
              options: [
                { name: 'Jumbo Snail in Sauce', extraPrice: 3500, isAvailable: true },
                { name: 'Extra Smoked Catfish Chunk', extraPrice: 2000, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 25,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['soup', 'afang', 'chef-special'],
          sortOrder: 2,
        },

        // Category 5: Fast Food
        {
          categoryId: createdCategories['fast-food-finger-bites']._id,
          name: 'City Den Triple Club Sandwich & Fries',
          description: 'Toasted triple brioche layered with smoked chicken, boiled egg, cheese, crispy beef bacon, tomato, lettuce, and secret garlic mayo.',
          images: ['https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80'],
          basePrice: 5500,
          hasSizes: false,
          sizes: [],
          optionGroups: [
            {
              name: 'Fries Accompaniment',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'French Fries', extraPrice: 0, isAvailable: true },
                { name: 'Spicy Potato Wedges', extraPrice: 500, isAvailable: true },
                { name: 'Crispy Yam Chips', extraPrice: 500, isAvailable: true },
              ],
            },
            {
              name: 'Sauce Dips',
              required: false,
              minSelections: 0,
              maxSelections: 2,
              selectionType: OptionSelectionType.MultiSelect,
              options: [
                { name: 'Garlic Mayo Dip', extraPrice: 300, isAvailable: true },
                { name: 'Sweet Chili Dip', extraPrice: 300, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 20,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['sandwich', 'fries', 'quick-bites'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['fast-food-finger-bites']._id,
          name: 'Crispy Seasoned Chicken Wings',
          description: 'Tender chicken wings fried crisp and tossed in your choice of artisan sauce glaze.',
          images: ['https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80'],
          basePrice: 4500,
          hasSizes: true,
          sizes: [
            { name: '6 Wings', price: 4500, isDefault: true },
            { name: '12 Wings', price: 8500, isDefault: false },
            { name: '20 Wings Sharing Pack', price: 13500, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Glaze Flavor',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'Honey BBQ Sauce', extraPrice: 0, isAvailable: true },
                { name: 'Suya Spiced Fire Glaze', extraPrice: 0, isAvailable: true },
                { name: 'Garlic Parmesan Crust', extraPrice: 500, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 20,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['wings', 'finger-food', 'crispy'],
          sortOrder: 2,
        },

        // Category 6: Cold Drinks & Juices
        {
          categoryId: createdCategories['juices-beverages']._id,
          name: 'Chilled Kunu Aya (Tiger Nut, Dates & Coconut)',
          description: 'Creamy homemade milk made from blended organic tiger nuts, dates, ginger, and coconut water. Served ice-cold.',
          images: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'],
          basePrice: 2000,
          hasSizes: true,
          sizes: [
            { name: '500ml Bottle', price: 2000, isDefault: true },
            { name: '1 Litre Pitcher', price: 3800, isDefault: false },
          ],
          optionGroups: [
            {
              name: 'Sweetness',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              selectionType: OptionSelectionType.SingleSelect,
              options: [
                { name: 'All Natural / No Added Sugar', extraPrice: 0, isAvailable: true },
                { name: 'Pure Honey Infused', extraPrice: 300, isAvailable: true },
              ],
            },
          ],
          estimatedPrepTimeMinutes: 5,
          isAvailable: true,
          isChefSpecial: true,
          tags: ['beverage', 'healthy', 'traditional'],
          sortOrder: 1,
        },
        {
          categoryId: createdCategories['juices-beverages']._id,
          name: 'Infused Hibiscus & Pineapple Zobo Cooler',
          description: 'Chilled hibiscus flower infusion simmered with fresh pineapple chunks, ginger, and aromatic cloves.',
          images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'],
          basePrice: 1500,
          hasSizes: true,
          sizes: [
            { name: '500ml Bottle', price: 1500, isDefault: true },
            { name: '1 Litre Pitcher', price: 2800, isDefault: false },
          ],
          optionGroups: [],
          estimatedPrepTimeMinutes: 5,
          isAvailable: true,
          isChefSpecial: false,
          tags: ['zobo', 'cold-drink', 'refreshing'],
          sortOrder: 2,
        },
      ];

      for (const itemData of itemsToSeed) {
        await this.menuItemModel.create({
          branchId: branch._id,
          ...itemData,
        });
        totalItems++;
      }

      // 3. Create Delivery Locations for this branch
      const locationTemplates =
        branch.name.toLowerCase().includes('kaduna')
          ? [
              { zoneName: 'Ungwan Rimi & Malali', deliveryFee: 1000, estimatedDeliveryMinutes: 25, sortOrder: 1 },
              { zoneName: 'Barnawa & Narayi', deliveryFee: 1500, estimatedDeliveryMinutes: 35, sortOrder: 2 },
              { zoneName: 'Kaduna GRA & Independence Way', deliveryFee: 1000, estimatedDeliveryMinutes: 30, sortOrder: 3 },
              { zoneName: 'Millennium City', deliveryFee: 2500, estimatedDeliveryMinutes: 45, sortOrder: 4 },
            ]
          : branch.name.toLowerCase().includes('maiduguri')
          ? [
              { zoneName: 'GRA Maiduguri', deliveryFee: 1000, estimatedDeliveryMinutes: 25, sortOrder: 1 },
              { zoneName: 'UNIMAID Axis', deliveryFee: 1500, estimatedDeliveryMinutes: 35, sortOrder: 2 },
              { zoneName: 'Bulumkutu & Airport Road', deliveryFee: 1500, estimatedDeliveryMinutes: 35, sortOrder: 3 },
            ]
          : [
              { zoneName: 'Wuse II', deliveryFee: 1500, estimatedDeliveryMinutes: 35, sortOrder: 1 },
              { zoneName: 'Maitama', deliveryFee: 2000, estimatedDeliveryMinutes: 40, sortOrder: 2 },
              { zoneName: 'Jabi & Utako', deliveryFee: 1000, estimatedDeliveryMinutes: 25, sortOrder: 3 },
              { zoneName: 'Garki I & II', deliveryFee: 2000, estimatedDeliveryMinutes: 45, sortOrder: 4 },
              { zoneName: 'Asokoro', deliveryFee: 2500, estimatedDeliveryMinutes: 50, sortOrder: 5 },
              { zoneName: 'Guzape', deliveryFee: 3000, estimatedDeliveryMinutes: 55, sortOrder: 6 },
              { zoneName: 'Central Business District (CBD)', deliveryFee: 1500, estimatedDeliveryMinutes: 35, sortOrder: 7 },
              { zoneName: 'Life Camp & Gwarinpa', deliveryFee: 2000, estimatedDeliveryMinutes: 40, sortOrder: 8 },
            ];

      for (const loc of locationTemplates) {
        await this.deliveryLocationModel.create({
          branchId: branch._id,
          ...loc,
          isActive: true,
        });
        totalLocations++;
      }
    }

    // 4. Create General and Branch Promotional Banners
    const bannersToSeed = [
      {
        branchId: null, // applies to all branches
        title: 'Executive Suite Dining Experience',
        subtitle: 'Enjoy gourmet chef specials delivered right to your apartment door.',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        bannerType: BannerType.SpecialDiscount,
        actionLink: '/menu',
        isActive: true,
        sortOrder: 1,
      },
      {
        branchId: null,
        title: 'Authentic Northern & Traditional Specialties',
        subtitle: 'Fresh Masa, Miyan Taushe, Suya, and slow-cooked pepper soup made fresh daily.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        bannerType: BannerType.MealPromo,
        actionLink: '/menu',
        isActive: true,
        sortOrder: 2,
      },
      {
        branchId: null,
        title: 'Fast City Home Delivery',
        subtitle: 'Hot, packaged meals dispatched across all major city delivery zones in 45 mins.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
        bannerType: BannerType.Announcement,
        actionLink: '/menu',
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const b of bannersToSeed) {
      await this.bannerModel.create(b);
    }

    this.logger.log(`Restaurant seed completed — Categories: ${totalCategories}, Dishes: ${totalItems}, Delivery Locations: ${totalLocations}, Banners: ${bannersToSeed.length}`);
    return {
      message: 'Restaurant menu items, categories, delivery zones, and banners seeded successfully',
      stats: {
        branches: branches.length,
        categories: totalCategories,
        menuItems: totalItems,
        deliveryLocations: totalLocations,
        banners: bannersToSeed.length,
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
