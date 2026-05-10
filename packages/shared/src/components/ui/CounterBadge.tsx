import React from 'react';
import { cn } from '../../lib/utils';
import { MotionDiv } from './MotionComponents';

interface CounterBadgeProps {
  count: number;
  className?: string;
  label?: string;
}

export const CounterBadge: React.FC<CounterBadgeProps> = ({ count, className, label }) => {
  return (
    <div className="flex flex-col items-center">
      <MotionDiv
        className={cn(
          'relative bg-primary-container p-[1px] rounded-sm',
          className,
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="bg-surface-container-lowest rounded-[1px] px-5 py-2 flex items-center justify-center border border-outline-variant">
          <span className="text-3xl font-serif font-normal text-primary">
            {count.toLocaleString()}
          </span>
        </div>
      </MotionDiv>
      {label && <span className="mt-3 type-label-caps text-on-surface-variant/80">{label}</span>}
    </div>
  );
};
