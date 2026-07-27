import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@citydenapartments/shared';

export const Footer = () => {
  return (
    <footer id="contact" className="scroll-mt-[5.85rem] w-full border-t border-outline-variant bg-surface-container px-[var(--spacing-margin-mobile)] pt-24 pb-12 md:scroll-mt-[6.25rem] lg:px-[var(--spacing-margin-desktop)]">
      <div className="mx-auto grid w-full max-w-[1240px] gap-12 grid-cols-1 md:grid-cols-5">
        <div className="md:col-span-2 w-full">
          <Logo />
          <p className="w-full font-serif text-sm mt-4 leading-relaxed text-[#4D4635] w-full">
            Redefining the urban retreat through architecture and the art of silence. Nestled within tranquil pockets of West Africa's most dynamic cities.
          </p>
          <p className="mt-8 text-xs leading-relaxed text-[#4D4635]/50">
            © {new Date().getFullYear()} City Den Apartments. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Locations</h4>
          <ul className="space-y-3">
            <FooterLink href="/cities/abuja">Abuja</FooterLink>
            <FooterLink href="/cities/kaduna">Kaduna</FooterLink>
            <FooterLink href="/cities/maiduguri">Maiduguri</FooterLink>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Connect</h4>
          <ul className="space-y-3">
            <FooterLink href="https://instagram.com/cityden_apartments_abuja" target="_blank" rel="noopener noreferrer">Instagram</FooterLink>
            <FooterLink href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</FooterLink>
            <FooterLink href="#">Newsletter</FooterLink>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Legal</h4>
          <ul className="space-y-3">
            <FooterLink href="#">Privacy Policy</FooterLink>
            <FooterLink href="#">Terms of Service</FooterLink>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-14 w-full max-w-[1240px] border-t border-outline-variant pt-10">
        <p className="max-w-4xl text-[10px] font-sans leading-relaxed text-[#4D4635]/45">
          All imagery reflects representative interiors across City Den residences. Specifications, timelines, names, and finishes may evolve by location without notice.
        </p>
      </div>
    </footer>
  );
};

const FooterLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: any }) => {
  const isInternal = href.startsWith('/');
  return (
    <li className="list-none hover:underline transition-all duration-300">
      {isInternal ? (
        <Link to={href} className="text-sm font-sans text-[#4D4635]/90 transition-colors hover:text-primary" {...props}>
          {children}
        </Link>
      ) : (
        <a href={href} className="text-sm font-sans text-[#4D4635]/90 transition-colors hover:text-primary" {...props}>
          {children}
        </a>
      )}
    </li>
  );
};

