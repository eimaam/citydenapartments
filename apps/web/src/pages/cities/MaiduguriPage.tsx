import React from 'react';
import { Waves, Dumbbell, Coffee } from 'lucide-react';
import { SectionReveal } from '../../components/marketing/motionSection';
import { BookingBar } from '../../components/marketing/BookingBar';

export const MaiduguriPage = () => {
  const expectations = [
    {
      icon: Waves,
      title: 'Infinity Oasis',
      description: 'A rooftop horizon pool overlooking the city skyline, designed for sunset contemplation.',
    },
    {
      icon: Dumbbell,
      title: 'The Kinetic Lab',
      description: '24-hour private fitness suite featuring high-end equipment and personal wellness tools.',
    },
    {
      icon: Coffee,
      title: 'The Indigo Lounge',
      description: 'A curated social space serving rare regional blends and international artisan coffee.',
    },
  ];

  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden bg-inverse-surface pt-24 pb-20 md:min-h-[95vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1545324224-fa8b6a84d48a?auto=format&fit=crop&w=2000&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 text-center md:px-10">
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
            City Den Apartments
            <br />
            <span className="italic text-primary-container font-light">Maiduguri</span>
          </h1>
        </div>

        {/* Booking Bar */}
        <BookingBar currentCity="maiduguri" />
      </section>

      {/* Spacing for Booking Bar overlay */}
      <div className="h-16 md:h-20" />

      {/* The Brand Promise Section */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 items-stretch md:grid-cols-2">
            {/* Left Column (Content & Stats) */}
            <div className="flex flex-col justify-between">
              <SectionReveal className="flex flex-col">
                <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE BRAND PROMISE</span>
                <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-on-surface">
                  The Quiet Luxury of the Savannah
                </h2>
                <p className="mt-8 font-serif text-lg leading-relaxed text-secondary italic">
                  Designed for the modern nomad and the discerning professional, City Den Maiduguri harmonizes the brutalist elegance of urban architecture with the warm, sweeping vistas of the Northern plains. Every suite is a sanctuary of silence, curated with artisanal textures and cinematic views.
                </p>
              </SectionReveal>

              {/* Stats Layout */}
              <SectionReveal className="mt-12 md:mt-0 grid grid-cols-2 gap-8 border-t border-outline-variant/40 pt-8">
                <div className="flex flex-col">
                  <span className="font-serif text-5xl md:text-6xl font-light text-on-surface">42</span>
                  <span className="text-[9px] font-bold tracking-widest text-secondary/70 uppercase mt-2">EXECUTIVE SUITES</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-serif text-5xl md:text-6xl font-light text-on-surface">01</span>
                  <span className="text-[9px] font-bold tracking-widest text-secondary/70 uppercase mt-2">SIGNATURE LOUNGE</span>
                </div>
              </SectionReveal>
            </div>

            {/* Right Column (Image) */}
            <SectionReveal className="rounded-sm overflow-hidden h-[450px] md:h-full shadow-ambient min-h-[500px]">
              <img
                src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80"
                alt="Maiduguri bedroom overlooking plains"
                className="size-full object-cover"
              />
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* What to Expect Section */}
      <section id="facilities" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28 border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="flex items-end justify-between mb-16 border-b border-outline-variant/30 pb-6">
            <h2 className="font-serif text-3xl font-normal text-on-surface md:text-4xl">
              What to Expect
            </h2>
            <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">
              EXCLUSIVITY DEFINED
            </span>
          </SectionReveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {expectations.map((exp, index) => {
              const Icon = exp.icon;
              return (
                <SectionReveal key={index} delay={index * 0.08} className="flex flex-col bg-white border border-outline-variant/35 p-8 rounded-sm shadow-card hover:shadow-ambient transition-all duration-500">
                  <div className="size-12 rounded-sm bg-[#735c00]/5 text-[#735c00] flex items-center justify-center mb-6">
                    <Icon className="size-6" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-sans text-base font-bold text-on-surface uppercase tracking-widest">
                    {exp.title}
                  </h4>
                  <p className="mt-3 text-sm text-secondary leading-relaxed">
                    {exp.description}
                  </p>
                </SectionReveal>
              );
            })}
          </div>
        </div>
      </section>


    </div>
  );
};
