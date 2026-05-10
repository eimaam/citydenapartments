import React from 'react';
import { Logo } from '@citydenapartments/shared';

export const Footer = () => {
  return (
    <footer id="contact" className="scroll-mt-[5.85rem] w-full border-t border-outline-variant bg-surface-container px-[var(--spacing-margin-mobile)] pt-24 pb-12 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)]">
      <div className="mx-auto grid w-full max-w-[1240px] gap-16 md:grid-cols-4 md:gap-12 lg:gap-16">
        <div className="md:col-span-2 w-full">
          <Logo
          />
          <p className="w-full font-serif text-sm mt-2 leading-relaxed text-on-surface-variant">
            Crafting quiet luxury across Nigeria.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/70">
            © {new Date().getFullYear()} City Den Apartments Ltd.{' '} All rights reserved.
          </p>
        </div>

        <div className="font-sans grid grid-cols-1 gap-12 border-t border-outline-variant pt-10  md:border-t-0 md:pt-0 lg:justify-end lg:gap-24 xl:gap-36">
          <div className="sm:border-e sm:border-outline-variant sm:pe-12">
              <h4 className="font-bold text-base text-primary">Links</h4>
            <ul className="mt-4 space-y-3">
              <FooterLink href="#locations">Locations</FooterLink>
              <FooterLink href="#rooms">Rooms</FooterLink>
              <FooterLink href="#contact">Careers</FooterLink>
              <FooterLink href="#contact">Investor Relations</FooterLink>
            </ul>
          </div>

                    <div className="sm:border-e sm:border-outline-variant sm:pe-12">

              <h4 className="font-bold text-base text-primary">Socials</h4>

                        <ul className="mt-4 space-y-3">

              <FooterLink href="https://instagram.com/cityden_apartments_abuja">Instagram</FooterLink>
              <FooterLink href="#">Newsletter</FooterLink>
              <FooterLink href="#">Cookie Policy</FooterLink>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-14 w-full max-w-[1240px] border-t border-outline-variant pt-10">
        <p className="max-w-4xl text-[10px] font-sans leading-relaxed text-on-surface-variant/45">
          All imagery reflects representative interiors across City Den residences. Specifications, timelines, names, and finishes may evolve by location without notice.
        </p>
      </div>
    </footer>
  );
};

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <li className="list-none border-outline-variant/55  hover:underline transition-all duration-600 last:border-transparent last:pb-0">
    <a href={href} className="text-sm font-sans text-on-surface-variant/90 transition-colors hover:text-primary">
      {children}
    </a>
  </li>
);
