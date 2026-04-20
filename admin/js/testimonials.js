class TestimonialsPage extends AdminBase {
    constructor() {
        super('testimonials');
        this.currentPage = 1;
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.bindModal('testimonialModal');
        this.setupEvents();
        await this.loadTestimonials(1);
    }

    setupEvents() {
        const addBtn = document.getElementById('addTestimonialBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openForCreate());

        const form = document.getElementById('testimonialForm');
        if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    async loadTestimonials(page = 1) {
        this.currentPage = page;
        try {
            const response = await this.request(`/content?type=testimonial&page=${page}&limit=6`);
            const items = response.data.content || [];
            const list = document.getElementById('testimonialsList');
            if (!list) return;

            if (!items.length) {
                list.innerHTML = '<p>No testimonials found</p>';
            } else {
                list.innerHTML = items.map((item) => `
                    <div class="content-item">
                        <h4>${item.title}</h4>
                        <p>Rating: ${item.customerRating || 5}</p>
                        <p>Customer: ${item.customerName || '-'}</p>
                        <p>${item.content || ''}</p>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="testimonialsPage.editTestimonial('${item._id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="testimonialsPage.deleteTestimonial('${item._id}')">Delete</button>
                        </div>
                    </div>
                `).join('');
            }

            this.renderPagination(response.data.pagination || {});
        } catch (error) {
            this.notify(error.message || 'Failed to load testimonials', 'error');
        }
    }

    renderPagination(pagination) {
        const target = document.getElementById('testimonialsPagination');
        if (!target || !pagination.totalPages) return;
        const current = pagination.currentPage || 1;
        const totalPages = pagination.totalPages || 1;
        let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="testimonialsPage.loadTestimonials(${current - 1})">Previous</button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="testimonialsPage.loadTestimonials(${i})">${i}</button>`;
        }
        html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="testimonialsPage.loadTestimonials(${current + 1})">Next</button>`;
        target.innerHTML = html;
    }

    openForCreate() {
        const form = document.getElementById('testimonialForm');
        if (!form) return;
        form.reset();
        form.dataset.testimonialId = '';
        document.getElementById('testimonialModalTitle').textContent = 'Add Testimonial';
        this.openModal(document.getElementById('testimonialModal'));
    }

    async editTestimonial(testimonialId) {
        try {
            const response = await this.request(`/content/${testimonialId}`);
            const testimonial = response.data.content;
            const form = document.getElementById('testimonialForm');
            if (!form) return;
            form.dataset.testimonialId = testimonialId;
            document.getElementById('testimonialModalTitle').textContent = 'Edit Testimonial';
            document.getElementById('testimonialTitle').value = testimonial.title || '';
            document.getElementById('testimonialContent').value = testimonial.content || '';
            document.getElementById('testimonialCustomerName').value = testimonial.customerName || '';
            document.getElementById('testimonialCustomerRating').value = testimonial.customerRating || 5;
            document.getElementById('testimonialCustomerLocation').value = testimonial.customerLocation || '';
            document.getElementById('testimonialStatus').value = testimonial.status || 'Published';
            this.openModal(document.getElementById('testimonialModal'));
        } catch (error) {
            this.notify(error.message || 'Failed to load testimonial', 'error');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const testimonialId = form.dataset.testimonialId;

        const payload = {
            type: 'testimonial',
            title: document.getElementById('testimonialTitle').value,
            content: document.getElementById('testimonialContent').value,
            customerName: document.getElementById('testimonialCustomerName').value,
            customerRating: Number(document.getElementById('testimonialCustomerRating').value || 5),
            customerLocation: document.getElementById('testimonialCustomerLocation').value,
            status: document.getElementById('testimonialStatus').value
        };

        try {
            if (testimonialId) {
                await this.request(`/content/${testimonialId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                this.notify('Testimonial updated successfully', 'success');
            } else {
                await this.request('/content', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                this.notify('Testimonial created successfully', 'success');
            }
            this.closeModal(document.getElementById('testimonialModal'));
            await this.loadTestimonials(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to save testimonial', 'error');
        }
    }

    async deleteTestimonial(testimonialId) {
        if (!confirm('Are you sure you want to delete this testimonial?')) return;
        try {
            await this.request(`/content/${testimonialId}`, { method: 'DELETE' });
            this.notify('Testimonial deleted successfully', 'success');
            await this.loadTestimonials(this.currentPage);
        } catch (error) {
            this.notify(error.message || 'Failed to delete testimonial', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.testimonialsPage = new TestimonialsPage();
    await window.testimonialsPage.init();
});
