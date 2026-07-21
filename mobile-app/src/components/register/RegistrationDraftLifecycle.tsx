import { useEffect } from "react";
import { useLocalSearchParams, usePathname } from "expo-router";
import {
  clearAllRegistrationDrafts,
  getRegistrationDraftSnapshot,
} from "@/utils/registerDraft";

const REGISTRATION_FLOW_PREFIX = "/register/organisation";
const REGISTRATION_ENTRY_PATH = "/register";

export default function RegistrationDraftLifecycle() {
  const pathname = usePathname();
  const searchParams = useLocalSearchParams<{ partnerRef?: string }>();

  useEffect(() => {
    const partnerRef = Array.isArray(searchParams.partnerRef)
      ? searchParams.partnerRef[0]
      : searchParams.partnerRef;

    if (!partnerRef) return;
    // The mobile registration draft is intentionally in memory for the active app session.
  }, [searchParams.partnerRef]);

  useEffect(() => {
    if (!pathname) return;

    if (pathname === REGISTRATION_ENTRY_PATH) {
      clearAllRegistrationDrafts();
      return;
    }

    if (pathname.startsWith(REGISTRATION_FLOW_PREFIX)) return;

    const snapshot = getRegistrationDraftSnapshot();
    const hasRegistrationDraft = Object.values(snapshot).some(Boolean);

    if (!hasRegistrationDraft) return;

    clearAllRegistrationDrafts();
  }, [pathname]);

  return null;
}
