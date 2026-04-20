// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.apiBase = 'http://localhost:5000/api';
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboard();
    }

    checkAuthentication() {
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }
        this.setupAuthHeaders();
    }

    setupAuthHeaders() {
        // Set up default headers for all fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            };
            return originalFetch(url, options);
        };
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Product Management
        this.setupProductListeners();
        this.setupOrderListeners();
        this.setupModalListeners();
    }

    setupProductListeners() {
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openProductModal());
        }

        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        // Search and filters
        const productSearch = document.getElementById('productSearch');
        if (productSearch) {
            productSearch.addEventListener('input', () => this.debounce(() => this.loadProducts(), 500));
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.loadProducts());
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadProducts());
        }
    }

    setupOrderListeners() {
        const orderSearch = document.getElementById('orderSearch');
        if (orderSearch) {
            orderSearch.addEventListener('input', () => this.debounce(() => this.loadOrders(), 500));
        }

        const orderStatusFilter = document.getElementById('orderStatusFilter');
        if (orderStatusFilter) {
            orderStatusFilter.addEventListener('change', () => this.loadOrders());
        }

        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.loadOrders());
            endDate.addEventListener('change', () => this.loadOrders());
        }
    }

    setupModalListeners() {
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Modal cancel buttons
        document.querySelectorAll('.modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Image preview
        const productImages = document.getElementById('productImages');
        if (productImages) {
            productImages.addEventListener('change', (e) => this.previewImages(e));
        }
    }

    navigateToPage(page) {
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.style.display = 'block';
        }

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
        }

        this.currentPage = page;

        // Load page-specific data
        this.loadPageData(page);
    }

    loadPageData(page) {
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'content':
                this.loadContent();
                break;
            default:
                console.log(`Loading ${page} data...`);
        }
    }

    async loadDashboard() {
        try {
            // Load stats
            const [productsRes, ordersRes, revenueRes] = await Promise.all([
                fetch(`${this.apiBase}/products?limit=1`),
                fetch(`${this.apiBase}/orders?limit=1`),
                fetch(`${this.apiBase}/orders/stats/sales`)
            ]);

            const productsData = await productsRes.json();
            const ordersData = await ordersRes.json();
            const revenueData = await revenueRes.json();

            // Update stats
            document.getElementById('totalProducts').textContent = productsData.data.pagination.totalProducts || 0;
            document.getElementById('totalOrders').textContent = ordersData.data.pagination.totalOrders || 0;
            document.getElementById('totalRevenue').textContent = `Rs ${this.formatMoney(revenueData.data.summary.totalRevenue || 0)}`;

            // Load recent orders
            this.loadRecentOrders();
            this.loadLowStockProducts();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadRecentOrders() {
        try {
            const response = await fetch(`${this.apiBase}/orders?limit=5`);
            const data = await response.json();
            
            const tbody = document.getElementById('recentOrdersTable');
            tbody.innerHTML = data.data.orders.map(order => `
                <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.customerInfo.name}</td>
                    <td>Rs ${this.formatMoney(order.totalPrice)}</td>
                    <td><span class="status-badge status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    async loadLowStockProducts() {
        try {
            const response = await fetch(`${this.apiBase}/products?limit=10`);
            const data = await response.json();
            
            const lowStockProducts = data.data.products.filter(product => product.stock < 5);
            
            const tbody = document.getElementById('lowStockTable');
            tbody.innerHTML = lowStockProducts.map(product => `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="dashboard.editProduct('${product._id}')">
                            Edit
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading low stock products:', error);
        }
    }

    async loadProducts(page = 1) {
        try {
            const search = document.getElementById('productSearch')?.value || '';
            const category = document.getElementById('categoryFilter')?.value || '';
            const status = document.getElementById('statusFilter')?.value || '';
            
            let url = `${this.apiBase}/products?page=${page}&limit=10`;
            if (search) url += `&search=${search}`;
            if (category) url += `&category=${category}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url);
            const data = await response.json();
            
            const tbody = document.getElementById('productsTable');
            tbody.innerHTML = data.data.products.map(product => `
                <tr>
                    <td><img src="${product.images[0]}" alt="${product.name}" class="product-image"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>Rs ${this.formatMoney(product.price)}</td>
                    <td>${product.stock}</td>
                    <td><span class="status-badge status-${product.status.toLowerCase().replace(' ', '-')}">${product.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="dashboard.viewProduct('${product._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="dashboard.editProduct('${product._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="dashboard.deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.updatePagination('products', data.data.pagination);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products');
        }
    }

    async loadOrders(page = 1) {
        try {
            const search = document.getElementById('orderSearch')?.value || '';
            const status = document.getElementById('orderStatusFilter')?.value || '';
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            
            let url = `${this.apiBase}/orders?page=${page}&limit=10`;
            if (search) url += `&search=${search}`;
            if (status) url += `&status=${status}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url);
            const data = await response.json();
            
            const tbody = document.getElementById('ordersTable');
            tbody.innerHTML = data.data.orders.map(order => `
                <tr>
                    <td>${order.orderNumber}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>${order.customerInfo.name}</td>
                    <td>Rs ${this.formatMoney(order.totalPrice)}</td>
                    <td><span class="status-badge status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="dashboard.viewOrder('${order._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="dashboard.updateOrderStatus('${order._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.updatePagination('orders', data.data.pagination);
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Failed to load orders');
        }
    }

    async loadContent() {
        try {
            const [pagesRes, blogsRes, bannersRes, testimonialsRes] = await Promise.all([
                fetch(`${this.apiBase}/content?type=page`),
                fetch(`${this.apiBase}/content?type=blog`),
                fetch(`${this.apiBase}/content?type=banner`),
                fetch(`${this.apiBase}/content?type=testimonial`)
            ]);

            const pagesData = await pagesRes.json();
            const blogsData = await blogsRes.json();
            const bannersData = await bannersRes.json();
            const testimonialsData = await testimonialsRes.json();

            this.renderContentList('pagesList', pagesData.data.content);
            this.renderContentList('blogPostsList', blogsData.data.content);
            this.renderContentList('bannersList', bannersData.data.content);
            this.renderContentList('testimonialsList', testimonialsData.data.content);
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content');
        }
    }

    renderContentList(elementId, items) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (items.length === 0) {
            element.innerHTML = '<p>No items found</p>';
            return;
        }

        element.innerHTML = items.map(item => `
            <div class="content-item">
                <h4>${item.title}</h4>
                <p>Status: <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></p>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="dashboard.editContent('${item._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="dashboard.deleteContent('${item._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    updatePagination(type, pagination) {
        const paginationElement = document.getElementById(`${type}Pagination`);
        if (!paginationElement) return;

        let html = '';
        
        // Previous button
        html += `<button ${!pagination.hasPrevPage ? 'disabled' : ''} onclick="dashboard.load${type.charAt(0).toUpperCase() + type.slice(1)}(${pagination.currentPage - 1})">Previous</button>`;
        
        // Page numbers
        for (let i = 1; i <= pagination.totalPages; i++) {
            html += `<button class="${i === pagination.currentPage ? 'active' : ''}" onclick="dashboard.load${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">${i}</button>`;
        }
        
        // Next button
        html += `<button ${!pagination.hasNextPage ? 'disabled' : ''} onclick="dashboard.load${type.charAt(0).toUpperCase() + type.slice(1)}(${pagination.currentPage + 1})">Next</button>`;

        paginationElement.innerHTML = html;
    }

    // Product Management
    openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        if (productId) {
            title.textContent = 'Edit Product';
            this.loadProductForEdit(productId);
        } else {
            title.textContent = 'Add Product';
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
        }

        this.openModal(modal);
    }

    async loadProductForEdit(productId) {
        try {
            const response = await fetch(`${this.apiBase}/products/${productId}`);
            const data = await response.json();
            
            const product = data.data.product;
            const form = document.getElementById('productForm');
            
            // Fill form fields
            form.name.value = product.name;
            form.category.value = product.category;
            form.price.value = product.price;
            form.stock.value = product.stock;
            form.occasion.value = product.occasion || '';
            form.status.value = product.status;
            form.description.value = product.description;
            form.tags.value = product.tags.join(', ');
            form.featured.checked = product.featured;
            
            // Show existing images
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.innerHTML = product.images.map(img => `
                <img src="${img}" alt="${product.name}">
            `).join('');
            
            form.dataset.productId = productId;
        } catch (error) {
            console.error('Error loading product:', error);
            this.showError('Failed to load product');
        }
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const productId = form.dataset.productId;
        
        try {
            // Prepare product data
            const productData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                stock: parseInt(formData.get('stock')),
                occasion: formData.get('occasion'),
                status: formData.get('status'),
                description: formData.get('description'),
                tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
                featured: formData.has('featured')
            };

            let response;
            if (productId) {
                response = await fetch(`${this.apiBase}/products/${productId}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                });
            } else {
                response = await fetch(`${this.apiBase}/products`, {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });
            }

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(productId ? 'Product updated successfully' : 'Product created successfully');
                this.closeModal(document.getElementById('productModal'));
                this.loadProducts();
            } else {
                this.showError(data.message || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showError('Failed to save product');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const response = await fetch(`${this.apiBase}/products/${productId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Product deleted successfully');
                this.loadProducts();
            } else {
                this.showError(data.message || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Failed to delete product');
        }
    }

    // Order Management
    async viewOrder(orderId) {
        try {
            const response = await fetch(`${this.apiBase}/orders/${orderId}`);
            const data = await response.json();
            
            const order = data.data.order;
            const modal = document.getElementById('orderModal');
            const details = document.getElementById('orderDetails');
            
            details.innerHTML = `
                <div class="order-details">
                    <div class="order-header">
                        <h4>Order #${order.orderNumber}</h4>
                        <span class="status-badge status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
                    </div>
                    
                    <div class="order-section">
                        <h5>Customer Information</h5>
                        <p><strong>Name:</strong> ${order.customerInfo.name}</p>
                        <p><strong>Email:</strong> ${order.customerInfo.email}</p>
                        <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
                        <p><strong>Address:</strong> ${order.customerInfo.address.street}, ${order.customerInfo.address.city}, ${order.customerInfo.address.state} - ${order.customerInfo.address.postalCode}</p>
                    </div>
                    
                    <div class="order-section">
                        <h5>Order Items</h5>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.orderItems.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>Rs ${this.formatMoney(item.price)}</td>
                                        <td>Rs ${this.formatMoney(item.price * item.quantity)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="order-section">
                        <h5>Order Summary</h5>
                        <p><strong>Items Total:</strong> Rs ${this.formatMoney(order.itemsPrice)}</p>
                        <p><strong>Tax:</strong> Rs ${this.formatMoney(order.taxPrice)}</p>
                        <p><strong>Shipping:</strong> Rs ${this.formatMoney(order.shippingPrice)}</p>
                        <p><strong>Total:</strong> Rs ${this.formatMoney(order.totalPrice)}</p>
                    </div>
                    
                    <div class="order-section">
                        <h5>Update Status</h5>
                        <select id="orderStatusSelect" class="filter-select">
                            <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <input type="text" id="trackingNumber" placeholder="Tracking Number (if shipped)" class="filter-input" style="margin-top: 10px;">
                        <button class="btn btn-primary" onclick="dashboard.updateOrderStatus('${orderId}')" style="margin-top: 10px;">
                            Update Status
                        </button>
                    </div>
                </div>
            `;
            
            this.openModal(modal);
        } catch (error) {
            console.error('Error loading order:', error);
            this.showError('Failed to load order');
        }
    }

    async updateOrderStatus(orderId) {
        const status = document.getElementById('orderStatusSelect').value;
        const trackingNumber = document.getElementById('trackingNumber').value;
        
        try {
            const response = await fetch(`${this.apiBase}/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, trackingNumber })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Order status updated successfully');
                this.closeModal(document.getElementById('orderModal'));
                this.loadOrders();
            } else {
                this.showError(data.message || 'Failed to update order status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Failed to update order status');
        }
    }

    // Modal Management
    openModal(modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Utility Functions
    previewImages(e) {
        const files = e.target.files;
        const preview = document.getElementById('imagePreview');
        
        preview.innerHTML = '';
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('en-IN').format(amount);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.background = '#28a745';
        } else {
            notification.style.background = '#dc3545';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    async logout() {
        try {
            await fetch(`${this.apiBase}/auth/logout`, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AdminDashboard();
});
