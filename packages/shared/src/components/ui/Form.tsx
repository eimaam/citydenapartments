import React from 'react';
import { Form as AntForm } from 'antd';
import type { FormProps as AntFormProps, FormItemProps as AntFormItemProps } from 'antd';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const { Item, List, useForm, useWatch, ErrorList, Provider } = AntForm;

type FormVariant = 'default' | 'inline' | 'floating';
type FormItemVariant = 'default' | 'bordered' | 'underlined';

const formVariants = cva('w-full transition-all', {
  variants: {
    variant: {
      default: 'space-y-4',
      inline: 'flex flex-wrap gap-4 items-end',
      floating: 'space-y-6',
    },
    size: {
      small: 'text-sm',
      middle: 'text-base',
      large: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'middle',
  },
});

const formItemVariants = cva('w-full', {
  variants: {
    variant: {
      default: '',
      bordered: 'border border-outline-variant rounded-md p-4',
      underlined: 'border-b border-outline-variant pb-4',
    },
    required: {
      true: '',
    },
    status: {
      error: 'border-error',
      warning: 'border-primary',
      success: 'border-secondary',
    },
  },
  compoundVariants: [
    {
      variant: 'bordered',
      required: true,
      className:
        'relative pl-6 before:content-["*"] before:absolute before:left-2 before:top-4 before:text-error before:text-lg',
    },
    {
      variant: 'underlined',
      required: true,
      className:
        'relative pl-6 before:content-["*"] before:absolute before:left-2 before:top-0 before:text-error before:text-lg',
    },
  ],
  defaultVariants: {
    variant: 'default',
  },
});

export interface FormProps<Values = Record<string, unknown>>
  extends Omit<AntFormProps<Values>, 'variant'> {
  variant?: FormVariant;
  className?: string;
  children?: React.ReactNode;
}

export interface FormItemProps extends Omit<AntFormItemProps, 'status'> {
  variant?: FormItemVariant;
  className?: string;
  status?: 'error' | 'warning' | 'success';
  children?: React.ReactNode;
}

export const Form = <Values extends Record<string, unknown> = Record<string, unknown>>({
  className,
  variant,
  size,
  children,
  ...props
}: FormProps<Values>) => {
  const antdSize: AntFormProps<Values>['size'] =
    size === 'medium' ? 'middle' : (size as AntFormProps<Values>['size']);
  const layoutSize: 'small' | 'middle' | 'large' =
    size === 'medium' || size == null
      ? 'middle'
      : size === 'small' || size === 'middle' || size === 'large'
        ? size
        : 'middle';

  return (
    <AntForm
      className={cn(formVariants({ variant, size: layoutSize }), className)}
      size={antdSize}
      {...props}
    >
      {children}
    </AntForm>
  );
};

export const FormItem = ({
  className,
  variant,
  required,
  status,
  children,
  ...props
}: FormItemProps) => {
  const validateStatus = status as AntFormItemProps['validateStatus'];

  return (
    <Item
      className={cn(formItemVariants({ variant, required, status }), className)}
      required={required}
      validateStatus={validateStatus}
      {...props}
    >
      {children}
    </Item>
  );
};

export { List, useForm, useWatch, ErrorList, Provider };

export const FormLabel = ({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('type-label-caps block text-on-surface mb-1.5', className)} {...props}>
    {children}
  </label>
);

Form.Item = FormItem;
Form.List = List;
Form.useForm = useForm;
Form.useWatch = useWatch;
Form.ErrorList = ErrorList;
Form.Provider = Provider;
Form.Label = FormLabel;
