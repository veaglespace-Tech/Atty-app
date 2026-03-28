const express = require("express");
const router = express.Router();
const {
  createPost,
  getOrgPosts,
  updatePost,
  deletePost,
  voteOnPostPoll,
} = require("../controllers/post.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Routes protected by authentication
router.use(userProtected);

// Get all posts (Available to all authenticated members of organization)
router.get("/", getOrgPosts);
router.post("/:id/vote", voteOnPostPoll);

// Post management (Only for ORG_ADMIN role)
router.post("/", allowRoles("ORG_ADMIN"), createPost);
router.patch("/:id", allowRoles("ORG_ADMIN"), updatePost);
router.delete("/:id", allowRoles("ORG_ADMIN"), deletePost);

module.exports = router;
