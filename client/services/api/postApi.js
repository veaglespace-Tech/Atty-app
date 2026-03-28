import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";

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
    }),
    deletePost: builder.mutation({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Posts"],
    }),
  }),
});

export const {
  useGetOrgPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useVoteOnPostMutation,
  useDeletePostMutation,
} = postApi;
