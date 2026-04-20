export default function PublicLayout({ children }) {
  return (
    <div className="w-full overflow-x-clip">
      {children}

      <footer className="border-t border-slate-200/80 bg-white/70 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
        <div className="site-container text-center">
          <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 sm:text-sm">
            All Right Reserved &copy; Veagle Space Technology Pvt. Ltd.
          </p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
            Designed &amp; Developed By Veagle Space Technology Pvt. Ltd
          </p>
        </div>
      </footer>
    </div>
  );
}
