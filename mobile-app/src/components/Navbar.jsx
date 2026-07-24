import { memo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { Image } from "expo-image";
import { Link, usePathname, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { LayoutDashboard, LogIn, UserPlus, Menu, X, ChevronRight, LogOut } from "lucide-react-native";
import { logout } from "@/store/slices/authSlice";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserSignOutMutation } from "@/services/api/authApi";
import { formatRoleLabel, resolveDashboardPath } from "@/utils/roles";
import { useColorScheme } from "nativewind";
import ThemeToggle from "@/components/ThemeToggle";
import AnimatedLogo from "./AnimatedLogo";

const NAV_LINKS = [
{ href: "/", label: "Home" },
{ href: "/pricing", label: "Pricing" },
{ href: "/about", label: "About" },
{ href: "/contact", label: "Contact" }];


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, hydrated } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [userSignOut] = useUserSignOutMutation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isAuthReady = hydrated;
  const isLoggedIn = Boolean(isAuthReady && token && user);
  const currentRole = user?.currentRole;

  const dashboardHref =
  resolveDashboardPath(currentRole, user?.dashboardPath) || "/member/dashboard";

  const hideOnDashboardRoutes =
  pathname?.startsWith("/dashboard") ||
  pathname?.startsWith("/org") ||
  pathname?.startsWith("/member") ||
  pathname?.startsWith("/team-leader") ||
  pathname?.startsWith("/super-admin") && pathname !== "/super-admin/login";

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => setIsOpen(false);

  const onLogout = async () => {
    try {
      await userSignOut(undefined).unwrap();
    } catch (_) {}

    dispatch(logout());
    closeMenu();
    router.replace("/login");
  };

  if (hideOnDashboardRoutes) {
    return null;
  }

  return (
    <>
      <View className="z-[70] border-b border-slate-100 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 shadow-sm">
        <View className="px-4">
          <View className="flex-row h-16 items-center justify-between">
            <Link href="/" asChild>
              <Pressable className="flex-row items-center gap-2">
                <View className="h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <AnimatedLogo className="w-full h-full" />
                </View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">
                  Veagle <Text className="text-blue-500">Space</Text>
                </Text>
              </Pressable>
            </Link>

            {/* Desktop Nav - Hidden on mobile, but NativeWind handles breakpoints */}
            <View className="hidden md:flex-row items-center gap-6">
              {NAV_LINKS.map((link) =>
              <PublicNavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname === link.href} />

              )}
            </View>

            {/* Desktop Auth Buttons */}
            <View className="hidden md:flex-row items-center gap-3">
              <ThemeToggle />
              {!isAuthReady ?
              <View className="h-11 w-44 rounded-2xl bg-slate-100 dark:bg-slate-800" /> :
              isLoggedIn ?
              <>
                  <Link href={dashboardHref} asChild>
                    <Pressable className="flex-row items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3">
                      <LayoutDashboard size={18} color="white" />
                      <Text className="font-bold text-white">Dashboard</Text>
                    </Pressable>
                  </Link>
                  <Pressable onPress={onLogout} className="px-3 py-3">
                    <LogOut size={18} color="#64748b" />
                  </Pressable>
                </> :
              <>
                  <Link href="/login" asChild>
                    <Pressable className="rounded-2xl bg-blue-600 px-6 py-3">
                      <Text className="font-black text-white">Login</Text>
                    </Pressable>
                  </Link>
                </>
              }
            </View>

            {/* Mobile Menu Button */}
            <Pressable
              onPress={toggleMenu}
              className="p-2 md:hidden">
              
              {isOpen ?
              <X size={26} color={isDark ? "#cbd5e1" : "#475569"} /> :

              <Menu size={26} color={isDark ? "#cbd5e1" : "#475569"} />
              }
            </Pressable>
          </View>
        </View>
      </View>

      {/* Mobile Menu Overlay */}
      <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => {}}>
        <Pressable onPress={closeMenu} className="flex-1 bg-black/50" />
        <View className="absolute bottom-0 top-16 left-0 right-0 bg-white dark:bg-slate-950 p-4 shadow-xl">
          <ScrollView contentContainerStyle={{ gap: 24 }}>
            <View className="gap-4">
              {NAV_LINKS.map((link) =>
              <Link key={link.href} href={link.href} asChild onPress={closeMenu}>
                  <Pressable
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                  pathname === link.href ?
                  "bg-blue-50 dark:bg-blue-900" :
                  "bg-slate-50 dark:bg-slate-900"}`
                  }>
                  
                    <Text
                    className={
                    pathname === link.href ?
                    "font-black text-blue-600 dark:text-blue-300" :
                    "font-bold text-slate-600 dark:text-slate-300"
                    }>
                    
                      {link.label}
                    </Text>
                    <ChevronRight size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
                  </Pressable>
                </Link>
              )}
            </View>

            <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              {!isAuthReady ?
              <View className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800" /> :
              isLoggedIn ?
              <>
                  <View className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 mb-4">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      {user?.name || "User"}
                    </Text>
                    <Text className="text-xs uppercase text-slate-500">
                      {formatRoleLabel(currentRole)}
                    </Text>
                  </View>
                  <Link href={dashboardHref} asChild onPress={closeMenu}>
                    <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5 mb-4">
                      <LayoutDashboard size={20} color="white" />
                      <Text className="font-black text-white">Access Dashboard</Text>
                    </Pressable>
                  </Link>
                  <Pressable
                  onPress={onLogout}
                  className="flex-row items-center justify-center gap-2 rounded-2xl bg-rose-50 p-5">
                  
                    <LogOut size={20} color="#e11d48" />
                    <Text className="font-black text-rose-600">Logout</Text>
                  </Pressable>
                </> :
              <View className="gap-4">
                  <Link href="/login" asChild onPress={closeMenu}>
                    <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5">
                      <LogIn size={20} color="white" />
                      <Text className="font-black text-white">Login</Text>
                    </Pressable>
                  </Link>
                </View>
              }
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>);

}

const PublicNavLink = memo(function PublicNavLink({ href, label, active }) {
  return (
    <Link href={href} asChild>
      <Pressable className="relative">
        <Text
          className={`text-xs font-black uppercase tracking-widest ${
          active ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}`
          }>
          
          {label}
        </Text>
        {active &&
        <View className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-blue-600" />
        }
      </Pressable>
    </Link>);

});
