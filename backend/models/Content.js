const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['page', 'blog', 'banner', 'testimonial', 'seo'],
    required: true
  },
  title: {
    type: String,
    required: function() {
      return this.type !== 'seo';
    },
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: function() {
      return this.type === 'page' || this.type === 'blog';
    },
    unique: true,
    sparse: true,
    lowercase: true
  },
  content: {
    type: String,
    required: function() {
      return this.type !== 'seo';
    }
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  author: {
    type: String,
    required: function() {
      return this.type === 'blog';
    }
  },
  category: {
    type: String,
    enum: ['Gift Ideas', 'Festival Special', 'Corporate Gifts', 'Personal Occasions', 'General'],
    required: function() {
      return this.type === 'blog';
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  featuredImage: String,
  images: [String],
  status: {
    type: String,
    enum: ['Published', 'Draft', 'Archived'],
    default: 'Draft'
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    ogImage: String
  },
  publishedAt: Date,
  pageType: {
    type: String,
    enum: ['home', 'about', 'contact', 'shop', 'blog', 'cart', 'product'],
    required: function() {
      return this.type === 'page';
    }
  },
  bannerType: {
    type: String,
    enum: ['hero', 'promotion', 'announcement', 'seasonal'],
    required: function() {
      return this.type === 'banner';
    }
  },
  bannerLink: String,
  customerName: {
    type: String,
    required: function() {
      return this.type === 'testimonial';
    }
  },
  customerRating: {
    type: Number,
    min: 1,
    max: 5,
    required: function() {
      return this.type === 'testimonial';
    }
  },
  customerLocation: String,
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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

// Pre-save middleware
contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set publishedAt when status changes to Published
  if (this.isModified('status') && this.status === 'Published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  // Generate slug from title for pages and blogs
  if ((this.type === 'page' || this.type === 'blog') && this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  next();
});

// Static method to get published content by type
contentSchema.statics.getPublishedByType = function(type, limit = 10) {
  return this.find({ type, status: 'Published', isActive: true })
    .sort({ sortOrder: 1, publishedAt: -1 })
    .limit(limit);
};

// Static method to get page content
contentSchema.statics.getPage = function(pageType) {
  return this.findOne({ type: 'page', pageType, status: 'Published', isActive: true });
};

// Static method to get active banners
contentSchema.statics.getActiveBanners = function() {
  return this.find({ type: 'banner', status: 'Published', isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 });
};

// Static method to get testimonials
contentSchema.statics.getTestimonials = function(limit = 5) {
  return this.find({ type: 'testimonial', status: 'Published', isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(limit);
};

// Static method to search blog posts
contentSchema.statics.searchBlogs = function(query, limit = 10) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    type: 'blog',
    status: 'Published',
    isActive: true,
    $or: [
      { title: searchRegex },
      { content: searchRegex },
      { tags: searchRegex },
      { category: searchRegex }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Virtual for URL
contentSchema.virtual('url').get(function() {
  if (this.type === 'blog') {
    return `/blog/${this.slug}`;
  } else if (this.type === 'page') {
    return `/${this.pageType}`;
  }
  return '#';
});

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;
