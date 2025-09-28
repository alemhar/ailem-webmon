// Background service worker for Web Monitor Pro
let networkRequests = [];
let cookieChanges = [];
let storageChanges = [];
let consoleLogs = [];

// Persistence (session-only) to survive service worker restarts
let __saveTimer = null;
function __scheduleSave() {
  if (__saveTimer) clearTimeout(__saveTimer);
  __saveTimer = setTimeout(__saveAll, 300);
}

function __saveAll() {
  __saveTimer = null;
  try {
    chrome.storage?.session?.set?.({
      networkRequests,
      cookieChanges,
      storageChanges,
      consoleLogs
    });
  } catch (e) {
    // ignore storage errors
  }
}

async function __loadAll() {
  try {
    const data = await chrome.storage?.session?.get?.([
      'networkRequests', 'cookieChanges', 'storageChanges', 'consoleLogs'
    ]);
    if (Array.isArray(data?.networkRequests)) networkRequests = data.networkRequests;
    if (Array.isArray(data?.cookieChanges)) cookieChanges = data.cookieChanges;
    if (Array.isArray(data?.storageChanges)) storageChanges = data.storageChanges;
    if (Array.isArray(data?.consoleLogs)) consoleLogs = data.consoleLogs;
  } catch (e) {
    // ignore load errors
  }
}

// Load persisted state on service worker startup
__loadAll();

// Network request monitoring
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const request = {
      id: details.requestId,
      url: details.url,
      method: details.method,
      timestamp: new Date().toISOString(),
      type: details.type,
      tabId: details.tabId,
      requestBody: details.requestBody,
      status: 'pending'
    };
    
    networkRequests.push(request);
    
    // Keep only last 1000 requests to prevent memory issues
    if (networkRequests.length > 1000) {
      networkRequests = networkRequests.slice(-1000);
    }
    __scheduleSave();
    
    // Notify popup if it's open
    chrome.runtime.sendMessage({
      type: 'NETWORK_REQUEST',
      data: request
    }).catch(() => {}); // Ignore errors if popup is closed
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Update the request with response details
    const request = networkRequests.find(req => req.id === details.requestId);
    if (request) {
      request.status = 'completed';
      request.statusCode = details.statusCode;
      request.responseHeaders = details.responseHeaders;
      request.completedTimestamp = new Date().toISOString();
      
      chrome.runtime.sendMessage({
        type: 'NETWORK_RESPONSE',
        data: request
      }).catch(() => {});
      __scheduleSave();
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const request = networkRequests.find(req => req.id === details.requestId);
    if (request) {
      request.status = 'error';
      request.error = details.error;
      request.completedTimestamp = new Date().toISOString();
      
      chrome.runtime.sendMessage({
        type: 'NETWORK_ERROR',
        data: request
      }).catch(() => {});
      __scheduleSave();
    }
  },
  { urls: ["<all_urls>"] }
);

// Cookie monitoring
chrome.cookies.onChanged.addListener((changeInfo) => {
  const change = {
    timestamp: new Date().toISOString(),
    removed: changeInfo.removed,
    cookie: changeInfo.cookie,
    cause: changeInfo.cause
  };
  
  cookieChanges.push(change);
  
  // Keep only last 500 cookie changes
  if (cookieChanges.length > 500) {
    cookieChanges = cookieChanges.slice(-500);
  }
  __scheduleSave();
  
  chrome.runtime.sendMessage({
    type: 'COOKIE_CHANGE',
    data: change
  }).catch(() => {});
});

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle console logs from content script
  if (message.type === 'CONSOLE_LOG') {
    const entry = {
      timestamp: new Date().toISOString(),
      tabId: sender.tab?.id,
      url: sender.tab?.url,
      ...message.data
    };
    consoleLogs.push(entry);
    
    // Keep only last 500 console logs
    if (consoleLogs.length > 500) {
      consoleLogs = consoleLogs.slice(-500);
    }
    
    // Forward to popup (include tabId so UI can filter by current tab)
    chrome.runtime.sendMessage({
      type: 'CONSOLE_LOG',
      data: entry
    }).catch(() => {});
    __scheduleSave();
  }
  
  // Handle storage changes from content script
  if (message.type === 'STORAGE_CHANGE') {
    const change = {
      timestamp: new Date().toISOString(),
      tabId: sender.tab?.id,
      url: sender.tab?.url,
      ...message.data
    };
    storageChanges.push(change);
    
    // Keep only last 500 storage changes
    if (storageChanges.length > 500) {
      storageChanges = storageChanges.slice(-500);
    }
    
    // Forward to popup (include tabId for filtering)
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: change
    }).catch(() => {});
    __scheduleSave();
  }
  
  // Handle requests for stored data from popup
  if (message.type === 'GET_NETWORK_DATA') {
    const tabId = message.tabId;
    const requests = typeof tabId === 'number' ? networkRequests.filter(r => r.tabId === tabId) : networkRequests;
    sendResponse({ requests });
  }
  
  if (message.type === 'GET_COOKIE_DATA') {
    const domainHost = message.domainHost; // e.g., example.com
    let changes = cookieChanges;
    if (domainHost) {
      const host = domainHost.startsWith('.') ? domainHost.slice(1) : domainHost;
      changes = cookieChanges.filter(c => {
        const d = c.cookie?.domain || '';
        const dd = d.startsWith('.') ? d.slice(1) : d;
        return dd === host || dd.endsWith('.' + host) || host.endsWith('.' + dd);
      });
    }
    sendResponse({ changes });
  }
  
  if (message.type === 'GET_STORAGE_DATA') {
    const tabId = message.tabId;
    const changes = typeof tabId === 'number' ? storageChanges.filter(c => c.tabId === tabId) : storageChanges;
    sendResponse({ changes });
  }
  
  if (message.type === 'GET_CONSOLE_DATA') {
    const tabId = message.tabId;
    const logs = typeof tabId === 'number' ? consoleLogs.filter(l => l.tabId === tabId) : consoleLogs;
    sendResponse({ logs });
  }
  
  // Handle clear data requests
    if (message.type === 'CLEAR_DATA') {
      if (message.dataType === 'network' || message.dataType === 'all') {
        networkRequests = [];
      }
      if (message.dataType === 'cookies' || message.dataType === 'all') {
        cookieChanges = [];
      }
      if (message.dataType === 'storage' || message.dataType === 'all') {
        storageChanges = [];
      }
      if (message.dataType === 'console' || message.dataType === 'all') {
        consoleLogs = [];
      }
      __scheduleSave();
      sendResponse({ success: true });
    }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Persist captured data in chrome.storage.session to survive service worker restarts
async function __save() {
  try {
    await chrome.storage.session.set({
      networkRequests,
      cookieChanges,
      storageChanges,
      consoleLogs
    });
  } catch (e) {
    // ignore storage errors
  }
}
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Monitor Pro installed');
});

// Clean up data when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove data associated with closed tab
  networkRequests = networkRequests.filter(req => req.tabId !== tabId);
  consoleLogs = consoleLogs.filter(log => log.tabId !== tabId);
  storageChanges = storageChanges.filter(change => change.tabId !== tabId);
  __scheduleSave();
});

// Removed side panel and action click overrides; popup will open by default via manifest action
