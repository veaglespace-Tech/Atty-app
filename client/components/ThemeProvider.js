"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMounted } from "@/hooks/useMounted";

const ThemeContext = createContext({
  theme: "light",
  isDarkMode: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
  mounted: false,
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEYS = ["veagle-theme", "theme"];

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  const isDark = resolvedTheme === "dark";

  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}

function getStoredTheme() {
  if (typeof document !== "undefined") {
    const bootTheme = document.documentElement.getAttribute("data-theme");
    if (bootTheme === "dark" || bootTheme === "light") {
      return bootTheme;
    }
  }

  if (typeof window === "undefined") return "light";

  for (const key of THEME_STORAGE_KEYS) {
    const storedTheme = window.localStorage.getItem(key);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getStoredTheme());
  const mounted = useMounted();

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== "undefined") {
      THEME_STORAGE_KEYS.forEach((key) => {
        window.localStorage.setItem(key, theme);
      });
    }
  }, [theme]);

  const setThemeMode = useCallback((nextTheme) => {
    const resolvedTheme = nextTheme === "dark" ? "dark" : "light";
    setTheme(resolvedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      toggleTheme,
      setThemeMode,
      mounted,
    }),
    [mounted, setThemeMode, theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
