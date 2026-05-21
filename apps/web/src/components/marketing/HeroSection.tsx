import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { HeroEntrance } from './motionSection';
import { Button } from '@citydenapartments/shared';

interface HeroSectionProps {
  title?: React.ReactNode;
  tagline?: string;
  image?: string;
  showScrollIndicator?: boolean;
}

export const HeroSection = ({
  title = (
    <>
      City Den Apartments:
      <br />
      Premium Living Across <span className="text-primary-container">Nigeria</span>
    </>
  ),
  tagline = "Experience the pinnacle of urban comfort in Abuja, Kaduna & Maiduguri. Your home, your sanctuary.",
  image = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=80',
  showScrollIndicator = true,
}: HeroSectionProps) => {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-inverse-surface pt-[4.75rem] md:pt-24"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-inverse-surface/45 via-inverse-surface/55 to-inverse-surface/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-transparent to-inverse-surface/20" />

      <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 pb-28 text-center md:px-10">
        <HeroEntrance delay={0}>
          <h1 className="font-serif text-3xl md:text-display-xl font-medium leading-[1.12] tracking-[-0.02em] text-inverse-on-surface">
            {title}
          </h1>
        </HeroEntrance>

        <HeroEntrance delay={0.14} className="mt-6">
          <p className="text-sm md:text-lg italic mx-auto w-full text-inverse-on-surface/88 ">
            {tagline}
          </p>
        </HeroEntrance>

        <HeroEntrance delay={0.28} className="mt-12">
          <a
            href="#locations"
          >
            <Button
            size="lg"
            variant='outline'
            >

            EXPLORE LOCATIONS
            </Button>
          </a>
        </HeroEntrance>
      </div>

      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="type-label-caps text-[10px] text-inverse-on-surface/50">Scroll</span>
          <motion.div
            aria-hidden
            animate={reduce ? { y: 0 } : { y: [0, 8, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 2.25, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }
            }
          >
            <ChevronDown className="size-6 text-primary-container" strokeWidth={1.35} />
          </motion.div>
        </div>
      )}
    </section>
  );
};
