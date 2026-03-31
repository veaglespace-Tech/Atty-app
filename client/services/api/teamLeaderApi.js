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
      query: (limit = 1600) => `/team-leader/users?limit=${limit}`,
      providesTags: ["TLUsers"],
    }),
    getTeamLeaderAttendance: builder.query({
      query: (queryString = "") => `/team-leader/attendance${queryString ? `?${queryString}` : ""}`,
      providesTags: ["TLAttendance"],
    }),
    getTeamLeaderReports: builder.query({
      query: (queryString = "") => `/team-leader/reports${queryString ? `?${queryString}` : ""}`,
    }),
  }),
});

export const {
  useGetTeamLeaderDashboardQuery,
  useGetTeamLeaderTeamsQuery,
  useCreateTeamLeaderTeamMutation,
  usePatchTeamLeaderTeamMutation,
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderUsersQuery,
  useGetTeamLeaderAttendanceQuery,
  useGetTeamLeaderReportsQuery,
} = teamLeaderApi;

