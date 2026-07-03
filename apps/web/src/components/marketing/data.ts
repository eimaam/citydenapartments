
import { 
  Waves, 
  Wifi, 
  Dumbbell, 
  Utensils, 
  Coffee, 
  Wine, 
  Users, 
  Clock, 
  Shirt 
} from 'lucide-react';
import type { IAmenityItem, ILocationCard, ISuiteCard, ICityPageData } from './types';

export const locations: ILocationCard[] = [
  {
    id: 'abuja',
    city: 'Abuja',
    tagline: 'FEDERAL CAPITAL TERRITORY',
    imageUrl:
      'https://bucket.citydenapartments.com/abj/abuja-thumbnail.jpeg',
  },
  {
    id: 'kaduna',
    city: 'Kaduna',
    tagline: 'HERITAGE CITY',
    imageUrl:
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'maiduguri',
    city: 'Maiduguri',
    tagline: 'COMING SOON',
    imageUrl:
      'https://images.unsplash.com/photo-1545324224-fa8b6a84d48a?auto=format&fit=crop&w=1200&q=80',
    comingSoon: true,
  },
];
export const suites: ISuiteCard[] = [
  {
    id: 'king-suite',
    title: 'King Suite',
    price: 60000,
    description:
      'An intimate layout with sculpted light, tactile finishes, and a calm palette for effortless daily rhythm.',
    imageUrl:
      'https://images.unsplash.com/photo-1616594039964-3f59a4a3f6f9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'deluxe-suite',
    title: 'Deluxe Suite',
    price: 70000,
    description:
      'Enhanced comfort featuring premium materials and a spacious layout designed for extended relaxation.',
    imageUrl:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'executive-suite',
    title: 'Executive Suite',
    price: 80000,
    description:
      'Sophisticated design meets functional luxury, perfect for the modern traveler seeking a refined work-life balance.',
    imageUrl:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'penthouse-suite',
    title: 'Penthouse Suite',
    price: 120000,
    description:
      'Unrivaled views and expansive living spaces defined by high ceilings and bespoke interior craftsmanship.',
    imageUrl:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'royal-suite',
    title: 'Royal Suite',
    price: 150000,
    description:
      'Palatial living with grand architectural details and curated art pieces for a truly majestic experience.',
    imageUrl:
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'business-suite',
    title: 'Business Suite',
    price: 160000,
    description:
      'An efficient yet elegant environment equipped with cutting-edge technology and a streamlined aesthetic.',
    imageUrl:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'presidential-suite',
    title: 'Presidential Suite',
    price: 400000,
    description:
      'The pinnacle of luxury, offering ultimate privacy, 360-degree views, and personalized world-class service.',
    imageUrl:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  },
];




export const amenities: IAmenityItem[] = [
  { 
    id: 'breakfast', 
    label: 'Complimentary Breakfast', 
    icon: Coffee 
  },
  { 
    id: 'wifi', 
    label: '24/hrs Wi-Fi Service', 
    icon: Wifi 
  },
  {

    id: 'housekeeping', 
    label: '24/hrs House Keeping', 
    icon: Clock 
  },
  { 
    id: 'conference', 
    label: '100-Capacity Conference Room', 
    icon: Users 
  },
  { 
    id: 'lounge', 
    label: 'Outdoor & Indoor Lounge', 
    icon: Waves 
  },
  { 
    id: 'restaurant', 
    label: 'Restaurant Service', 
    icon: Utensils 
  },
  { 
    id: 'gym', 
    label: 'Elite Gym', 
    icon: Dumbbell 
  },
  
  { 
    id: 'bar', 
    label: 'Bar Service', 
    icon: Wine 
  },
  { 
    id: 'laundry', 
    label: 'Laundry Service', 
    icon: Shirt 
  },
];

export const cityData: Record<string, ICityPageData> = {
  abuja: {
    id: 'abuja',
    name: 'Abuja',
    tagline: 'FEDERAL CAPITAL TERRITORY',
    description: 'Experience the pinnacle of urban comfort in the heart of Nigeria\'s capital. Our Abuja suites offer a blend of modern luxury and serene comfort.',
    heroImage: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2400&q=80',
    suites: suites,
    amenities: amenities,
    galleryImages: [
      'https://images.unsplash.com/photo-1616594039964-3f59a4a3f6f9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  kaduna: {
    id: 'kaduna',
    name: 'Kaduna',
    tagline: 'HERITAGE CITY',
    description: 'Discover historical elegance combined with contemporary living. Our Kaduna location provides a unique heritage experience with all modern amenities.',
    heroImage: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=2400&q=80',
    suites: suites.slice(0, 4),
    amenities: amenities.slice(0, 6),
    galleryImages: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    ],
  },
};

