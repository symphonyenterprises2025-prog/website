// In-memory database simulation for demo purposes
const users = [];
const products = [];
const orders = [];
const contents = [];

let nextId = 1;

const generateId = () => (nextId++).toString();

// User methods
const User = {
  create: async (userData) => {
    const user = {
      _id: generateId(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.push(user);
    return user;
  },
  
  findOne: async (query) => {
    if (query.email) {
      return users.find(u => u.email === query.email);
    }
    if (query._id) {
      return users.find(u => u._id === query._id);
    }
    return null;
  },
  
  findById: async (id) => {
    return users.find(u => u._id === id);
  }
};

// Product methods
const Product = {
  create: async (productData) => {
    const product = {
      _id: generateId(),
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    products.push(product);
    return product;
  },
  
  find: async (filter = {}) => {
    let result = [...products];
    
    // Apply filters
    if (filter.status) {
      result = result.filter(p => p.status === filter.status);
    }
    if (filter.category) {
      result = result.filter(p => p.category === filter.category);
    }
    if (filter.featured) {
      result = result.filter(p => p.featured === filter.featured);
    }
    
    // Apply sorting
    if (filter.sort) {
      const [field, order] = Object.entries(filter.sort)[0];
      result.sort((a, b) => {
        if (order === -1) {
          return b[field] > a[field] ? 1 : -1;
        }
        return a[field] > b[field] ? 1 : -1;
      });
    }
    
    // Apply pagination
    if (filter.skip) {
      result = result.slice(filter.skip);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }
    
    return result;
  },
  
  findById: async (id) => {
    return products.find(p => p._id === id);
  },
  
  countDocuments: async (filter = {}) => {
    let result = [...products];
    
    if (filter.status) {
      result = result.filter(p => p.status === filter.status);
    }
    
    return result.length;
  },
  
  findByIdAndUpdate: async (id, updateData) => {
    const index = products.findIndex(p => p._id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updateData, updatedAt: new Date() };
      return products[index];
    }
    return null;
  },
  
  findByIdAndDelete: async (id) => {
    const index = products.findIndex(p => p._id === id);
    if (index !== -1) {
      return products.splice(index, 1)[0];
    }
    return null;
  },
  
  distinct: async (field) => {
    const values = [...new Set(products.map(p => p[field]))];
    return values;
  }
};

// Order methods
const Order = {
  create: async (orderData) => {
    const order = {
      _id: generateId(),
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    orders.push(order);
    return order;
  },
  
  find: async (filter = {}) => {
    let result = [...orders];
    
    // Apply filters
    if (filter.orderStatus) {
      result = result.filter(o => o.orderStatus === filter.orderStatus);
    }
    if (filter['customerInfo.email']) {
      result = result.filter(o => o.customerInfo.email === filter['customerInfo.email']);
    }
    
    // Apply sorting
    if (filter.sort) {
      const [field, order] = Object.entries(filter.sort)[0];
      result.sort((a, b) => {
        if (order === -1) {
          return b[field] > a[field] ? 1 : -1;
        }
        return a[field] > b[field] ? 1 : -1;
      });
    }
    
    // Apply pagination
    if (filter.skip) {
      result = result.slice(filter.skip);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }
    
    return result;
  },
  
  findById: async (id) => {
    return orders.find(o => o._id === id);
  },
  
  countDocuments: async (filter = {}) => {
    let result = [...orders];
    
    if (filter.orderStatus) {
      result = result.filter(o => o.orderStatus === filter.orderStatus);
    }
    
    return result.length;
  }
};

// Content methods
const Content = {
  create: async (contentData) => {
    const content = {
      _id: generateId(),
      ...contentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    contents.push(content);
    return content;
  },
  
  find: async (filter = {}) => {
    let result = [...contents];
    
    // Apply filters
    if (filter.type) {
      result = result.filter(c => c.type === filter.type);
    }
    if (filter.status) {
      result = result.filter(c => c.status === filter.status);
    }
    if (filter.isActive !== undefined) {
      result = result.filter(c => c.isActive === filter.isActive);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return b.createdAt - a.createdAt;
    });
    
    // Apply pagination
    if (filter.skip) {
      result = result.slice(filter.skip);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }
    
    return result;
  },
  
  findById: async (id) => {
    return contents.find(c => c._id === id);
  },
  
  findByIdAndUpdate: async (id, updateData) => {
    const index = contents.findIndex(c => c._id === id);
    if (index !== -1) {
      contents[index] = { ...contents[index], ...updateData, updatedAt: new Date() };
      return contents[index];
    }
    return null;
  },
  
  findByIdAndDelete: async (id) => {
    const index = contents.findIndex(c => c._id === id);
    if (index !== -1) {
      return contents.splice(index, 1)[0];
    }
    return null;
  }
};

module.exports = {
  User,
  Product,
  Order,
  Content
};
