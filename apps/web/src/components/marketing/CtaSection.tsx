import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@citydenapartments/shared';
import { SectionReveal } from './motionSection';

interface CtaSectionProps {
  title?: string;
  buttonText?: string;
}

export const CtaSection = ({
  title = "Ready to experience the City Den difference?",
  buttonText = "Choose your city",
}: CtaSectionProps) => {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-outline-variant/55 bg-background px-[var(--spacing-margin-mobile)] py-24 lg:px-[var(--spacing-margin-desktop)] lg:py-32">
      <SectionReveal className="mx-auto w-full max-w-[1240px] text-center">
        <h2 className="mx-auto max-w-3xl font-serif text-[2rem] font-normal leading-tight tracking-[-0.02em] text-on-surface md:text-5xl lg:text-[3.25rem]">
          {title}
        </h2>

        <motion.div
          className="mt-14 flex justify-center"
          whileHover={reduce ? undefined : { scale: 1.025 }}
          whileTap={reduce ? undefined : { scale: 0.985 }}
        >
          <Button
            size="lg"
            className="uppercase"
          >
            {buttonText}
          </Button>
        </motion.div>
      </SectionReveal>
    </section>
  );
};
