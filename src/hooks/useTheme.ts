"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "mastermap:theme";

const getSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useTheme = () => {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const frame = window.requestAnimationFrame(() => {
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setThemePreference(storedTheme);
      }

      setHasHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme = themePreference === "system" ? getSystemTheme() : themePreference;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    };

    applyTheme();
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);

    const handleChange = () => {
      if (themePreference === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [hasHydrated, themePreference]);

  return {
    themePreference,
    setThemePreference,
  };
};
