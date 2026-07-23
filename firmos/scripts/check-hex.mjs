#!/usr/bin/env node
/**
 * check:hex — no raw hex/rgb color literal outside src/styles/tokens.css (PRD §9.7.5/§9.7.9).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const ALLOW = new Set([path.join("styles", "tokens.css")]);
const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
const RGB = /\brgba?\(/g;

let failures = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|css|jsx?)$/.test(e.name)) continue;
    const rel = path.relative(root, p);
    if (ALLOW.has(rel)) continue;
    const src = fs.readFileSync(p, "utf-8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      // ignore URLs/anchors: only flag likely color usage
      const hexes = (line.match(HEX) ?? []).filter((h) => /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{8}$/.test(h));
      if (hexes.length && !line.includes("http")) {
        console.error(`✗ ${rel}:${i + 1} raw hex ${hexes.join(", ")}`);
        failures++;
      }
      if (RGB.test(line)) {
        console.error(`✗ ${rel}:${i + 1} raw rgb()/rgba()`);
        failures++;
      }
      RGB.lastIndex = 0;
    });
  }
}
walk(root);

if (failures) {
  console.error(`\ncheck:hex FAILED — ${failures} raw color literal(s) outside tokens.css.`);
  process.exit(1);
}
console.log("check:hex passed — no color literals outside tokens.css.");
