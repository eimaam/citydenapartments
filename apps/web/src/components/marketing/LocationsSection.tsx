import { Link } from 'react-router-dom';
import { SectionReveal } from './motionSection';
import { locations } from './data';

export const LocationsSection = () => {
  return (
    <section
      id="locations"
      className="scroll-mt-[5.85rem] bg-surface-container-low px-[var(--spacing-margin-mobile)] py-20 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)] lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <SectionReveal>
          <p className="type-label-caps text-primary">Our Destinations</p>
          <h2 className="mt-5 max-w-2xl font-serif text-4xl font-normal leading-[1.12] tracking-[-0.02em] text-on-surface md:text-5xl">
            Curated Sanctuaries in the Heart of the City
          </h2>
        </SectionReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3 lg:gap-10">
          {locations.map((location, index) => (
            <SectionReveal key={location.id} delay={index * 0.08}>
              <Link to={`/cities/${location.id}`}>
                <article className="group relative h-[min(88vw,520px)] w-full overflow-hidden rounded-sm bg-inverse-surface shadow-none transition-[transform,box-shadow] duration-500 ease-out hover:shadow-ambient hover:border-primary hover:border-2 md:h-[540px]">
                <img
                  src={location.imageUrl}
                  alt={location?.city}
                  className={`absolute inset-0 size-full object-cover transition-all duration-800  ease-out group-hover:scale-105 ${location.comingSoon ? 'grayscale-[0.9] opacity-95' : ''
                    }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/88 via-inverse-surface/15 to-inverse-surface/10" />

                <div className="absolute inset-x-0 bottom-0 p-7 pb-10 md:p-10">
                  <p className="font-serif text-4xl font-normal leading-none tracking-[-0.02em] text-inverse-on-surface md:text-[2.7rem]">
                    {location.city}
                  </p>
                  <p className="type-label-caps mt-5 text-[11px] text-primary-container">{location.tagline}</p>
                </div>
              </article>
              </Link>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
