import React from 'react';
import { Card as AntCard } from 'antd';
import type { CardProps as AntCardProps } from 'antd';
import { cva } from 'class-variance-authority';
import { MotionDiv } from './MotionComponents';
import { cn } from '../../lib/utils';

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type CardShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type CardBorder = 'none' | 'solid' | 'dashed' | 'dotted';

const cardVariants = cva('overflow-hidden transition-all duration-300', {
  variants: {
    variant: {
      default: '!bg-surface-container-lowest !border !border-outline-variant hover:!border-outline hover:!shadow-ambient',
      outlined: '!bg-surface-container-lowest !border !border-outline-variant',
      elevated: '!bg-surface-container-lowest !border !border-outline-variant !shadow-card hover:!shadow-ambient',
    },
    rounded: {
      none: '!rounded-none',
      sm: '!rounded-sm',
      md: '!rounded-md',
      lg: '!rounded-lg',
      xl: '!rounded-xl',
    },
    padding: {
      none: '!p-0',
      sm: '!p-3',
      md: '!p-5',
      lg: '!p-6',
      xl: '!p-8',
    },
    border: {
      none: '!border-none',
      solid: '!border',
      dashed: '!border-dashed',
      dotted: '!border-dotted',
    },
    shadow: {
      none: '!shadow-none',
      sm: '!shadow-sm',
      md: '!shadow-md',
      lg: '!shadow-ambient',
      xl: '!shadow-ambient',
    },
  },
  defaultVariants: {
    variant: 'default',
    rounded: 'lg',
    padding: 'none',
    border: 'none',
  },
});

export interface CardProps extends Omit<AntCardProps, 'type' | 'variant'> {
  variant?: CardVariant;
  rounded?: CardRounded;
  padding?: CardPadding;
  animate?: boolean;
  shadow?: CardShadow;
  border?:   CardBorder;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const Card = ({
  className,
  children,
  animate = false,
  variant = 'default',
  rounded,
  padding,
  shadow,
  border,
  title,
  extra,
  bordered,
  hoverable = false,
  cover,
  actions,
  ref,
  ...props
}: CardProps) => {
  const cardStyles = cardVariants({
    variant: variant as CardVariant,
    rounded: rounded as CardRounded,
    padding: padding as CardPadding,
    shadow: shadow as CardShadow,
    border: border as CardBorder,
    className,
  });

  const cardContent = (
    <AntCard
      className={cn(cardStyles)}
      title={
        null
      }
      bordered={bordered}
      hoverable={hoverable}
      cover={cover}
      actions={actions}
      ref={ref}
      {...props}
    >
      {
        (title && !extra) ? <h3 className="text-xl md:text-2xl mb-4 font-serif font-medium tracking-tight text-on-surface">
        {title}
      </h3>:
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl md:text-2xl font-serif font-medium tracking-tight text-on-surface">
        {title}
      </h3>
        {extra}
      </div>
      }
      {children}
    </AntCard>
  );

  if (animate) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {cardContent}
      </MotionDiv>
    );
  }

  return cardContent;
};

export const { Meta: CardMeta } = AntCard;

type CardSpacing = 'none' | 'sm' | 'md' | 'lg';

const cardContentVariants = cva('card-content', {
  variants: {
    spacing: {
      none: 'mt-0',
      sm: 'mt-2',
      md: 'mt-4',
      lg: 'mt-6',
    },
  },
  defaultVariants: {
    spacing: 'md',
  },
});

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: CardSpacing;
  className?: string;
  children?: React.ReactNode;
}

export const CardContent = ({
  className,
  children,
  spacing = 'md',
  ...props
}: CardContentProps) => {
  const contentStyles = cardContentVariants({
    spacing: spacing as CardSpacing,
    className,
  });

  return (
    <div className={cn(contentStyles)} {...props}>
      {children}
    </div>
  );
};
