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
  useDeletePostMutation 
} from "@/store/api/postApi";
import { getErrorMessage } from "@/utils/formValidation";
import { PostForm } from "./_components/PostForm";
import { PostCard } from "./_components/PostCard";

const POST_TYPES = [
  { value: "NOTIFICATION", label: "Notification", icon: Megaphone, color: "text-blue-600 bg-blue-50" },
  { value: "ARTICLE", label: "Article", icon: FileText, color: "text-emerald-600 bg-emerald-50" },
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

  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "NOTIFICATION",
    metadata: { options: ["", ""] },
  });

  const { data: postsData, isLoading, refetch, isFetching } = useGetOrgPostsQuery();
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
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

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      type: "NOTIFICATION",
      metadata: { options: ["", ""] },
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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Organization Posts</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create and manage notifications, polls, and articles for your organization members.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (createOpen && editingId) resetForm();
                else setCreateOpen(!createOpen);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={15} />
              {editingId ? "Cancel Edit" : "Create Post"}
              {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={refetch}
              disabled={isLoading || isFetching}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
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
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                types={POST_TYPES}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
