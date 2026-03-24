import "./globals.css";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/components/StoreProvider";

const themeInitScript = `
  (function () {
    try {
      var root = document.documentElement;
      var storageKeys = ["veagle-theme", "theme"];
      var theme = null;

      for (var index = 0; index < storageKeys.length; index += 1) {
        var value = window.localStorage.getItem(storageKeys[index]);
        if (value === "dark" || value === "light") {
          theme = value;
          break;
        }
      }

      if (theme !== "dark" && theme !== "light") {
        theme =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      }

      var isDark = theme === "dark";
      root.classList.toggle("dark", isDark);
      root.setAttribute("data-theme", theme);
      root.style.colorScheme = theme;
      root.style.backgroundColor = isDark ? "rgb(4 12 30)" : "rgb(244 249 255)";
      root.style.color = isDark ? "rgb(235 246 255)" : "rgb(8 28 70)";
    } catch (error) {
      // Ignore theme boot failures and allow the client provider to recover.
    }
  })();
`;

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
  description: "Simple attendance and team management for growing organizations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-background text-foreground antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
