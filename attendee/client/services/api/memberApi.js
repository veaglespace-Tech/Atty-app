import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const memberApi = createApi({
  reducerPath: "memberApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["MemberDashboard", "MemberAttendance", "MemberInstruments"],
  endpoints: (builder) => ({
    getMemberDashboard: builder.query({
      query: () => "/member/dashboard",
      providesTags: ["MemberDashboard"],
    }),
    getMemberAttendance: builder.query({
      query: (params) => {
        let url = `/member/attendance?`;
        if (typeof params === 'number') {
          url += `limit=${params}`;
        } else if (params) {
          if (params.limit) url += `limit=${params.limit}&`;
          if (params.from) url += `from=${params.from}&`;
          if (params.to) url += `to=${params.to}&`;
        } else {
          url += `limit=180`;
        }
        return url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
      },
      providesTags: ["MemberAttendance"],
    }),
    downloadMemberAttendancePdf: builder.mutation({
      query: (params) => ({
        url: `/member/attendance/pdf${params || ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadMemberAttendanceExcel: builder.mutation({
      query: (params) => ({
        url: `/member/attendance/excel${params || ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getMemberInstruments: builder.query({
      query: () => "/member/instruments",
      providesTags: ["MemberInstruments"],
    }),
  }),
});

export const { 
  useGetMemberDashboardQuery, 
  useGetMemberAttendanceQuery,
  useDownloadMemberAttendancePdfMutation,
  useDownloadMemberAttendanceExcelMutation,
  useGetMemberInstrumentsQuery
} = memberApi;
