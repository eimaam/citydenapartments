import React from 'react';
import { Input as AntInput } from 'antd';
import type { InputProps as AntInputProps, InputRef } from 'antd';
import type { TextAreaProps } from 'antd/es/input/TextArea';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const { TextArea, Password, Search } = AntInput;

type InputVariant = 'default' | 'filled' | 'borderless';
type InputSize = 'sm' | 'md' | 'lg';

const inputVariants = cva(
  'w-full transition-all !border-0 !border-b !font-sans !text-on-surface !rounded-none placeholder:!text-on-surface-variant/60 !mt-1',
  {
    variants: {
      variant: {
        default:
          '!bg-surface-container-low !border-outline-variant hover:!border-outline focus:!border-primary focus:!shadow-none',
        filled:
          '!bg-surface-container !border-outline-variant focus:!bg-surface-container-low focus:!border-primary',
        borderless: '!border-transparent !bg-transparent !shadow-none',
      },
      size: {
        sm: '!min-h-9 !text-xs px-3',
        md: '!min-h-11 !text-sm px-4',
        lg: '!min-h-13 !text-base px-5',
      },
      status: {
        error: '!border-error hover:!border-error focus:!border-error !text-error',
        warning: '!border-primary hover:!border-primary',
        success: '!border-secondary focus:!border-secondary',
      },
      disabled: {
        true: '!opacity-50 !cursor-not-allowed !bg-surface-container',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BaseInputProps {
  variant?: InputVariant;
  size?: InputSize;
  status?: 'error' | 'warning' | 'success';
  fullWidth?: boolean;
  className?: string;
}

export const Input = React.forwardRef<InputRef, BaseInputProps & Omit<AntInputProps, 'size'>>(({
  className,
  variant,
  status,
  disabled,
  size,
  ...props
}, ref) => {
  const antStatus = status as AntInputProps['status'];

  return (
    <AntInput
      className={cn(inputVariants({ variant, status, disabled, size }), className)}
      status={antStatus}
      disabled={disabled}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export const Textarea = React.forwardRef<InputRef, BaseInputProps & Omit<TextAreaProps, 'size'>>(({
  className,
  variant,
  status,
  disabled,
  size,
  rows = 4,
  ...props
}, ref) => {
  const antStatus = status as AntInputProps['status'];

  return (
    <TextArea
      className={cn(inputVariants({ variant, status, disabled, size }), className)}
      status={antStatus}
      disabled={disabled}
      rows={rows}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export const PasswordInput = React.forwardRef<InputRef, BaseInputProps & Omit<AntInputProps, 'size'>>(({
  className,
  variant,
  status,
  disabled,
  size,
  ...props
}, ref) => {
  const antStatus = status as AntInputProps['status'];

  return (
    <Password
      className={cn(inputVariants({ variant, status, disabled, size }), className)}
      status={antStatus}
      disabled={disabled}
      ref={ref}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';


export const SearchInput = React.forwardRef<InputRef, BaseInputProps & Omit<AntInputProps, 'size'> & { onSearch?: (value: string) => void }>(({
  className,
  variant,
  status,
  disabled,
  size,
  onSearch,
  ...props
}, ref) => {
  const antStatus = status as AntInputProps['status'];

  return (
    <Search
      className={cn(inputVariants({ variant, status, disabled, size }), className)}
      status={antStatus}
      disabled={disabled}
      onSearch={onSearch}
      ref={ref}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';
