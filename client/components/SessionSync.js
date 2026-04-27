"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMeQuery } from "@/services/api/authApi";
import { logout, markSessionChecked, setCurrentUser } from "@/store/slices/authSlice";

/**
 * SessionSync component ensures that the local auth state (Redux) 
 * stays synchronized with the server's user data, including permissions.
 * This component runs in the background and re-fetches user data 
 * on initial load and whenever the user might have changed.
 */
export default function SessionSync() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const hydrated = useSelector((state) => state.auth.hydrated);

  // Run getMe after hydration to align client state with the cookie-backed server session.
  const { data, isSuccess, error } = useGetMeQuery(undefined, {
    skip: !hydrated,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (isSuccess && data?.user) {
      // update user in redux with fresh data from server
      dispatch(setCurrentUser(data.user));
    }
  }, [data, isSuccess, dispatch]);

  useEffect(() => {
    if (error) {
      const status = Number(error?.status || error?.originalStatus || 0);
      if (status === 401 || status === 403) {
        dispatch(logout());
        return;
      }

      // Keep the last known session state for transient failures (network/server issues).
      if (user) {
        console.warn("Session synchronization failed:", error);
      }
      dispatch(markSessionChecked());
    }
  }, [dispatch, error, user]);

  return null;
}
