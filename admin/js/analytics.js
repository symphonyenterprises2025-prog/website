class AnalyticsPage extends AdminBase {
    constructor() {
        super('analytics');
        this.currentPeriod = '30days';
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.setupEvents();
        await this.loadAnalytics();
    }

    setupEvents() {
        document.querySelectorAll('[data-period]').forEach((button) => {
            button.addEventListener('click', async () => {
                this.currentPeriod = button.dataset.period;
                await this.loadAnalytics();
            });
        });
    }

    getDateRange() {
        const endDate = new Date();
        let days = 30;
        if (this.currentPeriod === '7days') days = 7;
        if (this.currentPeriod === '90days') days = 90;
        if (this.currentPeriod === '1year') days = 365;
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        return { startDate, endDate };
    }

    async loadAnalytics() {
        try {
            const { startDate, endDate } = this.getDateRange();
            const query = `?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`;
            const [salesRes, ordersRes] = await Promise.all([
                this.request(`/orders/stats/sales${query}`),
                this.request('/orders?limit=5')
            ]);

            const summary = salesRes.data.summary || {};
            document.getElementById('totalRevenue').textContent = `Rs ${this.formatMoney(summary.totalRevenue || 0)}`;
            document.getElementById('totalOrders').textContent = summary.totalOrders || 0;
            document.getElementById('averageOrderValue').textContent = `Rs ${this.formatMoney(summary.averageOrderValue || 0)}`;

            const topProducts = salesRes.data.topProducts || [];
            const topProductsEl = document.getElementById('topProducts');
            if (topProductsEl) {
                if (!topProducts.length) {
                    topProductsEl.innerHTML = '<p>No sales data available</p>';
                } else {
                    topProductsEl.innerHTML = topProducts.map((p, idx) => `
                        <div class="top-product">
                            <span class="rank">#${idx + 1}</span>
                            <div class="product-info">
                                <h4>${p.name}</h4>
                                <p>Units Sold: ${p.totalSold}</p>
                                <p>Revenue: Rs ${this.formatMoney(p.revenue)}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }

            const recentOrdersEl = document.getElementById('recentOrdersAnalytics');
            const orders = ordersRes.data.orders || [];
            if (recentOrdersEl) {
                if (!orders.length) {
                    recentOrdersEl.innerHTML = '<p>No recent orders</p>';
                } else {
                    recentOrdersEl.innerHTML = orders.map((order) => `
                        <div class="recent-order">
                            <h4>#${order.orderNumber}</h4>
                            <p>${order.customerInfo?.name || '-'}</p>
                            <p>Rs ${this.formatMoney(order.totalPrice)}</p>
                            <p>${order.orderStatus}</p>
                        </div>
                    `).join('');
                }
            }

            document.querySelectorAll('[data-period]').forEach((button) => {
                button.classList.toggle('active', button.dataset.period === this.currentPeriod);
            });
        } catch (error) {
            this.notify(error.message || 'Failed to load analytics', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.analyticsPage = new AnalyticsPage();
    await window.analyticsPage.init();
});
