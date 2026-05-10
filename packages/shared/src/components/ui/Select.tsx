import React from 'react';
import { Select as AntSelect } from 'antd';
import type { SelectProps as AntSelectProps, RefSelectProps } from 'antd';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

type SelectVariant = 'default' | 'filled' | 'borderless';
type SelectSize = 'sm' | 'md' | 'lg';

const selectVariants = cva('w-full transition-all !border-0 !border-b !font-sans !text-on-surface !rounded-none !mt-1', {
  variants: {
    variant: {
      default:
        '!bg-surface-container-low !border-outline-variant hover:!border-outline focus:!border-primary',
      filled:
        '!bg-surface-container !border-outline-variant focus:!bg-surface-container-low focus:!border-primary',
      borderless: '!border-transparent !bg-transparent hover:!border-transparent !shadow-none',
    },
    size: {
      sm: '!h-9 !text-xs',
      md: '!h-11 md:!text-sm',
      lg: '!h-13 !text-base',
    },
    status: {
      error: '!border-error hover:!border-error focus:!border-error',
      warning: '!border-primary hover:!border-primary',
      success: '!border-secondary hover:!border-secondary',
    },
    disabled: {
      true: '!opacity-50 !cursor-not-allowed !bg-surface-container',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface BaseSelectProps {
  variant?: SelectVariant;
  size?: SelectSize;
  status?: 'error' | 'warning' | 'success';
  fullWidth?: boolean;
  className?: string;
}

export const Select = React.forwardRef<
  RefSelectProps,
  BaseSelectProps & Omit<AntSelectProps, 'size'>
>(({ className, variant, status, disabled, size, ...props }, ref) => {
  const antStatus = status as AntSelectProps['status'];

  return (
    <AntSelect
      className={cn(selectVariants({ variant, status, disabled, size }), className)}
      status={antStatus}
      disabled={disabled}
      ref={ref}
      {...props}
    />
  );
});

Select.displayName = 'Select';

export const { Option, OptGroup } = AntSelect;
