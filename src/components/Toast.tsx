"use client";

/**
 * Minimal toast system. Wrap a tree in <ToastProvider> and call useToast().
 * Used to give immediate feedback on actions (apply, invite, save, hire…).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{
  show: (message: string, tone?: ToastTone) => void;
} | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "bg-foreground text-white",
  error: "bg-danger text-white",
  info: "bg-foreground text-white",
};

const toneIcon: Record<ToastTone, IconName> = {
  success: "check",
  error: "warning",
  info: "info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live so screen readers announce action feedback, which they
          previously never did. Sits above the mobile bottom bar, and drops to
          a normal offset once that bar is gone at md. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-5 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-control px-4 py-3 text-sm font-medium shadow-overlay",
              toneStyles[t.tone],
            )}
          >
            <Icon name={toneIcon[t.tone]} className="h-4 w-4" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a `show(message, tone)` function. No-ops outside a provider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {} };
}
