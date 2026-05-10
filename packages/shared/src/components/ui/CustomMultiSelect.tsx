import React from 'react';
import { Select as AntSelect } from 'antd';
import { cn } from '../../lib/utils';

interface IOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

interface CustomMultiSelectProps {
  options: IOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  size?: 'large' | 'middle' | 'small';
  disabled?: boolean;
  maxTagCount?: number;
}

const multiSelectClass =
  'w-full !min-h-10 !rounded-none !border-0 !border-b !border-outline-variant !bg-surface-container-low !text-on-surface hover:!border-outline focus-within:!border-primary';

export const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  className,
  size = 'middle',
  disabled,
  maxTagCount,
}) => (
  <AntSelect
    mode="multiple"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    options={options}
    className={cn(multiSelectClass, className)}
    size={size}
    disabled={disabled}
    maxTagCount={maxTagCount}
    style={{ width: '100%' }}
  />
);
