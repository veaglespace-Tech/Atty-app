import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/utils';

export function PremiumIcon({ 
  icon: Icon, 
  color = "blue", 
  size = 24, 
  containerSize = 56,
  className 
}) {
  // Map our rich colors to tailwind classes for the 3D effect
  const colorMap = {
    blue: {
      bg: "bg-blue-500",
      shadow: "shadow-blue-500/40",
      border: "border-blue-400",
      icon: "white",
    },
    indigo: {
      bg: "bg-indigo-500",
      shadow: "shadow-indigo-500/40",
      border: "border-indigo-400",
      icon: "white",
    },
    rose: {
      bg: "bg-rose-500",
      shadow: "shadow-rose-500/40",
      border: "border-rose-400",
      icon: "white",
    },
    emerald: {
      bg: "bg-emerald-500",
      shadow: "shadow-emerald-500/40",
      border: "border-emerald-400",
      icon: "white",
    },
    amber: {
      bg: "bg-amber-500",
      shadow: "shadow-amber-500/40",
      border: "border-amber-400",
      icon: "white",
    },
    slate: {
      bg: "bg-slate-800 dark:bg-slate-700",
      shadow: "shadow-slate-900/40",
      border: "border-slate-700 dark:border-slate-600",
      icon: "white",
    }
  };

  const theme = colorMap[color] || colorMap.blue;

  return (
    <View 
      style={{ width: containerSize, height: containerSize }}
      className={cn(
        "items-center justify-center rounded-[22px] border-t-[1.5px] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]",
        theme.bg,
        theme.shadow,
        theme.border,
        className
      )}
    >
      <Icon size={size} color={theme.icon} strokeWidth={2.5} />
    </View>
  );
}
