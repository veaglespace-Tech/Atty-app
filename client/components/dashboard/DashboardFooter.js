export default function DashboardFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto w-full max-w-[1540px] px-3 sm:px-4 md:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm">
          All Right Reserved &copy;{" "}
          <a
            href="https://veaglespace.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Veagle Space Technology Pvt. Ltd.
          </a>
        </p>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
          Designed &amp; Developed By{" "}
          <a
            href="https://veaglespace.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Veagle Space Technology Pvt. Ltd
          </a>
        </p>
      </div>
    </footer>
  );
}
