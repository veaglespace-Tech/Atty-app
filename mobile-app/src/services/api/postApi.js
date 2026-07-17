import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";
import { orgApi } from "./orgApi";

export const postApi = createApi({
  reducerPath: "postApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["Posts"],
  endpoints: (builder) => ({
    getOrgPosts: builder.query({
      query: (params) => ({
        url: "/posts",
        params,
      }),
      providesTags: ["Posts"],
    }),
    createPost: builder.mutation({
      query: (data) => ({
        url: "/posts",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Posts"],
    }),
    updatePost: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Posts"],
    }),
    voteOnPost: builder.mutation({
      query: ({ id, optionIndex }) => ({
        url: `/posts/${id}/vote`,
        method: "POST",
        body: { optionIndex },
      }),
      invalidatesTags: ["Posts"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(orgApi.util.invalidateTags(["OrgNotifications"]));
        } catch {
          // vote failed, no need to invalidate
        }
      },
    }),
    deletePost: builder.mutation({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Posts"],
    }),
    getPostPollResults: builder.query({
      query: (id) => `/posts/${id}/poll-results`,
      providesTags: (result, error, id) => [{ type: "Posts", id }],
    }),
  }),
});

export const {
  useGetOrgPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useVoteOnPostMutation,
  useDeletePostMutation,
  useGetPostPollResultsQuery,
} = postApi;

