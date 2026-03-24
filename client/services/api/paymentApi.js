import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: buildBaseQuery(),
  endpoints: (builder) => ({
    getPaymentPublicKey: builder.query({
      query: () => "/payment/get-key",
    }),
    createPaymentOrder: builder.mutation({
      query: (payload) => ({
        url: "/payment/create-order",
        method: "POST",
        body: payload,
      }),
    }),
    verifyAndRegisterPayment: builder.mutation({
      query: (payload) => ({
        url: "/payment/verify-and-register",
        method: "POST",
        body: payload,
      }),
    }),
    archiveFailedRegistration: builder.mutation({
      query: (payload) => ({
        url: "/payment/archive-failed-registration",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useGetPaymentPublicKeyQuery,
  useLazyGetPaymentPublicKeyQuery,
  useCreatePaymentOrderMutation,
  useVerifyAndRegisterPaymentMutation,
  useArchiveFailedRegistrationMutation,
} = paymentApi;

