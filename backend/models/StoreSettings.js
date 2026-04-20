const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeKey: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      default: 'Symphony Enterprises',
      trim: true,
    },
    storeEmail: {
      type: String,
      default: 'info@symphony.com',
      trim: true,
      lowercase: true,
    },
    storePhone: {
      type: String,
      default: '+91 9876543210',
      trim: true,
    },
    storeAddress: {
      type: String,
      default:
        '54, Gopabandhu - Siripur Rd, Siripur, Soubhagya Nagar, Surya Nagar, Bhubaneswar, Odisha 751003',
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
    },
    enableNotifications: {
      type: Boolean,
      default: true,
    },
    enableMaintenance: {
      type: Boolean,
      default: false,
    },
    cashOnDelivery: {
      type: String,
      default: 'enabled',
      enum: ['enabled', 'disabled'],
    },
    onlinePayments: {
      type: String,
      default: 'enabled',
      enum: ['enabled', 'disabled'],
    },
    paymentGateway: {
      type: String,
      default: 'razorpay',
      enum: ['stripe', 'paypal', 'razorpay'],
    },
    freeShipping: {
      type: Number,
      default: 999,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 50,
      min: 0,
    },
    expressShippingCost: {
      type: Number,
      default: 100,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    taxIncluded: {
      type: Boolean,
      default: true,
    },
    sessionTimeout: {
      type: Number,
      default: 30,
      min: 5,
      max: 240,
    },
    twoFactorAuth: {
      type: Boolean,
      default: true,
    },
    forceLogout: {
      type: Boolean,
      default: true,
    },
    autoBackup: {
      type: String,
      default: 'daily',
      enum: ['daily', 'weekly', 'monthly', 'disabled'],
    },
    backupRetention: {
      type: Number,
      default: 30,
      min: 7,
      max: 365,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
