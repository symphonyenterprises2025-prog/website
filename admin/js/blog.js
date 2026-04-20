class BlogPage extends AdminBase {
    constructor() {
        super('blog');
        this.currentPage = 1;
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('blogModal');
        this.setupEvents();
        await this.loadPosts(1);
    }

    setupEvents() {
        const addBtn = document.getElementById('addBlogBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openForCreate());

        const form = document.getElementById('blogForm');
        if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    async loadPosts(page = 1) {
        this.currentPage = page;
        try {
            const response = await this.request(`/content?type=blog&page=${page}&limit=6`);
            const posts = response.data.content || [];
            const grid = document.querySelector('.blog-grid');
            if (!grid) return;

            if (!posts.length) {
                grid.innerHTML = '<p>No blog posts found</p>';
            } else {
                grid.innerHTML = posts.map((post) => `
                    <div class="blog-card">
                        <div class="blog-image">
                            <img src="${post.featuredImage || 'https://via.placeholder.com/300x200/8B4789/FFFFFF?text=Blog'}" alt="${post.title}">
                        </div>
                        <div class="blog-content">
                            <h3>${post.title}</h3>
                            <p class="blog-meta">${new Date(post.createdAt).toLocaleDateString()}</p>
                            <p>${(post.excerpt || post.content || '').slice(0, 120)}...</p>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-info" onclick="blogPage.editPost('${post._id}')">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="blogPage.deletePost('${post._id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            this.renderPagination(response.data.pagination || {});
        } catch (error) {
            this.notify(error.message || 'Failed to load blog posts', 'error');
        }
    }

    renderPagination(pagination) {
        const target = document.getElementById('blogPagination');
        if (!target || !pagination.totalPages) return;
        const current = pagination.currentPage || 1;
        const totalPages = pagination.totalPages || 1;
        let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="blogPage.loadPosts(${current - 1})">Previous</button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="blogPage.loadPosts(${i})">${i}</button>`;
        }
        html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="blogPage.loadPosts(${current + 1})">Next</button>`;
        target.innerHTML = html;
    }

    openForCreate() {
        const form = document.getElementById('blogForm');
        if (!form) return;
        form.reset();
        form.dataset.postId = '';
        document.getElementById('blogModalTitle').textContent = 'New Blog Post';
        this.openModal(document.getElementById('blogModal'));
    }

    async editPost(postId) {
        try {
            const response = await this.request(`/content/${postId}`);
            const post = response.data.content;
            const form = document.getElementById('blogForm');
            if (!form) return;
            form.dataset.postId = postId;
            document.getElementById('blogModalTitle').textContent = 'Edit Blog Post';
            document.getElementById('blogTitle').value = post.title || '';
            document.getElementById('blogCategory').value = post.category || 'General';
            document.getElementById('blogExcerpt').value = post.excerpt || '';
            document.getElementById('blogContent').value = post.content || '';
            document.getElementById('blogStatus').value = post.status || 'Draft';
            this.openModal(document.getElementById('blogModal'));
        } catch (error) {
            this.notify(error.message || 'Failed to load blog post', 'error');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const postId = form.dataset.postId;

        const payload = {
            type: 'blog',
            title: document.getElementById('blogTitle').value,
            category: document.getElementById('blogCategory').value,
            excerpt: document.getElementById('blogExcerpt').value,
            content: document.getElementById('blogContent').value,
            status: document.getElementById('blogStatus').value,
            author: 'Admin'
        };

        try {
            if (postId) {
                await this.request(`/content/${postId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                this.notify('Blog post updated successfully', 'success');
            } else {
                await this.request('/content', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                this.notify('Blog post created successfully', 'success');
            }
            this.closeModal(document.getElementById('blogModal'));
            await this.loadPosts(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to save blog post', 'error');
        }
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this blog post?')) return;
        try {
            await this.request(`/content/${postId}`, { method: 'DELETE' });
            this.notify('Blog post deleted successfully', 'success');
            await this.loadPosts(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to delete blog post', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.blogPage = new BlogPage();
    await window.blogPage.init();
});
