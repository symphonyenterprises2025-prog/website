class DashboardPage extends AdminBase {
    constructor() {
        super('dashboard');
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        await this.loadDashboard();
    }

    async loadDashboard() {
        try {
            const [productsRes, ordersRes, salesRes] = await Promise.all([
                this.request('/products?limit=1'),
                this.request('/orders?limit=5'),
                this.request('/orders/stats/sales')
            ]);

            const products = productsRes.data.pagination.totalProducts || 0;
            const totalOrders = ordersRes.data.pagination.totalOrders || 0;
            const summary = salesRes.data.summary || {};

            document.getElementById('totalProducts').textContent = products;
            document.getElementById('totalOrders').textContent = totalOrders;
            document.getElementById('totalRevenue').textContent = `Rs ${this.formatMoney(summary.totalRevenue || 0)}`;
            const customerEl = document.getElementById('totalCustomers');
            if (customerEl) customerEl.textContent = '-';

            this.renderRecentOrders(ordersRes.data.orders || []);
            await this.loadLowStockProducts();
        } catch (error) {
            this.notify(error.message || 'Failed to load dashboard', 'error');
        }
    }

    renderRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersTable');
        if (!tbody) return;

        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="4">No recent orders found</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map((order) => `
            <tr>
                <td>${order.orderNumber}</td>
                <td>${order.customerInfo?.name || '-'}</td>
                <td>Rs ${this.formatMoney(order.totalPrice)}</td>
                <td><span class="status-badge status-${String(order.orderStatus || '').toLowerCase()}">${order.orderStatus}</span></td>
            </tr>
        `).join('');
    }

    async loadLowStockProducts() {
        const tbody = document.getElementById('lowStockTable');
        if (!tbody) return;

        try {
            const response = await this.request('/products?limit=50');
            const lowStock = (response.data.products || []).filter((p) => Number(p.stock) < 5);
            if (!lowStock.length) {
                tbody.innerHTML = '<tr><td colspan="3">No low-stock products</td></tr>';
                return;
            }

            tbody.innerHTML = lowStock.slice(0, 8).map((product) => `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.stock}</td>
                    <td><a class="btn btn-sm btn-primary" href="products.html">Manage</a></td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3">Failed to load products</td></tr>';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const page = new DashboardPage();
    window.dashboardPage = page;
    await page.init();
});
