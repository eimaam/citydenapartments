import React from 'react';
import { Modal as AntModal } from 'antd';
import type { ModalProps as AntModalProps, ModalFuncProps } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import type { Variants, Transition } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

type ModalVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface ModalProps
  extends Omit<
    AntModalProps,
    | 'open'
    | 'onCancel'
    | 'footer'
    | 'closable'
    | 'centered'
    | 'width'
    | 'maskClosable'
    | 'mask'
    | 'destroyOnClose'
  > {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
  showCloseButton?: boolean;
  className?: string;
  footer?: React.ReactNode;
  centered?: boolean;
  variant?: ModalVariant;
  maskClosable?: boolean;
  destroyOnHidden?: boolean;
}
const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
    } as Transition,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    } as Transition,
  },
};

export const Modal: React.FC<ModalProps> & {
  confirm: (props: ModalFuncProps) => void;
  info: (props: ModalFuncProps) => void;
  success: (props: ModalFuncProps) => void;
  error: (props: ModalFuncProps) => void;
  warning: (props: ModalFuncProps) => void;
} = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subTitle,
  children,
  width = 500,
  showCloseButton = true,
  className,
  footer,
  centered = true,
  variant = 'default',
  maskClosable = true,
  ...antModalProps
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-secondary';
      case 'warning':
        return 'border-primary';
      case 'danger':
        return 'border-error';
      case 'info':
        return 'border-outline';
      default:
        return 'border-outline-variant';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <AntModal
          {...antModalProps}
          open={isOpen}
          onCancel={onClose}
          footer={null}
          closable={false}
          centered={centered}
          width={width}
          maskClosable={maskClosable}
          mask
          styles={{ mask: { backdropFilter: 'blur(2px)' } }}
          wrapClassName="!bg-transparent"
          className="[&_.ant-modal-content]:!p-0 md:[&_.ant-modal-content]:!p-0"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            className={cn(
              '!bg-surface-container-lowest !py-8 !p-4 !shadow-ambient',
              '!border !border-outline-variant',
              '!rounded-lg',
              getVariantStyles(),
              className,
            )}
          >
            {(title || showCloseButton) && (
              <div
                className={cn('mb-6', title ? 'px-3 md:px-4' : 'py-0!')}
              >
                <div className={cn('flex items-start justify-between gap-4')}>
                  <div>
                    {title && (
                      <h3 className="text-xl md:text-2xl font-serif font-normal text-on-surface tracking-tight leading-tight">{title}</h3>
                    )}
                  </div>
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="!text-on-surface-variant hover:!text-on-surface p-1 mt-1"
                    >
                      <X size={24} />
                    </Button>
                  )}
                </div>
                {subTitle && (
                  <p className="mt-2 type-body-sm text-on-surface-variant leading-relaxed">{subTitle}</p>
                )}
              </div>
            )}

            <div className="px-3 md:px-4 py-2 text-base font-sans text-on-surface-variant leading-relaxed">{children}</div>

            {footer !== null && (
              <footer className="mt-8 flex flex-col-reverse md:flex-row gap-3 md:justify-end px-3 md:px-4">
                {footer ? (
                  footer
                ) : (
                  <>
                    {!showCloseButton ? null : (
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          onClose();
                        }}
                        {...(antModalProps.cancelButtonProps as object)}
                      >
                        {antModalProps.cancelText || 'Cancel'}
                      </Button>
                    )}
                    <Button
                      className={cn('mt-2', !showCloseButton && 'w-full')}
                      onClick={(e) => {
                        onConfirm?.(e);
                        antModalProps.onOk?.(e as never);
                      }}
                      {...(antModalProps.okButtonProps as object)}
                    >
                      {antModalProps.okText || 'OK'}
                    </Button>
                  </>
                )}
              </footer>
            )}
          </motion.div>
        </AntModal>
      )}
    </AnimatePresence>
  );
};

Modal.confirm = (props) => AntModal.confirm({
  ...props,
  className: cn('custom-modal-confirm', props.className),
  centered: true,
});

Modal.info = (props) => AntModal.info({
  ...props,
  centered: true,
});

Modal.success = (props) => AntModal.success({
  ...props,
  centered: true,
});

Modal.error = (props) => AntModal.error({
  ...props,
  centered: true,
});

Modal.warning = (props) => AntModal.warning({
  ...props,
  centered: true,
});
