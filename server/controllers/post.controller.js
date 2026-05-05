const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveOrganizationId, resolveUserRole } = require("../utils/membership");
const { assertPermission } = require("../services/access.service");
const { PERMISSION_KEYS } = require("../constants/permissions");
const {
  parseBoolean,
  parseLimit,
  parseOffset,
  truncateText,
} = require("../services/common.service");

const POST_TYPES = new Set([
  "NOTIFICATION",
  "NEWS",
  "ARTICLE",
  "POLL",
  "TOURNAMENT_CARD",
]);

const POST_INCLUDE = {
  author: {
    select: {
      name: true,
      memberships: {
        select: {
          orgId: true,
          role: true,
          isActive: true,
        },
      },
    },
  },
};

const toSafeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const normalizePostType = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toUpperCase();
  return POST_TYPES.has(normalized) ? normalized : null;
};

const normalizePollOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === "string") return option.trim();
      if (option == null) return "";
      return String(option).trim();
    })
    .filter(Boolean);

const normalizePollVotes = (votes = {}, optionCount = 0) => {
  const safeVotes = toSafeObject(votes);

  return Object.entries(safeVotes).reduce((accumulator, [userId, optionIndex]) => {
    const parsedIndex = Number(optionIndex);

    if (
      Number.isInteger(parsedIndex) &&
      parsedIndex >= 0 &&
      parsedIndex < optionCount
    ) {
      accumulator[String(userId)] = parsedIndex;
    }

    return accumulator;
  }, {});
};

const areSamePollOptions = (left = [], right = []) =>
  left.length === right.length && left.every((option, index) => option === right[index]);

const preparePollMetadata = (metadata = {}, existingMetadata = {}) => {
  const safeMetadata = toSafeObject(metadata);
  const options = normalizePollOptions(safeMetadata.options);

  if (options.length < 2) {
    return { error: "Poll must include at least two options" };
  }

  const previousMetadata = toSafeObject(existingMetadata);
  const previousOptions = normalizePollOptions(previousMetadata.options);
  const shouldReuseVotes = areSamePollOptions(options, previousOptions);
  const votes = shouldReuseVotes
    ? normalizePollVotes(previousMetadata.votes, options.length)
    : {};

  return {
    metadata: {
      ...safeMetadata,
      options,
      votes,
    },
  };
};

const serializePost = (post, currentUserId) => {
  const authorRole = post?.author ? resolveUserRole(post.author, post.orgId) : null;
  const serializedPost = authorRole
    ? {
        ...post,
        author: {
          ...post.author,
          role: authorRole,
        },
      }
    : post;

  if (!post || post.type !== "POLL") {
    return serializedPost;
  }

  const safeMetadata = toSafeObject(serializedPost.metadata);
  const options = normalizePollOptions(safeMetadata.options);
  const votes = normalizePollVotes(safeMetadata.votes, options.length);
  const totalVotes = Object.keys(votes).length;
  const voteCounts = Object.values(votes).reduce((accumulator, optionIndex) => {
    accumulator[optionIndex] = (accumulator[optionIndex] || 0) + 1;
    return accumulator;
  }, {});

  return {
    ...serializedPost,
    metadata: {
      ...safeMetadata,
      options,
      votes,
    },
    poll: {
      totalVotes,
      selectedOptionIndex: Object.prototype.hasOwnProperty.call(
        votes,
        String(currentUserId)
      )
        ? votes[String(currentUserId)]
        : null,
      results: options.map((option, index) => {
        const count = voteCounts[index] || 0;

        return {
          index,
          option,
          votes: count,
          percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0,
        };
      }),
    },
  };
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Org Admin
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, type, metadata } = req.body;
  const orgId = resolveOrganizationId(req.user);
  assertPermission(res, req.user, PERMISSION_KEYS.POST_CREATE, orgId);
  const normalizedType = normalizePostType(type, "NOTIFICATION");

  const normalizedTitle = truncateText(title, 191);
  const normalizedContent = String(content || "").trim();

  if (!normalizedTitle || !normalizedContent) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  if (!normalizedType) {
    res.status(400);
    throw new Error("Invalid post type");
  }

  let nextMetadata = toSafeObject(metadata);

  if (normalizedType === "POLL") {
    const preparedPoll = preparePollMetadata(metadata);

    if (preparedPoll.error) {
      res.status(400);
      throw new Error(preparedPoll.error);
    }

    nextMetadata = preparedPoll.metadata;
  }

  const post = await prisma.post.create({
    data: {
      title: normalizedTitle,
      content: normalizedContent,
      type: normalizedType,
      metadata: nextMetadata,
      orgId,
      authorId: req.user.id,
    },
    include: POST_INCLUDE,
  });

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    item: serializePost(post, req.user.id),
  });
});

