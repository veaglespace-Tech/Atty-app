const express = require("express");
const router = express.Router();
const {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/plan.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { requireSuperAdmin } = require("../middlewares/rbac.middleware");

router.get("/", getPlans);
router.get("/:id", getPlanById);
router.post("/", verifyToken, requireSuperAdmin(), createPlan);
router.put("/:id", verifyToken, requireSuperAdmin(), updatePlan);
router.delete("/:id", verifyToken, requireSuperAdmin(), deletePlan);

module.exports = router;
