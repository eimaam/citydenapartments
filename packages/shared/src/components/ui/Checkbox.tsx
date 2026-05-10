import React from 'react';
import { Checkbox as AntCheckbox } from 'antd';
import type { CheckboxProps as AntCheckboxProps } from 'antd';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const checkboxVariants = cva(
  '[&_.ant-checkbox-inner]:!border-outline-variant [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-primary [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-primary [&_.ant-checkbox-inner]:!rounded-sm [&_.ant-checkbox-checked_.ant-checkbox-inner:after]:!border-on-primary',
  {
    variants: {
      tone: {
        default: '',
        /** Slightly larger hit target for dense legal / form rows */
        comfortable: '!mt-1.5',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export interface CheckboxProps
  extends AntCheckboxProps,
    VariantProps<typeof checkboxVariants> {
  className?: string;
}

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof AntCheckbox>,
  CheckboxProps
>(({ className, tone, ...props }, ref) => (
  <AntCheckbox ref={ref} className={cn(checkboxVariants({ tone }), className)} {...props} />
));

Checkbox.displayName = 'Checkbox';
