import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const superAdminApi = createApi({
  reducerPath: "superAdminApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["SADashboard", "SAOrganizations", "SAPlans", "SAAnalytics", "SAPermissions", "SARolePermissions", "SAContacts", "SASettings", "SAPosts", "SuperAdminLeads", "SACoupons"],
  endpoints: (builder) => ({
    getSuperAdminDashboard: builder.query({
      query: () => "/super-admin/dashboard",
      providesTags: ["SADashboard"],
    }),
    downloadSuperAdminDashboardPdf: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/dashboard/pdf${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSuperAdminDashboardExcel: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/dashboard/excel${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getSuperAdminOrganizations: builder.query({
      query: (params) => {
        let url = `/super-admin/organizations?limit=${params?.limit || 2000}`;
        if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
        if (params?.access) url += `&access=${params.access}`;
        if (params?.block) url += `&block=${params.block}`;
        return url;
      },
      providesTags: ["SAOrganizations"],
    }),
    getSuperAdminOrganizationById: builder.query({
      query: (organizationId) => `/super-admin/organizations/${organizationId}`,
      providesTags: ["SAOrganizations"],
    }),
    getSuperAdminOrganizationUsers: builder.query({
      query: (organizationId) => `/super-admin/organizations/${organizationId}/users`,
      providesTags: ["SAOrganizations"],
    }),
    getSuperAdminOrganizationTeams: builder.query({
      query: (organizationId) => `/super-admin/organizations/${organizationId}/teams`,
      providesTags: ["SAOrganizations"],
    }),
    getSuperAdminLeads: builder.query({
      query: () => "/super-admin/leads",
      providesTags: ["SuperAdminLeads"],
    }),
    deleteSuperAdminLead: builder.mutation({
      query: (leadId) => ({
        url: `/super-admin/leads/${leadId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SuperAdminLeads"],
    }),
    downloadSuperAdminOrganizationsPdf: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/organizations/pdf${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSuperAdminOrganizationsExcel: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/organizations/excel${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    patchSuperAdminOrganization: builder.mutation({
      query: ({ organizationId, ...payload }) => ({
        url: `/super-admin/organizations/${organizationId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAOrganizations", "SADashboard"],
    }),
    createSuperAdminOrganization: builder.mutation({
      query: (payload) => ({
        url: "/super-admin/organizations",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SAOrganizations", "SADashboard"],
    }),
    extendSuperAdminOrganizationPlan: builder.mutation({
      query: ({ organizationId, ...payload }) => ({
        url: `/super-admin/organizations/${organizationId}/extend-plan`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SAOrganizations", "SADashboard"],
    }),
    updateOrganizationAccess: builder.mutation({
      query: ({ organizationId, ...payload }) => ({
        url: `/super-admin/organizations/${organizationId}/access`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAOrganizations", "SADashboard"],
    }),
    getSuperAdminPlans: builder.query({
      query: () => "/super-admin/plans",
      providesTags: ["SAPlans"],
    }),

    getSuperAdminAnalytics: builder.query({
      query: () => "/super-admin/analytics",
      providesTags: ["SAAnalytics"],  
    }),
    getPermissions: builder.query({
      query: () => "/super-admin/permissions",
      providesTags: ["SAPermissions"],
    }),
    createPermission: builder.mutation({
      query: (payload) => ({
        url: "/super-admin/permissions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SAPermissions"],
    }),
    updatePermission: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/super-admin/permissions/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAPermissions", "SARolePermissions"],
    }),
    deletePermission: builder.mutation({
      query: (id) => ({
        url: `/super-admin/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SAPermissions", "SARolePermissions"],
    }),
    getRolePermissions: builder.query({
      query: () => "/super-admin/roles/permissions",
      providesTags: ["SARolePermissions"],
    }),
    updateRolePermissions: builder.mutation({
      query: (payload) => ({
        url: "/super-admin/roles/permissions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SARolePermissions"],
    }),
    getSuperAdminContactById: builder.query({
      query: (id) => `/super-admin/contacts/${id}`,
      providesTags: ["SAContacts"],
    }),
    patchSuperAdminContact: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/super-admin/contacts/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAContacts"],
    }),
    deleteSuperAdminContact: builder.mutation({
      query: (id) => ({
        url: `/super-admin/contacts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SAContacts"],
    }),
    getSuperAdminContactInquiries: builder.query({
      query: () => "/super-admin/contacts?limit=500",
      providesTags: ["SAContacts"],
    }),
    deleteAllSuperAdminContacts: builder.mutation({
      query: () => ({
        url: "/super-admin/contacts",
        method: "DELETE",
      }),
      invalidatesTags: ["SAContacts"],
    }),
    getAllSuperAdminUsers: builder.query({
      query: () => "/super-admin/users",
      providesTags: ["SAOrganizations"],
    }),
    getSuperAdminUserById: builder.query({
      query: (userId) => `/super-admin/users/${userId}`,
      providesTags: ["SAOrganizations"],
    }),
    patchSuperAdminUser: builder.mutation({
      query: ({ userId, ...payload }) => ({
        url: `/super-admin/users/${userId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAOrganizations", "SADashboard"],
    }),
    getSystemSettings: builder.query({
      query: () => "/super-admin/settings",
      providesTags: ["SASettings"],
    }),
    updateSystemSetting: builder.mutation({
      query: (payload) => ({
        url: "/super-admin/settings",
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SASettings"],
    }),
    getSuperAdminPosts: builder.query({
      query: ({ orgId, type, limit = 50, offset = 0 } = {}) => {
        const params = new URLSearchParams();
        if (orgId) params.append("orgId", orgId);
        if (type) params.append("type", type);
        params.append("limit", limit);
        params.append("offset", offset);
        return `/super-admin/posts?${params.toString()}`;
      },
      providesTags: ["SAPosts"],
    }),
    createSuperAdminPost: builder.mutation({
      query: (payload) => ({
        url: "/super-admin/posts",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SAPosts", "SADashboard"],
    }),
    updateSuperAdminPost: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/super-admin/posts/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAPosts", "SADashboard"],
    }),
    deleteSuperAdminPost: builder.mutation({
      query: (id) => ({
        url: `/super-admin/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SAPosts", "SADashboard"],
    }),
    getSuperAdminAttendanceReports: builder.query({
      query: (params = "") => `/super-admin/attendance/reports${params ? `?${params}` : ""}`,
    }),
    downloadSuperAdminAttendanceReportsPdf: builder.mutation({
      query: (params = "") => ({
        url: `/super-admin/attendance/reports/pdf${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSuperAdminAttendanceReportsExcel: builder.mutation({
      query: (params = "") => ({
        url: `/super-admin/attendance/reports/excel${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getSuperAdminUserAttendanceLogs: builder.query({
      query: ({ userId, params = "" }) => `/super-admin/attendance/users/${userId}/logs${params ? `?${params}` : ""}`,
    }),
    downloadSuperAdminUserAttendancePdf: builder.mutation({
      query: ({ userId, params = "" }) => ({
        url: `/super-admin/attendance/users/${userId}/pdf${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSuperAdminUserAttendanceExcel: builder.mutation({
      query: ({ userId, params = "" }) => ({
        url: `/super-admin/attendance/users/${userId}/excel${params ? `?${params}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportSuperAdminOrganizationUsersExcel: builder.mutation({
      query: (organizationId) => ({
        url: `/super-admin/organizations/${organizationId}/users/excel`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportAllSuperAdminUsersExcel: builder.mutation({
      query: () => ({
        url: "/super-admin/users/excel",
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadDatabaseBackup: builder.mutation({
      query: () => ({
        url: "/super-admin/backup/download",
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getSuperAdminCoupons: builder.query({
      query: () => "/coupons/admin",
      providesTags: ["SACoupons"],
    }),
    createSuperAdminCoupon: builder.mutation({
      query: (payload) => ({
        url: "/coupons",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SACoupons"],
    }),
    updateSuperAdminCoupon: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/coupons/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["SACoupons"],
    }),
    deleteSuperAdminCoupon: builder.mutation({
      query: (id) => ({
        url: `/coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SACoupons"],
    }),
  }),
});

export const {
  useGetSuperAdminDashboardQuery,
  useDownloadSuperAdminDashboardPdfMutation,
  useDownloadSuperAdminDashboardExcelMutation,
  useGetSuperAdminOrganizationsQuery,
  useGetSuperAdminOrganizationByIdQuery,
  useGetSuperAdminOrganizationUsersQuery,
  useGetSuperAdminOrganizationTeamsQuery,
  useGetSuperAdminLeadsQuery,
  useDeleteSuperAdminLeadMutation,
  useDownloadSuperAdminOrganizationsPdfMutation,
  useDownloadSuperAdminOrganizationsExcelMutation,
  usePatchSuperAdminOrganizationMutation,
  useCreateSuperAdminOrganizationMutation,
  useExtendSuperAdminOrganizationPlanMutation,
  useUpdateOrganizationAccessMutation,
  useGetSuperAdminPlansQuery,

  useGetSuperAdminAnalyticsQuery,
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
  useGetSuperAdminContactByIdQuery,
  usePatchSuperAdminContactMutation,
  useDeleteSuperAdminContactMutation,
  useGetSuperAdminContactInquiriesQuery,
  useDeleteAllSuperAdminContactsMutation,
  useGetSuperAdminUserByIdQuery,
  useGetAllSuperAdminUsersQuery,
  usePatchSuperAdminUserMutation,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
  useGetSuperAdminPostsQuery,
  useCreateSuperAdminPostMutation,
  useUpdateSuperAdminPostMutation,
  useDeleteSuperAdminPostMutation,
  useGetSuperAdminAttendanceReportsQuery,
  useDownloadSuperAdminAttendanceReportsPdfMutation,
  useDownloadSuperAdminAttendanceReportsExcelMutation,
  useGetSuperAdminUserAttendanceLogsQuery,
  useDownloadSuperAdminUserAttendancePdfMutation,
  useDownloadSuperAdminUserAttendanceExcelMutation,
  useDownloadDatabaseBackupMutation,
  useExportSuperAdminOrganizationUsersExcelMutation,
  useExportAllSuperAdminUsersExcelMutation,
  useGetSuperAdminCouponsQuery,
  useCreateSuperAdminCouponMutation,
  useUpdateSuperAdminCouponMutation,
  useDeleteSuperAdminCouponMutation,
} = superAdminApi;
