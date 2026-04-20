class ProductsPage extends AdminBase {
    constructor() {
        super('products');
        this.currentPage = 1;
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('productModal');
        this.setupEvents();
        await this.loadProducts(1);
    }

    setupEvents() {
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openProductModal());

        const searchInput = document.getElementById('productSearch');
        const category = document.getElementById('categoryFilter');
        const status = document.getElementById('statusFilter');
        const debouncedLoad = this.debounce(() => this.loadProducts(1), 350);

        if (searchInput) searchInput.addEventListener('input', debouncedLoad);
        if (category) category.addEventListener('change', () => this.loadProducts(1));
        if (status) status.addEventListener('change', () => this.loadProducts(1));

        const form = document.getElementById('productForm');
        if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));

        const imageInput = document.getElementById('productImages');
        if (imageInput) imageInput.addEventListener('change', (event) => this.previewImages(event));
    }

    async loadProducts(page = 1) {
        this.currentPage = page;
        const search = encodeURIComponent(document.getElementById('productSearch')?.value || '');
        const category = encodeURIComponent(document.getElementById('categoryFilter')?.value || '');
        const status = encodeURIComponent(document.getElementById('statusFilter')?.value || '');

        let path = `/products?page=${page}&limit=10`;
        if (search) path += `&search=${search}`;
        if (category) path += `&category=${category}`;
        if (status) path += `&status=${status}`;

        try {
            const response = await this.request(path);
            const products = response.data.products || [];
            const pagination = response.data.pagination || {};

            const tbody = document.getElementById('productsTable');
            if (!tbody) return;

            if (!products.length) {
                tbody.innerHTML = '<tr><td colspan="7">No products found</td></tr>';
                this.renderPagination(pagination);
                return;
            }

            tbody.innerHTML = products.map((product) => `
                <tr>
                    <td><img src="${product.images?.[0] || ''}" alt="${product.name}" class="product-image"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>Rs ${this.formatMoney(product.price)}</td>
                    <td>${product.stock}</td>
                    <td><span class="status-badge status-${String(product.status || '').toLowerCase().replace(/\s+/g, '-')}">${product.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-warning" onclick="productsPage.openProductModal('${product._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="productsPage.deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.renderPagination(pagination);
        } catch (error) {
            this.notify(error.message || 'Failed to load products', 'error');
        }
    }

    renderPagination(pagination) {
        const target = document.getElementById('productsPagination');
        if (!target || !pagination.totalPages) return;

        const current = pagination.currentPage || 1;
        const totalPages = pagination.totalPages || 1;
        let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="productsPage.loadProducts(${current - 1})">Previous</button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="productsPage.loadProducts(${i})">${i}</button>`;
        }
        html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="productsPage.loadProducts(${current + 1})">Next</button>`;
        target.innerHTML = html;
    }

    async openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');
        if (!modal || !form || !title) return;

        form.reset();
        form.dataset.productId = '';
        document.getElementById('imagePreview').innerHTML = '';

        if (productId) {
            title.textContent = 'Edit Product';
            try {
                const response = await this.request(`/products/${productId}`);
                const product = response.data.product;

                form.dataset.productId = product._id;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productPrice').value = product.price || 0;
                document.getElementById('productStock').value = product.stock || 0;
                document.getElementById('productOccasion').value = product.occasion || '';
                document.getElementById('productStatus').value = product.status || 'Active';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productTags').value = (product.tags || []).join(', ');
                document.getElementById('productFeatured').checked = Boolean(product.featured);

                const preview = document.getElementById('imagePreview');
                preview.innerHTML = (product.images || []).map((img) => `<img src="${img}" alt="${product.name}" class="product-image">`).join('');
            } catch (error) {
                this.notify(error.message || 'Failed to load product', 'error');
                return;
            }
        } else {
            title.textContent = 'Add Product';
        }

        this.openModal(modal);
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const productId = form.dataset.productId;

        const payload = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: Number(document.getElementById('productPrice').value || 0),
            stock: Number(document.getElementById('productStock').value || 0),
            occasion: document.getElementById('productOccasion').value || undefined,
            status: document.getElementById('productStatus').value,
            description: document.getElementById('productDescription').value,
            tags: (document.getElementById('productTags').value || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            featured: document.getElementById('productFeatured').checked
        };

        try {
            if (productId) {
                await this.request(`/products/${productId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                this.notify('Product updated successfully', 'success');
            } else {
                await this.request('/products', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                this.notify('Product created successfully', 'success');
            }

            this.closeModal(document.getElementById('productModal'));
            await this.loadProducts(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to save product', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await this.request(`/products/${productId}`, { method: 'DELETE' });
            this.notify('Product deleted successfully', 'success');
            await this.loadProducts(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to delete product', 'error');
        }
    }

    previewImages(event) {
        const files = Array.from(event.target.files || []);
        const preview = document.getElementById('imagePreview');
        if (!preview) return;
        preview.innerHTML = '';
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const img = document.createElement('img');
                img.src = loadEvent.target.result;
                img.className = 'product-image';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.productsPage = new ProductsPage();
    await window.productsPage.init();
});
