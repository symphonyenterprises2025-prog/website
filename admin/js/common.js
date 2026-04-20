class AdminBase {
    constructor(pageName) {
        this.pageName = pageName;
        this.apiBase = 'http://localhost:5000/api';
        this.token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    }

    requireAuth() {
        if (!this.token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    authHeaders(extra = {}) {
        return {
            Authorization: `Bearer ${this.token}`,
            ...extra
        };
    }

    async request(path, options = {}) {
        const isFormData = options.body instanceof FormData;
        const headers = this.authHeaders(options.headers || {});
        if (!isFormData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${this.apiBase}${path}`, {
            ...options,
            headers
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        if (response.status === 401) {
            this.clearAuth();
            window.location.href = 'login.html';
            throw new Error('Session expired');
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    }

    clearAuth() {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (e) {
            // Best effort logout.
        } finally {
            this.clearAuth();
            window.location.href = 'login.html';
        }
    }

    setupLayout() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach((link) => {
            const href = link.getAttribute('href') || '';
            link.classList.toggle('active', href.endsWith(`${this.pageName}.html`));
        });

        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    bindModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.querySelectorAll('.modal-close, .modal-cancel').forEach((btn) => {
            btn.addEventListener('click', () => this.closeModal(modal));
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    openModal(modal) {
        if (!modal) return;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    formatMoney(amount) {
        const numeric = Number(amount || 0);
        return new Intl.NumberFormat('en-IN').format(numeric);
    }

    notify(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#198754' : '#0d6efd'};
            z-index: 9999;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 2500);
    }

    debounce(fn, wait = 300) {
        let timeout = null;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), wait);
        };
    }
}
