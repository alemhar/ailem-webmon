// Popup JavaScript for Web Monitor Pro
class WebMonitorPopup {
    constructor() {
        this.currentTab = 'network';
        this.currentTabId = null;
        this.currentDomainHost = null;
        this.data = {
            network: [],
            console: [],
            cookies: [],
            storage: []
        };
        this.filters = {
            network: 'all',
            console: 'all',
            storage: 'all'
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.resolveActiveTabContext();
        await this.loadData();
        this.startRealTimeUpdates();
    }
    
    async resolveActiveTabContext() {
        try {
            // Prefer query params (when opened as a dedicated window)
            const search = new URLSearchParams(location.search || '');
            const qTabId = search.get('tabId');
            const qHost = search.get('host');
            if (qTabId) {
                const idNum = Number(qTabId);
                if (!Number.isNaN(idNum)) this.currentTabId = idNum;
            }
        // Retry interval selector
        const retrySel = document.getElementById('retryInterval');
        if (retrySel) {
            chrome.runtime.sendMessage({ type: 'GET_RETRY_INTERVAL' }).then((resp) => {
                if (resp && typeof resp.retryIntervalMs === 'number') {
                    retrySel.value = String(resp.retryIntervalMs);
                }
            }).catch(() => {});
            retrySel.addEventListener('change', async (e) => {
                try {
                    const retryIntervalMs = Number(e.target.value);
                    await chrome.runtime.sendMessage({ type: 'SET_RETRY_INTERVAL', retryIntervalMs });
                } catch (_) {}
            });
        }
            if (qHost) this.currentDomainHost = qHost;

            // Fallback to active tab of current window when params missing
            if (!this.currentTabId) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    this.currentTabId = tab.id;
                    try {
                        const urlObj = new URL(tab.url || '');
                        this.currentDomainHost = this.currentDomainHost || urlObj.hostname || null;
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }

    setupEventListeners() {
        // Submission toggle
        const toggle = document.getElementById('toggleSubmit');
        if (toggle) {
            // Load initial state
            chrome.runtime.sendMessage({ type: 'GET_SUBMISSION_ENABLED' }).then((resp) => {
                if (resp && typeof resp.enabled === 'boolean') {
                    toggle.checked = resp.enabled;
                }
            }).catch(() => {});

            toggle.addEventListener('change', async (e) => {
                try {
                    const enabled = Boolean(e.target.checked);
                    await chrome.runtime.sendMessage({ type: 'SET_SUBMISSION_ENABLED', enabled });
                } catch (_) {}
            });
        }
        // Open in persistent window
        const openWindowBtn = document.getElementById('openWindow');
        if (openWindowBtn) {
            openWindowBtn.addEventListener('click', async () => {
                // Ensure we have latest tab context
                if (!this.currentTabId) {
                    await this.resolveActiveTabContext();
                }
                const baseUrl = chrome.runtime.getURL('popup.html');
                const params = new URLSearchParams();
                if (this.currentTabId) params.set('tabId', String(this.currentTabId));
                if (this.currentDomainHost) params.set('host', this.currentDomainHost);
                const url = `${baseUrl}?${params.toString()}`;
                const features = 'popup=yes,width=420,height=640,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
                window.open(url, 'WebMonitorProWindow', features);
            });
        }
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Filter changes
        document.getElementById('networkFilter').addEventListener('change', (e) => {
            this.filters.network = e.target.value;
            this.renderNetworkData();
        });
        
        document.getElementById('consoleFilter').addEventListener('change', (e) => {
            this.filters.console = e.target.value;
            this.renderConsoleData();
        });
        
        document.getElementById('storageFilter').addEventListener('change', (e) => {
            this.filters.storage = e.target.value;
            this.renderStorageData();
        });
        
        // Clear buttons
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllData();
        });
        
        document.getElementById('clearNetwork').addEventListener('click', () => {
            this.clearData('network');
        });
        
        document.getElementById('clearConsole').addEventListener('click', () => {
            this.clearData('console');
        });
        
        document.getElementById('clearCookies').addEventListener('click', () => {
            this.clearData('cookies');
        });
        
        document.getElementById('clearStorage').addEventListener('click', () => {
            this.clearData('storage');
        });
        
        document.getElementById('refresh').addEventListener('click', () => {
            this.loadData();
        });
    }
    
    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        this.currentTab = tabName;
    }
    
