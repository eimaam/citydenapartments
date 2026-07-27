import { SectionReveal } from './motionSection';
import { Link } from 'react-router-dom';

interface GallerySectionProps {
  images: string[];
}

export const GallerySection = ({
  images,
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

        <SectionReveal className="mt-12 flex justify-center">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-on-surface hover:text-[#735c00] bg-transparent border border-on-surface/30 hover:border-[#735c00] py-4 px-12 transition-all uppercase rounded-none"
          >
            SEE ALL
          </Link>
        </SectionReveal>
      </div>
    </section>
  );
};
