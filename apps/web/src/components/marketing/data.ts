
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
import type { IAmenityItem, ILocationCard } from './types';

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
    tagline: 'BORNO STATE CAPITAL',
    imageUrl:
      'https://images.unsplash.com/photo-1545324224-fa8b6a84d48a?auto=format&fit=crop&w=1200&q=80',
  },


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


