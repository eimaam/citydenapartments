import React from 'react';
import { MapPin, Phone, Mail, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionReveal } from '../components/marketing/motionSection';
import {
  BRANCH_CONTACTS,
  BRANCH_COORDINATES,
  MAP_EMBEDS,
} from '../data/branches';

const branches = [
  { ...BRANCH_CONTACTS.abuja, coords: BRANCH_COORDINATES.abuja, map: MAP_EMBEDS.abuja },
  { ...BRANCH_CONTACTS.kaduna, coords: BRANCH_COORDINATES.kaduna, map: MAP_EMBEDS.kaduna },
  { ...BRANCH_CONTACTS.maiduguri, coords: BRANCH_COORDINATES.maiduguri, map: MAP_EMBEDS.maiduguri },
];

export const ContactPage = () => {
  return (
    <div className="flex flex-col bg-[#FAF8F6]">
      {/* Hero */}
      <section className="relative flex min-h-[40vh] w-full flex-col items-center justify-center overflow-hidden bg-inverse-surface pt-24 md:min-h-[45vh]">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center px-6 text-center">
          <SectionReveal>
            <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-white">
              Contact Us
            </h1>
            <p className="mt-4 text-lg text-white/80 font-serif">
              Reach out to any of our locations
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Branch Contact Cards */}
      <section className="px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28">
        <div className="mx-auto w-full max-w-[1240px] grid grid-cols-1 gap-16 md:grid-cols-3">
          {branches.map((branch, index) => (
            <SectionReveal key={branch.code} delay={index * 0.1}>
              <div className="flex flex-col bg-white border border-outline-variant/35 rounded-sm shadow-card overflow-hidden">
                {/* Map */}
                <div className="h-48 w-full overflow-hidden">
                  <iframe
                    src={branch.map}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of City Den ${branch.name}`}
                  />
                </div>

                <div className="flex flex-col p-6 gap-5">
                  <h3 className="font-serif text-2xl font-normal text-on-surface">
                    City Den — {branch.name}
                  </h3>

                  <div className="flex items-start gap-3">
                    <MapPin className="size-4 shrink-0 mt-0.5 text-[#735c00]" strokeWidth={1.5} />
                    <p className="text-sm text-secondary leading-relaxed">{branch.address}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="size-4 shrink-0 mt-0.5 text-[#735c00]" strokeWidth={1.5} />
                    <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="text-sm text-secondary hover:text-[#735c00] transition-colors">
                      {branch.phone}
                    </a>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="size-4 shrink-0 mt-0.5 text-[#735c00]" strokeWidth={1.5} />
                    <a href={`mailto:${branch.email}`} className="text-sm text-secondary hover:text-[#735c00] transition-colors">
                      {branch.email}
                    </a>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="size-4 shrink-0 mt-0.5 text-[#735c00]" strokeWidth={1.5} />
                    <div className="flex flex-col text-sm text-secondary">
                      <span>Check-in: 14:00</span>
                      <span>Check-out: 12:00</span>
                    </div>
                  </div>

                  <Link
                    to={`/book?city=${branch.code.toLowerCase()}`}
                    className="mt-2 inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#735c00] hover:text-[#554300] uppercase border-b border-[#735c00]/30 hover:border-[#554300]/80 pb-0.5 w-fit transition-colors"
                  >
                    BOOK THIS LOCATION
                    <ArrowUpRight className="size-3.5" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* General Inquiry Section */}
      <section className="bg-[#F6F4F1] px-[var(--spacing-margin-mobile)] py-20 lg:px-[var(--spacing-margin-desktop)] lg:py-28 border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[700px] text-center">
          <SectionReveal>
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-on-surface">
              General Inquiries
            </h2>
            <p className="mt-4 text-sm text-secondary leading-relaxed">
              For reservations, partnerships, or general questions, reach out to our corporate team.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="mailto:info@citydenapartments.com"
                className="inline-flex items-center gap-2 text-sm text-[#735c00] hover:text-[#554300] font-medium transition-colors"
              >
                <Mail className="size-4" />
                info@citydenapartments.com
              </a>
              <a
                href="tel:+2348090009012"
                className="inline-flex items-center gap-2 text-sm text-[#735c00] hover:text-[#554300] font-medium transition-colors"
              >
                <Phone className="size-4" />
                +234 809 000 9012
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
};
