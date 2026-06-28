import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const teamLeaderApi = createApi({
  reducerPath: "teamLeaderApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["TLDashboard", "TLTeams", "TLUsers", "TLAttendance"],
  endpoints: (builder) => ({
    getTeamLeaderDashboard: builder.query({
      query: () => "/team-leader/dashboard",
      providesTags: ["TLDashboard"],
    }),
    getTeamLeaderTeams: builder.query({
      query: (limit = 1200) => `/team-leader/teams?limit=${limit}`,
      providesTags: ["TLTeams"],
    }),
    getTeamLeaderTeamById: builder.query({
      query: (teamId) => `/team-leader/teams/${teamId}`,
      providesTags: (result, error, id) => [{ type: "TLTeams", id }],
    }),
    createTeamLeaderTeam: builder.mutation({
      query: (payload) => ({
        url: "/team-leader/teams",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["TLTeams"],
    }),
    patchTeamLeaderTeam: builder.mutation({
      query: ({ teamId, ...payload }) => ({
        url: `/team-leader/teams/${teamId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["TLTeams"],
    }),
    deleteTeamLeaderTeam: builder.mutation({
      query: (teamId) => ({
        url: `/team-leader/teams/${teamId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TLTeams"],
    }),
    getTeamLeaderUsers: builder.query({
      query: (arg) => {
        const limit = typeof arg === "object" ? (arg.limit || 1600) : (arg || 1600);
        const assignable = typeof arg === "object" ? !!arg.assignable : false;
        const teamId = typeof arg === "object" && arg.teamId ? arg.teamId : "";
        return `/team-leader/users?limit=${limit}&assignable=${assignable}${teamId ? `&teamId=${teamId}` : ""}`;
      },
      providesTags: ["TLUsers"],
    }),
    getTeamLeaderAttendance: builder.query({
      query: (queryString = "") => `/team-leader/attendance${queryString ? `?${queryString}` : ""}`,
      providesTags: ["TLAttendance"],
    }),
    getTeamLeaderReports: builder.query({
      query: (queryString = "") => `/team-leader/reports${queryString ? `?${queryString}` : ""}`,
    }),
    downloadTeamLeaderReportsPdf: builder.mutation({
      query: (queryString = "") => ({
        url: `/team-leader/reports/pdf${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadTeamLeaderReportsExcel: builder.mutation({
      query: (queryString = "") => ({
        url: `/team-leader/reports/excel${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetTeamLeaderDashboardQuery,
  useGetTeamLeaderTeamsQuery,
  useGetTeamLeaderTeamByIdQuery,
  useCreateTeamLeaderTeamMutation,
  usePatchTeamLeaderTeamMutation,
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderUsersQuery,
  useGetTeamLeaderAttendanceQuery,
  useGetTeamLeaderReportsQuery,
  useDownloadTeamLeaderReportsPdfMutation,
  useDownloadTeamLeaderReportsExcelMutation,
} = teamLeaderApi;

