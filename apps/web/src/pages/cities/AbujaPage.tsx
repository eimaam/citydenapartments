import React, { useEffect, useState } from 'react';
import { Waves, Award, Dumbbell } from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { HeroEntrance, SectionReveal } from '../../components/marketing/motionSection';
import { BookingBar } from '../../components/marketing/BookingBar';
import { formatNGN } from '@citydenapartments/shared';
import { getRoomTypes } from '../../lib/api';
import type { PublicRoomType } from '../../lib/api';

export const AbujaPage = () => {
  const [suites, setSuites] = useState<PublicRoomType[]>([]);

  useEffect(() => {
    getRoomTypes('ABJ').then(setSuites).catch(() => {});
  }, []);

  const experiences = [
    {
      icon: Waves,
      title: 'Rooftop Infinity Pool',
      description: 'Enjoy the sunset pool overlooking Jabi Lake and the Abuja cityscape.',
    },
    {
      icon: Award,
      title: 'Executive Lounge',
      description: 'Private lounge for networking, working, and quiet relaxation.',
    },
    {
      icon: Dumbbell,
      title: '360 Gym',
      description: 'State-of-the-art equipment with floor-to-ceiling windows.',
    },
  ];

  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden bg-inverse-surface pt-24 md:min-h-[95vh]">
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 pb-20 text-center md:px-10">
          <HeroEntrance delay={0}>
            <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
              City Den — Abuja
            </h1>
          </HeroEntrance>
        </div>

        {/* Booking Bar */}
        <BookingBar currentCity="abuja" />
      </section>

      {/* Spacing for Booking Bar overlay */}
      <div className="h-16 md:h-20" />

      {/* The Location Info Section */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Left Address */}
            <SectionReveal className="flex flex-col border-l border-primary/40 pl-6">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE LOCATION</span>
              <p className="mt-3 font-serif text-sm leading-relaxed text-secondary">
                {suites[0]?.branch?.address || 'No 5 Audu Ogbe Street, Jabi Abuja.'}
              </p>
            </SectionReveal>

            {/* Right Intro Description */}
            <SectionReveal className="md:col-span-2">
              <p className="font-serif text-2xl md:text-3xl lg:text-[2.2rem] font-normal leading-[1.3] text-on-surface">
                A sanctuary of quiet luxury nestled between the <span className="font-bold">vibrant pulse</span> of the Nigerian capital and the serene waters of <span className="font-bold">Jabi Lake</span>. Our Abuja residence offers an editorial lifestyle where <span className="font-bold">modern architecture</span> meets cinematic tranquility.
              </p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Available Suites Section */}
      <section id="rooms" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="text-center mb-16">
            <h2 className="font-serif text-4xl font-normal italic tracking-tight text-on-surface md:text-5xl">
              Available Suites
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {suites.map((suite, index) => (
              <SectionReveal key={suite.id} delay={index * 0.08}>
                <article className="group flex flex-col bg-white border border-outline-variant/35 p-3 rounded-sm shadow-card hover:shadow-ambient transition-all duration-500">
                  <div className="overflow-hidden rounded-sm relative aspect-[4/3] w-full bg-surface-container-low">
                    <img
                      src={suite.images[0] || ''}
                      alt={suite.name}
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-6 flex flex-col px-2 pb-2">
                    <h3 className="font-serif text-2xl font-normal text-on-surface">
                      {suite.name}
                    </h3>
                    <p className="mt-3 text-sm text-secondary min-h-[40px]">
                      {suite.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-secondary/60 font-bold uppercase tracking-widest">STARTING FROM</span>
                        <span className="font-serif text-lg font-bold text-on-surface">{formatNGN(suite.basePrice)}<span className="text-xs font-normal text-secondary">/night</span></span>
                      </div>
                      <a
                        href="#contact"
                        className="text-xs font-bold tracking-widest text-[#735c00] hover:text-[#554300] border-b border-[#735c00]/30 hover:border-[#554300]/80 pb-0.5 uppercase transition-colors"
                      >
                        BOOK NOW
                      </a>
                    </div>
                  </div>
                </article>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Elevated Experiences Section */}
      <section id="facilities" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 items-center md:grid-cols-1">
            <div className="flex flex-col">
              <SectionReveal>
                <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-on-surface mb-8">
                  Elevated Experiences
                </h2>
              </SectionReveal>

              <div className="flex flex-col gap-8">
                {experiences.map((exp, index) => {
                  const Icon = exp.icon;
                  return (
                    <SectionReveal key={index} delay={index * 0.08} className="flex gap-4 border-b border-outline-variant/30 pb-6 last:border-0 last:pb-0">
                      <div className="shrink-0 flex items-center justify-center size-10 rounded-sm bg-[#735c00]/5 text-[#735c00]">
                        <Icon className="size-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-sans text-base font-bold text-on-surface">
                          {exp.title}
                        </h4>
                        <p className="mt-1 text-sm text-secondary leading-relaxed">
                          {exp.description}
                        </p>
                      </div>
                    </SectionReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>





      {/* Your Urban Sanctuary Awaits (CTA) */}
      <section className="relative w-full py-28 md:py-36 bg-inverse-surface overflow-hidden">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 mx-auto flex max-w-[700px] flex-col items-center px-6 text-center text-white">
          <SectionReveal>
            <h2 className="font-serif text-4xl md:text-5xl font-normal leading-tight">
              Your Urban Sanctuary Awaits
            </h2>
            <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed font-serif max-w-2xl mx-auto italic">
              Experience the best of Abuja in our luxury serviced apartments.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="!bg-[#735c00] hover:!bg-[#554300] !text-white !rounded-none font-bold tracking-widest text-xs px-8 py-4"
              >
                BOOK NOW
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white !text-white hover:bg-white/10 !rounded-none font-bold tracking-widest text-xs px-8 py-4"
              >
                EXPLORE SUITES
              </Button>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
};
