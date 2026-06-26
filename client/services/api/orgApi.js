import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const orgApi = createApi({
  reducerPath: "orgApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["OrgUsers", "OrgTeams", "OrgAttendance", "OrgNotifications", "OrgDashboard", "RegistrationRequests", "OrgUserAttendance"],
  endpoints: (builder) => ({
    onboardOrganization: builder.mutation({
      query: (payload) => ({
        url: "/org/onboard",
        method: "POST",
        body: payload,
      }),
    }),
    getOrgRegistrationRequests: builder.query({
      query: () => "/org/registration-requests",
      providesTags: ["RegistrationRequests"],
    }),
    acceptRegistrationRequest: builder.mutation({
      query: (requestId) => ({
        url: `/org/registration-requests/${requestId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["RegistrationRequests", "OrgUsers", "OrgNotifications"],
    }),
    rejectRegistrationRequest: builder.mutation({
      query: ({ requestId, note }) => ({
        url: `/org/registration-requests/${requestId}/reject`,
        method: "PATCH",
        body: { note },
      }),
      invalidatesTags: ["RegistrationRequests"],
    }),
    getOrgDashboard: builder.query({
      query: () => "/org/dashboard",
      providesTags: ["OrgDashboard"],
    }),
    getOrgReports: builder.query({
      query: (params = "") => `/org/reports${params ? `?${params}` : ""}`,
    }),
    downloadOrgReportPdf: builder.mutation({
      query: (params = "") => ({
        url: `/org/reports/pdf${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadOrgReportExcel: builder.mutation({
      query: (params = "") => ({
        url: `/org/reports/excel${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getOrgSubscription: builder.query({
      query: () => "/org/subscription",
    }),
    getOrgNotifications: builder.query({
      query: (limit = 100) => `/org/notifications?limit=${limit}`,
      providesTags: ["OrgNotifications"],
    }),
    getOrgNotificationById: builder.query({
      query: (id) => `/org/notifications/${id}`,
      providesTags: (result, error, id) => [{ type: "OrgNotifications", id }],
    }),
    markNotificationAsRead: builder.mutation({
      query: (id) => ({
        url: `/org/notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: ["OrgNotifications"],
    }),
    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: "/org/notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["OrgNotifications"],
    }),
    getOrgUsers: builder.query({
      query: (limit = 1600) => `/org/users?limit=${limit}`,
      providesTags: ["OrgUsers"],
    }),
    getOrgUserById: builder.query({
      query: (userId) => `/org/users/${userId}`,
      providesTags: ["OrgUsers"],
    }),
    downloadOrgUserProfilePdf: builder.mutation({
      query: (userId) => ({
        url: `/org/users/${userId}/profile-pdf`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    createOrgUser: builder.mutation({
      query: (payload) => ({
        url: "/org/users",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["OrgUsers", "OrgNotifications"],
    }),
    updateOrgUserStatus: builder.mutation({
      query: ({ userId, ...payload }) => ({
        url: `/org/users/${userId}/status`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["OrgUsers", "OrgNotifications"],
    }),
    patchOrgUser: builder.mutation({
      query: ({ userId, ...payload }) => ({
        url: `/org/users/${userId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["OrgUsers"],
    }),
    toggleOrgUserActive: builder.mutation({
      query: ({ userId, ...payload }) => ({
        url: `/org/users/${userId}/active`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["OrgUsers"],
    }),
    deleteOrgUser: builder.mutation({
      query: (userId) => ({
        url: `/org/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OrgUsers"],
    }),
    getOrgTeams: builder.query({
      query: (limit = 1200) => `/org/teams?limit=${limit}`,
      providesTags: ["OrgTeams"],
    }),
    getOrgTeamById: builder.query({
      query: (teamId) => `/org/teams/${teamId}`,
      providesTags: ["OrgTeams"],
    }),
    getOrgTeamMembers: builder.query({
      query: (teamId) => `/org/teams/${teamId}/members`,
      providesTags: ["OrgTeams"],
    }),
    createOrgTeam: builder.mutation({
      query: (payload) => ({
        url: "/org/teams",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["OrgTeams"],
    }),
    patchOrgTeam: builder.mutation({
      query: ({ teamId, ...payload }) => ({
        url: `/org/teams/${teamId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["OrgTeams"],
    }),
    deleteOrgTeam: builder.mutation({
      query: (teamId) => ({
        url: `/org/teams/${teamId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OrgTeams"],
    }),
    getOrgAttendance: builder.query({
      query: (params = "") => `/org/attendance${params ? `?${params}` : ""}`,
      providesTags: ["OrgAttendance"],
    }),
    downloadOrgAttendancePdf: builder.mutation({
      query: (params = "") => ({
        url: `/org/attendance/pdf${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadOrgAttendanceExcel: builder.mutation({
      query: (params = "") => ({
        url: `/org/attendance/excel${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getOrgAttendanceLogById: builder.query({
      query: (id) => `/org/attendance/${id}`,
      providesTags: (result, error, id) => [{ type: "OrgAttendance", id }],
    }),
    getOrgAttendanceSettings: builder.query({
      query: () => "/org/attendance/settings",
      providesTags: ["OrgAttendance"],
    }),
    updateOrgAttendanceSettings: builder.mutation({
      query: (payload) => ({
        url: "/org/attendance/settings",
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["OrgAttendance"],
    }),
    getOrgUserAttendanceLogs: builder.query({
      query: ({ userId, params = "" }) => `/org/users/${userId}/attendance/logs${params ? `?${params}` : ""}`,
      providesTags: (result, error, { userId }) => [{ type: "OrgUserAttendance", id: userId }],
    }),
    downloadOrgUserAttendancePdf: builder.mutation({
      query: ({ userId, params = "" }) => ({
        url: `/org/users/${userId}/attendance/pdf${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadOrgUserAttendanceExcel: builder.mutation({
      query: ({ userId, params = "" }) => ({
        url: `/org/users/${userId}/attendance/excel${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadOrgUsersExcel: builder.mutation({
      query: () => ({
        url: "/org/users/excel",
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useOnboardOrganizationMutation,
  useGetOrgDashboardQuery,
  useGetOrgReportsQuery,
  useDownloadOrgReportPdfMutation,
  useDownloadOrgReportExcelMutation,
  useGetOrgSubscriptionQuery,
  useGetOrgNotificationsQuery,
  useGetOrgNotificationByIdQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetOrgUsersQuery,
  useGetOrgUserByIdQuery,
  useDownloadOrgUserProfilePdfMutation,
  useCreateOrgUserMutation,
  usePatchOrgUserMutation,
  useUpdateOrgUserStatusMutation,
  useToggleOrgUserActiveMutation,
  useDeleteOrgUserMutation,
  useGetOrgTeamsQuery,
  useGetOrgTeamByIdQuery,
  useGetOrgTeamMembersQuery,
  useCreateOrgTeamMutation,
  usePatchOrgTeamMutation,
  useDeleteOrgTeamMutation,
  useGetOrgAttendanceQuery,
  useGetOrgAttendanceLogByIdQuery,
  useDownloadOrgAttendancePdfMutation,
  useDownloadOrgAttendanceExcelMutation,
  useGetOrgAttendanceSettingsQuery,
  useUpdateOrgAttendanceSettingsMutation,
  useGetOrgUserAttendanceLogsQuery,
  useDownloadOrgUserAttendancePdfMutation,
  useDownloadOrgUserAttendanceExcelMutation,
  useGetOrgRegistrationRequestsQuery,
  useAcceptRegistrationRequestMutation,
  useRejectRegistrationRequestMutation,
  useDownloadOrgUsersExcelMutation,
} = orgApi;
