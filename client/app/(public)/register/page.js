import Link from "next/link";
import { ArrowRight, Building2, UserCircle2 } from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";

const pageShell =
  "relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 pb-12 pt-32 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900";
const cardClassName =
  "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/80 p-8 shadow-[0_34px_100px_rgba(59,130,246,0.16),0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_112px_rgba(37,99,235,0.18),0_20px_46px_rgba(15,23,42,0.10)] dark:border-slate-700/80 dark:bg-slate-950/78 dark:shadow-[0_35px_100px_rgba(2,6,23,0.55)] md:rounded-[3rem] md:p-12";

export default function RegisterPage() {
  return (
    <div className={pageShell}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-24 h-80 w-80 rounded-full bg-indigo-400/14 blur-[120px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-36 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/16" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-14 text-center">
          <SectionEyebrow className="mb-6">
            Get Started
          </SectionEyebrow>
          <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-slate-950 dark:text-white md:text-7xl">
            Veagle <span className="gradient-text">Attendee</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300 md:text-base">
            Pick the setup that matches you, whether you are creating an organization or joining an existing team.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
          <RegistrationCard
            icon={Building2}
            title="Create Organization"
            desc="Set up your organization, invite your team, and start managing attendance from one place."
            badge="Owner / Admin"
            href="/register/organisation"
          />

          <RegistrationCard
            icon={UserCircle2}
            title="Join as Member"
            desc="Join an existing organization as an employee, team leader, or sub-admin and start checking in."
            badge="Staff / Team"
            href="/register/user"
          />
        </div>

        <p className="mt-14 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 transition hover:underline dark:text-blue-300">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegistrationCard({ icon: Icon, title, desc, badge, href }) {
  return (
    <Link href={href} className={`${cardClassName} group block hover:scale-[1.02]`}>
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300" />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="brand-hover-white-media flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-blue-50 text-blue-600 transition-all duration-500 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/15 dark:text-blue-200 dark:group-hover:bg-blue-500 md:h-24 md:w-24">
          <Icon size={40} />
        </div>
        <div className="rounded-full bg-blue-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_18px_44px_rgba(59,130,246,0.22)] dark:bg-blue-400 dark:text-slate-950">
          {badge}
        </div>
      </div>

      <h2 className="mb-4 text-left text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mb-10 flex-grow text-left text-base font-medium leading-relaxed text-slate-500 dark:text-slate-300">
        {desc}
      </p>

      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600 transition-all group-hover:gap-4 dark:text-blue-300">
        Continue
        <ArrowRight size={18} />
      </div>
    </Link>
  );
}
