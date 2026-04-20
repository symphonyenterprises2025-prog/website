const express = require('express');
const { body, validationResult } = require('express-validator');
const StoreSettings = require('../models/StoreSettings');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

async function getOrCreateSettings() {
  let settings = await StoreSettings.findOne({ storeKey: 'default' });
  if (!settings) {
    settings = await StoreSettings.create({ storeKey: 'default' });
  }
  return settings;
}

router.get('/', protect, admin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching settings',
    });
  }
});

router.post(
  '/',
  protect,
  admin,
  [
    body('storeEmail').optional().isEmail().withMessage('Invalid store email'),
    body('currency').optional().isIn(['INR', 'USD', 'EUR']).withMessage('Invalid currency'),
    body('cashOnDelivery').optional().isIn(['enabled', 'disabled']).withMessage('Invalid cashOnDelivery'),
    body('onlinePayments').optional().isIn(['enabled', 'disabled']).withMessage('Invalid onlinePayments'),
    body('paymentGateway').optional().isIn(['stripe', 'paypal', 'razorpay']).withMessage('Invalid paymentGateway'),
    body('autoBackup').optional().isIn(['daily', 'weekly', 'monthly', 'disabled']).withMessage('Invalid autoBackup'),
    body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Invalid tax rate'),
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

      const update = { ...req.body, storeKey: 'default' };
      const settings = await StoreSettings.findOneAndUpdate(
        { storeKey: 'default' },
        update,
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );

      res.json({
        success: true,
        message: 'Settings saved successfully',
        data: {
          settings,
        },
      });
    } catch (error) {
      console.error('Save settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while saving settings',
      });
    }
  }
);

module.exports = router;
