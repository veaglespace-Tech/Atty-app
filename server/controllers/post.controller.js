const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

const POST_INCLUDE = {
  author: {
    select: {
      name: true,
      role: true,
    },
  },
};

const toSafeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

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
  if (!post || post.type !== "POLL") {
    return post;
  }

  const safeMetadata = toSafeObject(post.metadata);
  const options = normalizePollOptions(safeMetadata.options);
  const votes = normalizePollVotes(safeMetadata.votes, options.length);
  const totalVotes = Object.keys(votes).length;
  const voteCounts = Object.values(votes).reduce((accumulator, optionIndex) => {
    accumulator[optionIndex] = (accumulator[optionIndex] || 0) + 1;
    return accumulator;
  }, {});

  return {
    ...post,
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
  const orgId = req.user.orgId;
  const normalizedType = type || "NOTIFICATION";

  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
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
      title,
      content,
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
  const orgId = req.user.orgId;
  const { type, limit = 20, offset = 0 } = req.query;

  const where = {
    orgId,
    isActive: true,
    deletedAt: null,
  };

  if (type) {
    where.type = type;
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.post.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    items: items.map((item) => serializePost(item, req.user.id)),
    meta: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

// @desc    Update a post
// @route   PATCH /api/posts/:id
// @access  Org Admin
exports.updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, type, metadata, isActive } = req.body;
  const orgId = req.user.orgId;

  const existing = await prisma.post.findUnique({
    where: { id: Number(id) },
  });

  if (!existing || existing.orgId !== orgId) {
    res.status(404);
    throw new Error("Post not found");
  }

  const nextType = type !== undefined ? type : existing.type;
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
  } else if (existing.type === "POLL" && type !== undefined && type !== "POLL" && metadata === undefined) {
    nextMetadata = {};
  }

  const updated = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      title: title !== undefined ? title : existing.title,
      content: content !== undefined ? content : existing.content,
      type: nextType,
      metadata: nextMetadata,
      isActive: isActive !== undefined ? isActive : existing.isActive,
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
  const orgId = req.user.orgId;
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
  const orgId = req.user.orgId;

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
