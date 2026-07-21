const express = require("express");
const router = express.Router();
const {
  createPost,
  getOrgPosts,
  updatePost,
  deletePost,
  voteOnPostPoll,
  getPostPollResults,
} = require("../controllers/post.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { requireMembership } = require("../middlewares/rbac.middleware");

// Routes protected by authentication
router.use(userProtected);
router.use(requireMembership());

// Get all posts (Available to all authenticated members of organization)
router.get("/", getOrgPosts);
router.get("/:id/poll-results", getPostPollResults);
router.post("/:id/vote", voteOnPostPoll);

// Post management (Gated by permission in controller)
router.post("/", createPost);
router.patch("/:id", updatePost);
router.delete("/:id", deletePost);

module.exports = router;
