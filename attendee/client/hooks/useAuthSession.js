"use client";

import { shallowEqual, useSelector } from "react-redux";

export function useAuthSession() {
  return useSelector(
    (state) => ({
      user: state.auth.user,
      token: state.auth.token,
      hydrated: state.auth.hydrated,
      loading: state.auth.loading,
      redirectPath: state.auth.redirectPath,
    }),
    shallowEqual
  );
}
