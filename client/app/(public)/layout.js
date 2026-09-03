export default function PublicLayout({ children }) {
  const companyWebsiteUrl = "https://veaglespace.com/";

  return (
    <div className="w-full overflow-x-clip">
      {children}

      <footer id="dashboard-footer" className="border-t border-slate-200/80 bg-white/70 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex w-full max-w-[1540px] flex-row items-center justify-center px-4 md:px-8 text-center">
          <div className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Designed &amp; Developed by{" "}
            <a
              href={companyWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition hover:text-blue-600 dark:hover:text-blue-300"
            >
              Veagle Space Technology Pvt. Ltd.
            </a>
            {" "} | &copy; 2026 All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
