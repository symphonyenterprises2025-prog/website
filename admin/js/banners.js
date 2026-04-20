class BannersPage extends AdminBase {
    constructor() {
        super('banners');
        this.currentPage = 1;
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('bannerModal');
        this.setupEvents();
        await this.loadBanners(1);
    }

    setupEvents() {
        const addBtn = document.getElementById('addBannerBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openForCreate());

        const form = document.getElementById('bannerForm');
        if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    async loadBanners(page = 1) {
        this.currentPage = page;
        try {
            const response = await this.request(`/content?type=banner&page=${page}&limit=6`);
            const banners = response.data.content || [];
            const grid = document.querySelector('.banner-grid');
            if (!grid) return;

            if (!banners.length) {
                grid.innerHTML = '<p>No banners found</p>';
            } else {
                grid.innerHTML = banners.map((banner) => `
                    <div class="banner-card">
                        <div class="banner-preview">
                            <img src="${banner.featuredImage || 'https://via.placeholder.com/400x200/8B4789/FFFFFF?text=Banner'}" alt="${banner.title}">
                        </div>
                        <div class="banner-content">
                            <h4>${banner.title}</h4>
                            <p>Type: ${banner.bannerType || '-'}</p>
                            <p>Status: ${banner.status}</p>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-info" onclick="bannersPage.editBanner('${banner._id}')">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="bannersPage.deleteBanner('${banner._id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            this.renderPagination(response.data.pagination || {});
        } catch (error) {
            this.notify(error.message || 'Failed to load banners', 'error');
        }
    }

    renderPagination(pagination) {
        const target = document.getElementById('bannerPagination');
        if (!target || !pagination.totalPages) return;
        const current = pagination.currentPage || 1;
        const totalPages = pagination.totalPages || 1;
        let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="bannersPage.loadBanners(${current - 1})">Previous</button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="bannersPage.loadBanners(${i})">${i}</button>`;
        }
        html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="bannersPage.loadBanners(${current + 1})">Next</button>`;
        target.innerHTML = html;
    }

    openForCreate() {
        const form = document.getElementById('bannerForm');
        if (!form) return;
        form.reset();
        form.dataset.bannerId = '';
        document.getElementById('bannerModalTitle').textContent = 'Add Banner';
        this.openModal(document.getElementById('bannerModal'));
    }

    async editBanner(bannerId) {
        try {
            const response = await this.request(`/content/${bannerId}`);
            const banner = response.data.content;
            const form = document.getElementById('bannerForm');
            if (!form) return;
            form.dataset.bannerId = bannerId;
            document.getElementById('bannerModalTitle').textContent = 'Edit Banner';
            document.getElementById('bannerTitle').value = banner.title || '';
            document.getElementById('bannerType').value = banner.bannerType || 'promotion';
            document.getElementById('bannerLink').value = banner.bannerLink || '';
            document.getElementById('bannerDescription').value = banner.content || '';
            document.getElementById('bannerStatus').value = banner.status || 'Draft';
            this.openModal(document.getElementById('bannerModal'));
        } catch (error) {
            this.notify(error.message || 'Failed to load banner', 'error');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const bannerId = form.dataset.bannerId;

        const payload = {
            type: 'banner',
            title: document.getElementById('bannerTitle').value,
            bannerType: document.getElementById('bannerType').value,
            bannerLink: document.getElementById('bannerLink').value,
            content: document.getElementById('bannerDescription').value || 'Banner content',
            status: document.getElementById('bannerStatus').value
        };

        try {
            if (bannerId) {
                await this.request(`/content/${bannerId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                this.notify('Banner updated successfully', 'success');
            } else {
                await this.request('/content', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                this.notify('Banner created successfully', 'success');
            }
            this.closeModal(document.getElementById('bannerModal'));
            await this.loadBanners(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to save banner', 'error');
        }
    }

    async deleteBanner(bannerId) {
        if (!confirm('Are you sure you want to delete this banner?')) return;
        try {
            await this.request(`/content/${bannerId}`, { method: 'DELETE' });
            this.notify('Banner deleted successfully', 'success');
            await this.loadBanners(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to delete banner', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.bannersPage = new BannersPage();
    await window.bannersPage.init();
});
