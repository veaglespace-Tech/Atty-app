import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const superAdminApi = createApi({
  reducerPath: "superAdminApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["SADashboard", "SAOrganizations", "SAPlans", "SAPayments", "SAAnalytics"],
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
  }),
});

export const {
  useGetSuperAdminDashboardQuery,
  useDownloadSuperAdminDashboardPdfMutation,
  useDownloadSuperAdminDashboardExcelMutation,
  useGetSuperAdminOrganizationsQuery,
  useGetSuperAdminOrganizationByIdQuery,
  useDownloadSuperAdminOrganizationsPdfMutation,
  useDownloadSuperAdminOrganizationsExcelMutation,
  usePatchSuperAdminOrganizationMutation,
  useUpdateOrganizationAccessMutation,
  useGetSuperAdminPlansQuery,
  useGetSuperAdminPaymentsQuery,
  useGetSuperAdminPaymentByIdQuery,
  useUpdateSuperAdminPaymentMutation,
  useDeleteSuperAdminPaymentMutation,
  useDownloadSuperAdminPaymentsPdfMutation,
  useDownloadSuperAdminPaymentsExcelMutation,
  useGetSuperAdminAnalyticsQuery,
} = superAdminApi;
