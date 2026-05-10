import cdLogo from '../../assets/images/logo.png';

import { cn } from '../../lib/utils'

export type ILogoProps = {
  className?: string
  label?: string
  size?: 'sm' | 'md'
}

export const Logo = ({ className, label, size = 'md' }: ILogoProps) => {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-sans font-bold text-on-surface', className)}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface ring-1 ring-primary/10',
          size === 'sm' ? 'size-8' : 'size-10'
        )}
        aria-hidden
      >
        <img
          src={cdLogo}
          alt="Logo"
          width={40}
          height={40}
          className="size-full object-contain p-0.5"
          decoding="async"
        />
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            'text-[11px] font-normal tracking-[0.22em] md:text-[12px]',
          )}
        >
          CITY DEN
        </span>
        <span
          className={cn(
            'text-[11px] font-normal tracking-[0.22em] md:text-[12px]',
          )}
        >
          APARTMENTS
        </span>
      </span>

    </span>
  )
}
