import { SectionReveal } from './motionSection';
import { amenities } from './data';

export const AmenitiesSection = () => {
  return (
    <section
      id="facilities"
      className="scroll-mt-[5.85rem] border-y border-outline-variant/55 bg-surface-container px-[var(--spacing-margin-mobile)] py-20 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)] lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <SectionReveal className="text-center">
          <p className="type-label-caps text-primary">Unparalleled Facilities</p>
        </SectionReveal>

        <div className="mt-16 grid grid-cols-2 gap-12 md:grid-cols-4 md:gap-8 lg:gap-12">
          {amenities?.map((amenity, index) => {
            const Icon = amenity.icon;

            return (
              <SectionReveal key={amenity.id} delay={index * 0.07} className="flex flex-col items-center">
                <div className='border-[0.3px] hover:border-1 border-outline-variant/40 p-2 hover:border-primary  transition-all ease-in-out duration-700'>

                <Icon className="size-9 text-primary" strokeWidth={1.15} />
                </div>
                <p className="mt-8 type-label-caps text-center text-[11px] text-on-surface-variant">{amenity.label}</p>
              </SectionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
