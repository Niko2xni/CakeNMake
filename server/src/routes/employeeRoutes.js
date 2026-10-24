const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole, requirePlatformMembership } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate, loadAppUser);

const adminOnly = [
  requireRole('bakery_admin', 'platform_admin'),
  requirePlatformMembership,
];

// GET /api/bakery/employees - List all employees for the bakery platform
router.get('/', ...adminOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    if (!platformId) {
      return res.status(400).json({ message: 'No platform associated with your account.' });
    }

    const employees = await User.find({
      platform: platformId,
      role: { $in: ['bakery_staff', 'bakery_admin'] },
    })
      .select('_id email displayName photoURL role status createdAt')
      .sort({ createdAt: -1 });

    return res.json({ employees });
  } catch (error) {
    console.error('Failed to list employees:', error);
    return res.status(500).json({ message: 'Failed to retrieve employee directory.' });
  }
});

// POST /api/bakery/employees - Grant staff access to an account by email
router.post('/', ...adminOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    if (!platformId) {
      return res.status(400).json({ message: 'No platform associated with your account.' });
    }

    const { email, role = 'bakery_staff' } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if target role is valid
    if (!['bakery_staff', 'bakery_admin'].includes(role)) {
      return res.status(400).json({ message: 'Assigned role must be bakery_staff or bakery_admin.' });
    }

    // Find the user with this email
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: 'No registered user was found with this email. Have them register or sign in first.',
      });
    }

    // If already has this platform and role
    if (String(user.platform) === String(platformId) && user.role === role) {
      return res.status(400).json({
        message: `${user.displayName || user.email} already has ${role} access to this bakery.`,
      });
    }

    // Protect platform_admin
    if (user.role === 'platform_admin') {
      return res.status(403).json({ message: 'Cannot modify a platform administrator.' });
    }

    user.role = role;
    user.platform = platformId;
    user.status = 'active';
    await user.save();

    return res.json({
      message: `Access granted! ${user.displayName || user.email} is now a ${role === 'bakery_admin' ? 'Bakery Admin' : 'Bakery Staff member'}.`,
      employee: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to add employee:', error);
    return res.status(500).json({ message: 'Failed to grant employee access.' });
  }
});

// DELETE /api/bakery/employees/:id - Revoke employee access
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const targetId = req.params.id;

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid employee ID.' });
    }

    // Prevent removing oneself
    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ message: 'You cannot revoke your own admin account access.' });
    }

    const user = await User.findOne({
      _id: targetId,
      platform: platformId,
    });

    if (!user) {
      return res.status(404).json({ message: 'Employee not found in your bakery platform.' });
    }

    if (user.role === 'platform_admin') {
      return res.status(403).json({ message: 'Cannot revoke a platform administrator.' });
    }

    // Revoke bakery role and reset to regular customer
    user.role = 'customer';
    user.platform = null;
    await user.save();

    return res.json({
      message: `Access revoked for ${user.displayName || user.email}. They are now a regular customer account.`,
      employeeId: user._id,
    });
  } catch (error) {
    console.error('Failed to revoke employee access:', error);
    return res.status(500).json({ message: 'Failed to revoke employee access.' });
  }
});

module.exports = router;
