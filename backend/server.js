const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const User = require('./models/User');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5500'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    status: 'OK',
    message: 'Symphony Enterprises CMS API is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: isConnected,
      name: mongoose.connection.name || null,
    },
  });
});

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@symphony.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin User';

  const existing = await User.findOne({ email });
  if (existing) return;

  await User.create({
    name,
    email,
    password,
    role: 'admin',
    isActive: true,
  });

  console.log(`Seeded default admin user: ${email}`);
}

async function startServer() {
  await connectDB();
  await seedAdminUser();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Health Check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
