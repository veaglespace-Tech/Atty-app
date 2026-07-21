const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requirePermission, requireMembership } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Public
router.get('/validate/:code', couponController.validateCoupon);

// Admin only
router.post('/', verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), couponController.createCoupon);
router.put('/:id', verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), couponController.updateCoupon);
router.delete('/:id', verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), couponController.deleteCoupon);
router.get('/admin', verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), couponController.getAdminCoupons);
router.get('/assignable-users', verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), couponController.getAssignableUsers);

// SubAdmin / TeamLeader
router.get('/my-coupons', verifyToken, requireMembership(), couponController.getMyCoupons);

module.exports = router;
