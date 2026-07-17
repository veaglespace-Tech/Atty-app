import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: buildBaseQuery(),
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
    }),
    updateMe: builder.mutation({
      query: (payload) => ({
        url: "/auth/me",
        method: "PATCH",
        body: payload,
      }),
    }),
    userSignUp: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),
    searchOrganizations: builder.query({
      query: ({ query, limit = 8 }) => ({
        url: `/auth/organizations/search?query=${encodeURIComponent(query)}&limit=${limit}`,
        method: "GET",
      }),
    }),
    userSignIn: builder.mutation({
      query: (userData) => ({
        url: "/auth/login",
        method: "POST",
        body: userData,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (payload) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: payload,
      }),
    }),
    validateResetPasswordToken: builder.mutation({
      query: (payload) => ({
        url: "/auth/reset-password/validate",
        method: "POST",
        body: payload,
      }),
    }),
    resetPassword: builder.mutation({
      query: (payload) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: payload,
      }),
    }),
    userSignOut: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    adminSignin: builder.mutation({
      query: (userData) => ({
        url: "/auth/login",
        method: "POST",
        body: userData,
      }),
    }),
    adminSignout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    validateReferralCode: builder.query({
      query: (referralCode) => ({
        url: `/auth/join/${referralCode}`,
        method: "GET",
      }),
    }),
    joinOrganization: builder.mutation({
      query: ({ referralCode, data }) => ({
        url: `/auth/join/${referralCode}`,
        method: "POST",
        body: data,
      }),
    }),
    checkEmail: builder.mutation({
      query: (email) => ({
        url: "/auth/check-email",
        method: "POST",
        body: { email },
      }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useUserSignUpMutation,
  useLazySearchOrganizationsQuery,
  useUserSignInMutation,
  useForgotPasswordMutation,
  useValidateResetPasswordTokenMutation,
  useResetPasswordMutation,
  useUserSignOutMutation,
  useAdminSigninMutation,
  useAdminSignoutMutation,
  useValidateReferralCodeQuery,
  useJoinOrganizationMutation,
  useCheckEmailMutation,
} = authApi;
