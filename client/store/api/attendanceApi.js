import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["Attendance"],
  endpoints: (builder) => ({
    getAttendance: builder.query({
      query: (queryString = "") => `/attendance${queryString ? `?${queryString}` : ""}`,
      providesTags: ["Attendance"],
    }),
    getAttendanceSummary: builder.query({
      query: () => "/attendance/summary",
      providesTags: ["Attendance"],
    }),
    punchIn: builder.mutation({
      query: (payload) => ({
        url: "/attendance/punch-in",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Attendance"],
    }),
    punchOut: builder.mutation({
      query: (payload) => ({
        url: "/attendance/punch-out",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Attendance"],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetAttendanceSummaryQuery,
  usePunchInMutation,
  usePunchOutMutation,
} = attendanceApi;

