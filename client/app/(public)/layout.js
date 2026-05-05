export default function PublicLayout({ children }) {
  const companyWebsiteUrl = "https://veaglespace.com/";

  return (
    <div className="w-full overflow-x-clip">
      {children}

      <footer className="border-t border-slate-200/80 bg-white/70 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
        <div className="site-container text-center">
          <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 sm:text-sm">
            All Rights Reserved &copy;{" "}
            <a
              href={companyWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-400 underline-offset-2 transition hover:text-blue-600 dark:hover:text-blue-300"
            >
              Veagle Space Technology Pvt. Ltd.
            </a>
          </p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
            Designed &amp; Developed by{" "}
            <a
              href={companyWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-400 underline-offset-2 transition hover:text-blue-600 dark:hover:text-blue-300"
            >
              Veagle Space Technology Pvt. Ltd.
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
