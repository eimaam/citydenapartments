import React from 'react';
import { formatCompactNumber } from '../../utils/format';

interface MetricCardProps {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  className?: string;
}

export function MetricCard({ icon: Icon, label, value, sub, color, className = '' }: MetricCardProps) {
  const displayValue = typeof value === 'number' ? formatCompactNumber(value) : value;

  return (
    <div className={`border border-outline-variant/40 rounded-md p-3 md:px-4 hover:shadow-ambient transition-shadow duration-300 ${className}`}>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px] md:text-[11px] font-medium text-outline uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-on-surface tracking-tight leading-tight">{displayValue}</p>
      {sub && <p className="text-[10px] text-outline/60 mt-1 sm:mt-1.5">{sub}</p>}
    </div>
  );
}
