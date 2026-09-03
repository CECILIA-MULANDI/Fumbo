"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckIcon, InfoIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  duration?: number | null;
};

type Toast = ToastInput & { id: string; variant: Variant };

type PushFn = (variant: Variant, input: ToastInput) => string;

const ToastCtx = createContext<{
  push: PushFn;
  dismiss: (id: string) => void;
} | null>(null);

const DEFAULT_DURATION = 5000;
const MAX_STACK = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<PushFn>(
    (variant, input) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const toast: Toast = { ...input, id, variant };
      setToasts((prev) => [...prev, toast].slice(-MAX_STACK));
      const duration = input.duration ?? DEFAULT_DURATION;
      if (duration !== null) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:top-24 sm:w-104"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return useMemo(
    () => ({
      success: (input: ToastInput) => ctx.push("success", input),
      error: (input: ToastInput) => ctx.push("error", input),
      info: (input: ToastInput) => ctx.push("info", input),
      dismiss: ctx.dismiss,
    }),
    [ctx],
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const iconClass = "size-5 shrink-0";
  const icon =
    toast.variant === "success" ? (
      <CheckIcon className={cn(iconClass, "text-accent")} />
    ) : toast.variant === "error" ? (
      <XIcon className={cn(iconClass, "text-destructive")} />
    ) : (
      <InfoIcon className={cn(iconClass, "text-muted-foreground")} />
    );

  const borderClass =
    toast.variant === "success"
      ? "border-accent/50"
      : toast.variant === "error"
      ? "border-destructive/50"
      : "border-border";

  const bgClass =
    toast.variant === "success"
      ? "bg-accent/10"
      : toast.variant === "error"
      ? "bg-destructive/10"
      : "bg-card";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        borderClass,
        bgClass,
      )}
      role="status"
    >
      <span className="mt-1">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-snug text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1.5 text-sm leading-[1.55] text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="mt-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
    </motion.div>
  );
}
