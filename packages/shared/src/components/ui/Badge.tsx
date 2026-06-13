import React from 'react';
import { cn } from '../../lib/utils';
import { BookingStatus, RoomStatus } from '../../types';

const colorMap: Record<string, string> = {
  [BookingStatus.Confirmed]:   'bg-blue-50 text-blue-700 border-blue-200',
  [BookingStatus.Checked_In]:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  [BookingStatus.Checked_Out]: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  [BookingStatus.Cancelled]:   'bg-red-50 text-red-600 border-red-200',
  [RoomStatus.Available]:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  [RoomStatus.Occupied]:       'bg-amber-50 text-amber-700 border-amber-200',
  [RoomStatus.Dirty]:          'bg-orange-50 text-orange-700 border-orange-200',
  [RoomStatus.Maintenance]:    'bg-red-50 text-red-600 border-red-200',
};

const labelMap: Record<string, string> = {
  [BookingStatus.Confirmed]:   'Confirmed',
  [BookingStatus.Checked_In]:  'Checked In',
  [BookingStatus.Checked_Out]: 'Checked Out',
  [BookingStatus.Cancelled]:   'Cancelled',
  [RoomStatus.Available]:      'Available',
  [RoomStatus.Occupied]:       'Occupied',
  [RoomStatus.Dirty]:          'Dirty',
  [RoomStatus.Maintenance]:    'Maintenance',
};

const fallbackColor = 'bg-zinc-100 text-zinc-600 border-zinc-200';

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface BadgeProps {
  status: string;
  label?: string;
  colorMap?: Record<string, string>;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  colorMap: customColorMap,
  className,
}) => {
  const effectiveColorMap = customColorMap ? { ...colorMap, ...customColorMap } : colorMap;
  const color = effectiveColorMap[status] ?? fallbackColor;
  const displayLabel = label ?? labelMap[status] ?? formatLabel(status);

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border', color, className)}>
      {displayLabel}
    </span>
  );
};

Badge.displayName = 'Badge';
