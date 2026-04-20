const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/',
  [
    body('customerInfo.name').trim().isLength({ min: 2, max: 50 }).withMessage('Customer name must be between 2 and 50 characters'),
    body('customerInfo.email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('customerInfo.phone').matches(/^[\d\s\-\+\(\)]+$/).withMessage('Please provide a valid phone number'),
    body('customerInfo.address.street').notEmpty().withMessage('Street address is required'),
    body('customerInfo.address.city').notEmpty().withMessage('City is required'),
    body('customerInfo.address.state').notEmpty().withMessage('State is required'),
    body('customerInfo.address.postalCode').notEmpty().withMessage('Postal code is required'),
    body('orderItems').isArray({ min: 1 }).withMessage('At least one order item is required'),
    body('orderItems.*.product').isMongoId().withMessage('Valid product ID is required'),
    body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('paymentInfo.method').isIn(['COD', 'Online', 'UPI', 'Card']).withMessage('Invalid payment method'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
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

      const { customerInfo, orderItems, paymentInfo, notes } = req.body;
      let itemsPrice = 0;
      const validatedOrderItems = [];

      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product with ID ${item.product} not found`,
          });
        }
        if (!product.isInStock()) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} is out of stock`,
          });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          });
        }

        validatedOrderItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          image: product.images[0],
        });
        itemsPrice += product.price * item.quantity;
      }

      const taxPrice = itemsPrice * 0.18;
      const shippingPrice = itemsPrice > 999 ? 0 : 50;
      const totalPrice = itemsPrice + taxPrice + shippingPrice;

      const order = await Order.create({
        customerInfo,
        orderItems: validatedOrderItems,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        notes,
      });

      for (const item of validatedOrderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order,
        },
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating order',
      });
    }
  }
);

router.get(
  '/',
  protect,
  admin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
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

      const {
        page = 1,
        limit = 10,
        status,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filter = {};
      if (status) filter.orderStatus = status;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { 'customerInfo.name': searchRegex },
          { 'customerInfo.email': searchRegex },
          { 'customerInfo.phone': searchRegex },
          { orderNumber: searchRegex },
        ];
      }

      const validSortFields = ['createdAt', 'totalPrice', 'orderStatus', 'orderNumber'];
      const sortOptions = {
        [validSortFields.includes(sortBy) ? sortBy : 'createdAt']: sortOrder === 'desc' ? -1 : 1,
      };

      const numericPage = parseInt(page, 10);
      const numericLimit = parseInt(limit, 10);
      const skip = (numericPage - 1) * numericLimit;

      const orders = await Order.find(filter).sort(sortOptions).skip(skip).limit(numericLimit);
      const total = await Order.countDocuments(filter);
      const totalPages = Math.ceil(total / numericLimit) || 1;

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: numericPage,
            totalPages,
            totalOrders: total,
            hasNextPage: numericPage < totalPages,
            hasPrevPage: numericPage > 1,
            limit: numericLimit,
          },
        },
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching orders',
      });
    }
  }
);

router.get('/my-orders', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const filter = { 'customerInfo.email': req.user.email };
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit) || 1,
          totalOrders: total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
    });
  }
});

router.get(
  '/stats/sales',
  protect,
  admin,
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
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

      const start = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const stats = await Order.getSalesStats(start, end);
      const ordersByStatus = await Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]);
      const topProducts = await Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: '$orderItems.product',
            name: { $first: '$orderItems.name' },
            totalSold: { $sum: '$orderItems.quantity' },
            revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]);

      res.json({
        success: true,
        data: {
          period: { startDate: start, endDate: end },
          summary: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
          ordersByStatus,
          topProducts,
        },
      });
    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching sales statistics',
      });
    }
  }
);

router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (req.user.role !== 'admin' && order.customerInfo.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
    });
  }
});

router.put(
  '/:id/status',
  protect,
  admin,
  [
    body('status').isIn(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']).withMessage('Invalid status'),
    body('trackingNumber').optional().isLength({ min: 3, max: 50 }).withMessage('Tracking number must be between 3 and 50 characters'),
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

      const { status, trackingNumber } = req.body;
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      await order.updateStatus(status, trackingNumber);
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          order,
        },
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating order status',
      });
    }
  }
);

module.exports = router;
