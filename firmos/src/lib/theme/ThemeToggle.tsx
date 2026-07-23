"use client";

import { useTheme } from "./ThemeProvider";

/** Theme toggle — demonstrates default/hover/active/focus/disabled in both themes. */
export function ThemeToggle({ disabled = false }: { disabled?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="themed rounded-md px-3 py-1.5 text-sm font-medium"
      style={{
        background: "var(--color-muted-bg)",
        color: "var(--color-text-primary)",
        border: "1px solid var(--color-border-subtle)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.borderColor = "var(--color-border-interactive)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-subtle)";
      }}
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
