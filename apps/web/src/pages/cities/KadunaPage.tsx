import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, Navigation } from 'lucide-react';
import { SectionReveal } from '../../components/marketing/motionSection';
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
  FALLBACK_HERO,
  FALLBACK_SUITE_IMAGE,
  LANDMARKS,
  calculateDistance,
  getDriveTimeMinutes,
} from '../../data/branches';

const city = 'kaduna';

export const KadunaPage = () => {
  const [suites, setSuites] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImg, setHeroImg] = useState(HERO_IMAGES[city]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRoomTypes('KAD')
      .then((data) => { setSuites(data.map(s => ({ ...s, images: [...s.images].sort(() => Math.random() - 0.5) }))); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const { lat, lng } = BRANCH_COORDINATES[city];
  const landmarks = LANDMARKS[city].map((lm) => {
    const dist = calculateDistance(lat, lng, lm.lat, lm.lng);
    return { ...lm, distanceKm: dist, driveMin: getDriveTimeMinutes(dist) };
  });

  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      <SEOHead
        title="Kaduna"
        description="Luxury serviced apartments in Kaduna — G.R.A. Premium accommodation in the heart of Kaduna with world-class amenities and serene surroundings."
        canonical="/cities/kaduna"
      />
      {/* Hero Section */}
      <section className="relative flex min-h-[70vh] w-full flex-col items-center justify-center pt-24 md:min-h-[75vh]">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            className="size-full object-cover"
            onError={() => setHeroImg(FALLBACK_HERO)}
          />
        </div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 text-center md:px-10">
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
            City Den Apartments — Kaduna
          </h1>
        </div>

        <BookingBar currentCity={city} />
      </section>

      <div className="h-16 md:h-20" />

      {/* The Retreat Section */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 items-stretch md:grid-cols-2">
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
                  {suites[0]?.branch?.address || BRANCH_CONTACTS[city].address}
                </p>
              </SectionReveal>
            </div>
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

      {/* Select Your Suite Section */}
      <section id="rooms" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="flex items-end justify-between mb-16 border-b border-outline-variant/30 pb-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">STANDARD CONCORDANCE</span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-on-surface md:text-4xl">Select Your Suite</h2>
            </div>
            <span className="type-label-caps inline-flex items-center gap-2 text-[10px] font-bold text-[#735c00]">
              VIEW ALL ({suites.length})
            </span>
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
                  getRoomTypes('KAD').then(setSuites).catch((e) => setError(e.message)).finally(() => setLoading(false));
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
                        <Link to="/book?city=kaduna" className="text-xs font-bold tracking-widest text-[#735c00] hover:text-[#554300] border-b border-[#735c00]/30 hover:border-[#554300]/80 pb-0.5 uppercase transition-colors">
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

      {/* Curated Facilities */}
      <section id="facilities" className="scroll-mt-[5.85rem] md:scroll-mt-[6.25rem] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <SectionReveal className="text-center mb-16">
            <span className="text-[11px] font-bold tracking-widest text-primary uppercase">THE EXPERIENCE</span>
            <h2 className="mt-2 font-serif text-4xl font-normal text-on-surface">Curated Facilities</h2>
          </SectionReveal>
          <div className="flex justify-center">
            <SectionReveal className="flex flex-col justify-center bg-white border border-outline-variant/35 rounded-sm p-8 shadow-card hover:shadow-ambient transition-all duration-500 max-w-md">
              <div className="size-10 rounded-sm bg-[#735c00]/5 text-[#735c00] flex items-center justify-center mb-4">
                <Wifi className="size-5" />
              </div>
              <h4 className="font-sans text-base font-bold text-on-surface uppercase tracking-widest">Fiber Optic Connectivity</h4>
              <p className="mt-2 text-sm text-secondary leading-relaxed">High-speed connection throughout the entire estate.</p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Local Landmarks Section */}
      <section className="bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28 border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <SectionReveal className="flex flex-col border-l border-primary/40 pl-6">
              <span className="text-[11px] font-bold tracking-widest text-[#7F7663] uppercase">G.R.A NEIGHBORHOOD</span>
              <h2 className="mt-3 font-serif text-3xl font-normal text-on-surface md:text-4xl">Local Landmarks</h2>
              <p className="mt-4 text-sm text-secondary max-w-xs leading-relaxed">
                Explore the culture and serenity of Kaduna from our peaceful location.
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
    </div>
  );
};
