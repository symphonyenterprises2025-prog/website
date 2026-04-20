const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'home',
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'customer'],
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getProfile = function getProfile() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    addresses: this.addresses,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.methods.updateLastLogin = function updateLastLogin() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

userSchema.statics.findByEmailWithPassword = function findByEmailWithPassword(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

module.exports = mongoose.model('User', userSchema);
