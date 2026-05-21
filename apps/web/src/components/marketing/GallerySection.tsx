import { SectionReveal } from './motionSection';

const defaultGalleryImages = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80',
];

interface GallerySectionProps {
  images?: string[];
}

export const GallerySection = ({
  images = defaultGalleryImages,
}: GallerySectionProps) => {
  return (
    <section id="gallery" className="scroll-mt-[5.85rem] bg-background px-[var(--spacing-margin-mobile)] py-16 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)] lg:py-20">
      <div className="mx-auto w-full max-w-[1240px]">
        <SectionReveal>
          <p className="type-label-caps text-center text-primary">Gallery</p>
        </SectionReveal>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {images?.map((src, index) => (
            <SectionReveal key={src} delay={index * 0.05} className="overflow-hidden rounded-sm">
              <img
                src={src}
                alt=""
                className="aspect-[3/4] h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.5]"
              />
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
