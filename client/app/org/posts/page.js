"use client";

import { useMemo, useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Plus, 
  RefreshCcw, 
  Search, 
  Megaphone, 
  FileText, 
  BarChart2, 
  Trophy 
} from "lucide-react";
import { 
  useGetOrgPostsQuery, 
  useCreatePostMutation, 
  useUpdatePostMutation, 
  useVoteOnPostMutation,
  useDeletePostMutation 
} from "@/services/api/postApi";
import PaginationControls from "@/components/dashboard/PaginationControls";
import { getErrorMessage } from "@/utils/formValidation";
import useLocalPagination from "@/hooks/useLocalPagination";
import { useAuthSession } from "@/hooks/useAuthSession";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { PostForm } from "./_components/PostForm";
import { PostCard } from "./_components/PostCard";

const POST_TYPES = [
  { value: "NOTIFICATION", label: "Notification", icon: Megaphone, color: "text-blue-600 bg-blue-50" },
  { value: "ARTICLE", label: "Article", icon: FileText, color: "text-emerald-600 bg-emerald-50" },
  { value: "NEWS", label: "News", icon: Megaphone, color: "text-sky-600 bg-sky-50" },
  { value: "POLL", label: "Poll", icon: BarChart2, color: "text-amber-600 bg-amber-50" },
  { value: "TOURNAMENT_CARD", label: "Tournament Card", icon: Trophy, color: "text-rose-600 bg-rose-50" },
];

export default function OrgPostsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "NOTIFICATION",
    metadata: { options: ["", ""] },
    attachments: [],
  });

  const { user } = useAuthSession();
  const { data: postsData, isLoading, refetch, isFetching } = useGetOrgPostsQuery({ authorId: user?.id }, { skip: !user?.id });
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [voteOnPost] = useVoteOnPostMutation();
  const [deletePost] = useDeletePostMutation();

  const posts = useMemo(() => postsData?.items || [], [postsData]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "ALL" || post.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [posts, searchTerm, typeFilter]);
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPosts,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredPosts, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.POSTS[0],
    dependencies: [searchTerm, typeFilter],
  });

  const onInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      type: "NOTIFICATION",
      metadata: { options: ["", ""] },
      attachments: [],
    });
    setEditingId(null);
    setCreateOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = { ...form };
      if (payload.type !== "POLL") {
        delete payload.metadata;
      } else {
        payload.metadata.options = payload.metadata.options.filter(opt => opt.trim());
      }

      if (editingId) {
        await updatePost({ id: editingId, ...payload }).unwrap();
        setMessage("Post updated successfully");
      } else {
        await createPost(payload).unwrap();
        setMessage("Post created successfully");
      }
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save post"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (post) => {
    setForm({
      title: post.title,
      content: post.content,
      type: post.type,
      metadata: post.metadata || { options: ["", ""] },
      attachments: post.metadata?.attachments || (post.metadata?.attachment ? [post.metadata.attachment] : []),
    });
    setEditingId(post.id);
    setCreateOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(id).unwrap();
      setMessage("Post deleted successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete post"));
    }
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      setError("");
      setMessage("");
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
      setMessage("Poll response saved successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save poll response"));
    } finally {
      setActiveVoteId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">Organization Posts</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Create and manage notifications, polls, and articles for your organization members.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (createOpen && editingId) resetForm();
                else setCreateOpen(!createOpen);
              }}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              <Plus size={15} />
              {editingId ? "Cancel Edit" : "Create Post"}
              {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={refetch}
              disabled={isLoading || isFetching}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {isLoading || isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      {createOpen ? (
        <PostForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onReset={resetForm}
          onInputChange={onInputChange}
          types={POST_TYPES}
        />
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Post Feed</h3>
          
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-300 w-48 transition-all"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-blue-300 transition-all font-semibold text-slate-600"
            >
              <option value="ALL">All Types</option>
              {POST_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-bold">Fetching your feed...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 font-bold">No posts found.</p>
            <p className="text-xs text-slate-400 mt-1">Try creating your first announcement!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {paginatedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  types={POST_TYPES}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onVote={handleVote}
                  isVoting={activeVoteId === post.id}
                />
              ))}
            </div>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredPosts.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.POSTS}
              label="posts"
            />
          </div>
        )}
      </div>
    </section>
  );
}
