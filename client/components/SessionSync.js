"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMeQuery } from "@/services/api/authApi";
import { setCurrentUser } from "@/store/slices/authSlice";

/**
 * SessionSync component ensures that the local auth state (Redux) 
 * stays synchronized with the server's user data, including permissions.
 * This component runs in the background and re-fetches user data 
 * on initial load and whenever the user might have changed.
 */
export default function SessionSync() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const hydrated = useSelector((state) => state.auth.hydrated);

  // We only call getMe if we have a token and the store has been hydrated from storage
  const { data, isSuccess, error } = useGetMeQuery(undefined, {
    skip: !token || !hydrated,
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
      // If the profile fetch fails with a 401/403 (invalid token), 
      // we don't necessarily logout here to avoid loops, 
      // but we could log the error.
      console.warn("Session synchronization failed:", error);
    }
  }, [error]);

  return null;
}
