import React from "react";
import { Text, Pressable, ActivityIndicator } from "react-native";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}












export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  textClassName,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) {
  // Base styles mapping your Next.js/DaisyUI brand buttons
  const baseStyles = "flex-row items-center justify-center rounded-2xl transition-all";

  const variants = {
    primary: "bg-blue-600 dark:bg-blue-500 shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:shadow-blue-950/30",
    secondary: "bg-slate-100 dark:bg-slate-800",
    outline: "border border-slate-200 dark:border-slate-800 bg-transparent",
    ghost: "bg-transparent",
    danger: "bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20"
  };

  const sizes = {
    sm: "h-9 px-3",
    md: "h-11 px-5",
    lg: "h-14 px-7"
  };

  const textVariants = {
    primary: "text-white font-black",
    secondary: "text-slate-900 dark:text-white font-bold",
    outline: "text-slate-900 dark:text-white font-bold",
    ghost: "text-slate-600 dark:text-slate-300 font-bold",
    danger: "text-rose-700 dark:text-rose-200 font-black"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        isDisabled && "opacity-50",
        className
      )}
      style={({ pressed }) => ({
        transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }]
      })}
      {...props}>
      
      {isLoading ?
      <ActivityIndicator
        color={variant === "primary" || variant === "danger" ? "white" : "#64748b"}
        size="small" /> :


      <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text
          className={cn(
            textVariants[variant],
            textSizes[size],
            (leftIcon || rightIcon) && "mx-2",
            textClassName
          )}>
          
            {children}
          </Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      }
    </Pressable>);

}

export default Button;
