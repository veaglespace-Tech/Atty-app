import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const attyApi = createApi({
  reducerPath: "attyApi",
  baseQuery: buildBaseQuery(),
  endpoints: (builder) => ({
    // Send message to Atty — no email fired here
    askAtty: builder.mutation({
      query: (message) => ({
        url: "/atty/chat",
        method: "POST",
        body: { message },
      }),
    }),

    // Submit support form — email fires on backend here only
    submitAttySupport: builder.mutation({
      query: (formData) => ({
        url: "/atty/support",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const { useAskAttyMutation, useSubmitAttySupportMutation } = attyApi;
