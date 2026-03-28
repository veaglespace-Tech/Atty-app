"use client";

import Image from "next/image";

export default function DashboardBrandBlock() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center md:h-20 md:w-20">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(92,209,229,0.34),rgba(30,112,209,0.04)_68%)] blur-xl" />
          <Image
            src="/logo1-clean.webp"
            alt="Veagle logo mark"
            width={80}
            height={80}
            unoptimized
            className="brand-logo-mark h-full w-full object-contain"
          />
        </div>
        <p className="mt-2 text-xs font-bold tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Veagle
        </p>
        <h2 className="brand-wordmark mt-1 text-[1.55rem] font-black leading-none tracking-tight md:text-[1.7rem]">
          Attendee
        </h2>
      </div>
    </div>
  );
}
