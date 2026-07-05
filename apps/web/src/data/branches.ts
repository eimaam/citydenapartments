export const BRANCH_COORDINATES = {
  abuja: { lat: 9.0691474, lng: 7.42641 },
  kaduna: { lat: 10.545013363418246, lng: 7.456493775717975 },
  maiduguri: { lat: 11.804458439389704, lng: 13.150351275728267 },
} as const;

export const BRANCH_CONTACTS = {
  abuja: {
    address: 'No 5 Audu Ogbe Street, Jabi Abuja.',
    phone: '0810 704 3924',
    email: 'abuja@citydenapartments.com',
    name: 'Abuja',
    code: 'ABJ',
  },
  kaduna: {
    address: 'Plot 24, 26 & 28 Turunku Road, off Inuwa Wada Road, Ungwan Rimi, Kaduna',
    phone: '0701 124 0957',
    email: 'kaduna@citydenapartments.com',
    name: 'Kaduna',
    code: 'KAD',
  },
  maiduguri: {
    address: '15 Damaturu Road, Maiduguri',
    phone: '+234 809 000 9012',
    email: 'maiduguri@citydenapartments.com',
    name: 'Maiduguri',
    code: 'MAI',
  },
} as const;

export const MAP_EMBEDS = {
  abuja: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3939.940917111082!2d7.426410000000002!3d9.0691474!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e74d813aa5555%3A0x9dde89910b8c07ca!2s5%20Audu%20Ogbe%20St%2C%20Jabi%2C%20Abuja%20900108%2C%20Federal%20Capital%20Territory!5e0!3m2!1sen!2sng!4v1783096157239!5m2!1sen!2sng',
  kaduna: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3922.436011058829!2d7.456493775717975!3d10.545013363418246!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x11b2b50047b0b985%3A0xbb0c01b2e4bb4ec6!2sCITY%20DEN%20APARTMENT!5e0!3m2!1sen!2sng!4v1783096211779!5m2!1sen!2sng',
  maiduguri: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3905.4395400736767!2d13.150351275728267!3d11.804458439389704!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x11049f00722ef797%3A0x7d09be4ee458df8c!2sCITY%20DEN%20APARTMENTS%20MAIDUGURI!5e0!3m2!1sen!2sng!4v1783096250430!5m2!1sen!2sng',
} as const;

export const HERO_IMAGES: Record<string, string> = {
  abuja: 'https://pub-644677a999f742b39f8a60416322206c.r2.dev/abj/hero.jpeg',
  kaduna: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1920&q=80',
  maiduguri: 'https://images.unsplash.com/photo-1545324224-fa8b6a84d48a?auto=format&fit=crop&w=1920&q=80',
};

export const FALLBACK_HERO = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80';

export const FALLBACK_SUITE_IMAGE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

interface Landmark {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export const LANDMARKS: Record<string, Landmark[]> = {
  abuja: [
    { name: 'Jabi Lake', lat: 9.0825, lng: 7.4350, description: 'Scenic lake with walking trails and water activities' },
    { name: 'Jabi Lake Mall', lat: 9.0735, lng: 7.4215, description: 'Premier shopping and dining destination' },
    { name: 'International Conference Centre', lat: 9.0580, lng: 7.4900, description: 'Major convention and events venue' },
    { name: 'Millennium Park', lat: 9.0420, lng: 7.4890, description: 'Largest public park in Abuja' },
    { name: 'Abuja National Mosque', lat: 9.0600, lng: 7.4900, description: 'Iconic national landmark' },
  ],
  kaduna: [
    { name: 'Kaduna Golf Club', lat: 10.5350, lng: 7.4500, description: '18-Hole Golf Course — a premier golfing destination' },
    { name: 'Gamji Park', lat: 10.5300, lng: 7.4400, description: 'Scenic park along the Kaduna River' },
    { name: 'Kaduna Museum', lat: 10.5100, lng: 7.4400, description: 'Historical and heritage exhibition centre' },
    { name: 'Lugard Hall', lat: 10.5200, lng: 7.4400, description: 'Historic government building and architectural landmark' },
    { name: "Shehu Yar'adua Bridge", lat: 10.5550, lng: 7.4500, description: 'Major landmark bridge over the Kaduna River' },
  ],
  maiduguri: [
    { name: 'Sanda Kyarimi Park Zoo', lat: 11.8300, lng: 13.1500, description: 'Wildlife conservation and recreation park' },
    { name: 'University of Maiduguri', lat: 11.8400, lng: 13.1400, description: 'Premier institution of higher learning' },
    { name: "Emir's Palace", lat: 11.8100, lng: 13.1500, description: 'Historic seat of the Borno Emirate' },
    { name: 'Maiduguri Monday Market', lat: 11.8200, lng: 13.1600, description: 'Traditional market hub and cultural centre' },
  ],
};

export function calculateDistance(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDriveTimeMinutes(distanceKm: number): number {
  const speedKmh = 30;
  return Math.round((distanceKm / speedKmh) * 60);
}
