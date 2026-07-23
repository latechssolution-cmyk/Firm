"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };

const ThemeContext = createContext<Ctx>({ theme: "light", setTheme: () => {}, toggle: () => {} });

/** Inline blocking script injected in <head> — resolves theme before hydration (no flash). */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("firmos-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (current) setThemeState(current);
    // With no stored preference, keep listening live for OS changes.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("firmos-theme")) {
        const t: Theme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", t);
        setThemeState(t);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("firmos-theme", t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme((document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  }, [setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
