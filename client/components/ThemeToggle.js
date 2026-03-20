"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function ThemeToggle({
  showLabel = false,
  className,
  labelClassName,
  iconClassName,
  size = 18,
  lightLabel = "Dark Mode",
  darkLabel = "Light Mode",
}) {
  const { isDarkMode, toggleTheme, mounted } = useTheme();
  const showResolvedTheme = mounted;
  const label = showResolvedTheme ? (isDarkMode ? darkLabel : lightLabel) : "Theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${label.toLowerCase()}` : "Toggle theme"}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-blue-500/30 dark:hover:bg-slate-900 dark:hover:text-blue-200",
        className
      )}
    >
      {showResolvedTheme && isDarkMode ? (
        <Sun size={size} className={cn("shrink-0", iconClassName)} />
      ) : showResolvedTheme ? (
        <Moon size={size} className={cn("shrink-0", iconClassName)} />
      ) : (
        <span
          aria-hidden="true"
          className={cn("inline-block shrink-0", iconClassName)}
          style={{ width: size, height: size }}
        />
      )}
      {showLabel ? <span className={cn("leading-none", labelClassName)}>{label}</span> : null}
    </button>
  );
}
