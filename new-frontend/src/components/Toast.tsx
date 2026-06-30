import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info, Undo2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  toastWithUndo: (message: string, undoAction: () => void, undoLabel?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {}, toastWithUndo: () => {} });
export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000, undoAction?: () => void, undoLabel?: string) => {
    const id = toastId++;
    setToasts(prev => [...prev, { id, type, message, duration, undoAction, undoLabel }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, duration + 400);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    addToast(message, type, duration);
  }, [addToast]);

  const toastWithUndo = useCallback((message: string, undoAction: () => void, undoLabel = 'Undo', duration = 8000) => {
    addToast(message, 'success', duration, undoAction, undoLabel);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, toastWithUndo }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const toastStyles: Record<ToastType, { color: string; bg: string; border: string; icon: typeof Check }> = {
  success: { color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: Check },
  error: { color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: X },
  info: { color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', icon: Info },
  warning: { color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: AlertCircle },
};

const MAX_VISIBLE = 3;

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const visible = toasts.slice(0, MAX_VISIBLE);
  const hiddenCount = toasts.length - MAX_VISIBLE;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }} role="status" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {visible.map(item => (
          <ToastMessage key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {hiddenCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto text-center py-1.5 rounded-xl text-[10px] font-medium"
            style={{
              background: "var(--bg-glass-strong)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-muted)",
            }}
          >
            +{hiddenCount} more notification{hiddenCount > 1 ? "s" : ""}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const style = toastStyles[item.type];
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.color}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 20px ${style.bg}`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className="h-4 w-4 shrink-0" style={{ color: style.color }} />
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{item.message}</p>
        {item.undoAction && (
          <button
            onClick={() => { item.undoAction?.(); onDismiss(item.id); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors"
            style={{ color: style.color, background: style.bg }}
          >
            <Undo2 className="h-3 w-3" />
            {item.undoLabel || 'Undo'}
          </button>
        )}
        <button
          onClick={() => onDismiss(item.id)}
          className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <motion.div
        className="h-0.5"
        style={{ background: style.color }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: item.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}
