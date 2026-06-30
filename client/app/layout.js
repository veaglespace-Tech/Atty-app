import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/components/StoreProvider";
import AttyWidget from "@/components/AttyWidget";
import SessionSync from "@/components/SessionSync";
import RegistrationDraftLifecycle from "@/components/register/RegistrationDraftLifecycle";
import GlobalErrorToast from "@/components/GlobalErrorToast";

export const metadata = {
  title: "Veagle Attendee - Attendance Management Simplified",
  description: "Modern multi-tenant attendance management system for organizations.",
  icons: {
    icon: "/logo1-clean.webp",
  },
};

const THEME_BOOTSTRAP_SCRIPT = `(() => {
  try {
    const root = document.documentElement;
    const keys = ["veagle-theme", "theme"];
    let theme = root.getAttribute("data-theme");

    if (theme !== "dark" && theme !== "light") {
      for (const key of keys) {
        const storedTheme = window.localStorage.getItem(key);
        if (storedTheme === "dark" || storedTheme === "light") {
          theme = storedTheme;
          break;
        }
      }
    }

    if (theme !== "dark" && theme !== "light") {
      theme =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }

    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  } catch (error) {
    console.warn("Theme bootstrap failed", error);
  }
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased transition-colors duration-300">
        <ThemeProvider>
          <StoreProvider>
            <SessionSync />
            <Suspense fallback={null}>
              <RegistrationDraftLifecycle />
            </Suspense>
            <Navbar />
            <main className="w-full overflow-x-clip">{children}</main>
            <GlobalErrorToast />
            <AttyWidget />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
