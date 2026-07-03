import React, { useEffect, useState } from 'react';
import { Wifi, ArrowUpRight } from 'lucide-react';
import { SectionReveal } from '../../components/marketing/motionSection';
import { BookingBar } from '../../components/marketing/BookingBar';
import { formatNGN } from '@citydenapartments/shared';
import { getRoomTypes } from '../../lib/api';
import type { PublicRoomType } from '../../lib/api';

export const KadunaPage = () => {
  const [suites, setSuites] = useState<PublicRoomType[]>([]);

  useEffect(() => {
    getRoomTypes('KAD').then(setSuites).catch(() => {});
  }, []);

  const landmarks = [
    {
      title: 'Kaduna Golf Club',
      description: '10 Mins Drive — 18-Hole Golf Course',
    },
    {
      title: 'Gamji Park',
      description: '15 Mins Drive — Scenic Park along the Kaduna River',
    },
    {
      title: 'Kaduna Museum',
      description: '12 Mins Drive — Historical & Heritage Exhibition',
    },
  ];

  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden bg-inverse-surface pt-24 pb-20 md:min-h-[95vh]">
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 text-center md:px-10">
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
            City Den Apartments — Kaduna
          </h1>
        </div>

        {/* Booking Bar */}
        <BookingBar currentCity="kaduna" />
      </section>

      {/* Spacing for Booking Bar overlay */}
      <div className="h-16 md:h-20" />

      {/* The Retreat Section */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 items-stretch md:grid-cols-2">
            {/* Left Column (Content & Address) */}
            <div className="flex flex-col justify-between">
              <SectionReveal className="flex flex-col">
                <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE RETREAT</span>
                <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-on-surface">
                  A Retreat into Tranquility
                </h2>
                <p className="mt-8 font-serif text-lg leading-relaxed text-secondary italic">
                  Situated in the prestigious G.R.A Kaduna, our apartments offer a retreat from the hustle and bustle of the metropolis. Calm, quiet and serene, the sight is a soothing, and the luxury of flat in the space is supreme.
                </p>
              </SectionReveal>

              <SectionReveal className="mt-12 md:mt-0 border-t border-outline-variant/40 pt-6">
                <p className="font-sans text-xs font-bold text-secondary uppercase tracking-widest">LOCATION ADDRESS</p>
                <p className="mt-2 font-serif text-sm text-on-surface">
                  {suites[0]?.branch?.address || 'Plot 24, 26 & 28 Turunku Road, off Inuwa Wada Road, Ungwan Rimi, Kaduna'}
                </p>
              </SectionReveal>
            </div>


          </div>
        </div>
      </section>

      {/* Select Your Suite Section */}
      <section id="rooms" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="flex items-end justify-between mb-16 border-b border-outline-variant/30 pb-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">STANDARD CONCORDANCE</span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-on-surface md:text-4xl">
                Select Your Suite
              </h2>
            </div>
            <a
              href="#rooms"
              className="type-label-caps group inline-flex items-center gap-2 text-[10px] font-bold text-[#735c00] hover:text-[#554300]"
            >
              VIEW ALL ({suites.length})
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </a>
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

      {/* Curated Facilities */}
      <section id="facilities" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="text-center mb-16">
            <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE EXPERIENCE</span>
            <h2 className="mt-2 font-serif text-4xl font-normal text-on-surface">
              Curated Facilities
            </h2>
          </SectionReveal>

          <div className="flex justify-center">
            <SectionReveal className="flex flex-col justify-center bg-white border border-outline-variant/35 rounded-sm p-8 shadow-card hover:shadow-ambient transition-all duration-500 max-w-md">
              <div className="size-10 rounded-sm bg-[#735c00]/5 text-[#735c00] flex items-center justify-center mb-4">
                <Wifi className="size-5" />
              </div>
              <h4 className="font-sans text-base font-bold text-on-surface uppercase tracking-widest">
                Fiber Optic Connectivity
              </h4>
              <p className="mt-2 text-sm text-secondary leading-relaxed">
                High-speed connection throughout the entire estate.
              </p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Local Landmarks (Neighborhood) Section */}
      <section className="bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28 border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {/* Left Header Column */}
            <SectionReveal className="flex flex-col border-l border-primary/40 pl-6">
              <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">G.R.A NEIGHBORHOOD</span>
              <h2 className="mt-3 font-serif text-3xl font-normal text-on-surface md:text-4xl">
                Local Landmarks
              </h2>
              <p className="mt-4 text-sm text-secondary max-w-xs leading-relaxed">
                Explore the culture and serenity of Kaduna from our peaceful location.
              </p>
            </SectionReveal>

            {/* Right List Column */}
            <div className="md:col-span-2 flex flex-col gap-8 md:pl-10">
              {landmarks.map((landmark, index) => (
                <SectionReveal key={index} delay={index * 0.08} className="flex flex-col border-b border-outline-variant/30 pb-6 last:border-0 last:pb-0">
                  <h4 className="font-serif text-xl font-normal text-on-surface">
                    {landmark.title}
                  </h4>
                  <p className="mt-2 text-sm text-secondary leading-relaxed">
                    {landmark.description}
                  </p>
                </SectionReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
