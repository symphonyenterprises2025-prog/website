const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
}

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Please provide a valid phone number'),
    body('role').optional().isIn(['admin', 'customer']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, email, password, phone, role = 'customer' } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      const user = await User.create({
        name,
        email,
        password,
        phone,
        role,
      });

      const token = generateToken(user._id);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.getProfile(),
          token,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
      });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      const user = await User.findByEmailWithPassword(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      await user.updateLastLogin();
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.getProfile(),
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getProfile ? req.user.getProfile() : req.user,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
});

router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Please provide a valid phone number'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, phone, email } = req.body;
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use',
          });
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (phone) user.phone = phone;
      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.getProfile(),
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating profile',
      });
    }
  }
);

router.post(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findByEmailWithPassword(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while changing password',
      });
    }
  }
);

router.post('/logout', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router;
