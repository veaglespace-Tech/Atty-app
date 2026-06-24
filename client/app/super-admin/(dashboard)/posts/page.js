"use client";

import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Megaphone,
  FileText,
  Globe,
  BarChart2,
  Trophy,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Edit2,
  Building2,
  X,
  User,
  Paperclip,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import {
  useGetSuperAdminPostsQuery,
  useCreateSuperAdminPostMutation,
  useUpdateSuperAdminPostMutation,
  useDeleteSuperAdminPostMutation,
} from "@/services/api/superAdminApi";
import OrganizationLookupField from "@/components/OrganizationLookupField";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { addNotification } from "@/store/slices/notificationSlice";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";

const POST_TYPES = [
  { value: "NOTIFICATION", label: "Announcement", icon: Megaphone, color: "text-blue-600 bg-blue-50/80 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  { value: "NEWS", label: "News Feed", icon: Globe, color: "text-sky-600 bg-sky-50/80 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20" },
  { value: "ARTICLE", label: "Knowledge Article", icon: FileText, color: "text-emerald-600 bg-emerald-50/80 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  { value: "POLL", label: "Interactive Poll", icon: BarChart2, color: "text-amber-600 bg-amber-50/80 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  { value: "TOURNAMENT_CARD", label: "Tournament Card", icon: Trophy, color: "text-rose-600 bg-rose-50/80 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" },
];

export default function SuperAdminPostsPage() {
  const dispatch = useDispatch();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "NOTIFICATION",
    metadata: { options: ["", ""] },
    orgId: "",
    attachmentDataUrl: undefined,
    attachmentName: "",
    attachmentAllowDownload: true,
  });
  const [selectedOrgForm, setSelectedOrgForm] = useState(null);

  // API Hooks
  const {
    data: postsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminPostsQuery({ limit: 1000 });

  const [createPost, { isLoading: creating }] = useCreateSuperAdminPostMutation();
  const [updatePost, { isLoading: updating }] = useUpdateSuperAdminPostMutation();
  const [deletePost] = useDeleteSuperAdminPostMutation();

  const posts = useMemo(() => postsData?.items || [], [postsData]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = posts.length;
    const active = posts.filter((p) => p.isActive).length;
    const polls = posts.filter((p) => p.type === "POLL").length;
    const news = posts.filter((p) => p.type === "NEWS" || p.type === "NOTIFICATION").length;
    return { total, active, polls, news };
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "ALL" || post.type === typeFilter;
      const matchesOrg = !selectedOrgFilter || post.orgId === selectedOrgFilter.id;
      return matchesSearch && matchesType && matchesOrg;
    });
  }, [posts, searchTerm, typeFilter, selectedOrgFilter]);

  // Pagination
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
    dependencies: [searchTerm, typeFilter, selectedOrgFilter, filteredPosts.length],
  });

  const onInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onPollOptionChange = (index, value) => {
    const newOptions = [...form.metadata.options];
    newOptions[index] = value;
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, options: newOptions },
    }));
  };

  const addPollOption = () => {
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        options: [...prev.metadata.options, ""],
      },
    }));
  };

  const removePollOption = (index) => {
    if (form.metadata.options.length <= 2) return;
    const newOptions = form.metadata.options.filter((_, i) => i !== index);
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, options: newOptions },
    }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      type: "NOTIFICATION",
      metadata: { options: ["", ""] },
      orgId: "",
      attachmentDataUrl: undefined,
      attachmentName: "",
      attachmentAllowDownload: true,
    });
    setSelectedOrgForm(null);
    setShowAddForm(false);
    setEditingPost(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.orgId) {
      dispatch(
        addNotification({
          type: "error",
          title: "Validation Error",
          message: "Please select an organization for the post.",
        })
      );
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        orgId: Number(form.orgId),
        attachmentDataUrl: form.attachmentDataUrl,
        attachmentName: form.attachmentName,
        attachmentAllowDownload: form.attachmentAllowDownload,
      };

      if (form.type === "POLL") {
        const cleanOpts = form.metadata.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          dispatch(
            addNotification({
              type: "error",
              title: "Validation Error",
              message: "Poll must contain at least 2 non-empty options.",
            })
          );
          return;
        }
        payload.metadata = { options: cleanOpts };
      }

      await createPost(payload).unwrap();
      dispatch(
        addNotification({
          type: "success",
          title: "Post Created",
          message: "The post was successfully published.",
        })
      );
      resetForm();
    } catch (err) {
      dispatch(
        addNotification({
          type: "error",
          title: "Creation Failed",
          message: err?.data?.message || "Failed to publish the post.",
        })
      );
    }
  };

  const handleEditInit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      content: post.content,
      type: post.type,
      metadata: post.metadata || { options: ["", ""] },
      orgId: String(post.orgId),
      isActive: post.isActive,
      attachmentDataUrl: undefined,
      attachmentName: post.metadata?.attachment?.name || "",
      attachmentAllowDownload: post.metadata?.attachment?.allowDownload ?? true,
    });
    setSelectedOrgForm(post.organization);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingPost.id,
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        isActive: form.isActive,
        attachmentDataUrl: form.attachmentDataUrl,
        attachmentName: form.attachmentName,
        attachmentAllowDownload: form.attachmentAllowDownload,
      };

      if (form.type === "POLL") {
        const cleanOpts = form.metadata.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          dispatch(
            addNotification({
              type: "error",
              title: "Validation Error",
              message: "Poll must contain at least 2 non-empty options.",
            })
          );
          return;
        }
        payload.metadata = { ...form.metadata, options: cleanOpts };
      }

      await updatePost(payload).unwrap();
      dispatch(
        addNotification({
          type: "success",
          title: "Post Updated",
          message: "The post details were successfully saved.",
        })
      );
      resetForm();
    } catch (err) {
      dispatch(
        addNotification({
          type: "error",
          title: "Update Failed",
          message: err?.data?.message || "Failed to update the post.",
        })
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this post? This will soft-delete the post.")) {
      try {
        await deletePost(id).unwrap();
        dispatch(
          addNotification({
            type: "success",
            title: "Post Deleted",
            message: "The post was successfully removed.",
          })
        );
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            title: "Deletion Failed",
            message: err?.data?.message || "Failed to delete the post.",
          })
        );
      }
    }
  };

  const getPollResults = (post) => {
    const options = Array.isArray(post.metadata?.options) ? post.metadata.options : [];
    const votes = post.metadata?.votes || {};
    const totalVotes = Object.keys(votes).length;

    const voteCounts = Object.values(votes).reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});

    return options.map((option, index) => {
      const count = voteCounts[index] || 0;
      return {
        option,
        votes: count,
        percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0,
      };
      };
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size should not exceed 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        attachmentDataUrl: reader.result,
        attachmentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setForm((prev) => ({
      ...prev,
      attachmentDataUrl: "",
      attachmentName: "",
    }));
  };

  const getExistingAttachmentName = () => {
    if (form.attachmentName) return form.attachmentName;
    if (form.metadata?.attachment?.name) return form.metadata.attachment.name;
    if (form.metadata?.attachment?.url) return "Existing Attachment";
    return null;
  };

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Post Management</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Announcements & Polls System</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-sm h-10 w-10 p-0"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="brand-btn brand-btn-primary brand-btn-md"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Posts" value={metrics.total} hint="All published posts across orgs" />
        <MetricCard label="Active Posts" value={metrics.active} hint="Posts visible to organization members" />
        <MetricCard label="Interactive Polls" value={metrics.polls} hint="Feedback polls created" />
        <MetricCard label="Broadcasts" value={metrics.news} hint="Announcements & news feeds" />
      </div>

      {/* Filter panel */}
      <div className={`${panelClassName} relative overflow-hidden`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-1.5 min-w-[280px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Organization</label>
            <OrganizationLookupField
              selectedOrganization={selectedOrgFilter}
              onSelect={(org) => setSelectedOrgFilter(org)}
              onClear={() => setSelectedOrgFilter(null)}
              placeholder="Search and select organization"
              inputClassName="w-full h-11 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#111] border-slate-200 dark:border-slate-800"
              normalFieldClassName="border border-slate-200 dark:border-slate-800"
              containerClassName="relative"
            />
          </div>

          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Post Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-1.5 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Search Keywords</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, content..."
                className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main post listing grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-64 rounded-[1.9rem] bg-slate-100 animate-pulse border border-slate-200 dark:bg-slate-900 dark:border-slate-800"></div>
              ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className={`${panelClassName} text-center py-16`}>
            <Megaphone className="mx-auto text-slate-200 dark:text-slate-700" size={48} />
            <p className="mt-4 text-slate-400 font-black">No posts found matching the criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedPosts.map((post) => {
                const typeInfo = POST_TYPES.find((t) => t.value === post.type) || POST_TYPES[0];
                const Icon = typeInfo.icon;
                const pollResults = post.type === "POLL" ? getPollResults(post) : [];
                const totalPollVotes = post.type === "POLL" && post.metadata?.votes ? Object.keys(post.metadata.votes).length : 0;

                return (
                  <div
                    key={post.id}
                    className="brand-entity-card flex flex-col justify-between overflow-hidden relative group"
                  >
                    <div className="brand-metric-glow" />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          {/* Organization badge */}
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                            <Building2 size={13} />
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] truncate">
                              {post.organization?.name || "Global"}
                            </span>
                          </div>
                          <span className="inline-block text-[9px] font-bold text-slate-400 tracking-wider">
                            Code: {post.organization?.organizationCode || "N/A"}
                          </span>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] ${typeInfo.color}`}>
                          <Icon size={11} />
                          {typeInfo.label}
                        </span>
                      </div>

                      {/* Content Section */}
                      <div className="mt-5">
                        <h4 className="text-base font-black text-slate-900 dark:text-white line-clamp-1">{post.title}</h4>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 min-h-[4.5em]">
                          {post.content}
                        </p>
                      </div>

                      {/* Attachment Section */}
                      {post.metadata?.attachment && (
                        <div className="mt-4">
                          {post.metadata.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) || (post.metadata.attachment.resourceType === "image" && post.metadata.attachment.format !== "pdf" && !post.metadata.attachment.url?.match(/\.pdf/i)) ? (
                            <div 
                              className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                              onContextMenu={(e) => post.metadata.attachment.allowDownload === false ? e.preventDefault() : null}
                            >
                              <img 
                                src={post.metadata.attachment.url} 
                                alt={post.metadata.attachment.name || "Attachment"} 
                                className={`h-full w-full object-cover ${post.metadata.attachment.allowDownload === false ? 'pointer-events-none select-none' : ''}`} 
                              />
                            </div>
                          ) : (
                            post.metadata.attachment.allowDownload !== false ? (
                              <a 
                                href={post.metadata.attachment.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <Paperclip size={18} className="text-blue-500 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">{post.metadata.attachment.name || "Attached File"}</p>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Click to view/download</p>
                                </div>
                              </a>
                            ) : (
                              <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 opacity-80">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <Paperclip size={18} className="text-slate-400" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="truncate text-xs font-bold text-slate-500">{post.metadata.attachment.name || "Attached File"}</p>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Attachment (Download Disabled)</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Poll View */}
                      {post.type === "POLL" && pollResults.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50/30 border border-amber-100 rounded-2xl dark:bg-amber-500/5 dark:border-amber-500/10 space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
                            <span>Poll Responses</span>
                            <span>{totalPollVotes} votes</span>
                          </div>
                          {pollResults.map((res, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span className="truncate">{res.option}</span>
                                <span>{res.percentage}% ({res.votes})</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${res.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Details & Actions */}
                    <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <User size={10} />
                          <span className="truncate max-w-[80px]">{post.author?.name || "System"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${
                          post.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {post.isActive ? "ACTIVE" : "PAUSED"}
                        </span>
                        
                        <div className="flex gap-1.5 relative z-10">
                          <button
                            type="button"
                            onClick={() => handleEditInit(post)}
                            className="p-1.5 rounded-lg border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-blue-600 dark:border-slate-800 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                            title="Edit Post"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 rounded-lg border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-rose-600 dark:border-slate-800 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                            title="Delete Post"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          </>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {(showAddForm || editingPost) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-[2.2rem] bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {editingPost ? "Edit Publication Details" : "Create New Publication"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {editingPost ? "Modify parameters for existing post" : "Publish announcement to organization"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingPost ? handleUpdateSubmit : handleCreateSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Organization Selection (only creation, or read-only on edit) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Organization</label>
                  {editingPost ? (
                    <div className="flex items-center gap-2 h-12 px-4 bg-slate-100 dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-500">
                      <Building2 size={16} />
                      <span>{selectedOrgForm?.name || "Global"}</span>
                    </div>
                  ) : (
                    <OrganizationLookupField
                      selectedOrganization={selectedOrgForm}
                      onSelect={(org) => {
                        setSelectedOrgForm(org);
                        setForm((prev) => ({ ...prev, orgId: String(org.id) }));
                      }}
                      onClear={() => {
                        setSelectedOrgForm(null);
                        setForm((prev) => ({ ...prev, orgId: "" }));
                      }}
                      placeholder="Select target workspace"
                      inputClassName="w-full h-12 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-[#111]"
                      normalFieldClassName="border border-slate-200 dark:border-slate-800"
                      containerClassName="relative"
                    />
                  )}
                </div>

                {/* Post Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Publication Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={onInputChange}
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {POST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Publication Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onInputChange}
                  placeholder="E.g., System Maintenance Schedule"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] text-sm font-bold outline-none transition focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              {/* Content Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Publication Body</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={onInputChange}
                  placeholder="Enter detailed message contents..."
                  rows={4}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] text-sm font-bold outline-none transition focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Attachment Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Attachment (Optional)
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
                      <Paperclip size={16} />
                      Attach File
                      <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                    
                    {(form.attachmentDataUrl !== "" && getExistingAttachmentName()) && (
                      <div className="flex items-center gap-2 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
                        {form.attachmentName?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <ImageIcon size={16} className="text-blue-500" />
                        ) : (
                          <FileText size={16} className="text-blue-500" />
                        )}
                        <span className="font-bold truncate max-w-[200px]">
                          {getExistingAttachmentName()}
                        </span>
                        <button
                          type="button"
                          onClick={removeAttachment}
                          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {(form.attachmentDataUrl !== "" && getExistingAttachmentName()) && (
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        name="attachmentAllowDownload"
                        checked={form.attachmentAllowDownload ?? true}
                        onChange={onInputChange}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Allow users to download this attachment</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Poll Options (If POLL type selected) */}
              {form.type === "POLL" && (
                <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/30 dark:border-amber-500/10 dark:bg-amber-500/5 space-y-3">
                  <label className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
                    Interactive Poll Choices
                  </label>
                  <div className="space-y-2">
                    {form.metadata.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={opt}
                          onChange={(e) => onPollOptionChange(i, e.target.value)}
                          placeholder={`Option #${i + 1}`}
                          className="flex-1 h-11 px-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#111] text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                        {form.metadata.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(i)}
                            className="p-2 text-amber-400 hover:text-rose-500 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> Add Option
                  </button>
                </div>
              )}

              {/* Edit Mode Flags */}
              {editingPost && (
                <div className="flex h-12 items-center gap-4 px-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">Active (Visible to users)</span>
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="brand-btn brand-btn-secondary w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="brand-btn brand-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {creating || updating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingPost ? (
                    "Save Changes"
                  ) : (
                    "Publish Now"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="brand-metric-card">
      <div className="brand-metric-glow" />
      <div className="relative">
        <p className="brand-metric-label mt-0">{label}</p>
        <p className="brand-metric-value">{value}</p>
        <p className="brand-metric-copy">{hint}</p>
      </div>
    </div>
  );
}
