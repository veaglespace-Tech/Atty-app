import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: buildBaseQuery(),
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => "/dashboard/stats",
    }),
    getDashboardActivities: builder.query({
      query: () => "/dashboard/activities",
    }),
  }),
});

export const { useGetDashboardStatsQuery, useGetDashboardActivitiesQuery } = dashboardApi;

