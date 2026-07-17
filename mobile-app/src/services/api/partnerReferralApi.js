import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const partnerReferralApi = createApi({
  reducerPath: "partnerReferralApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["ReferralPartner"],
  endpoints: (builder) => ({
    getAllReferralPartners: builder.query({
      query: () => "/partner-referral",
      providesTags: ["ReferralPartner"],
    }),
    getReferralPartnerById: builder.query({
      query: (id) => `/partner-referral/${id}`,
      providesTags: (result, error, id) => [{ type: "ReferralPartner", id }],
    }),
    createReferralPartner: builder.mutation({
      query: (data) => ({
        url: "/partner-referral",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ReferralPartner"],
    }),
    deleteReferralPartner: builder.mutation({
      query: (id) => ({
        url: `/partner-referral/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ReferralPartner"],
    }),
    updateReferralPartner: builder.mutation({
      query: ({ id, data }) => ({
        url: `/partner-referral/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ReferralPartner", id },
        "ReferralPartner",
      ],
    }),
    getPublicPartnerStats: builder.mutation({
      query: (credentials) => ({
        url: "/partner-referral/stats-public",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
});

export const {
  useGetAllReferralPartnersQuery,
  useGetReferralPartnerByIdQuery,
  useCreateReferralPartnerMutation,
  useUpdateReferralPartnerMutation,
  useDeleteReferralPartnerMutation,
  useGetPublicPartnerStatsMutation,
} = partnerReferralApi;