    async loadData() {
        try {
            // Load network data
            const networkResponse = await chrome.runtime.sendMessage({ type: 'GET_NETWORK_DATA', tabId: this.currentTabId });
            if (networkResponse?.requests) {
                this.data.network = networkResponse.requests;
                this.renderNetworkData();
            }
            
            // Load cookie data
            const cookieResponse = await chrome.runtime.sendMessage({ type: 'GET_COOKIE_DATA', domainHost: this.currentDomainHost });
            if (cookieResponse?.changes) {
                this.data.cookies = cookieResponse.changes;
                this.renderCookieData();
            }
            
            // Load storage data
            const storageResponse = await chrome.runtime.sendMessage({ type: 'GET_STORAGE_DATA', tabId: this.currentTabId });
            if (storageResponse?.changes) {
                this.data.storage = storageResponse.changes;
                this.renderStorageData();
            }
            
            // Load console data from background (includes page hook relayed logs)
            if (this.currentTabId) {
                try {
                    const consoleResponse = await chrome.runtime.sendMessage({ type: 'GET_CONSOLE_DATA', tabId: this.currentTabId });
                    if (consoleResponse?.logs) {
                        this.data.console = consoleResponse.logs;
                        this.renderConsoleData();
                    }
                } catch (e) {
                    console.log('Could not get console logs from background');
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    startRealTimeUpdates() {
        // Listen for real-time updates from background script
        chrome.runtime.onMessage.addListener((message) => {
            switch (message.type) {
                case 'NETWORK_REQUEST':
                case 'NETWORK_RESPONSE':
                case 'NETWORK_ERROR':
                    if (message.data?.tabId === this.currentTabId) {
                        this.loadData(); // Reload all network data for current tab
                    }
                    break;
                case 'CONSOLE_LOG':
                    if (message.data?.tabId === this.currentTabId) {
                        this.data.console.push(message.data);
                        if (this.data.console.length > 500) {
                            this.data.console = this.data.console.slice(-500);
                        }
                        if (this.currentTab === 'console') {
                            this.renderConsoleData();
                        }
                    }
                    break;
                case 'COOKIE_CHANGE':
                    if (this.cookieChangeMatchesCurrentDomain(message.data)) {
                        this.data.cookies.push(message.data);
                        if (this.data.cookies.length > 500) {
                            this.data.cookies = this.data.cookies.slice(-500);
                        }
                        if (this.currentTab === 'cookies') {
                            this.renderCookieData();
                        }
                    }
                    break;
                case 'STORAGE_CHANGE':
                    if (message.data?.tabId === this.currentTabId) {
                        this.data.storage.push(message.data);
                        if (this.data.storage.length > 500) {
                            this.data.storage = this.data.storage.slice(-500);
                        }
                        if (this.currentTab === 'storage') {
                            this.renderStorageData();
                        }
                    }
                    break;
                case 'SUBMISSION_STATUS':
                    this.showSubmissionToast(message.data);
                    break;
            }
        });
    }

    cookieChangeMatchesCurrentDomain(change) {
        if (!this.currentDomainHost) return false;
        const d = change?.cookie?.domain || '';
        const cookieHost = d.startsWith('.') ? d.slice(1) : d;
        const host = this.currentDomainHost.startsWith('.') ? this.currentDomainHost.slice(1) : this.currentDomainHost;
        return cookieHost === host || cookieHost.endsWith('.' + host) || host.endsWith('.' + cookieHost);
    }

    showSubmissionToast(status) {
        try {
            const container = document.getElementById('toasts');
            if (!container) return;
            const el = document.createElement('div');
            const ok = !!status?.ok;
            const code = status?.status ?? '';
            const item = status?.item || {};
            const msg = ok
                ? `Submitted ${item.eventType} #${item.seq} (batch ${item.batchId}) ${code ? '– HTTP '+code : ''}`
                : `Submit failed for ${item.eventType} #${item.seq} (batch ${item.batchId}) ${code ? '– HTTP '+code : ''}${status?.error ? ' – '+status.error : ''}`;
            el.textContent = msg;
            el.style.cssText = `
                background: ${ok ? '#0f766e' : '#b91c1c'};
                color: #fff; padding: 8px 12px; margin: 6px 0; border-radius: 6px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.2); font-size: 12px;
            `;
            container.style.cssText = `
                position: fixed; right: 10px; bottom: 10px; max-width: 360px; z-index: 9999;
                display: flex; flex-direction: column; align-items: flex-end;
            `;
            container.appendChild(el);
            setTimeout(() => { el.remove(); }, 3500);
        } catch (_) {}
    }
    
    renderNetworkData() {
        const container = document.getElementById('networkList');
        let filteredData = this.data.network;
        
        if (this.filters.network !== 'all') {
            filteredData = this.data.network.filter(req => req.type === this.filters.network);
        }
        
        if (filteredData.length === 0) {
            container.innerHTML = '<div class="empty-state">No network requests captured yet</div>';
            return;
        }
        
        container.innerHTML = filteredData.slice(-50).reverse().map(request => `
            <div class="data-item">
                <div class="item-header">
                    <div class="item-title">
                        <span class="http-method ${request.method}">${request.method}</span>
                        ${this.truncateUrl(request.url)}
                    </div>
                    <div class="item-meta">
                        <span class="status ${request.status}">${request.status}</span>
                        ${request.statusCode ? `${request.statusCode}` : ''}
                    </div>
                </div>
                <div class="item-details">
                    <div><strong>Type:</strong> ${request.type}</div>
                    <div><strong>Time:</strong> ${new Date(request.timestamp).toLocaleTimeString()}</div>
                    ${request.error ? `<div><strong>Error:</strong> ${request.error}</div>` : ''}
                    ${request.responseHeaders ? `<pre>${JSON.stringify(request.responseHeaders, null, 2)}</pre>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderConsoleData() {
        const container = document.getElementById('consoleList');
        let filteredData = this.data.console;
        
        if (this.filters.console !== 'all') {
            filteredData = this.data.console.filter(log => log.level === this.filters.console);
        }
        
        if (filteredData.length === 0) {
            container.innerHTML = '<div class="empty-state">No console logs captured yet</div>';
            return;
        }
        
        container.innerHTML = filteredData.slice(-50).reverse().map(log => `
            <div class="data-item">
                <div class="item-header">
                    <div class="item-title">
                        <span class="log-level ${log.level}">${log.level}</span>
                        ${this.escapeHtml(log.message)}
                    </div>
                    <div class="item-meta">
                        ${new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                <div class="item-details">
                    <div><strong>URL:</strong> ${this.truncateUrl(log.url)}</div>
                    ${log.stack ? `<pre>${this.escapeHtml(log.stack)}</pre>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderCookieData() {
        const container = document.getElementById('cookiesList');
        
        if (this.data.cookies.length === 0) {
            container.innerHTML = '<div class="empty-state">No cookie changes captured yet</div>';
            return;
        }
        
        container.innerHTML = this.data.cookies.slice(-50).reverse().map(change => `
            <div class="data-item">
                <div class="item-header">
                    <div class="item-title">
                        ${change.removed ? 'Removed' : 'Added/Updated'}: ${change.cookie.name}
                    </div>
                    <div class="item-meta">
                        ${new Date(change.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                <div class="item-details">
                    <div><strong>Domain:</strong> ${change.cookie.domain}</div>
                    <div><strong>Path:</strong> ${change.cookie.path}</div>
                    ${!change.removed ? `<div><strong>Value:</strong> ${this.truncateText(change.cookie.value, 100)}</div>` : ''}
                    <div><strong>Cause:</strong> ${change.cause}</div>
                </div>
            </div>
        `).join('');
    }
    
    renderStorageData() {
        const container = document.getElementById('storageList');
        let filteredData = this.data.storage;
        
        if (this.filters.storage !== 'all') {
            filteredData = this.data.storage.filter(change => change.storageType === this.filters.storage);
        }
        
        if (filteredData.length === 0) {
            container.innerHTML = '<div class="empty-state">No storage changes captured yet</div>';
            return;
        }
        
        container.innerHTML = filteredData.slice(-50).reverse().map(change => `
            <div class="data-item">
                <div class="item-header">
                    <div class="item-title">
                        ${change.storageType}: ${change.action}
                        ${change.key ? `(${change.key})` : ''}
                    </div>
                    <div class="item-meta">
                        ${new Date(change.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                <div class="item-details">
                    <div><strong>URL:</strong> ${this.truncateUrl(change.url)}</div>
                    ${change.key ? `<div><strong>Key:</strong> ${change.key}</div>` : ''}
                    ${change.value ? `<div><strong>Value:</strong> ${this.truncateText(change.value, 200)}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    async clearData(type) {
        if (type === 'console') {
            // Clear console logs from content script (tab buffer)
            try {
                if (this.currentTabId) {
                    await chrome.tabs.sendMessage(this.currentTabId, { type: 'CLEAR_CONSOLE_LOGS' });
                } else {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab) await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_CONSOLE_LOGS' });
                }
            } catch (e) {
                console.log('Could not clear console logs from content script');
            }

            // Also clear background-persisted console logs
            try {
                await chrome.runtime.sendMessage({ type: 'CLEAR_DATA', dataType: 'console' });
            } catch (e) {
                console.log('Could not clear console logs from background');
            }

            // Local state and UI
            this.data.console = [];
            this.renderConsoleData();
        } else {
            // Clear data from background script
            await chrome.runtime.sendMessage({ type: 'CLEAR_DATA', dataType: type });
            this.data[type] = [];
            
            switch (type) {
                case 'network':
                    this.renderNetworkData();
                    break;
                case 'cookies':
                    this.renderCookieData();
                    break;
                case 'storage':
                    this.renderStorageData();
                    break;
            }
        }
    }
    
    async clearAllData() {
        await this.clearData('network');
        await this.clearData('console');
        await this.clearData('cookies');
        await this.clearData('storage');
    }
    
    truncateUrl(url) {
        if (url.length > 60) {
            return url.substring(0, 60) + '...';
        }
        return url;
    }
    
    truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebMonitorPopup();
});
