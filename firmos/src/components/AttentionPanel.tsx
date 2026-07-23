import Link from "next/link";
import { Card } from "@/components/ui";
import { IconAlert, IconClock, IconCheck } from "@/components/icons";
import type { AttentionItem } from "@/lib/insights";

const dot: Record<string, string> = { high: "var(--color-danger)", medium: "var(--color-warning)", low: "var(--color-info)" };
const label: Record<string, string> = { high: "Now", medium: "Soon", low: "Watch" };

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const shown = items.slice(0, 8);
  const highCount = items.filter((i) => i.priority === "high").length;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <IconClock size={18} /> Needs Attention Today
        </h2>
        <span className="text-xs font-semibold" style={{ color: highCount ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
          {items.length === 0 ? "All clear" : `${highCount} urgent · ${items.length} total`}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <IconCheck size={28} />
          <span>Nothing needs attention. Every hearing is prepared, no deadlines loom, fees are current.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shown.map((it, i) => (
            <Link key={i} href={it.href}
              className="themed flex items-start gap-3 rounded-md border p-2.5 no-underline"
              style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot[it.priority] }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{it.title}</span>
                <span className="block truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{it.detail}</span>
              </span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ color: dot[it.priority], border: `1px solid ${dot[it.priority]}` }}>
                {label[it.priority]}
              </span>
            </Link>
          ))}
          {items.length > shown.length && (
            <div className="pt-1 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
              + {items.length - shown.length} more
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export { IconAlert };
