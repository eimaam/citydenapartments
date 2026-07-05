import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionReveal } from './motionSection';
import { formatNGN } from '@citydenapartments/shared';
import type { ISuiteCard } from './types';

const FALLBACK_SUITE_IMAGE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

interface SuitesSectionProps {
  suites?: ISuiteCard[];
  title?: string;
}

export const SuitesSection = ({
  suites: suitesProp = [],
  title = "Signature Suites",
}: SuitesSectionProps) => {
  return (
    <section
      id="rooms"
      className="scroll-mt-[5.85rem] bg-background px-[var(--spacing-margin-mobile)] py-20 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)] lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <SectionReveal className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-4xl font-normal leading-[1.12] tracking-[-0.02em] text-on-surface md:text-5xl lg:text-[3rem]">
            {title}
          </h2>
          <Link
            to="/book"
            className="type-label-caps group inline-flex items-center gap-2 text-[11px] text-primary transition-colors hover:text-primary-container"
          >
            VIEW ALL ROOMS
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </Link>
        </SectionReveal>

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-3 lg:gap-12 xl:gap-16">
          {suitesProp.map((suite, index) => (
            <SectionReveal key={suite.id} delay={index * 0.06}>
              <article className="group flex flex-col">
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={suite.imageUrl || FALLBACK_SUITE_IMAGE}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.2]"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_SUITE_IMAGE }}
                  />
                </div>
                <h3 className="mt-8 font-serif text-3xl font-normal tracking-tight text-on-surface">{suite.title}</h3>
                <p className="mt-5 type-body-md text-secondary">{suite.description}</p>
                <Link
                  to="/book"
                  className="type-label-caps mt-8 inline-flex w-fit items-center gap-1 border-b border-primary/40 pb-0.5 text-[11px] text-primary transition-colors hover:border-primary-container hover:text-primary-container"
                >
                  from {formatNGN(suite.price)}
                </Link>
              </article>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
