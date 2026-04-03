import { cn } from "@/lib/utils";
import SectionEyebrow from "@/components/SectionEyebrow";

const pageShellClassName =
  "page-shell relative min-h-screen overflow-hidden px-4 pb-16 pt-28 transition-colors duration-500";

const cardShellClassName =
  "surface-card-strong relative z-10 overflow-hidden rounded-[2rem] transition-colors duration-500 md:rounded-[2.4rem]";

export default function RegisterFlowShell({
  badge,
  title,
  description,
  children,
  beforeCard,
  afterCard,
  maxWidthClassName = "max-w-2xl",
  containerClassName = "",
  cardClassName = "",
  contentClassName = "",
  headerClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  badgeClassName = "",
  align = "center",
}) {
  const alignClassName = align === "left" ? "text-left" : "text-center";

  return (
    <div className={pageShellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-6%] top-24 h-80 w-80 rounded-full blur-[120px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-36 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-10 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className={cn("relative z-10 mx-auto w-full", maxWidthClassName, containerClassName)}>
        {beforeCard ? <div className="mb-8">{beforeCard}</div> : null}

        <div className={cn(cardShellClassName, cardClassName)}>
          <div className="surface-accent-bar h-1.5" />

          <div className={cn("p-8 md:p-12", contentClassName)}>
            {(badge || title || description) && (
              <div className={cn("mb-10", alignClassName, headerClassName)}>
                {badge ? (
                  <SectionEyebrow className={cn("mb-5", badgeClassName)}>
                    {badge}
                  </SectionEyebrow>
                ) : null}

                {title ? (
                  <h2
                    className={cn(
                      "mb-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl",
                      titleClassName
                    )}
                  >
                    {title}
                  </h2>
                ) : null}

                {description ? (
                  <p className={cn("font-medium text-slate-500 dark:text-slate-300", descriptionClassName)}>
                    {description}
                  </p>
                ) : null}
              </div>
            )}

            {children}
          </div>
        </div>

        {afterCard ? <div className="mt-8">{afterCard}</div> : null}
      </div>
    </div>
  );
}
