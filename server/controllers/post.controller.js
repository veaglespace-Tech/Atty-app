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
const { uploadFileDataUrl, deleteCloudinaryFile } = require("../services/cloudinary-image.service");

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
      role: true,
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
// @access  Org member with POST_CREATE permission
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, type, metadata, teamId } = req.body;
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

  // Validate teamId if provided - must belong to this org
  let resolvedTeamId = null;
  if (teamId) {
    const parsedTeamId = Number(teamId);
    if (Number.isFinite(parsedTeamId) && parsedTeamId > 0) {
      const team = await prisma.team.findFirst({
        where: { id: parsedTeamId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!team) {
        res.status(404);
        throw new Error("Team not found in this organization");
      }
      resolvedTeamId = parsedTeamId;
    }
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

  if (req.body.attachments && Array.isArray(req.body.attachments)) {
    nextMetadata.attachments = [];
    for (const file of req.body.attachments) {
      if (file.dataUrl) {
        try {
          const uploadResult = await uploadFileDataUrl({
            dataUrl: file.dataUrl,
            folder: process.env.CLOUDINARY_POST_ATTACHMENT_FOLDER || "veagle-attendee/post-attachments",
          });
          nextMetadata.attachments.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            resourceType: uploadResult.resourceType,
            name: file.name || "Attachment",
            allowDownload: file.allowDownload !== false,
          });
        } catch (err) {
          res.status(400);
          throw new Error("Failed to upload attachment: " + err.message);
        }
      }
    }
  } else if (req.body.attachmentDataUrl) {
    try {
      const uploadResult = await uploadFileDataUrl({
        dataUrl: req.body.attachmentDataUrl,
        folder: process.env.CLOUDINARY_POST_ATTACHMENT_FOLDER || "veagle-attendee/post-attachments",
      });
      nextMetadata.attachment = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        format: uploadResult.format,
        resourceType: uploadResult.resourceType,
        name: req.body.attachmentName || "Attachment",
        allowDownload: req.body.attachmentAllowDownload !== false,
      };
    } catch (err) {
      res.status(400);
      throw new Error("Failed to upload attachment: " + err.message);
    }
  }

  const post = await prisma.post.create({
    data: {
      title: normalizedTitle,
      content: normalizedContent,
      type: normalizedType,
      metadata: nextMetadata,
      orgId,
      teamId: resolvedTeamId,
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
  const userId = Number(req.user.id);
  const { type, limit = 20, offset = 0 } = req.query;
  const safeLimit = parseLimit(limit, 20, 100);
  const safeOffset = parseOffset(offset, 0, 10000);
  const userRole = resolveUserRole(req.user, orgId);

  // For Team Leader and Member, show only:
  //   - Global org-wide posts (teamId IS NULL)
  //   - Posts scoped to a team the user is a member/leader of
  let teamFilter = null;
  if (userRole === "TEAM_LEADER" || userRole === "MEMBER") {
    const userTeams = await prisma.team.findMany({
      where: {
        orgId,
        deletedAt: null,
        OR: [
          { leaderId: userId },
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const teamIds = userTeams.map((t) => t.id);
    // Show global (org-wide, no teamId) posts + posts for their teams
    teamFilter = {
      OR: [
        { teamId: null },
        { teamId: { in: teamIds } },
      ],
    };
  }

  const where = {
    OR: [{ orgId: Number(orgId) }, { orgId: null }],
    isActive: true,
    deletedAt: null,
    ...(teamFilter || {}),
  };

  if (type) {
    const normalizedType = normalizePostType(type);
    if (!normalizedType) {
      res.status(400);
      throw new Error("Invalid post type");
    }
    where.type = normalizedType;
  }

  if (req.query.authorId) {
    where.authorId = Number(req.query.authorId);
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

  // Handle attachment changes
  if (req.body.attachments && Array.isArray(req.body.attachments)) {
    const incomingPublicIds = req.body.attachments.map(a => a.publicId).filter(Boolean);
    const existingAttachments = nextMetadata.attachments || (nextMetadata.attachment ? [nextMetadata.attachment] : []);
    
    for (const ext of existingAttachments) {
      if (ext.publicId && !incomingPublicIds.includes(ext.publicId)) {
        await deleteCloudinaryFile(ext.publicId, ext.resourceType).catch(e => console.error(e));
      }
    }

    delete nextMetadata.attachment;
    nextMetadata.attachments = [];

    for (const file of req.body.attachments) {
      if (file.dataUrl && file.dataUrl.startsWith("data:")) {
        try {
          const uploadResult = await uploadFileDataUrl({
            dataUrl: file.dataUrl,
            folder: process.env.CLOUDINARY_POST_ATTACHMENT_FOLDER || "veagle-attendee/post-attachments",
          });
          nextMetadata.attachments.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            resourceType: uploadResult.resourceType,
            name: file.name || "Attachment",
            allowDownload: file.allowDownload !== false,
          });
        } catch (err) {
          res.status(400);
          throw new Error("Failed to upload attachment: " + err.message);
        }
      } else {
        nextMetadata.attachments.push(file);
      }
    }
  } else if (req.body.attachmentDataUrl !== undefined) {
    // If a new attachment is provided or the existing one is removed
    if (!req.body.attachmentDataUrl) {
      // Remove attachment
      if (nextMetadata.attachment?.publicId) {
        await deleteCloudinaryFile(nextMetadata.attachment.publicId, nextMetadata.attachment.resourceType);
      }
      delete nextMetadata.attachment;
    } else if (req.body.attachmentDataUrl.startsWith("data:")) {
      // Upload new attachment
      try {
        const uploadResult = await uploadFileDataUrl({
          dataUrl: req.body.attachmentDataUrl,
          folder: process.env.CLOUDINARY_POST_ATTACHMENT_FOLDER || "veagle-attendee/post-attachments",
        });
        
        // Delete old attachment if it exists
        if (nextMetadata.attachment?.publicId) {
          await deleteCloudinaryFile(nextMetadata.attachment.publicId, nextMetadata.attachment.resourceType);
        }

        nextMetadata.attachment = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
          name: req.body.attachmentName || "Attachment",
          allowDownload: req.body.attachmentAllowDownload !== false,
        };
      } catch (err) {
        res.status(400);
        throw new Error("Failed to upload attachment: " + err.message);
      }
    }
  }

  // Handle allowDownload toggle without re-uploading
  if (req.body.attachmentDataUrl === undefined && req.body.attachmentAllowDownload !== undefined) {
    if (nextMetadata.attachment) {
      nextMetadata.attachment.allowDownload = req.body.attachmentAllowDownload;
    }
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

  // Delete attachment if it exists
  const existingMetadata = toSafeObject(existing.metadata);
  if (existingMetadata.attachment?.publicId) {
    await deleteCloudinaryFile(existingMetadata.attachment.publicId, existingMetadata.attachment.resourceType);
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

// @desc    Get detailed poll voters grouped by selected option
// @route   GET /api/posts/:id/poll-results
// @access  ORG_ADMIN, SUB_ADMIN, TEAM_LEADER
exports.getPostPollResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = resolveOrganizationId(req.user);
  
  // Verify user has access based on role
  const role = resolveUserRole(req.user);
  if (!["ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER"].includes(role)) {
    res.status(403);
    throw new Error("Not authorized to view detailed poll results");
  }

  const existing = await prisma.post.findUnique({
    where: { id: Number(id) },
  });

  if (!existing || existing.orgId !== orgId || existing.deletedAt !== null) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (existing.type !== "POLL") {
    res.status(400);
    throw new Error("This post is not a poll");
  }

  const safeMetadata = toSafeObject(existing.metadata);
  const options = normalizePollOptions(safeMetadata.options);
  const votes = normalizePollVotes(safeMetadata.votes, options.length);
  
  // Collect all unique user IDs who voted
  const voterUserIds = Object.keys(votes).map(Number).filter(Boolean);

  if (voterUserIds.length === 0) {
    return res.status(200).json({
      success: true,
      message: "Poll results fetched successfully",
      items: options.map((option, index) => ({
        index,
        option,
        voters: [],
      })),
    });
  }

  // Define team scope if TEAM_LEADER
  let leaderTeamIds = null;
  if (role === "TEAM_LEADER") {
    const leaderTeams = await prisma.team.findMany({
      where: {
        orgId,
        deletedAt: null,
        OR: [
          { leaderId: req.user.id },
          { createdById: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ]
      },
      select: { id: true }
    });
    leaderTeamIds = leaderTeams.map(t => t.id);
  }

  // Fetch the voters details
  const users = await prisma.user.findMany({
    where: {
      id: { in: voterUserIds },
      orgId,
      ...(leaderTeamIds !== null ? {
        teamMemberships: {
          some: { teamId: { in: leaderTeamIds } }
        }
      } : {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      profileImageUrl: true,
      role: true,
      teamMemberships: {
        select: {
          team: {
            select: { name: true }
          }
        }
      }
    }
  });

  const validUserIds = new Set(users.map(u => u.id));
  
  // Map users back to options, honoring team constraints
  const groupedResults = options.map((option, index) => {
    const votersForOption = [];
    
    // Find all user IDs who voted for this option
    for (const [userIdStr, votedIndex] of Object.entries(votes)) {
      if (votedIndex === index) {
        const uid = Number(userIdStr);
        if (validUserIds.has(uid)) {
          const u = users.find(user => user.id === uid);
          votersForOption.push({
            id: u.id,
            name: u.name,
            email: u.email,
            profileImageUrl: u.profileImageUrl,
            role: u.role,
            teams: u.teamMemberships.map(tm => tm.team.name).join(", "),
          });
        }
      }
    }

    return {
      index,
      option,
      voters: votersForOption,
    };
  });

  res.status(200).json({
    success: true,
    message: "Poll results fetched successfully",
    items: groupedResults,
  });
});
