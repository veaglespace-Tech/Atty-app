const express = require("express");
const router = express.Router();
const { getMyClaims, raiseClaim, getAllClaims, updateClaimStatus, getClaimByNo } = require("../controllers/claims.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const { singleUpload } = require("../middlewares/upload");

router.use(verifyToken);

// For Users
router.get("/my-claims", getMyClaims);
router.post("/raise", singleUpload("receipt"), raiseClaim);

// For Admins
router.get("/", getAllClaims);
router.get("/by-no/:claimNo", getClaimByNo);
router.put("/:id/status", updateClaimStatus);

module.exports = router;