// @desc    Get all posts for the organization
// @route   GET /api/posts
// @access  Org Member
exports.getOrgPosts = asyncHandler(async (req, res) => {
  const orgId = resolveOrganizationId(req.user);
  const { type, limit = 20, offset = 0 } = req.query;
  const safeLimit = parseLimit(limit, 20, 100);
  const safeOffset = parseOffset(offset, 0, 10000);

  const where = {
    orgId,
    isActive: true,
    deletedAt: null,
  };

  if (type) {
    const normalizedType = normalizePostType(type);
    if (!normalizedType) {
      res.status(400);
      throw new Error("Invalid post type");
    }
    where.type = normalizedType;
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
      take: safeLimit,
      skip: safeOffset,
    }),
    prisma.post.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    items: items.map((item) => serializePost(item, req.user.id)),
    meta: {
      total,
      limit: safeLimit,
      offset: safeOffset,
    },
  });
});

// @desc    Update a post
// @route   PATCH /api/posts/:id
// @access  Org Admin
exports.updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, type, metadata, isActive } = req.body;
  const orgId = resolveOrganizationId(req.user);
  assertPermission(res, req.user, PERMISSION_KEYS.POST_CREATE, orgId);

  const existing = await prisma.post.findUnique({
    where: { id: Number(id) },
  });

  if (!existing || existing.orgId !== orgId) {
    res.status(404);
    throw new Error("Post not found");
  }

  const nextType = type !== undefined ? normalizePostType(type) : existing.type;
  if (!nextType) {
    res.status(400);
    throw new Error("Invalid post type");
  }

  const nextTitle = title !== undefined ? truncateText(title, 191) : existing.title;
  const nextContent = content !== undefined ? String(content || "").trim() : existing.content;

  if (!nextTitle || !nextContent) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  const nextIsActive =
    isActive !== undefined ? parseBoolean(isActive, null) : existing.isActive;
  if (nextIsActive === null) {
    res.status(400);
    throw new Error("isActive must be boolean");
  }

  let nextMetadata =
    metadata !== undefined ? toSafeObject(metadata) : toSafeObject(existing.metadata);

  if (nextType === "POLL") {
    const preparedPoll = preparePollMetadata(
      metadata !== undefined ? metadata : existing.metadata,
      existing.metadata
    );

    if (preparedPoll.error) {
      res.status(400);
      throw new Error(preparedPoll.error);
    }

    nextMetadata = preparedPoll.metadata;
  } else if (existing.type === "POLL" && type !== undefined && nextType !== "POLL" && metadata === undefined) {
    nextMetadata = {};
  }

  const updated = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      title: nextTitle,
      content: nextContent,
      type: nextType,
      metadata: nextMetadata,
      isActive: nextIsActive,
    },
    include: POST_INCLUDE,
  });

  res.status(200).json({
    success: true,
    message: "Post updated successfully",
    item: serializePost(updated, req.user.id),
  });
});

// @desc    Vote on a poll post
// @route   POST /api/posts/:id/vote
// @access  Org Member
exports.voteOnPostPoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = resolveOrganizationId(req.user);
  const optionIndex = Number(req.body?.optionIndex);

  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    res.status(400);
    throw new Error("A valid poll option is required");
  }

  const existing = await prisma.post.findUnique({
    where: { id: Number(id) },
    include: POST_INCLUDE,
  });

  if (
    !existing ||
    existing.orgId !== orgId ||
    existing.deletedAt !== null ||
    existing.isActive !== true
  ) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (existing.type !== "POLL") {
    res.status(400);
    throw new Error("This post does not accept poll responses");
  }

  const preparedPoll = preparePollMetadata(existing.metadata, existing.metadata);

  if (preparedPoll.error) {
    res.status(400);
    throw new Error(preparedPoll.error);
  }

  if (optionIndex >= preparedPoll.metadata.options.length) {
    res.status(400);
    throw new Error("Selected poll option is invalid");
  }

  const nextVotes = normalizePollVotes(
    preparedPoll.metadata.votes,
    preparedPoll.metadata.options.length
  );

  nextVotes[String(req.user.id)] = optionIndex;

  const updated = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      metadata: {
        ...preparedPoll.metadata,
        votes: nextVotes,
      },
    },
    include: POST_INCLUDE,
  });

  res.status(200).json({
    success: true,
    message: "Poll response saved successfully",
    item: serializePost(updated, req.user.id),
  });
});

// @desc    Delete a post (Soft Delete)
// @route   DELETE /api/posts/:id
// @access  Org Admin
exports.deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = resolveOrganizationId(req.user);
  assertPermission(res, req.user, PERMISSION_KEYS.POST_CREATE, orgId);

  const existing = await prisma.post.findUnique({
    where: { id: Number(id) },
  });

  if (!existing || existing.orgId !== orgId) {
    res.status(404);
    throw new Error("Post not found");
  }

  await prisma.post.update({
    where: { id: Number(id) },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});
