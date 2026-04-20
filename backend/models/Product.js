const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['Birthday', 'Wedding', 'Festival', 'Corporate', 'Baby Shower', 'Valentine', 'Rakhi', 'Diwali', 'Christmas', 'Eid', 'Teacher\'s Day', 'Housewarming', 'General']
  },
  images: [{
    type: String,
    required: true
  }],
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }],
  occasion: {
    type: String,
    enum: ['All Occasions', 'Birthday', 'Anniversary', 'Festival', 'Corporate', 'Wedding', 'Baby Shower', 'Valentine\'s Day', 'Rakhi', 'Diwali', 'Christmas', 'Eid', 'Teacher\'s Day', 'Housewarming']
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Out of Stock'],
    default: 'Active'
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

// Update the updatedAt field on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for product URL
productSchema.virtual('url').get(function() {
  return `/products/${this._id}`;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function() {
  return this.stock > 0 && this.status === 'Active';
};

// Method to add review
productSchema.methods.addReview = function(review) {
  this.reviews.push(review);
  this.numReviews = this.reviews.length;
  
  // Calculate average rating
  this.rating = this.reviews.reduce((acc, item) => item.rating + acc, 0) / this.reviews.length;
  
  return this.save();
};

// Static method to get featured products
productSchema.statics.getFeatured = function() {
  return this.find({ featured: true, status: 'Active' }).sort({ createdAt: -1 });
};

// Static method to get products by category
productSchema.statics.getByCategory = function(category) {
  return this.find({ category: category, status: 'Active' }).sort({ createdAt: -1 });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
