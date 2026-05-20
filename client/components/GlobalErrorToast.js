"use client";

import { AlertCircle, X } from "lucide-react";
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
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-white/95 p-4 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-rose-500/25 dark:bg-slate-950/95 dark:text-white"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200">
            <AlertCircle size={18} />
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
      ))}
    </div>
  );
}
