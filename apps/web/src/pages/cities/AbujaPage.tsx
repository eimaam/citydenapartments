import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, Award, Dumbbell, Navigation } from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { HeroEntrance, SectionReveal } from '../../components/marketing/motionSection';
import { BookingBar } from '../../components/marketing/BookingBar';
import { formatNGN } from '@citydenapartments/shared';
import { getRoomTypes } from '../../lib/api';
import type { PublicRoomType } from '../../lib/api';
import { SEOHead } from '../../components/SEOHead';
import {
  BRANCH_COORDINATES,
  BRANCH_CONTACTS,
  MAP_EMBEDS,
  HERO_IMAGES,
  FALLBACK_SUITE_IMAGE,
  LANDMARKS,
  calculateDistance,
  getDriveTimeMinutes,
} from '../../data/branches';

const city = 'abuja';

export const AbujaPage = () => {
  const [suites, setSuites] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImg, setHeroImg] = useState(HERO_IMAGES[city]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRoomTypes('ABJ')
      .then((data) => { setSuites(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const { lat, lng } = BRANCH_COORDINATES[city];
  const landmarks = LANDMARKS[city].map((lm) => {
    const dist = calculateDistance(lat, lng, lm.lat, lm.lng);
    return { ...lm, distanceKm: dist, driveMin: getDriveTimeMinutes(dist) };
  });

  const experiences = [
    {
      icon: Waves, title: 'Rooftop Infinity Pool',
      description: 'Enjoy the sunset pool overlooking Jabi Lake and the Abuja cityscape.',
    },
    {
      icon: Award, title: 'Executive Lounge',
      description: 'Private lounge for networking, working, and quiet relaxation.',
    },
    {
      icon: Dumbbell, title: '360 Gym',
      description: 'State-of-the-art equipment with floor-to-ceiling windows.',
    },
  ];

  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      <SEOHead
        title="Abuja"
        description="Luxury serviced apartments in Abuja — Jabi. Premium accommodation near Jabi Lake with world-class amenities for business and leisure travelers."
        canonical="/cities/abuja"
      />
      {/* Hero Section */}
      <section className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden pt-24 md:min-h-[75vh]">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            className="size-full object-cover"
            onError={() => setHeroImg(FALLBACK_SUITE_IMAGE)}
          />
        </div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 pb-20 text-center md:px-10">
          <HeroEntrance delay={0}>
            <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
              City Den — Abuja
            </h1>
          </HeroEntrance>
        </div>

        <BookingBar currentCity={city} />
      </section>

      <div className="h-16 md:h-20" />

      {/* Location Info Section */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <SectionReveal className="flex flex-col border-l border-primary/40 pl-6">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE LOCATION</span>
              <p className="mt-3 font-serif text-sm leading-relaxed text-secondary">
                {suites[0]?.branch?.address || BRANCH_CONTACTS[city].address}
              </p>
            </SectionReveal>
            <SectionReveal className="md:col-span-2">
              <p className="font-serif text-2xl md:text-3xl lg:text-[2.2rem] font-normal leading-[1.3] text-on-surface">
                A sanctuary of quiet luxury nestled between the <span className="font-bold">vibrant pulse</span> of the Nigerian capital and the serene waters of <span className="font-bold">Jabi Lake</span>. Our Abuja residence offers an editorial lifestyle where <span className="font-bold">modern architecture</span> meets cinematic tranquility.
              </p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="px-[var(--spacing-margin-mobile)] pb-20 lg:px-[var(--spacing-margin-desktop)] lg:pb-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="overflow-hidden rounded-sm shadow-card">
            <iframe
              src={MAP_EMBEDS[city]}
              width="100%"
              height="400"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of City Den Apartments ${BRANCH_CONTACTS[city].name}`}
              className="w-full"
            />
          </SectionReveal>
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

          {loading ? (
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] w-full rounded-sm bg-surface-container-high" />
                  <div className="mt-6 h-6 w-3/4 rounded bg-surface-container-high" />
                  <div className="mt-3 h-4 w-full rounded bg-surface-container-high" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-surface-container-high" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-secondary">Unable to load suites at this time.</p>
              <button
                onClick={() => {
                  setLoading(true); setError(null);
                  getRoomTypes('ABJ').then(setSuites).catch((e) => setError(e.message)).finally(() => setLoading(false));
                }}
                className="mt-4 text-xs font-bold tracking-widest text-[#735c00] underline hover:text-[#554300] uppercase"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {suites.map((suite, index) => (
                <SectionReveal key={suite.id} delay={index * 0.08}>
                  <article className="group flex flex-col bg-white border border-outline-variant/35 p-3 rounded-sm shadow-card hover:shadow-ambient transition-all duration-500">
                    <div className="overflow-hidden rounded-sm relative aspect-[4/3] w-full bg-surface-container-low">
                      <img
                        src={suite.images[0] || FALLBACK_SUITE_IMAGE}
                        alt={suite.name}
                        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_SUITE_IMAGE;
                        }}
                      />
                    </div>
                    <div className="mt-6 flex flex-col px-2 pb-2">
                      <h3 className="font-serif text-2xl font-normal text-on-surface">{suite.name}</h3>
                      <p className="mt-3 text-sm text-secondary min-h-[40px]">{suite.description}</p>
                      <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-secondary/60 font-bold uppercase tracking-widest">STARTING FROM</span>
                          <span className="font-serif text-lg font-bold text-on-surface">{formatNGN(suite.basePrice)}<span className="text-xs font-normal text-secondary">/night</span></span>
                        </div>
                        <Link to="/book?city=abuja" className="text-xs font-bold tracking-widest text-[#735c00] hover:text-[#554300] border-b border-[#735c00]/30 hover:border-[#554300]/80 pb-0.5 uppercase transition-colors">
                          BOOK NOW
                        </Link>
                      </div>
                    </div>
                  </article>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Elevated Experiences Section */}
      <section id="facilities" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
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
                    <h4 className="font-sans text-base font-bold text-on-surface">{exp.title}</h4>
                    <p className="mt-1 text-sm text-secondary leading-relaxed">{exp.description}</p>
                  </div>
                </SectionReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Local Landmarks Section */}
      <section className="bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28 border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <SectionReveal className="flex flex-col border-l border-primary/40 pl-6">
              <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">JABI NEIGHBORHOOD</span>
              <h2 className="mt-3 font-serif text-3xl font-normal text-on-surface md:text-4xl">
                Local Landmarks
              </h2>
              <p className="mt-4 text-sm text-secondary max-w-xs leading-relaxed">
                Explore the best of Abuja from our prime Jabi location.
              </p>
            </SectionReveal>

            <div className="md:col-span-2 flex flex-col gap-8 md:pl-10">
              {landmarks.map((lm, index) => (
                <SectionReveal key={index} delay={index * 0.08} className="flex items-start gap-4 border-b border-outline-variant/30 pb-6 last:border-0 last:pb-0">
                  <div className="shrink-0 mt-1 flex size-9 items-center justify-center rounded-sm bg-[#735c00]/5 text-[#735c00]">
                    <Navigation className="size-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <div>
                      <h4 className="font-serif text-xl font-normal text-on-surface">{lm.name}</h4>
                      <p className="mt-1 text-sm text-secondary leading-relaxed">{lm.description}</p>
                    </div>
                    <span className="mt-2 sm:mt-0 shrink-0 text-xs font-bold text-[#735c00] uppercase tracking-widest whitespace-nowrap">
                      {lm.driveMin} min drive
                    </span>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
              <Link to="/book?city=abuja">
                <Button size="lg" className="!bg-[#735c00] hover:!bg-[#554300] !text-white !rounded-none font-bold tracking-widest text-xs px-8 py-4">
                  BOOK NOW
                </Button>
              </Link>
              <Link to="/cities/abuja#rooms">
                <Button size="lg" variant="outline" className="border-white !text-white hover:bg-white/10 !rounded-none font-bold tracking-widest text-xs px-8 py-4">
                  EXPLORE SUITES
                </Button>
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
};


