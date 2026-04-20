const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { protect, admin, optionalAuth } = require('../middleware/auth');
const { uploadProductImages, handleUploadError, getFileInfo } = require('../middleware/upload');

const router = express.Router();

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function parseImages(images) {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === 'string') {
    return images
      .split(',')
      .map((img) => img.trim())
      .filter(Boolean);
  }
  return [];
}

router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isString().withMessage('Category must be text'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be positive'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be positive'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
    query('featured').optional().isBoolean().withMessage('Featured must be boolean'),
    query('occasion').optional().isString().withMessage('Occasion must be text'),
    query('status').optional().isIn(['Active', 'Inactive', 'Out of Stock']).withMessage('Invalid status'),
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

      const {
        page = 1,
        limit = 12,
        category,
        minPrice,
        maxPrice,
        search,
        featured,
        occasion,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filter = {};
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isAdmin && !status) filter.status = 'Active';
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (typeof featured !== 'undefined') filter.featured = featured === 'true';
      if (occasion) filter.occasion = occasion;

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { category: searchRegex },
          { occasion: searchRegex },
        ];
      }

      const sortOptions = {};
      const validSortFields = ['name', 'price', 'createdAt', 'rating', 'stock'];
      sortOptions[validSortFields.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'desc' ? -1 : 1;

      const numericPage = parseInt(page, 10);
      const numericLimit = parseInt(limit, 10);
      const skip = (numericPage - 1) * numericLimit;

      const products = await Product.find(filter).sort(sortOptions).skip(skip).limit(numericLimit);
      const total = await Product.countDocuments(filter);
      const totalPages = Math.ceil(total / numericLimit) || 1;

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            currentPage: numericPage,
            totalPages,
            totalProducts: total,
            hasNextPage: numericPage < totalPages,
            hasPrevPage: numericPage > 1,
            limit: numericLimit,
          },
        },
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching products',
      });
    }
  }
);

router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;
    const products = await Product.getFeatured().limit(limit);
    res.json({
      success: true,
      data: {
        products,
      },
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured products',
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const categoriesWithCount = await Promise.all(
      categories.map(async (name) => ({
        name,
        count: await Product.countDocuments({ category: name, status: 'Active' }),
      }))
    );
    res.json({
      success: true,
      data: {
        categories: categoriesWithCount,
      },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
    });
  }
});

router.post(
  '/',
  protect,
  admin,
  uploadProductImages,
  handleUploadError,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').isIn(['Birthday', 'Wedding', 'Festival', 'Corporate', 'Baby Shower', 'Valentine', 'Rakhi', 'Diwali', 'Christmas', 'Eid', "Teacher's Day", 'Housewarming', 'General']).withMessage('Invalid category'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('occasion').optional().isIn(['All Occasions', 'Birthday', 'Anniversary', 'Festival', 'Corporate', 'Wedding', 'Baby Shower', "Valentine's Day", 'Rakhi', 'Diwali', 'Christmas', 'Eid', "Teacher's Day", 'Housewarming']).withMessage('Invalid occasion'),
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

      const images = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => images.push(getFileInfo(file).url));
      } else {
        images.push(...parseImages(req.body.images));
      }
      if (images.length === 0) images.push('/img/products/gift01.webp');

      const product = await Product.create({
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        category: req.body.category,
        stock: parseInt(req.body.stock, 10),
        occasion: req.body.occasion,
        featured: parseBoolean(req.body.featured),
        tags: parseTags(req.body.tags),
        status: req.body.status || 'Active',
        images,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          product,
        },
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating product',
      });
    }
  }
);

router.put(
  '/:id',
  protect,
  admin,
  uploadProductImages,
  handleUploadError,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
    body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('status').optional().isIn(['Active', 'Inactive', 'Out of Stock']).withMessage('Invalid status'),
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

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const updateData = { ...req.body };
      if (typeof updateData.price !== 'undefined') updateData.price = parseFloat(updateData.price);
      if (typeof updateData.stock !== 'undefined') updateData.stock = parseInt(updateData.stock, 10);
      if (typeof updateData.featured !== 'undefined') updateData.featured = parseBoolean(updateData.featured);
      if (typeof updateData.tags !== 'undefined') updateData.tags = parseTags(updateData.tags);

      if (req.files && req.files.length > 0) {
        const uploaded = req.files.map((file) => getFileInfo(file).url);
        updateData.images = [...product.images, ...uploaded];
      } else if (typeof req.body.images !== 'undefined') {
        updateData.images = parseImages(req.body.images);
      }

      const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: {
          product: updatedProduct,
        },
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating product',
      });
    }
  }
);

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
    });
  }
});

router.post(
  '/:id/reviews',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
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

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const { name, rating, comment } = req.body;
      await product.addReview({ name, rating, comment });

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: {
          product,
        },
      });
    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while adding review',
      });
    }
  }
);

module.exports = router;
