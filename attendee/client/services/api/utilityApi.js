import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const utilityApi = createApi({
  reducerPath: "utilityApi",
  baseQuery: buildBaseQuery(),
  endpoints: (builder) => ({
    getUtilityEndpoint: builder.query({
      query: (endpoint) => endpoint,
    }),
  }),
});

export const { useGetUtilityEndpointQuery } = utilityApi;
