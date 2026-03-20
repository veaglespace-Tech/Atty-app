"use client";
import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, LogIn, UserPlus, Menu, X, ChevronRight, LogOut, UserCircle2 } from "lucide-react";
import { logout } from "@/store/slices/authSlice";
import { useUserSignOutMutation } from "@/store/api/authApi";
import ThemeToggle from "@/components/ThemeToggle";
import { formatRoleLabel, resolveDashboardPath } from "@/utils/roles";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, hydrated } = useSelector((state) => state.auth);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isOpen, setIsOpen] = useState(false);
  const [userSignOut] = useUserSignOutMutation();
  const isAuthReady = isClient && hydrated;
  const isLoggedIn = Boolean(isAuthReady && token && user);
  const dashboardHref = resolveDashboardPath(user?.role, user?.dashboardPath) || "/member/dashboard";
  const hideOnAppSections =
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/org") ||
    pathname?.startsWith("/member") ||
    pathname?.startsWith("/team-leader") ||
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/dashboard");

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

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

  if (hideOnAppSections) {
    return null;
  }

  return (
    <Fragment>
      <nav className="fixed top-0 left-0 right-0 z-[70] border-b border-slate-100 bg-white/80 shadow-[0_16px_48px_rgba(59,130,246,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-20 items-center justify-between">
          {/* Logo */}
            <Link href="/" className="group shrink-0 flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-blue-50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-200 dark:bg-blue-500/15 dark:group-hover:shadow-blue-950/40 md:h-12 md:w-12">
              <Image
                src="/Logo.webp"
                alt="Veagle Space Logo"
                fill
                sizes="(max-width: 768px) 40px, 48px"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden absolute inset-0 bg-blue-600 items-center justify-center text-white font-black text-lg">
                VS
              </div>
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white md:text-2xl">
                Veagle <span className="text-blue-600">Space</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden items-center gap-10 lg:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={pathname === link.href}
                />
              ))}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden items-center gap-4 md:flex">
              <ThemeToggle className="w-11 px-0" />
              {!isAuthReady ? (
                <div className="h-11 w-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ) : isLoggedIn ? (
                <>
                  <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900 lg:flex">
                    <UserCircle2 size={18} className="text-slate-500 dark:text-slate-300" />
                    <div className="text-right leading-tight">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white">{user?.name || "User"}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{formatRoleLabel(user?.role)}</p>
                    </div>
                  </div>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_24px_60px_rgba(59,130,246,0.28)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30 dark:hover:bg-blue-300"
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-500 transition-all hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-500 transition-all hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300">
                    <LogIn size={18} />
                    Login
                  </Link>
                  <Link href="/register" className="rounded-2xl bg-blue-600 px-7 py-3 text-sm font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_24px_60px_rgba(59,130,246,0.28)] dark:shadow-blue-950/30">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-site-menu"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="p-2 text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-200 lg:hidden"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[58] bg-slate-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              id="mobile-site-menu"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 top-20 z-[65] overflow-y-auto bg-white/95 px-4 pb-6 pt-4 shadow-[0_24px_72px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:bg-slate-950/95 dark:shadow-black/30 lg:hidden"
            >
              <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6">
                <div className="space-y-4">
                  {navLinks.map((link) => (
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
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || "User"}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{formatRoleLabel(user?.role)}</p>
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
                      <Link href="/login" onClick={closeMenu} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 font-black text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                        <LogIn size={20} />
                        Login
                      </Link>
                      <Link href="/register" onClick={closeMenu} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5 font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] dark:shadow-blue-950/30">
                        <UserPlus size={20} />
                        Register Now
                      </Link>
                    </>
                  )}

                  <ThemeToggle showLabel className="w-full justify-center" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Fragment>
  );
}

function NavLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`relative text-[11px] font-black uppercase tracking-widest transition-all hover:text-blue-600 dark:hover:text-blue-300 ${
        active ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {label}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute -bottom-1 left-0 right-0 h-0.75 bg-blue-600 rounded-full"
        />
      )}
    </Link>
  );
}
