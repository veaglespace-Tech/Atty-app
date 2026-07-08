import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";
import { superAdminApi } from "./superAdminApi";

const invalidateSuperAdminPlans = async ({ dispatch, queryFulfilled }) => {
    try {
        await queryFulfilled;
        dispatch(superAdminApi.util.invalidateTags(["SAPlans"]));
    } catch (_) {
        // Keep existing error handling behavior unchanged.
    }
};

export const planApi = createApi({
    reducerPath: "planApi",
    baseQuery: buildBaseQuery(),
    tagTypes: ["Plans"],
    endpoints: (builder) => ({
        getPlans: builder.query({
            query: () => "/plans",
            transformResponse: (response) => response.plans || [],
            providesTags: ["Plans"],
        }),
        getPlanById: builder.query({
            query: (id) => `/plans/${id}`,
            transformResponse: (response) => response.plan,
            providesTags: (result, error, id) => [{ type: "Plans", id }],
        }),
        createPlan: builder.mutation({
            query: (payload) => ({
                url: "/plans",
                method: "POST",
                body: payload,
            }),
            invalidatesTags: ["Plans"],
            onQueryStarted: (_arg, api) => invalidateSuperAdminPlans(api),
        }),
        updatePlan: builder.mutation({
            query: ({ id, ...payload }) => ({
                url: `/plans/${id}`,
                method: "PUT",
                body: payload,
            }),
            invalidatesTags: ["Plans"],
            onQueryStarted: (_arg, api) => invalidateSuperAdminPlans(api),
        }),
        deletePlan: builder.mutation({
            query: (planId) => ({
                url: `/plans/${planId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Plans"],
            onQueryStarted: (_arg, api) => invalidateSuperAdminPlans(api),
        }),
    }),
});

export const {
    useGetPlansQuery,
    useGetPlanByIdQuery,
    useCreatePlanMutation,
    useUpdatePlanMutation,
    useDeletePlanMutation,
} = planApi;
