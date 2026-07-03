import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo, Button, cn } from '@citydenapartments/shared';
import { Menu } from 'lucide-react';

const navLinks: { label: string; href: string }[] = [
  { label: 'Locations', href: '#locations' },
  { label: 'Rooms', href: '#rooms' },
  { label: 'Facilities', href: '#facilities' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '#contact' },
];

export const Navbar = () => {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === '/';
  const overHero = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-colors duration-500 ease-out',
        overHero
          ? 'border-transparent bg-transparent'
          : 'border-b border-outline-variant bg-surface/92 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-[4.75rem] w-full max-w-[1440px] items-center justify-between gap-4 px-[var(--spacing-margin-mobile)] md:h-24 lg:px-[var(--spacing-margin-desktop)]">
        <Link to="/" className="relative z-[60] shrink-0 outline-none ring-primary/30 focus-visible:ring-2">
          <Logo
            className={cn(!overHero && 'text-on-surface')}
          />
        </Link>

        <nav
          aria-label="Primary"
          className="absolute left-1/2 hidden -translate-x-1/2 xl:flex xl:gap-11"
        >
          {navLinks.map((item) => {
            const href = !isHome && item.href === '#locations' ? '/#locations' : item.href;
            return (
              <a
                key={item.href}
                href={href}
                className={cn(
                  'type-label-caps text-[11px] transition-colors duration-300',
                  overHero
                    ? 'text-inverse-on-surface/88 hover:text-primary-container'
                    : 'text-on-surface-variant hover:text-primary',
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="relative z-[60] flex items-center gap-3">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className={cn(
              'flex size-10 items-center justify-center rounded-sm border transition-colors xl:hidden',
              overHero
                ? 'border-inverse-on-surface/25 text-inverse-on-surface hover:bg-inverse-on-surface/10'
                : 'border-outline-variant text-on-surface hover:bg-surface-container-low',
            )}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <Link to="/book">
            <Button
              size="md"
              variant="outline"
              className={cn(
                '',
                overHero && '!bg-primary-container !text-on-primary-container hover:!brightness-95',
              )}
            >
              BOOK NOW
            </Button>
          </Link>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          'border-t border-outline-variant bg-surface transition-all duration-300 xl:hidden',
          menuOpen ? 'max-h-[320px] opacity-100' : 'max-h-0 overflow-hidden border-transparent opacity-0',
          overHero && menuOpen && 'border-outline-variant/40 bg-inverse-surface/95 backdrop-blur-md',
        )}
      >
        <div className="flex flex-col gap-1 px-[var(--spacing-margin-mobile)] py-4">
          {navLinks.map((item) => {
            const href = !isHome && item.href === '#locations' ? '/#locations' : item.href;
            return (
              <a
                key={item.href}
                href={href}
                className={cn(
                  'type-label-caps py-3 text-[11px]',
                  overHero ? 'text-inverse-on-surface/90' : 'text-on-surface-variant',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </header>
  );
};
