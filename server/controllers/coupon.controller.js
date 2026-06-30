const prisma = require('../lib/prisma');

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { discountType, discountValue, maxUses, validFrom, validUntil } = req.body;
    const code = req.body.code?.toUpperCase();

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : null,
        createdById: Number(req.user?.id || req.user?._id || req.user?.userId),
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all coupons (Admin)
exports.getAdminCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        payments: {
          where: { status: 'SUCCESS' },
          include: {
            user: {
              select: { id: true, name: true, email: true, mobile: true, createdAt: true }
            }
          }
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching admin coupons:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get assignable users (SUB_ADMIN, TEAM_LEADER)
exports.getAssignableUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER'] },
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get my assigned coupons (For SubAdmin / TeamLeader)
exports.getMyCoupons = async (req, res) => {
  try {
    const userId = req.user.id;

    const coupons = await prisma.coupon.findMany({
      where: { assignedUserId: userId },
      include: {
        payments: {
          where: { status: 'SUCCESS' },
          include: {
            user: {
              select: { id: true, name: true, email: true, mobile: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching my coupons:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update a coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountType, discountValue, maxUses, validFrom, validUntil } = req.body;
    const code = req.body.code?.toUpperCase();

    const existing = await prisma.coupon.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    if (code !== existing.code) {
      const codeExists = await prisma.coupon.findUnique({ where: { code } });
      if (codeExists) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }
    }

    const updated = await prisma.coupon.update({
      where: { id: parseInt(id) },
      data: {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.coupon.findUnique({ where: { id: parseInt(id) }, include: { payments: true } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Don't delete if it's already used
    if (existing.payments && existing.payments.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete coupon that has already been used. You can edit it to set a past expiration date instead.' });
    }

    await prisma.coupon.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Validate a coupon (Public/Checkout)
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }
    
    const now = new Date();
    
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return res.status(400).json({ success: false, message: 'This coupon code is not yet valid' });
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return res.status(400).json({ success: false, message: 'This coupon code has expired' });
    }
    
    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon code has reached its usage limit' });
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        code: coupon.code,
        discountType: coupon.discountType, 
        discountValue: coupon.discountValue 
      } 
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
