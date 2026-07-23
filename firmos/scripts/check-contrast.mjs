#!/usr/bin/env node
/**
 * check:contrast — WCAG AA gate (PRD §9.7.3). Fails the build if any pairing
 * actually used by the UI is below threshold:
 *   body text ≥ 4.5:1 · large-text/UI components ≥ 3:1 · interactive borders ≥ 3:1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tokensFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "styles", "tokens.css");
const css = fs.readFileSync(tokensFile, "utf-8");

function parseTheme(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
  return out;
}
const lightBlock = css.match(/:root,\s*:root\[data-theme="light"\]\s*{([^}]+)}/)?.[1] ?? "";
const darkBlock = css.match(/:root\[data-theme="dark"\]\s*{([^}]+)}/)?.[1] ?? "";
const themes = { light: parseTheme(lightBlock), dark: parseTheme(darkBlock) };

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// (foreground, background, minimum, description) — pairs actually used in the UI.
const CHECKS = [
  ["color-text-primary", "color-bg", 4.5, "body text on page background"],
  ["color-text-primary", "color-surface", 4.5, "body text on cards"],
  ["color-text-primary", "color-surface-elev", 4.5, "body text on elevated surfaces"],
  ["color-text-primary", "color-muted-bg", 4.5, "body text on muted panels"],
  ["color-text-secondary", "color-bg", 4.5, "secondary text on page background"],
  ["color-text-secondary", "color-surface", 4.5, "secondary text on cards"],
  ["color-text-secondary", "color-surface-elev", 4.5, "secondary text on elevated surfaces"],
  ["color-text-secondary", "color-muted-bg", 4.5, "secondary text on muted panels"],
  ["color-on-primary", "color-primary", 4.5, "button label on primary"],
  ["color-on-primary", "color-primary-hover", 4.5, "button label on primary hover"],
  ["color-link", "color-bg", 4.5, "link text on page background"],
  ["color-link", "color-surface", 4.5, "link text on cards"],
  ["color-border-interactive", "color-bg", 3.0, "input border on page background (1.4.11)"],
  ["color-border-interactive", "color-surface", 3.0, "input border on cards (1.4.11)"],
  ["color-border-interactive", "color-surface-elev", 3.0, "input border on elevated surfaces (1.4.11)"],
  ["color-primary", "color-bg", 3.0, "focus ring on page background (1.4.11)"],
  ["color-primary", "color-surface", 3.0, "focus ring on cards (1.4.11)"],
  // Status colors are used as badge text/borders (UI components) on surface & bg.
  ["color-success", "color-surface", 3.0, "success badge on cards"],
  ["color-success", "color-bg", 3.0, "success badge on page background"],
  ["color-warning", "color-surface", 3.0, "warning badge on cards"],
  ["color-warning", "color-bg", 3.0, "warning badge on page background"],
  ["color-danger", "color-surface", 3.0, "danger badge on cards"],
  ["color-danger", "color-bg", 3.0, "danger badge on page background"],
  ["color-info", "color-surface", 3.0, "info badge on cards"],
  ["color-info", "color-bg", 3.0, "info badge on page background"],
];

let failures = 0;
for (const [themeName, tokens] of Object.entries(themes)) {
  for (const [fg, bg, min, desc] of CHECKS) {
    const f = tokens[fg];
    const b = tokens[bg];
    if (!f || !b) { console.error(`✗ [${themeName}] missing token: ${!f ? fg : bg}`); failures++; continue; }
    const r = ratio(f, b);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} [${themeName}] ${desc}: ${f} on ${b} = ${r.toFixed(2)}:1 (min ${min}:1)`);
  }
}

if (failures) {
  console.error(`\ncheck:contrast FAILED — ${failures} pairing(s) below WCAG AA. Fix tokens.css before shipping.`);
  process.exit(1);
}
console.log(`\ncheck:contrast passed — every used pairing meets WCAG AA in both themes.`);
