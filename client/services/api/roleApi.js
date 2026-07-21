import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const roleApi = createApi({
  reducerPath: "roleApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["Role"],
  endpoints: (builder) => ({
    getRoles: builder.query({
      query: () => "/roles",
      providesTags: ["Role"],
    }),
    createRole: builder.mutation({
      query: (body) => ({
        url: "/roles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Role"],
    }),
    updateRole: builder.mutation({
      query: ({ code, ...body }) => ({
        url: `/roles/${code}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Role"],
    }),
    deleteRole: builder.mutation({
      query: (code) => ({
        url: `/roles/${code}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi;
