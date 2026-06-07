import React from 'react';
import { Drawer as AntDrawer } from 'antd';
import type { DrawerProps as AntDrawerProps } from 'antd';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

interface DrawerProps extends Omit<AntDrawerProps, 'size' | 'onClose'> {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: DrawerSize;
  footer?: React.ReactNode;
  className?: string;
}

const sizeMap: Record<DrawerSize, number> = {
  sm: 380,
  md: 520,
  lg: 680,
  xl: 860,
};

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  className,
  ...props
}) => {
  return (
    <AntDrawer
      open={open}
      onClose={onClose}
      title={null}
      width={sizeMap[size]}
      closeIcon={null}
      destroyOnClose
      footer={null}
      styles={{ body: { padding: 0 } }}
      className={cn(
        '[&_.ant-drawer-content]:!bg-surface-container-lowest',
        '[&_.ant-drawer-header]:!border-outline-variant',
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        {title && (
          <h2 className="font-serif text-lg text-on-surface">{title}</h2>
        )}
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer bg-transparent border-none"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          {footer}
        </div>
      )}
    </AntDrawer>
  );
};

Drawer.displayName = 'Drawer';
