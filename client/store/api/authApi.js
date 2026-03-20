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
            transformResponse: (data) => {
                // Handle localStorage as per user preference
                if (data.token) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                }
                return data; // Return full data for component use
            },
        }),

        userSignOut: builder.mutation({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
            transformResponse: (data) => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                return data;
            },
        }),

        // Admin endpoints (using same backend points but separate hooks for clarity as requested)
        adminSignin: builder.mutation({
            query: (userData) => ({
                url: "/auth/login",
                method: "POST",
                body: userData,
            }),
            transformResponse: (data) => {
                if (data.token) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("admin", JSON.stringify(data.user));
                    localStorage.setItem("user", JSON.stringify(data.user));
                }
                return data;
            },
        }),

        adminSignout: builder.mutation({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
            transformResponse: (data) => {
                localStorage.removeItem("token");
                localStorage.removeItem("admin");
                localStorage.removeItem("user");
                return data;
            },
        }),
    }),
});

export const {
    useGetMeQuery,
    useUpdateMeMutation,
    useUserSignUpMutation,
    useLazySearchOrganizationsQuery,
    useUserSignInMutation,
    useUserSignOutMutation,
    useAdminSigninMutation,
    useAdminSignoutMutation,
} = authApi;
