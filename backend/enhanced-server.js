// Legacy reference server. Do not use for normal startup.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Database file paths
const DB_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'products'), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'banners'), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'blog'), { recursive: true });
  } catch (error) {
    console.log('Uploads directory already exists or created');
  }
};

// Database operations
class Database {
  constructor() {
    this.data = {
      users: [],
      products: [],
      orders: [],
      contents: []
    };
    this.nextId = 1;
  }

  async loadData() {
    try {
      const data = await fs.readFile(DB_FILE, 'utf8');
      this.data = JSON.parse(data);
      this.nextId = Math.max(...Object.values(this.data).flat().map(item => item._id ? parseInt(item._id) : 0)) + 1;
    } catch (error) {
      console.log('No existing data file, starting fresh');
      await this.initializeData();
      await this.saveData();
    }
  }

  async saveData() {
    try {
      await fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async initializeData() {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    this.data.users.push({
      _id: this.generateId(),
      name: 'Admin User',
      email: 'admin@symphony.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create comprehensive product catalog
    const products = [
      {
        name: 'Elegant Birthday Gift Box',
        description: 'A beautiful gift box perfect for birthdays with premium items and elegant packaging.',
        price: 899,
        category: 'Birthday',
        stock: 25,
        featured: true,
        rating: 5,
        numReviews: 12,
        images: ['/img/products/gift01.webp'],
        status: 'Active',
        tags: ['birthday', 'premium', 'special'],
        occasion: 'Birthday'
      },
      {
        name: 'Wedding Anniversary Special',
        description: 'Romantic gift set for wedding anniversaries with personalized items.',
        price: 1299,
        category: 'Wedding',
        stock: 15,
        featured: true,
        rating: 4.5,
        numReviews: 8,
        images: ['/img/products/gift02.webp'],
        status: 'Active',
        tags: ['wedding', 'anniversary', 'romantic'],
        occasion: 'Anniversary'
      },
      {
        name: 'Festival Special Hamper',
        description: 'Traditional festival gift hamper with sweets and decorative items.',
        price: 1599,
        category: 'Festival',
        stock: 20,
        featured: true,
        rating: 4.8,
        numReviews: 15,
        images: ['/img/products/gift03.webp'],
        status: 'Active',
        tags: ['festival', 'traditional', 'sweets'],
        occasion: 'Festival'
      },
      {
        name: 'Corporate Gift Set',
        description: 'Professional gift set perfect for corporate gifting with premium items.',
        price: 1899,
        category: 'Corporate',
        stock: 12,
        featured: true,
        rating: 4.2,
        numReviews: 6,
        images: ['/img/products/gift04.webp'],
        status: 'Active',
        tags: ['corporate', 'professional', 'executive'],
        occasion: 'Corporate'
      },
      {
        name: 'Rakhi Special Combo',
        description: 'Traditional Rakhi gift combo with sweets and gifts for brothers.',
        price: 799,
        category: 'Rakhi',
        stock: 30,
        featured: true,
        rating: 4.9,
        numReviews: 20,
        images: ['/img/products/gift05.webp'],
        status: 'Active',
        tags: ['rakhi', 'brother', 'traditional'],
        occasion: 'Rakhi'
      },
      {
        name: 'Diwali Gift Basket',
        description: 'Grand Diwali gift basket with sweets, decorations and festive items.',
        price: 2199,
        category: 'Diwali',
        stock: 18,
        featured: true,
        rating: 4.7,
        numReviews: 25,
        images: ['/img/products/gift06.webp'],
        status: 'Active',
        tags: ['diwali', 'festival', 'lights'],
        occasion: 'Diwali'
      },
      {
        name: 'Baby Shower Gift Pack',
        description: 'Cute and practical baby shower gift pack with essential items.',
        price: 999,
        category: 'Baby Shower',
        stock: 22,
        featured: false,
        rating: 4.6,
        numReviews: 10,
        images: ['/img/products/gift07.webp'],
        status: 'Active',
        tags: ['baby', 'shower', 'practical'],
        occasion: 'Baby Shower'
      },
      {
        name: "Valentine's Day Special",
        description: 'Romantic Valentine\'s Day special gift with flowers and chocolates.',
        price: 1499,
        category: 'Valentine',
        stock: 16,
        featured: true,
        rating: 4.8,
        numReviews: 18,
        images: ['/img/products/gift08.webp'],
        status: 'Active',
        tags: ['valentine', 'romantic', 'flowers'],
        occasion: "Valentine's Day"
      }
    ];

    products.forEach(product => {
      this.data.products.push({
        _id: this.generateId(),
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Create sample content
    this.data.contents.push({
      _id: this.generateId(),
      type: 'page',
      title: 'About Symphony Enterprises',
      slug: 'about',
      content: 'Symphony Enterprises is your premier gift shop in Bhubaneswar, Odisha. We offer a wide range of gifts for every occasion.',
      status: 'Published',
      pageType: 'about',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.data.contents.push({
      _id: this.generateId(),
      type: 'testimonial',
      title: 'Excellent Service',
      content: 'Amazing gift collection and wonderful customer service. Highly recommended!',
      customerName: 'Rajesh Kumar',
      customerRating: 5,
      customerLocation: 'Bhubaneswar',
      status: 'Published',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  generateId() {
    return (this.nextId++).toString();
  }

  // User operations
  async findUserByEmail(email) {
    return this.data.users.find(user => user.email === email);
  }

  async findUserById(id) {
    return this.data.users.find(user => user._id === id);
  }

  async createUser(userData) {
    const user = {
      _id: this.generateId(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.users.push(user);
    await this.saveData();
    return user;
  }

  // Product operations
  async findProducts(filter = {}) {
    let products = [...this.data.products];

    // Apply filters
    if (filter.category) {
      products = products.filter(p => p.category === filter.category);
    }
    if (filter.status) {
      products = products.filter(p => p.status === filter.status);
    }
    if (filter.featured) {
      products = products.filter(p => p.featured === filter.featured);
    }
    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      products = products.filter(p => 
        searchRegex.test(p.name) || searchRegex.test(p.description)
      );
    }

    // Apply sorting
    if (filter.sort) {
      const [field, order] = Object.entries(filter.sort)[0];
      products.sort((a, b) => {
        if (order === -1) return b[field] > a[field] ? 1 : -1;
        return a[field] > b[field] ? 1 : -1;
      });
    }

    // Apply pagination
    const total = products.length;
    if (filter.skip) products = products.slice(filter.skip);
    if (filter.limit) products = products.slice(0, filter.limit);

    return { products, total };
  }

  async findProductById(id) {
    return this.data.products.find(product => product._id === id);
  }

  async createProduct(productData) {
    const product = {
      _id: this.generateId(),
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.products.push(product);
    await this.saveData();
    return product;
  }

  async updateProduct(id, updateData) {
    const index = this.data.products.findIndex(p => p._id === id);
    if (index !== -1) {
      this.data.products[index] = { 
        ...this.data.products[index], 
        ...updateData, 
        updatedAt: new Date() 
      };
      await this.saveData();
      return this.data.products[index];
    }
    return null;
  }

  async deleteProduct(id) {
    const index = this.data.products.findIndex(p => p._id === id);
    if (index !== -1) {
      const deleted = this.data.products.splice(index, 1)[0];
      await this.saveData();
      return deleted;
    }
    return null;
  }

  // Order operations
  async findOrders(filter = {}) {
    let orders = [...this.data.orders];

    // Apply filters
    if (filter.orderStatus) {
      orders = orders.filter(o => o.orderStatus === filter.orderStatus);
    }
    if (filter['customerInfo.email']) {
      orders = orders.filter(o => o.customerInfo.email === filter['customerInfo.email']);
    }

    // Apply sorting
    if (filter.sort) {
      const [field, order] = Object.entries(filter.sort)[0];
      orders.sort((a, b) => {
        if (order === -1) return b[field] > a[field] ? 1 : -1;
        return a[field] > b[field] ? 1 : -1;
      });
    }

    // Apply pagination
    const total = orders.length;
    if (filter.skip) orders = orders.slice(filter.skip);
    if (filter.limit) orders = orders.slice(0, filter.limit);

    return { orders, total };
  }

  async findOrderById(id) {
    return this.data.orders.find(order => order._id === id);
  }

  async createOrder(orderData) {
    const order = {
      _id: this.generateId(),
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.orders.push(order);
    await this.saveData();
    return order;
  }

  async updateOrder(id, updateData) {
    const index = this.data.orders.findIndex(o => o._id === id);
    if (index !== -1) {
      this.data.orders[index] = { 
        ...this.data.orders[index], 
        ...updateData, 
        updatedAt: new Date() 
      };
      await this.saveData();
      return this.data.orders[index];
    }
    return null;
  }

  // Content operations
  async findContents(filter = {}) {
    let contents = [...this.data.contents];

    if (filter.type) {
      contents = contents.filter(c => c.type === filter.type);
    }
    if (filter.status) {
      contents = contents.filter(c => c.status === filter.status);
    }

    // Apply sorting
    contents.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.createdAt - a.createdAt;
    });

    return contents;
  }

  async createContent(contentData) {
    const content = {
      _id: this.generateId(),
      ...contentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.contents.push(content);
    await this.saveData();
    return content;
  }

  // Statistics
  async getSalesStats(startDate, endDate) {
    let orders = [...this.data.orders];
    
    if (startDate || endDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue
    };
  }
}

// Initialize database
const db = new Database();

// Helper functions
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = db.data.users.find(u => u._id === decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Symphony Enterprises CMS API is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db.findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { ...user, password: undefined },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.createUser({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true
    });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { ...user, password: undefined },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: { ...req.user, password: undefined }
    }
  });
});

// Product routes
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search, featured, status } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.search = search;
    if (featured) filter.featured = featured === 'true';
    if (status) filter.status = status;
    
    const skip = (page - 1) * limit;
    filter.skip = skip;
    filter.limit = parseInt(limit);
    
    const { products, total } = await db.findProducts(filter);
    
    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/products/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const { products } = await db.findProducts({ featured: true, limit });
    
    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    const products = await db.findProducts();
    const categories = [...new Set(products.products.map(p => p.category))];
    const categoriesWithCount = categories.map(cat => ({
      name: cat,
      count: products.products.filter(p => p.category === cat).length
    }));
    
    res.json({
      success: true,
      data: {
        categories: categoriesWithCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.findProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await db.createProduct(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await db.updateProduct(req.params.id, req.body);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await db.deleteProduct(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Order routes
app.get('/api/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.orderStatus = status;
    if (search) filter.search = search;
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);
    
    const skip = (page - 1) * limit;
    filter.skip = skip;
    filter.limit = parseInt(limit);
    
    const { orders, total } = await db.findOrders(filter);
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await db.findOrderById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if user is admin or order owner
    if (req.user.role !== 'admin' && order.customerInfo.email !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerInfo, orderItems, paymentInfo } = req.body;
    
    // Calculate totals
    const itemsPrice = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const taxPrice = itemsPrice * 0.18; // 18% GST
    const shippingPrice = itemsPrice > 999 ? 0 : 50;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;
    
    // Generate order number
    const date = new Date();
    const orderNumber = `SYM${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const order = await db.createOrder({
      orderNumber,
      customerInfo,
      orderItems,
      paymentInfo: {
        ...paymentInfo,
        status: 'Pending'
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      orderStatus: 'Pending'
    });
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    
    const order = await db.updateOrder(req.params.id, { 
      orderStatus: status,
      trackingNumber,
      shippedAt: status === 'Shipped' ? new Date() : undefined,
      deliveredAt: status === 'Delivered' ? new Date() : undefined
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/orders/stats/sales', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    const stats = await db.getSalesStats(start, end);
    
    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        summary: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Content routes
app.get('/api/content', async (req, res) => {
  try {
    const { type, status = 'Published' } = req.query;
    
    const contents = await db.findContents({ type, status });
    
    res.json({
      success: true,
      data: {
        content: contents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/content', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const content = await db.createContent(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Start server
const startServer = async () => {
  await ensureUploadsDir();
  await db.loadData();
  
  app.listen(PORT, () => {
    console.log(`🚀 Enhanced CMS Server is running on port ${PORT}`);
    console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
    console.log('\n🔐 Admin Login Credentials:');
    console.log('📧 Email: admin@symphony.com');
    console.log('🔑 Password: admin123');
    console.log('\n🌐 Access Points:');
    console.log(`📱 Admin Dashboard: http://localhost:5500/admin/login.html`);
    console.log(`🏠 Main Website: http://localhost:5500/index.html`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    console.log('\n💾 Database: JSON file with persistence');
    console.log('📈 Products: 8 sample gift items loaded');
    console.log('📦 Orders: Full order management enabled');
    console.log('📝 Content: Complete content management');
    console.log('\n✨ All CMS features are now fully functional!');
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
});
