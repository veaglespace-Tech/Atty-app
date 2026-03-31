"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardBrandBlock() {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      aria-label="Go to Veagle Attendee home page"
      className="group flex w-full items-center justify-center rounded-[1.5rem] transition-transform duration-300 hover:scale-[1.01]"
    >
      <div className="flex flex-col items-center text-center">
        <div key={pathname} className="brand-logo-reveal relative mx-auto flex h-16 w-16 items-center justify-center md:h-20 md:w-20">
          <div className="brand-logo-orbit absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(92,209,229,0.34),rgba(30,112,209,0.04)_68%)] blur-xl" />
          <div className="brand-logo-spotlight relative h-full w-full">
            <Image
              src="/logo1-clean.webp"
              alt="Veagle logo mark"
              width={80}
              height={80}
              unoptimized
              className="brand-logo-mark h-full w-full object-contain"
            />
          </div>
        </div>
        <p className="mt-2 text-xs font-bold tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Veagle
        </p>
        <h2 className="brand-wordmark mt-1 text-[1.55rem] font-black leading-none tracking-tight md:text-[1.7rem]">
          Attendee
        </h2>
      </div>
    </Link>
  );
}
