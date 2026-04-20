class ContentPage extends AdminBase {
    constructor() {
        super('content');
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('contentModal');
        this.setupEvents();
        await this.loadContent();
    }

    setupEvents() {
        const addBtn = document.getElementById('addContentBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openModalForCreate());

        const form = document.getElementById('contentForm');
        if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    async loadContent() {
        try {
            const [pages, blogs, banners, testimonials] = await Promise.all([
                this.request('/content?type=page'),
                this.request('/content?type=blog'),
                this.request('/content?type=banner'),
                this.request('/content?type=testimonial')
            ]);

            this.renderList('pagesList', pages.data.content || []);
            this.renderList('blogPostsList', blogs.data.content || []);
            this.renderList('bannersList', banners.data.content || []);
            this.renderList('testimonialsList', testimonials.data.content || []);
        } catch (error) {
            this.notify(error.message || 'Failed to load content', 'error');
        }
    }

    renderList(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '<p class="no-content">No content found</p>';
            return;
        }

        container.innerHTML = items.map((item) => `
            <div class="content-item">
                <h4>${item.title}</h4>
                <p>Status: ${item.status}</p>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="contentPage.editContent('${item._id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="contentPage.deleteContent('${item._id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    openModalForCreate() {
        const form = document.getElementById('contentForm');
        const title = document.getElementById('contentModalTitle');
        if (!form || !title) return;
        form.reset();
        form.dataset.contentId = '';
        title.textContent = 'Add Content';
        this.openModal(document.getElementById('contentModal'));
    }

    async editContent(contentId) {
        try {
            const response = await this.request(`/content/${contentId}`);
            const item = response.data.content;
            const form = document.getElementById('contentForm');
            if (!form) return;

            form.dataset.contentId = contentId;
            document.getElementById('contentModalTitle').textContent = 'Edit Content';
            document.getElementById('contentType').value = item.type || 'page';
            document.getElementById('contentTitle').value = item.title || '';
            document.getElementById('contentDescription').value = item.content || '';
            document.getElementById('contentStatus').value = item.status || 'Draft';

            this.openModal(document.getElementById('contentModal'));
        } catch (error) {
            this.notify(error.message || 'Failed to load content item', 'error');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const contentId = form.dataset.contentId;

        const payload = {
            type: document.getElementById('contentType').value,
            title: document.getElementById('contentTitle').value,
            content: document.getElementById('contentDescription').value,
            status: document.getElementById('contentStatus').value
        };

        try {
            if (contentId) {
                await this.request(`/content/${contentId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                this.notify('Content updated successfully', 'success');
            } else {
                await this.request('/content', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                this.notify('Content created successfully', 'success');
            }
            this.closeModal(document.getElementById('contentModal'));
            await this.loadContent();
        } catch (error) {
            this.notify(error.message || 'Failed to save content', 'error');
        }
    }

    async deleteContent(contentId) {
        if (!confirm('Are you sure you want to delete this content?')) return;
        try {
            await this.request(`/content/${contentId}`, { method: 'DELETE' });
            this.notify('Content deleted successfully', 'success');
            await this.loadContent();
        } catch (error) {
            this.notify(error.message || 'Failed to delete content', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.contentPage = new ContentPage();
    await window.contentPage.init();
});
