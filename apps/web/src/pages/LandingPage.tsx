import {
  AmenitiesSection,
  CtaSection,
  GallerySection,
  HeroSection,
  LocationsSection,
  PhilosophySection,
  SuitesSection,
} from '../components/marketing';

export const LandingPage = () => {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <LocationsSection />
      <PhilosophySection />
      <SuitesSection />
      <AmenitiesSection />
      <GallerySection />
      <CtaSection />
    </div>
  );
};
