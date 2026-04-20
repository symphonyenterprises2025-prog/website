const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Content = require('../models/Content');
const { protect, admin, optionalAuth } = require('../middleware/auth');
const { uploadBannerImage, uploadBlogImage, handleUploadError, getFileInfo } = require('../middleware/upload');

const router = express.Router();

function normalizeContentPayload(payload) {
  const data = { ...payload };
  if (data.type === 'blog') {
    data.author = data.author || 'Admin';
    data.category = data.category || 'General';
  }
  if (data.type === 'banner') {
    data.bannerType = data.bannerType || data.typeDetail || 'promotion';
    if (data.link && !data.bannerLink) data.bannerLink = data.link;
  }
  if (data.type === 'page') {
    data.pageType = data.pageType || 'about';
  }
  if (data.type === 'testimonial') {
    data.customerName = data.customerName || data.title || 'Customer';
    data.customerRating = Number(data.customerRating || 5);
  }
  return data;
}

router.get(
  '/',
  optionalAuth,
  [
    query('type').optional().isIn(['page', 'blog', 'banner', 'testimonial', 'seo']).withMessage('Invalid content type'),
    query('status').optional().isIn(['Published', 'Draft', 'Archived']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
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

      const { type, status, page = 1, limit = 10, search } = req.query;
      const filter = { isActive: true };
      const isAdmin = req.user && req.user.role === 'admin';

      if (type) filter.type = type;
      if (status) {
        filter.status = status;
      } else if (!isAdmin) {
        filter.status = 'Published';
      }
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { title: searchRegex },
          { content: searchRegex },
          { tags: searchRegex },
          { category: searchRegex },
        ];
      }

      const numericPage = parseInt(page, 10);
      const numericLimit = parseInt(limit, 10);
      const skip = (numericPage - 1) * numericLimit;

      const content = await Content.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(numericLimit);
      const total = await Content.countDocuments(filter);

      res.json({
        success: true,
        data: {
          content,
          pagination: {
            currentPage: numericPage,
            totalPages: Math.ceil(total / numericLimit) || 1,
            totalContent: total,
            hasNextPage: skip + content.length < total,
            hasPrevPage: numericPage > 1,
            limit: numericLimit,
          },
        },
      });
    } catch (error) {
      console.error('Get content error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching content',
      });
    }
  }
);

router.get('/pages/:pageType', async (req, res) => {
  try {
    const content = await Content.getPage(req.params.pageType);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Page content not found',
      });
    }
    res.json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    console.error('Get page content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching page content',
    });
  }
});

router.get('/banners', async (req, res) => {
  try {
    const banners = await Content.getActiveBanners();
    res.json({
      success: true,
      data: {
        banners,
      },
    });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching banners',
    });
  }
});

router.get('/testimonials', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '5', 10);
    const testimonials = await Content.getTestimonials(limit);
    res.json({
      success: true,
      data: {
        testimonials,
      },
    });
  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching testimonials',
    });
  }
});

router.get('/blog/search', [query('q').isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters')], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const blogs = await Content.searchBlogs(req.query.q, limit);
    res.json({
      success: true,
      data: {
        blogs,
        query: req.query.q,
      },
    });
  } catch (error) {
    console.error('Search blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching blogs',
    });
  }
});

router.get('/:id', protect, admin, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }
    res.json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    console.error('Get content by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching content',
    });
  }
});

router.post(
  '/',
  protect,
  admin,
  [
    body('type').isIn(['page', 'blog', 'banner', 'testimonial', 'seo']).withMessage('Invalid content type'),
    body('title').custom((value, { req }) => {
      if (req.body.type === 'seo') return true;
      if (!value || value.trim().length < 2 || value.trim().length > 200) {
        throw new Error('Title must be between 2 and 200 characters');
      }
      return true;
    }),
    body('content').custom((value, { req }) => {
      if (req.body.type === 'seo') return true;
      if (!value || value.trim().length < 10) {
        throw new Error('Content must be at least 10 characters');
      }
      return true;
    }),
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

      const contentData = normalizeContentPayload(req.body);
      const content = await Content.create(contentData);
      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: {
          content,
        },
      });
    } catch (error) {
      console.error('Create content error:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Content with this slug already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Server error while creating content',
      });
    }
  }
);

router.put(
  '/:id',
  protect,
  admin,
  [
    body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('content').optional().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
    body('status').optional().isIn(['Published', 'Draft', 'Archived']).withMessage('Invalid status'),
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

      const existing = await Content.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      const updateData = normalizeContentPayload(req.body);
      const content = await Content.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      res.json({
        success: true,
        message: 'Content updated successfully',
        data: {
          content,
        },
      });
    } catch (error) {
      console.error('Update content error:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Content with this slug already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Server error while updating content',
      });
    }
  }
);

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }
    await Content.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting content',
    });
  }
});

router.post(
  '/banner',
  protect,
  admin,
  uploadBannerImage,
  handleUploadError,
  [
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('bannerType').isIn(['hero', 'promotion', 'announcement', 'seasonal']).withMessage('Invalid banner type'),
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

      const payload = normalizeContentPayload({
        ...req.body,
        type: 'banner',
      });
      if (req.file) payload.featuredImage = getFileInfo(req.file).url;

      const banner = await Content.create(payload);
      res.status(201).json({
        success: true,
        message: 'Banner created successfully',
        data: {
          banner,
        },
      });
    } catch (error) {
      console.error('Create banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating banner',
      });
    }
  }
);

router.post(
  '/blog',
  protect,
  admin,
  uploadBlogImage,
  handleUploadError,
  [
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('content').trim().isLength({ min: 50 }).withMessage('Content must be at least 50 characters'),
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

      const payload = normalizeContentPayload({
        ...req.body,
        type: 'blog',
      });
      if (req.file) payload.featuredImage = getFileInfo(req.file).url;

      const blog = await Content.create(payload);
      res.status(201).json({
        success: true,
        message: 'Blog post created successfully',
        data: {
          blog,
        },
      });
    } catch (error) {
      console.error('Create blog error:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Blog with this slug already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Server error while creating blog post',
      });
    }
  }
);

module.exports = router;
