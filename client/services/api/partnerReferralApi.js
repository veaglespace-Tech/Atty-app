import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const partnerReferralApi = createApi({
  reducerPath: "partnerReferralApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["PartnerReferral", "SuperAdminUsers"],
  endpoints: (builder) => ({
    getPartnerStats: builder.query({
      query: () => "/partner-referral/stats",
      providesTags: ["PartnerReferral"],
    }),
    toggleReferralPartner: builder.mutation({
      query: ({ userId, isPartner }) => ({
        url: `/partner-referral/toggle-partner/${userId}`,
        method: "POST",
        body: { isPartner },
      }),
      invalidatesTags: ["SuperAdminUsers", "PartnerReferral"],
    }),
  }),
});

export const { useGetPartnerStatsQuery, useToggleReferralPartnerMutation } = partnerReferralApi;
