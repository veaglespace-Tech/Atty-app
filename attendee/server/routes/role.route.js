const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Roles are manageable by SUPER_ADMIN globally, but readable by everyone who is logged in (to populate dropdowns)
router.use(userProtected);

router.get("/", roleController.getRoles);

// Only SUPER_ADMIN can manage roles
router.use(allowRoles("SUPER_ADMIN"));

router.post("/", roleController.createRole);
router.put("/:code", roleController.updateRole);
router.delete("/:code", roleController.deleteRole);

module.exports = router;
