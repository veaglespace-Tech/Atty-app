"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterStepBack({
  href,
  label = "Back",
  className = "",
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={cn(
        "group flex items-center gap-2 text-sm font-bold text-slate-500 transition-all hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300",
        className
      )}
    >
      <ChevronLeft
        size={20}
        className="transition-transform group-hover:-translate-x-1"
      />
      {label}
    </button>
  );
}
