import type { ReactNode } from "react";

/** Native disclosure — expands a form/section without client JS. */
export function Collapsible({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <details className={className}>
      <summary className="themed inline-block cursor-pointer select-none rounded-md px-4 py-2 text-sm font-semibold btn-secondary">
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
