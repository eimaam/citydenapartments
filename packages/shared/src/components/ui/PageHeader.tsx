import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  extra,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn('mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between', className)}>
      <div className="space-y-2 max-w-3xl">
        <h1 className="type-headline-lg text-on-surface tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="type-body-md text-on-surface-variant leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {extra && (
        <div className="flex shrink-0 items-center">
          {extra}
        </div>
      )}
    </div>
  );
};
