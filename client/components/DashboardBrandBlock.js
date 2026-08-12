"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function DashboardBrandBlock() {
  const pathname = usePathname();
  const { user } = useAuthSession();

  const currentRole = user?.currentRole;
  const isSuperAdminRole = currentRole === "SUPER_ADMIN";
  const orgLogoUrl = user?.organization?.logoUrl;
  const orgName = user?.organization?.name || "Workspace";



  return (
    <Link
      href="/"
      aria-label="Go to Veagle Attendee home page"
      className="group flex w-full items-center justify-center rounded-[1.5rem] transition-transform duration-300 hover:scale-[1.01]"
    >
      <div className="flex flex-col items-center text-center">
        <div key="veagle" className="brand-logo-reveal relative mx-auto flex h-24 w-24 items-center justify-center md:h-32 md:w-32">
          <div className="relative h-full w-full">
            <Image
              src="/logo-transparent.png"
              alt="Veagle logo mark"
              width={80}
              height={80}
              priority
              unoptimized
              className="brand-logo-mark h-full w-full object-contain animate-flip-y"
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
