import { useEffect, useState } from 'react';
import {
  AmenitiesSection,
  CtaSection,
  GallerySection,
  HeroSection,
  LocationsSection,
  PhilosophySection,
  SuitesSection,
} from '../components/marketing';
import { getRoomTypes, getGallery } from '../lib/api';
import type { PublicRoomType } from '../lib/api';
import type { ISuiteCard } from '../components/marketing/types';

const toSuiteCard = (rt: PublicRoomType): ISuiteCard => ({
  id: rt.id,
  title: rt.name,
  description: rt.description,
  price: rt.basePrice,
  imageUrl: rt.images[0] || '',
});

export const LandingPage = () => {
  const [suites, setSuites] = useState<ISuiteCard[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    getRoomTypes('ABJ').then((items) => setSuites(items.map(toSuiteCard))).catch(() => {});
    getGallery(1, 10).then((res) => setGalleryImages(res.items.map((i) => i.url))).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">
      <HeroSection 
      image="https://pub-644677a999f742b39f8a60416322206c.r2.dev/abj/hero.jpeg"
      />
      <LocationsSection />
      <PhilosophySection />
      <SuitesSection suites={suites.length > 0 ? suites : undefined} />
      <AmenitiesSection />
      {galleryImages.length > 0 && <GallerySection images={galleryImages} />}
      <CtaSection />
    </div>
  );
};
