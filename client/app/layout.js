import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/components/StoreProvider";

export const metadata = {
  title: "Veagle Space - Attendance Management Simplified",
  description: "Modern multi-tenant attendance management system for organizations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-base-100 text-base-content antialiased transition-colors duration-300"
      >
        <ThemeProvider>
          <StoreProvider>
            <Navbar />
            <main className="overflow-x-clip">{children}</main>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
