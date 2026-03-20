"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

const ThemeContext = createContext({
  theme: "light",
  isDarkMode: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
  mounted: false,
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEYS = ["veagle-theme", "theme"];
const subscribe = () => () => {};

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
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setThemeMode = (nextTheme) => {
    const resolvedTheme = nextTheme === "dark" ? "dark" : "light";
    setTheme(resolvedTheme);

    if (typeof window !== "undefined") {
      THEME_STORAGE_KEYS.forEach((key) => {
        window.localStorage.setItem(key, resolvedTheme);
      });
    }

    applyTheme(resolvedTheme);
  };

  const toggleTheme = () => {
    setThemeMode(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode: theme === "dark",
        toggleTheme,
        setThemeMode,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
