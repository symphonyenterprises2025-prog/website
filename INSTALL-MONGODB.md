# MongoDB Installation Guide for Windows

## Option 1: Download and Install MongoDB Community Server

### Step 1: Download MongoDB
1. Go to [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Select:
   - Version: Latest (7.0.x)
   - Platform: Windows
   - Package: msi

### Step 2: Install MongoDB
1. Run the downloaded `.msi` file
2. Choose "Complete" installation
3. Install MongoDB Compass (optional GUI tool)

### Step 3: Configure MongoDB
1. During installation, choose "Install MongoDB as a Service"
2. Leave default settings for data directory
3. Complete installation

### Step 4: Add MongoDB to PATH
1. Right-click on "This PC" → Properties → Advanced System Settings
2. Click "Environment Variables"
3. Under "System variables", find "Path"
4. Click "Edit" → "New"
5. Add: `C:\Program Files\MongoDB\Server\7.0\bin`
6. Click OK on all windows

### Step 5: Start MongoDB Service
1. Open Command Prompt as Administrator
2. Run: `net start MongoDB`
3. Or restart your computer

## Option 2: Use MongoDB Atlas (Cloud Database)

### Step 1: Create Free Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (free tier)

### Step 2: Get Connection String
1. In Atlas, click "Connect" → "Connect your application"
2. Copy the connection string
3. Update your `.env` file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/symphony-cms?retryWrites=true&w=majority
   ```

## Option 3: Use Docker (Recommended for Developers)

### Step 1: Install Docker Desktop
1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install and restart your computer

### Step 2: Run MongoDB Container
```bash
docker run --name mongodb -p 27017:27017 -d mongo:latest
```

## Verify Installation

### Check MongoDB Version
```bash
mongod --version
```

### Start MongoDB Service
```bash
# As Administrator
net start MongoDB
```

### Stop MongoDB Service
```bash
# As Administrator
net stop MongoDB
```

## After Installation

1. **Restart Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Create Admin Account**:
   ```bash
   node create-admin.js
   ```

3. **Access Admin Dashboard**:
   - URL: http://localhost:5500/admin/login.html
   - Email: admin@symphony.com
   - Password: admin123

## Troubleshooting

### MongoDB Not Found
- Ensure MongoDB is installed and in PATH
- Check: `C:\Program Files\MongoDB\Server\7.0\bin`

### Connection Failed
- Make sure MongoDB service is running: `net start MongoDB`
- Check firewall settings for port 27017

### Permission Denied
- Run Command Prompt as Administrator
- Check MongoDB service permissions
