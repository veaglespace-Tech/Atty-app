"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearAllRegistrationDrafts,
  getRegistrationDraftSnapshot,
} from "@/utils/registerDraft";

const REGISTRATION_FLOW_PREFIX = "/register/organisation";
const REGISTRATION_ENTRY_PATH = "/register";

const isReloadNavigation = () => {
  if (typeof window === "undefined") return false;

  const navigationEntries = window.performance?.getEntriesByType?.("navigation");
  const navigationType = navigationEntries?.[0]?.type;

  if (typeof navigationType === "string") {
    return navigationType === "reload";
  }

  return window.performance?.navigation?.type === 1;
};

export default function RegistrationDraftLifecycle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (pathname === REGISTRATION_ENTRY_PATH) {
      clearAllRegistrationDrafts();
      return;
    }

    if (pathname.startsWith(REGISTRATION_FLOW_PREFIX)) return;

    const snapshot = getRegistrationDraftSnapshot();
    const hasRegistrationDraft = Object.values(snapshot).some(Boolean);

    if (!hasRegistrationDraft || !isReloadNavigation()) return;

    clearAllRegistrationDrafts();
  }, [pathname]);

  return null;
}
