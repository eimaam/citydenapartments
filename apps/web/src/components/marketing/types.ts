import type { LucideIcon } from 'lucide-react';

export interface ILocationCard {
  id: string;
  city: string;
  tagline: string;
  imageUrl: string;
  comingSoon?: boolean;
}

export interface ISuiteCard {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface IAmenityItem {
  id: string;
  label: string;
  icon: LucideIcon;
}


