import Sidebar from "@/components/Sidebar";
import DashboardTopbar from "@/components/DashboardTopbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="dashboard-theme flex min-h-screen flex-col bg-background transition-colors duration-300 lg:flex-row">
        <Sidebar />
        <main className="w-full flex-1 overflow-x-hidden">
          <div className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col px-3 pb-10 pt-16 sm:px-4 sm:pt-16 md:px-6 md:pt-20 lg:px-8 lg:pt-8">
            <DashboardTopbar />
            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
