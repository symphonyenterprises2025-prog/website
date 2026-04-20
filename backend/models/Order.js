const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerInfo: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      match: [/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number']
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required']
      },
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: {
        type: String,
        required: [true, 'State is required']
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required']
      },
      country: {
        type: String,
        default: 'India'
      }
    }
  },
  orderItems: [orderItemSchema],
  paymentInfo: {
    method: {
      type: String,
      enum: ['COD', 'Online', 'UPI', 'Card'],
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    transactionId: String,
    paidAt: Date
  },
  itemsPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  shippingPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  shippedAt: Date,
  deliveredAt: Date,
  trackingNumber: String,
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate unique order number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `SYM${year}${month}${day}${random}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(status, trackingNumber) {
  this.orderStatus = status;
  
  if (status === 'Shipped') {
    this.shippedAt = Date.now();
    if (trackingNumber) {
      this.trackingNumber = trackingNumber;
    }
  } else if (status === 'Delivered') {
    this.deliveredAt = Date.now();
  }
  
  return this.save();
};

// Method to calculate total
orderSchema.methods.calculateTotal = function() {
  this.itemsPrice = this.orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;
  return this.totalPrice;
};

// Static method to get sales statistics
orderSchema.statics.getSalesStats = function(startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ]);
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
