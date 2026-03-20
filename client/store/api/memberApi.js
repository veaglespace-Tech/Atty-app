import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const memberApi = createApi({
  reducerPath: "memberApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["MemberDashboard", "MemberAttendance"],
  endpoints: (builder) => ({
    getMemberDashboard: builder.query({
      query: () => "/member/dashboard",
      providesTags: ["MemberDashboard"],
    }),
    getMemberAttendance: builder.query({
      query: (limit = 45) => `/member/attendance?limit=${limit}`,
      providesTags: ["MemberAttendance"],
    }),
  }),
});

export const { useGetMemberDashboardQuery, useGetMemberAttendanceQuery } = memberApi;

