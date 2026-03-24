import "./globals.css";
import { Manrope, Space_Grotesk } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/components/StoreProvider";
import AttyWidget from "@/components/AttyWidget";
const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Veagle Attendee - Attendance Management Simplified",
  description: "Modern multi-tenant attendance management system for organizations.",
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
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-base-100 text-base-content antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          <StoreProvider>
            <Navbar />
            <main className="overflow-x-clip">{children}</main>
            <AttyWidget />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
