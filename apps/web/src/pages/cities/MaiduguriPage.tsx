import React, { useState } from 'react';
import { Waves, Dumbbell, Coffee } from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { SectionReveal } from '../../components/marketing/motionSection';
import { BookingBar } from '../../components/marketing/BookingBar';

export const MaiduguriPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

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
          <SectionReveal className="mb-4 inline-flex items-center gap-1.5 border border-primary-container/40 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-container rounded-full">
            <span>★</span> OPENING SOON
          </SectionReveal>
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white mt-4">
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

      {/* Be the First to Arrive (Waitlist CTA) */}
      <section id="contact" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] px-[var(--spacing-margin-mobile)] py-24 lg:px-[var(--spacing-margin-desktop)] lg:py-32">
        <div className="mx-auto w-full max-w-[820px] text-center">
          <SectionReveal>
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-on-surface">
              Be the First to Arrive
            </h2>
            <p className="mt-6 text-base text-secondary leading-relaxed max-w-2xl mx-auto italic">
              Join our exclusive waitlist for Maiduguri and receive early access to booking, opening night invitations, and seasonal membership benefits.
            </p>

            {submitted ? (
              <div className="mt-12 p-6 border border-[#735c00]/30 bg-[#735c00]/5 rounded-sm max-w-md mx-auto text-on-surface">
                <p className="font-bold text-base text-[#735c00]">Thank you for joining our waitlist!</p>
                <p className="text-sm mt-1 text-secondary">We will contact you with exclusive previews and access details.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-12 flex flex-col md:flex-row items-end gap-6 max-w-2xl mx-auto">
                <div className="flex flex-col w-full text-left">
                  <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="YOUR@EMAIL.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full border-b border-outline-variant/60 bg-transparent py-3 font-sans text-sm outline-none placeholder-on-surface-variant/30 text-on-surface focus:border-[#735c00] transition-colors"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-auto shrink-0 !bg-[#735c00] hover:!bg-[#554300] !text-white !rounded-none font-bold tracking-widest text-xs py-4 px-8"
                >
                  JOIN THE WAITLIST
                </Button>
              </form>
            )}
          </SectionReveal>
        </div>
      </section>
    </div>
  );
};
