"use client";

import { useState } from "react";
import {
  Database,
  Download,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  FileJson,
} from "lucide-react";
import { useDownloadDatabaseBackupMutation } from "@/services/api/superAdminApi";

const TABLE_INFO = [
  { icon: Users, label: "Users", desc: "All registered user accounts" },
  { icon: Building2, label: "Organizations", desc: "Org profiles & settings" },
  { icon: CalendarDays, label: "Attendance", desc: "Full attendance logs" },
  { icon: CreditCard, label: "Payments & Subscriptions", desc: "All billing records" },
  { icon: FileJson, label: "Plans, Posts, Contacts", desc: "Platform content & plans" },
  { icon: ShieldCheck, label: "Permissions & Roles", desc: "RBAC role-permission matrix" },
  { icon: HardDrive, label: "Archive & Misc", desc: "Archive data, settings, tokens" },
];

export default function BackupPage() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadBackup, { isLoading }] = useDownloadDatabaseBackupMutation();

  const handleBackup = async () => {
    try {
      setStatus("loading");
      setErrorMsg("");

      const blob = await downloadBackup().unwrap();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `db-backup-${timestamp}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setErrorMsg(err?.data?.message || "Failed to generate backup. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-10">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 ring-1 ring-blue-500/30">
            <HardDrive size={20} className="text-blue-400" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-blue-400">
            Super Admin
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-4xl">Database Backup</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Export a full snapshot of the database as a compressed ZIP file containing JSON data for every table.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: What's included */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/8 dark:bg-white/4 p-6 backdrop-blur-sm">
            <h2 className="mb-5 text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              What&apos;s included in the backup
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TABLE_INFO.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white dark:border-white/6 dark:bg-white/4 p-4 transition-all hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/5"
                >
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/15">
                    <Icon size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/8 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  A comprehensive database backup contains all critical system data, including user records, 
                  attendance logs, settings, and organizations. The backup contains sensitive data including hashed passwords, emails, and financial records.
                  Store the file securely and do not share it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Generate button card */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/8 dark:bg-white/4 p-6 backdrop-blur-sm">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-[0_20px_50px_rgba(59,130,246,0.35)]">
                <Database size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Generate Backup</h3>
                <p className="mt-1 text-xs text-slate-500">
                  All {TABLE_INFO.length} table categories · JSON format · ZIP compressed
                </p>
              </div>
            </div>

            {/* Status feedback */}
            {status === "success" && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
                <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Backup downloaded successfully!
                </p>
              </div>
            )}
            {status === "error" && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-50 dark:bg-red-500/10 px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">{errorMsg}</p>
              </div>
            )}

            {/* Download button */}
            <button
              id="generate-backup-btn"
              onClick={handleBackup}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-4 px-6 font-bold text-white shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(59,130,246,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
              {isLoading ? (
                <>
                  <Loader2 size={20} className="shrink-0 animate-spin" />
                  <span className="truncate">Generating backup…</span>
                </>
              ) : (
                <>
                  <Download size={20} className="shrink-0" />
                  <span className="text-center px-2">Generate &amp; Download Backup</span>
                </>
              )}
            </button>

            {/* Format info */}
            <div className="mt-5 space-y-2">
              {[
                ["Format", "ZIP archive (.zip)"],
                ["Contents", "JSON files per table + manifest"],
                ["Compression", "Maximum (level 9)"],
                ["Access", "Super Admin only"],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{key}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-300">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
