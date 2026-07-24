"use client";

import { useState } from "react";

type Slice = { label: string; count: number; pct: number };

// Palette drawn from tokens so it stays on-theme; emerald primary leads, then
// supporting hues. All via CSS vars — no literals.
const RING_VARS = ["--color-primary", "--color-info", "--color-warning", "--color-success", "--color-danger", "--color-text-secondary"];

/** Animated, hoverable donut for the case-by-court breakdown. */
export function Donut({ slices, total }: { slices: Slice[]; total: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const r = 52, c = 2 * Math.PI * r, size = 140;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted-bg)" strokeWidth="14" />
          {slices.map((s, i) => {
            const frac = s.count / (total || 1);
            const dash = frac * c;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={`var(${RING_VARS[i % RING_VARS.length]})`}
                strokeWidth={hover === i ? 18 : 14}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-width 160ms ease-out, stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)", opacity: hover === null || hover === i ? 1 : 0.4 }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold leading-none">{hover === null ? total : slices[hover].count}</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            {hover === null ? "cases" : slices[hover].label}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.map((s, i) => (
          <button type="button" key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left text-xs"
            style={{ background: hover === i ? "var(--color-muted-bg)" : "transparent" }}>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(${RING_VARS[i % RING_VARS.length]})` }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-semibold" style={{ color: "var(--color-text-secondary)" }}>{s.count} · {s.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
