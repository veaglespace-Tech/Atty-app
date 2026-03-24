const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

// @desc    Create a new post
// @route   POST /api/posts
// @access  Org Admin
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, type, metadata } = req.body;
  const orgId = req.user.orgId;

  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  const post = await prisma.post.create({
    data: {
      title,
      content,
      type: type || "NOTIFICATION",
      metadata: metadata || {},
      orgId,
      authorId: req.user.id,
    },
    include: {
      author: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    item: post,
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
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
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
    items,
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

  const updated = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      title: title !== undefined ? title : existing.title,
      content: content !== undefined ? content : existing.content,
      type: type !== undefined ? type : existing.type,
      metadata: metadata !== undefined ? metadata : existing.metadata,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    },
  });

  res.status(200).json({
    success: true,
    message: "Post updated successfully",
    item: updated,
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
