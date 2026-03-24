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
        "brand-btn brand-btn-secondary brand-btn-md rounded-[1.2rem] px-3.5 py-2.5 text-sm font-semibold tracking-[0.01em]",
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
      {showLabel ? (
        <span className={cn("leading-none text-sm font-semibold", labelClassName)}>{label}</span>
      ) : null}
    </button>
  );
}
