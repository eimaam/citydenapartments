import { SectionReveal } from './motionSection';

export const PhilosophySection = () => {
  return (
    <section className="relative overflow-hidden bg-surface-container px-[var(--spacing-margin-mobile)] py-24 lg:px-[var(--spacing-margin-desktop)] lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(160vw,860px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/[0.09] blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-[820px] text-center">
        <SectionReveal>
          <blockquote className="font-serif text-3xl font-normal leading-snug tracking-[-0.02em] text-on-surface not-italic md:text-5xl lg:text-[3.125rem]">
            <span className="italic">Designed</span> for comfort.&nbsp;<span className="italic">Built</span> for modern
            living.
          </blockquote>
          <p className="mx-auto mt-10 max-w-2xl type-body-lg text-secondary">
            Merging curated architecture with discreet five-star essentials, City Den reshapes urban living - where every
            space hums softly with comfort, purpose and light.
          </p>
        </SectionReveal>
      </div>
    </section>
  );
};
