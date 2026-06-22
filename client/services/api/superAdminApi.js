import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const superAdminApi = createApi({
  reducerPath: "superAdminApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["SADashboard", "SAOrganizations", "SAPlans", "SAPayments", "SAAnalytics", "SAPermissions", "SARolePermissions", "SAContacts", "SASettings", "SAPosts"],
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
      query: (limit = 2000) => `/super-admin/organizations?limit=${limit}`,
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
    getSuperAdminPayments: builder.query({
      query: (queryString = "") => `/super-admin/payments${queryString ? `?${queryString}` : ""}`,
      providesTags: ["SAPayments"],
    }),
    getSuperAdminPaymentById: builder.query({
      query: (paymentId) => `/super-admin/payments/${paymentId}`,
      providesTags: ["SAPayments"],
    }),
    updateSuperAdminPayment: builder.mutation({
      query: ({ paymentId, ...payload }) => ({
        url: `/super-admin/payments/${paymentId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["SAPayments", "SAOrganizations", "SADashboard"],
    }),
    deleteSuperAdminPayment: builder.mutation({
      query: (paymentId) => ({
        url: `/super-admin/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SAPayments", "SAOrganizations", "SADashboard"],
    }),
    downloadSuperAdminPaymentsPdf: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/payments/pdf${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSuperAdminPaymentsExcel: builder.mutation({
      query: (queryString = "") => ({
        url: `/super-admin/payments/excel${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
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
  useDownloadSuperAdminOrganizationsPdfMutation,
  useDownloadSuperAdminOrganizationsExcelMutation,
  usePatchSuperAdminOrganizationMutation,
  useCreateSuperAdminOrganizationMutation,
  useExtendSuperAdminOrganizationPlanMutation,
  useUpdateOrganizationAccessMutation,
  useGetSuperAdminPlansQuery,
  useGetSuperAdminPaymentsQuery,
  useGetSuperAdminPaymentByIdQuery,
  useUpdateSuperAdminPaymentMutation,
  useDeleteSuperAdminPaymentMutation,
  useDownloadSuperAdminPaymentsPdfMutation,
  useDownloadSuperAdminPaymentsExcelMutation,
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
} = superAdminApi;
