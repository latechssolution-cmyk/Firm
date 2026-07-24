import type { ReactNode } from "react";

/** Consistent labelled form field: label (+ required mark) → control → hint. */
export function Field({ label, hint, required, children, className = "" }: {
  label: string; hint?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 flex items-center gap-1 font-medium" style={{ color: "var(--color-text-primary)" }}>
        {label}
        {required && <span aria-hidden style={{ color: "var(--color-danger)" }}>*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs" style={{ color: "var(--color-text-secondary)" }}>{hint}</span>}
    </label>
  );
}
