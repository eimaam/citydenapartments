import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

const iconMap: Record<ToastType, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, { bg: string; text: string; border: string; icon: string }> = {
  success: { bg: 'var(--color-surface-container-lowest)', text: 'var(--color-on-surface)', border: '#10b981', icon: '#10b981' },
  error:   { bg: 'var(--color-surface-container-lowest)', text: 'var(--color-on-surface)', border: '#ef4444', icon: '#ef4444' },
  warning: { bg: 'var(--color-surface-container-lowest)', text: 'var(--color-on-surface)', border: '#f59e0b', icon: '#f59e0b' },
  info:    { bg: 'var(--color-surface-container-lowest)', text: 'var(--color-on-surface)', border: '#3b82f6', icon: '#3b82f6' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[1050] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          const colors = colorMap[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-[420px] animate-in slide-in-from-right-2 fade-in"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                color: colors.text,
                borderLeftWidth: '3px',
              }}
            >
              <div style={{ color: colors.icon, flexShrink: 0, marginTop: 1 }}>
                <Icon size={18} />
              </div>
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 p-0.5 rounded text-outline hover:text-on-surface cursor-pointer bg-transparent border-none"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
