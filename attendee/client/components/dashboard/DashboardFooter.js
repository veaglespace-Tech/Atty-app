export default function DashboardFooter() {
  const companyWebsiteUrl = "https://veaglespace.com/";

  return (
    <footer id="dashboard-footer" className="border-t border-slate-200/80 bg-white/70 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-[1540px] flex-row items-center justify-between px-4 md:px-8">
        <div className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm">
          All Rights Reserved &copy; 2026{" "}
          <a
            href={companyWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-400 underline-offset-2 transition hover:text-blue-600 dark:hover:text-blue-300"
          >
            Veagle Space Technology Pvt. Ltd.
          </a>
        </div>
        <div className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
          Designed &amp; Developed by{" "}
          <a
            href={companyWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-400 underline-offset-2 transition hover:text-blue-600 dark:hover:text-blue-300"
          >
            Veagle Space Technology Pvt. Ltd.
          </a>
        </div>
      </div>
    </footer>
  );
}
