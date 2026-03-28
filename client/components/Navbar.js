"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LayoutDashboard, LogIn, UserPlus, Menu, X, ChevronRight, LogOut, UserCircle2 } from "lucide-react";
import { logout } from "@/store/slices/authSlice";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useIdleRoutePrefetch } from "@/hooks/useIdleRoutePrefetch";
import { useUserSignOutMutation } from "@/services/api/authApi";
import ThemeToggle from "@/components/ThemeToggle";
import { formatRoleLabel, resolveDashboardPath } from "@/utils/roles";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, hydrated } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [userSignOut] = useUserSignOutMutation();
  const isAuthReady = hydrated;
  const isLoggedIn = Boolean(isAuthReady && token && user);
  const dashboardHref = resolveDashboardPath(user?.role, user?.dashboardPath) || "/member/dashboard";
  const prefetchedRoutes = useMemo(
    () => [...NAV_LINKS.map((link) => link.href), "/login", "/register", dashboardHref],
    [dashboardHref]
  );
  const hideOnDashboardRoutes =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/org") ||
    pathname?.startsWith("/member") ||
    pathname?.startsWith("/team-leader") ||
    (pathname?.startsWith("/super-admin") && pathname !== "/super-admin/login");

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  useIdleRoutePrefetch(router, prefetchedRoutes);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => setIsOpen(false);

  const onLogout = async () => {
    try {
      await userSignOut().unwrap();
    } catch (_) {
      // Logout should still continue on client state.
    }

    dispatch(logout());
    closeMenu();
    router.push("/login");
  };

  if (hideOnDashboardRoutes) {
    return null;
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[70] border-b border-slate-100 bg-white/80 shadow-[0_16px_48px_rgba(30,112,209,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="flex h-20 items-center justify-between gap-3 xl:gap-6">
            <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5 lg:gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-all duration-500 group-hover:scale-105 md:h-11 md:w-11 2xl:h-12 2xl:w-12">
                <Image
                  src="/logo1-clean.webp"
                  alt="Veagle logo mark"
                  fill
                  sizes="(max-width: 768px) 40px, 48px"
                  className="brand-logo-mark h-full w-full object-contain"
                />
              </div>
              <span className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl 2xl:text-2xl">
                Veagle <span className="brand-wordmark hidden sm:inline">Attendee</span>
              </span>
            </Link>

            <div className="hidden items-center gap-6 2xl:gap-10 xl:flex">
              {NAV_LINKS.map((link) => (
                <PublicNavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={pathname === link.href}
                />
              ))}
            </div>

            <div className="hidden items-center gap-2 sm:flex xl:hidden">
              <ThemeToggle className="h-11 w-11 px-0" />
              {!isAuthReady ? (
                <div className="h-11 w-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 lg:w-36" />
              ) : isLoggedIn ? (
                <Link
                  href={dashboardHref}
                  className="brand-btn brand-btn-primary h-11 rounded-2xl px-3 text-sm font-bold text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30"
                >
                  <LayoutDashboard size={18} />
                  <span className="hidden lg:inline">Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="brand-btn brand-btn-primary h-11 rounded-2xl px-3 text-sm font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:shadow-blue-950/30"
                >
                  <UserPlus size={18} />
                  <span className="hidden lg:inline">Get Started</span>
                </Link>
              )}
            </div>

            <div className="hidden items-center gap-3 2xl:gap-4 xl:flex">
              <ThemeToggle className="h-11 w-11 px-0" />
              {!isAuthReady ? (
                <div className="h-11 w-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ) : isLoggedIn ? (
                <>
                  <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900 2xl:flex">
                    <UserCircle2 size={18} className="text-slate-500 dark:text-slate-300" />
                    <div className="text-right leading-tight">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white">{user?.name || "User"}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{formatRoleLabel(user?.role)}</p>
                    </div>
                  </div>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_24px_60px_rgba(59,130,246,0.28)] 2xl:px-6 dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30 dark:hover:bg-blue-300"
                  >
                    <LayoutDashboard size={18} />
                    <span className="hidden 2xl:inline">Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-slate-500 transition-all hover:text-rose-600 2xl:px-5 dark:text-slate-300 dark:hover:text-rose-300"
                  >
                    <LogOut size={18} />
                    <span className="hidden 2xl:inline">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-slate-500 transition-all hover:text-blue-600 2xl:px-5 dark:text-slate-300 dark:hover:text-blue-300">
                    <LogIn size={18} />
                    <span className="hidden 2xl:inline">Login</span>
                  </Link>
                  <Link href="/register" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_24px_60px_rgba(59,130,246,0.28)] 2xl:px-7 dark:shadow-blue-950/30">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-site-menu"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="p-2 text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-200 xl:hidden"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="fixed inset-0 z-[58] bg-slate-950/50 backdrop-blur-sm xl:hidden"
          />
          <div
            id="mobile-site-menu"
            className="fixed inset-x-0 bottom-0 top-20 z-[65] overflow-y-auto bg-white/95 px-4 pb-6 pt-4 shadow-[0_24px_72px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:bg-slate-950/95 dark:shadow-black/30 xl:hidden"
          >
            <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6">
              <div className="space-y-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
                      pathname === link.href
                        ? "bg-blue-50 font-black text-blue-600 dark:bg-blue-500/15 dark:text-blue-200"
                        : "bg-slate-50 font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {link.label}
                    <ChevronRight size={18} opacity={0.5} />
                  </Link>
                ))}
              </div>

              <div className="mt-auto space-y-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_22px_58px_rgba(59,130,246,0.12)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/20">
                {!isAuthReady ? (
                  <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ) : isLoggedIn ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {user?.name || "User"}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {formatRoleLabel(user?.role)}
                      </p>
                    </div>
                    <Link
                      href={dashboardHref}
                      onClick={closeMenu}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5 font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30"
                    >
                      <LayoutDashboard size={20} />
                      Access Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-5 font-black text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                      <LogOut size={20} />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 font-black text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <LogIn size={20} />
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5 font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:shadow-blue-950/30"
                    >
                      <UserPlus size={20} />
                      Register Now
                    </Link>
                  </>
                )}

                <ThemeToggle showLabel className="w-full justify-center" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

const PublicNavLink = memo(function PublicNavLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`relative text-[11px] font-black uppercase tracking-widest transition-all hover:text-blue-600 dark:hover:text-blue-300 ${
        active ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1 left-0 right-0 h-0.75 rounded-full bg-blue-600" />
      )}
    </Link>
  );
});
