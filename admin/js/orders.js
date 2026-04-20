class OrdersPage extends AdminBase {
    constructor() {
        super('orders');
        this.currentPage = 1;
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('orderModal');
        this.setupEvents();
        await this.loadOrders(1);
    }

    setupEvents() {
        const searchInput = document.getElementById('orderSearch');
        const statusInput = document.getElementById('orderStatusFilter');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const debouncedLoad = this.debounce(() => this.loadOrders(1), 350);

        if (searchInput) searchInput.addEventListener('input', debouncedLoad);
        if (statusInput) statusInput.addEventListener('change', () => this.loadOrders(1));
        if (startDate) startDate.addEventListener('change', () => this.loadOrders(1));
        if (endDate) endDate.addEventListener('change', () => this.loadOrders(1));
    }

    buildQuery(page) {
        const search = encodeURIComponent(document.getElementById('orderSearch')?.value || '');
        const status = encodeURIComponent(document.getElementById('orderStatusFilter')?.value || '');
        const startDate = encodeURIComponent(document.getElementById('startDate')?.value || '');
        const endDate = encodeURIComponent(document.getElementById('endDate')?.value || '');

        let path = `/orders?page=${page}&limit=10`;
        if (search) path += `&search=${search}`;
        if (status) path += `&status=${status}`;
        if (startDate) path += `&startDate=${startDate}`;
        if (endDate) path += `&endDate=${endDate}`;
        return path;
    }

    async loadOrders(page = 1) {
        this.currentPage = page;
        try {
            const response = await this.request(this.buildQuery(page));
            const orders = response.data.orders || [];
            const tbody = document.getElementById('ordersTable');
            if (!tbody) return;

            if (!orders.length) {
                tbody.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
            } else {
                tbody.innerHTML = orders.map((order) => `
                    <tr>
                        <td>${order.orderNumber}</td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>${order.customerInfo?.name || '-'}</td>
                        <td>Rs ${this.formatMoney(order.totalPrice)}</td>
                        <td><span class="status-badge status-${String(order.orderStatus || '').toLowerCase()}">${order.orderStatus}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-info" onclick="ordersPage.viewOrder('${order._id}')"><i class="fas fa-eye"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }

            this.renderPagination(response.data.pagination || {});
        } catch (error) {
            this.notify(error.message || 'Failed to load orders', 'error');
        }
    }

    renderPagination(pagination) {
        const target = document.getElementById('ordersPagination');
        if (!target || !pagination.totalPages) return;

        const current = pagination.currentPage || 1;
        const totalPages = pagination.totalPages || 1;
        let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="ordersPage.loadOrders(${current - 1})">Previous</button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="ordersPage.loadOrders(${i})">${i}</button>`;
        }
        html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="ordersPage.loadOrders(${current + 1})">Next</button>`;
        target.innerHTML = html;
    }

    async viewOrder(orderId) {
        try {
            const response = await this.request(`/orders/${orderId}`);
            const order = response.data.order;
            const details = document.getElementById('orderDetails');
            if (!details) return;

            details.innerHTML = `
                <div class="order-details">
                    <h4>Order #${order.orderNumber}</h4>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p><strong>Customer:</strong> ${order.customerInfo?.name} (${order.customerInfo?.email})</p>
                    <p><strong>Phone:</strong> ${order.customerInfo?.phone || '-'}</p>
                    <p><strong>Total:</strong> Rs ${this.formatMoney(order.totalPrice)}</p>
                    <p><strong>Status:</strong> ${order.orderStatus}</p>
                    <hr>
                    <h5>Items</h5>
                    ${(order.orderItems || []).map((item) => `
                        <p>${item.name} x ${item.quantity} - Rs ${this.formatMoney(item.price)}</p>
                    `).join('')}
                    <hr>
                    <h5>Update Status</h5>
                    <select id="orderStatusSelect" class="filter-select">
                        ${['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
                            .map((status) => `<option value="${status}" ${order.orderStatus === status ? 'selected' : ''}>${status}</option>`)
                            .join('')}
                    </select>
                    <input id="trackingNumber" class="filter-input" style="margin-top:8px;" placeholder="Tracking Number" value="${order.trackingNumber || ''}">
                    <button class="btn btn-primary" style="margin-top:10px;" onclick="ordersPage.updateOrderStatus('${order._id}')">Save Status</button>
                </div>
            `;

            this.openModal(document.getElementById('orderModal'));
        } catch (error) {
            this.notify(error.message || 'Failed to load order details', 'error');
        }
    }

    async updateOrderStatus(orderId) {
        const status = document.getElementById('orderStatusSelect')?.value;
        const trackingNumber = document.getElementById('trackingNumber')?.value || '';
        try {
            await this.request(`/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, trackingNumber })
            });
            this.notify('Order status updated', 'success');
            this.closeModal(document.getElementById('orderModal'));
            await this.loadOrders(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to update status', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.ordersPage = new OrdersPage();
    await window.ordersPage.init();
});
