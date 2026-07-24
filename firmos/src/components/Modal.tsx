"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Reusable, accessible modal — backdrop blur, fade/scale in, Escape + click-out
 *  to close, focus moves in on open. One consistent dialog for the whole app. */
export function Modal({
  open, onClose, title, description, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  if (!open) return null;
  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`themed modal-in w-full ${maxW} rounded-xl border p-0 outline-none`}
        style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-border-subtle)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5 pb-4" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-tight">{title}</h3>
            {description && <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="themed -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-muted-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t p-4" style={{ borderColor: "var(--color-border-subtle)" }}>{footer}</div>}
      </div>
    </div>
  );
}
