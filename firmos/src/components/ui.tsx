import type { ReactNode } from "react";

export function Card({ children, elevated = false, className = "" }: { children: ReactNode; elevated?: boolean; className?: string }) {
  return (
    <div
      className={`themed rounded-lg p-4 ${className}`}
      style={{
        background: elevated ? "var(--color-surface-elev)" : "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string; tone?: "success" | "warning" | "danger" | "info"; icon?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="text-2xl font-bold" style={{ color: tone ? `var(--color-${tone})` : "var(--color-text-primary)" }}>{value}</div>
        {icon && <span style={{ color: "var(--color-text-secondary)" }}>{icon}</span>}
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
      {sub && <div className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>{sub}</div>}
    </Card>
  );
}

/** Status badge — maps by MEANING to semantic tokens, never per-series colors. */
export function Badge({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) {
  const color = tone === "neutral" ? "var(--color-text-secondary)" : `var(--color-${tone})`;
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ color, border: `1px solid ${color}` }}
    >
      {children}
    </span>
  );
}

export function Button({
  children, kind = "secondary", disabled = false, type = "submit", formAction, onClick,
}: {
  children: ReactNode; kind?: "primary" | "secondary" | "danger-outline"; disabled?: boolean;
  type?: "submit" | "button"; formAction?: (formData: FormData) => void; onClick?: () => void;
}) {
  const base = "themed rounded-md px-4 py-2 text-sm font-semibold";
  const cls = kind === "primary" ? "btn-primary" : kind === "danger-outline" ? "btn-danger-outline" : "btn-secondary";
  return (
    <button type={type} disabled={disabled} formAction={formAction} onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">{children}</h1>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>{children}</div>;
}

export const toneForReadiness = (r: string) => (r === "ready" ? "success" : r === "pending" ? "warning" : "neutral") as "success" | "warning" | "neutral";
export const toneForDocStatus = (s: string) => (s === "filed" ? "success" : s === "review" ? "warning" : "info") as "success" | "warning" | "info";
export const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
