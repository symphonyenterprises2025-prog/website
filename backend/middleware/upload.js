const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on field name or request context
    if (file.fieldname === 'productImages') {
      uploadPath = 'uploads/products/';
    } else if (file.fieldname === 'bannerImage') {
      uploadPath = 'uploads/banners/';
    } else if (file.fieldname === 'blogImage') {
      uploadPath = 'uploads/blog/';
    } else {
      uploadPath = 'uploads/general/';
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Max 10 files per request
  },
  fileFilter: fileFilter
});

// Single image upload middleware
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple images upload middleware
const uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Product images upload (max 5 images)
const uploadProductImages = uploadMultiple('productImages', 5);

// Banner image upload
const uploadBannerImage = uploadSingle('bannerImage');

// Blog image upload
const uploadBlogImage = uploadSingle('blogImage');

// General file upload
const uploadGeneralFile = uploadSingle('file');

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Utility function to delete uploaded files
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file info
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/${file.destination.split('uploads/')[1] || 'general/'}${file.filename}`
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadProductImages,
  uploadBannerImage,
  uploadBlogImage,
  uploadGeneralFile,
  handleUploadError,
  deleteFile,
  getFileInfo
};
