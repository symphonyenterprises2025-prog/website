// Legacy reference server. Do not use for normal startup.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// In-memory storage
let users = [];
let products = [];
let orders = [];
let contents = [];
let nextId = 1;

// Generate ID
const generateId = () => (nextId++).toString();

// Sample data
const initializeData = () => {
  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 12);
  users.push({
    _id: generateId(),
    name: 'Admin User',
    email: 'admin@symphony.com',
    password: adminPassword,
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create sample products
  const sampleProducts = [
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
      tags: ['birthday', 'premium', 'special']
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
      tags: ['wedding', 'anniversary', 'romantic']
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
      tags: ['festival', 'traditional', 'sweets']
    }
  ];

  sampleProducts.forEach(product => {
    products.push({
      _id: generateId(),
      ...product,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
};

// Initialize sample data
initializeData();

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
    req.user = users.find(u => u._id === decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
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

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  const isMatch = bcrypt.compareSync(password, user.password);
  
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  const token = generateToken(user._id);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getProfile ? user.getProfile() : { ...user, password: undefined },
      token
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = {
      _id: generateId(),
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(user);
    
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
app.get('/api/products', (req, res) => {
  const { page = 1, limit = 12, category, search } = req.query;
  
  let filteredProducts = [...products];
  
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }
  
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filteredProducts = filteredProducts.filter(p => 
      searchRegex.test(p.name) || searchRegex.test(p.description)
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredProducts.length / limit),
        totalProducts: filteredProducts.length,
        hasNextPage: endIndex < filteredProducts.length,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    }
  });
});

app.get('/api/products/featured', (req, res) => {
  const featuredProducts = products.filter(p => p.featured);
  res.json({
    success: true,
    data: {
      products: featuredProducts
    }
  });
});

app.get('/api/products/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  const categoriesWithCount = categories.map(cat => ({
    name: cat,
    count: products.filter(p => p.category === cat).length
  }));
  
  res.json({
    success: true,
    data: {
      categories: categoriesWithCount
    }
  });
});

// Order routes
app.post('/api/orders', (req, res) => {
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
    
    const order = {
      _id: generateId(),
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
      orderStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    orders.push(order);
    
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

// Content routes
app.get('/api/content', (req, res) => {
  const { type, status = 'Published' } = req.query;
  
  let filteredContent = [...contents];
  
  if (type) {
    filteredContent = filteredContent.filter(c => c.type === type);
  }
  
  if (status) {
    filteredContent = filteredContent.filter(c => c.status === status);
  }
  
  res.json({
    success: true,
    data: {
      content: filteredContent
    }
  });
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Health Check: http://localhost:${PORT}/api/health`);
  console.log('Using in-memory database for demo purposes');
  console.log('\nAdmin Login Credentials:');
  console.log('Email: admin@symphony.com');
  console.log('Password: admin123');
  console.log('\nAccess admin dashboard at: http://localhost:5500/admin/login.html');
});
