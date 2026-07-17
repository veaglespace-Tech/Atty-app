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
const { allowRoles } = require("../middlewares/rbac.middleware");

router.get("/", getPlans);
router.get("/:id", getPlanById);
router.post("/", verifyToken, allowRoles("SUPER_ADMIN"), createPlan);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN"), updatePlan);
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN"), deletePlan);

module.exports = router;
