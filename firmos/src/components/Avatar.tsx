/** Initials avatar — deterministic tint from the name, no images needed. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const parts = name.replace(/^(Adv\.|Munshi)\s+/i, "").trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        background: "var(--color-muted-bg)", color: "var(--color-primary)",
        border: "1px solid var(--color-border-subtle)",
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
