import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const MotionAntButton = (motion as any).create(AntButton) as any;

const buttonStyles = cva(
  'bg-transparent! font-sans! shadow-none! flex! items-center! rounded-none! justify-center! gap-2! font-semibold! transition-all duration-400 focus:!outline-none focus:!ring-1 focus:!ring-primary/20 focus-visible:!outline-none disabled:pointer-events-none disabled:!cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary! text-on-primary! border-0! hover:bg-primary-container! hover:!text-on-primary-container! active:translate-y-0!',
        destructive: '!bg-error !text-on-error !border-0 hover:!bg-error/90',
        outline:
          'border! border-primary! bg-transparent! text-primary! hover:bg-surface-container-low! hover:!border-outline',
        secondary:
          'bg-surface-container! text-on-surface! hover:bg-surface-container-high! border! border-outline-variant',
        tertiary:
          'bg-tertiary-container! text-on-tertiary-container! hover:brightness-95! border-0',
        ghost:
          'border! border-transparent! shadow-none! hover:bg-surface-container-low! hover:border-outline-variant! text-on-surface-variant',
        link: 'text-primary! border-0! shadow-none! underline-offset-4! hover:underline! bg-transparent',
        filled: 'bg-surface! text-on-surface! hover:bg-surface-container! border-0',
      },
      size: {
        default: '!min-h-10 !px-5 !py-2 !text-sm !tracking-[0.02em]',
        sm: '!h-8 !px-4 !text-xs',
        md: '!h-9 !px-5 md:h-12! md:px-8! text-sm! md:!text-base',
        lg: '!h-12 !px-8 md:!h-14 md:!px-10 !text-sm md:!text-base',
        icon: '!h-10 !w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  },
);

interface ButtonProps
  extends Omit<AntButtonProps, 'size' | 'variant'>,
    VariantProps<typeof buttonStyles> {
  className?: string;
  icon?: React.ReactNode;
  htmlType?: 'button' | 'submit' | 'reset';
  animate?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      icon,
      htmlType = 'button',
      children,
      animate = true,
      ...props
    },
    ref,
  ) => {
    const antSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle';

    const shouldAnimate = animate && !props.disabled && !props.loading;

    return (
      <MotionAntButton
        className={cn(
          buttonStyles({ variant, size, fullWidth, className }),
        )}
        size={antSize}
        icon={icon}
        htmlType={htmlType}
        ref={ref}
        {...props}
        whileHover={shouldAnimate ? 'hover' : undefined}
        whileTap={shouldAnimate ? 'tap' : undefined}
        style={variant === 'default' && shouldAnimate ? { position: 'relative', overflow: 'hidden' } : {}}
      >
        {children}
      </MotionAntButton>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonStyles as buttonVariants };
