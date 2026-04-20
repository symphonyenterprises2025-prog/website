# Symphony Enterprises - Complete CMS Integration

A comprehensive Content Management System for Symphony Enterprises gift shop, featuring full backend API, admin dashboard, and dynamic frontend integration.

## Features

### Backend API (Node.js + Express + MongoDB)
- **Authentication System**: JWT-based admin authentication
- **Product Management**: Complete CRUD operations for gift products
- **Order Management**: Full order processing and tracking
- **Content Management**: Dynamic pages, blog posts, banners, testimonials
- **File Upload**: Product image management
- **Security**: Rate limiting, input validation, CORS protection

### Admin Dashboard
- **Modern UI**: Responsive design with Symphony branding
- **Product Management**: Add/edit/delete products with image upload
- **Order Processing**: View orders and update status
- **Content Editor**: Manage pages, blog posts, banners
- **Analytics Dashboard**: Sales statistics and insights
- **Real-time Updates**: Dynamic content loading

### Frontend Integration
- **Dynamic Content**: API-driven product catalog
- **Shopping Cart**: Full cart functionality
- **Order Processing**: Complete checkout flow
- **Search & Filtering**: Advanced product search
- **Responsive Design**: Mobile-optimized interface

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd EcommerceSymphony
```

### 2. Backend Setup (Canonical Runtime)

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/symphony-cms

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Start MongoDB
```bash
# For Windows (if using MongoDB Compass)
# Make sure MongoDB service is running

# For manual start
mongod
```

#### Start Backend Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The API will be available at: `http://localhost:5000`

`server.js` is the only supported backend entrypoint. `simple-server.js` and `enhanced-server.js` are legacy reference files and should not be used for normal startup.

### 3. Admin Dashboard Setup

#### Access Admin Panel
Open `admin/login.html` in your browser:
```
http://localhost:5500/admin/login.html
```

After successful login, the admin app redirects to:
```
http://localhost:5500/admin/dashboard.html
```

Supported admin pages:
- `admin/dashboard.html`
- `admin/products.html`
- `admin/orders.html`
- `admin/content.html`
- `admin/blog.html`
- `admin/banners.html`
- `admin/testimonials.html`
- `admin/analytics.html`
- `admin/settings.html`

#### Default Admin Account
The backend seeds a default admin account automatically if it does not exist.

#### Login Credentials
- **Email**: admin@symphony.com
- **Password**: admin123

### 4. Frontend Setup

#### Update API Base URL
In `admin/js/admin.js`, update the API base URL if needed:
```javascript
this.apiBase = 'http://localhost:5000/api';
```

#### Serve Frontend Files
You can use any static file server:
```bash
# Using Python
python -m http.server 5500

# Using Node.js serve
npx serve .

# Using PHP built-in server
php -S localhost:5500
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - Get all products (with filtering/pagination)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/categories` - Get all categories
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `POST /api/products/:id/reviews` - Add product review

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (Admin only)
- `GET /api/orders/my-orders` - Get current user's orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `GET /api/orders/stats/sales` - Get sales statistics (Admin only)

### Content Management
- `GET /api/content` - Get content with filtering
- `GET /api/content/pages/:pageType` - Get page content
- `GET /api/content/banners` - Get active banners
- `GET /api/content/testimonials` - Get testimonials
- `GET /api/content/blog/search` - Search blog posts
- `POST /api/content` - Create content (Admin only)
- `PUT /api/content/:id` - Update content (Admin only)
- `DELETE /api/content/:id` - Delete content (Admin only)

## Database Schema

### Products Collection
```javascript
{
  name: String,
  description: String,
  price: Number,
  category: String, // Birthday, Wedding, Festival, etc.
  images: [String],
  stock: Number,
  featured: Boolean,
  rating: Number,
  reviews: [{
    name: String,
    rating: Number,
    comment: String,
    date: Date
  }],
  occasion: String,
  tags: [String],
  status: String, // Active, Inactive, Out of Stock
  createdAt: Date,
  updatedAt: Date
}
```

### Orders Collection
```javascript
{
  orderNumber: String,
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String
    }
  },
  orderItems: [{
    product: ObjectId,
    name: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  paymentInfo: {
    method: String,
    status: String,
    transactionId: String
  },
  itemsPrice: Number,
  taxPrice: Number,
  shippingPrice: Number,
  totalPrice: Number,
  orderStatus: String, // Pending, Processing, Shipped, Delivered
  createdAt: Date,
  updatedAt: Date
}
```

### Users Collection
```javascript
{
  name: String,
  email: String,
  password: String, // Hashed
  role: String, // admin, customer
  phone: String,
  addresses: [{
    type: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    isDefault: Boolean
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Content Collection
```javascript
{
  type: String, // page, blog, banner, testimonial
  title: String,
  slug: String,
  content: String,
  author: String, // For blog posts
  category: String, // For blog posts
  tags: [String],
  featuredImage: String,
  status: String, // Published, Draft, Archived
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Admin Dashboard Features

### Dashboard
- **Statistics Overview**: Total products, orders, revenue, customers
- **Recent Orders**: Latest 5 orders with quick status updates
- **Low Stock Alerts**: Products with stock < 5 units
- **Sales Charts**: Revenue and order trends

### Product Management
- **Product Listing**: Searchable, filterable product table
- **Add/Edit Products**: Form with image upload, categories, pricing
- **Bulk Operations**: Import/export products
- **Stock Management**: Real-time stock tracking
- **Product Reviews**: Customer review management

### Order Management
- **Order Processing**: View all orders with filtering
- **Status Updates**: Update order status and tracking
- **Customer Information**: Detailed customer data
- **Order Analytics**: Sales statistics and reports

### Content Management
- **Page Editor**: Edit homepage, about, contact pages
- **Blog Management**: Create/edit blog posts with rich text
- **Banner Management**: Update promotional banners
- **Testimonials**: Customer review management

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (Admin/Customer)
- Secure password hashing with bcrypt
- Session management

### API Security
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- File upload validation

### Data Protection
- Environment variable configuration
- Password encryption
- Secure file upload handling
- SQL injection prevention

## Deployment

### Development Environment
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in separate terminal)
cd .. && python -m http.server 5500
```

### Production Environment
1. **Backend Deployment**:
   - Set NODE_ENV=production
   - Configure production MongoDB
   - Set secure JWT_SECRET
   - Use process manager (PM2)

2. **Frontend Deployment**:
   - Build static assets
   - Deploy to CDN or static hosting
   - Update API base URL

### Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret-key
EMAIL_HOST=your-smtp-server
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
net start MongoDB

# Check MongoDB service status (PowerShell)
Get-Service -Name MongoDB
```

#### 2. Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

#### 3. CORS Issues
Update CORS origins in `server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500'],
  credentials: true
}));
```

#### 4. File Upload Issues
Check upload directory permissions:
```bash
# Create uploads directory
mkdir uploads/products
mkdir uploads/banners
mkdir uploads/blog
```

### Debug Mode
Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify MongoDB connection
5. Ensure all environment variables are set

## License

MIT License - Feel free to use this CMS for your projects.

---

**Symphony Enterprises CMS** - Complete e-commerce solution for gift shops with full content management capabilities.
