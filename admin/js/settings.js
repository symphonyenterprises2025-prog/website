class SettingsPage extends AdminBase {
    constructor() {
        super('settings');
    }

    async init() {
        if (!this.requireAuth()) return;
        this.setupLayout();
        this.setupEvents();
        await this.loadSettings();
    }

    setupEvents() {
        const form = document.getElementById('settingsForm');
        if (form) {
            form.addEventListener('submit', (event) => this.saveSettings(event));
        }

        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.loadSettings());
        }
    }

    setValue(id, value) {
        const element = document.getElementById(id);
        if (!element) return;
        if (element.type === 'checkbox') {
            element.checked = Boolean(value);
        } else {
            element.value = value ?? '';
        }
    }

    getValue(id) {
        const element = document.getElementById(id);
        if (!element) return null;
        return element.type === 'checkbox' ? element.checked : element.value;
    }

    async loadSettings() {
        try {
            const response = await this.request('/settings');
            const settings = response.data.settings || {};
            this.setValue('storeName', settings.storeName);
            this.setValue('storeEmail', settings.storeEmail);
            this.setValue('storePhone', settings.storePhone);
            this.setValue('storeAddress', settings.storeAddress);
            this.setValue('currency', settings.currency);
            this.setValue('enableNotifications', settings.enableNotifications);
            this.setValue('enableMaintenance', settings.enableMaintenance);
            this.setValue('cashOnDelivery', settings.cashOnDelivery);
            this.setValue('onlinePayments', settings.onlinePayments);
            this.setValue('paymentGateway', settings.paymentGateway);
            this.setValue('freeShipping', settings.freeShipping);
            this.setValue('shippingCost', settings.shippingCost);
            this.setValue('expressShippingCost', settings.expressShippingCost);
            this.setValue('taxRate', settings.taxRate);
            this.setValue('taxIncluded', settings.taxIncluded);
            this.setValue('sessionTimeout', settings.sessionTimeout);
            this.setValue('twoFactorAuth', settings.twoFactorAuth);
            this.setValue('forceLogout', settings.forceLogout);
            this.setValue('autoBackup', settings.autoBackup);
            this.setValue('backupRetention', settings.backupRetention);
        } catch (error) {
            this.notify(error.message || 'Failed to load settings', 'error');
        }
    }

    async saveSettings(event) {
        event.preventDefault();

        const payload = {
            storeName: this.getValue('storeName'),
            storeEmail: this.getValue('storeEmail'),
            storePhone: this.getValue('storePhone'),
            storeAddress: this.getValue('storeAddress'),
            currency: this.getValue('currency'),
            enableNotifications: this.getValue('enableNotifications'),
            enableMaintenance: this.getValue('enableMaintenance'),
            cashOnDelivery: this.getValue('cashOnDelivery'),
            onlinePayments: this.getValue('onlinePayments'),
            paymentGateway: this.getValue('paymentGateway'),
            freeShipping: Number(this.getValue('freeShipping') || 0),
            shippingCost: Number(this.getValue('shippingCost') || 0),
            expressShippingCost: Number(this.getValue('expressShippingCost') || 0),
            taxRate: Number(this.getValue('taxRate') || 0),
            taxIncluded: this.getValue('taxIncluded'),
            sessionTimeout: Number(this.getValue('sessionTimeout') || 30),
            twoFactorAuth: this.getValue('twoFactorAuth'),
            forceLogout: this.getValue('forceLogout'),
            autoBackup: this.getValue('autoBackup'),
            backupRetention: Number(this.getValue('backupRetention') || 30)
        };

        try {
            await this.request('/settings', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            this.notify('Settings saved successfully', 'success');
        } catch (error) {
            this.notify(error.message || 'Failed to save settings', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.settingsPage = new SettingsPage();
    await window.settingsPage.init();
});
