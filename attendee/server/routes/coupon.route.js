const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/rbac.middleware');

// Public
router.get('/validate/:code', couponController.validateCoupon);

// Admin only
router.post('/', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN'), couponController.createCoupon);
router.put('/:id', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN'), couponController.updateCoupon);
router.delete('/:id', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN'), couponController.deleteCoupon);
router.get('/admin', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN'), couponController.getAdminCoupons);
router.get('/assignable-users', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN'), couponController.getAssignableUsers);

// SubAdmin / TeamLeader
router.get('/my-coupons', verifyToken, allowRoles('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER'), couponController.getMyCoupons);

module.exports = router;
