"use client";

import { AlertCircle, CheckCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeNotification } from "@/store/slices/notificationSlice";

export default function GlobalErrorToast() {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.items);

  useEffect(() => {
    if (!notifications.length) return undefined;

    const timers = notifications.map((notification) =>
      window.setTimeout(() => {
        dispatch(removeNotification(notification.id));
      }, 5500)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dispatch, notifications]);

  if (!notifications.length) return null;

  return (
    <div className="fixed right-4 top-24 z-[1000] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6">
      {notifications.map((notification) => {
        const isSuccess = notification.type === "success";

        return (
          <div
            key={notification.id}
            role="alert"
            className={`flex items-start gap-3 rounded-2xl border bg-white/95 p-4 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-950/95 dark:text-white ${
              isSuccess
                ? "border-emerald-200 dark:border-emerald-500/25"
                : "border-rose-200 dark:border-rose-500/25"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isSuccess
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200"
              }`}
            >
              {isSuccess ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{notification.title}</p>
              <p className="mt-1 break-words text-sm leading-5 text-slate-600 dark:text-slate-300">
                {notification.message}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dispatch(removeNotification(notification.id))}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
