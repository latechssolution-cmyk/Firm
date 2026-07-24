import type { ReactNode } from "react";
import Link from "next/link";

/** A Link styled exactly like a Button — keeps navigation actions on-brand. */
export function LinkButton({ href, children, kind = "primary", className = "" }: {
  href: string; children: ReactNode; kind?: "primary" | "secondary"; className?: string;
}) {
  const cls = kind === "primary" ? "btn-primary" : "btn-secondary";
  return (
    <Link href={href} className={`themed ${cls} inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold no-underline ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, elevated = false, hover = false, className = "" }: { children: ReactNode; elevated?: boolean; hover?: boolean; className?: string }) {
  return (
    <div
      className={`themed card rounded-2xl p-5 ${hover ? "card-hover" : ""} ${className}`}
      style={{
        background: elevated ? "var(--color-surface-elev)" : "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon, featured = false }: { label: string; value: ReactNode; sub?: string; tone?: "success" | "warning" | "danger" | "info"; icon?: ReactNode; featured?: boolean }) {
  if (featured) {
    return (
      <div className="themed card card-hover rounded-2xl p-5" style={{ background: "var(--color-accent-surface)", color: "var(--color-on-accent)", border: "1px solid transparent", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ opacity: 0.85 }}>{label}</div>
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--color-on-accent) 18%, transparent)" }}>{icon}</span>
          )}
        </div>
        <div className="mt-2 text-[28px] font-bold leading-none tracking-tight">{value}</div>
        {sub && <div className="mt-1.5 text-xs" style={{ opacity: 0.8 }}>{sub}</div>}
      </div>
    );
  }
  return (
    <Card hover>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "var(--color-muted-bg)", color: "var(--color-primary)" }}>{icon}</span>
        )}
      </div>
      <div className="mt-2 text-[28px] font-bold leading-none tracking-tight" style={{ color: tone ? `var(--color-${tone})` : "var(--color-text-primary)" }}>{value}</div>
      {sub && <div className="mt-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{sub}</div>}
    </Card>
  );
}

/** Status badge — maps by MEANING to semantic tokens, never per-series colors.
 *  Soft tinted fill (color-mix) reads gentler than a hard outline. */
export function Badge({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) {
  const color = tone === "neutral" ? "var(--color-text-secondary)" : `var(--color-${tone})`;
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}
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
  const base = "themed rounded-full px-4 py-2 text-sm font-semibold";
  const cls = kind === "primary" ? "btn-primary" : kind === "danger-outline" ? "btn-danger-outline" : "btn-secondary";
  return (
    <button type={type} disabled={disabled} formAction={formAction} onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{children}</h1>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>{children}</div>;
}

/** Section heading inside a card — consistent weight/size across the app. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-bold">{children}</h2>
      {right}
    </div>
  );
}

export const toneForReadiness = (r: string) => (r === "ready" ? "success" : r === "pending" ? "warning" : "neutral") as "success" | "warning" | "neutral";
export const toneForDocStatus = (s: string) => (s === "filed" ? "success" : s === "review" ? "warning" : "info") as "success" | "warning" | "info";
export const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
