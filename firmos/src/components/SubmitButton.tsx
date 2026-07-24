"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** Submit button that shows a spinner + disables while the server action runs. */
export function SubmitButton({ children, kind = "primary", className = "" }: { children: ReactNode; kind?: "primary" | "secondary" | "danger-outline"; className?: string }) {
  const { pending } = useFormStatus();
  const cls = kind === "primary" ? "btn-primary" : kind === "danger-outline" ? "btn-danger-outline" : "btn-secondary";
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className={`themed ${cls} inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${className}`}>
      {pending && (
        <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
