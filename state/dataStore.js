// Central in-memory data store for background service worker
// Exports live bindings for arrays and helper functions to mutate them with caps

export let networkRequests = [];
export let cookieChanges = [];
export let storageChanges = [];
export let consoleLogs = [];

const CAPS = {
  network: 1000,
  others: 500
};

function capArray(arr, cap) {
  if (arr.length > cap) {
    return arr.slice(-cap);
  }
  return arr;
}

export function restoreFromSnapshot(snapshot = {}) {
  networkRequests = Array.isArray(snapshot.networkRequests) ? snapshot.networkRequests : [];
  cookieChanges = Array.isArray(snapshot.cookieChanges) ? snapshot.cookieChanges : [];
  storageChanges = Array.isArray(snapshot.storageChanges) ? snapshot.storageChanges : [];
  consoleLogs = Array.isArray(snapshot.consoleLogs) ? snapshot.consoleLogs : [];
}

export function getStateSnapshot() {
  return { networkRequests, cookieChanges, storageChanges, consoleLogs };
}

// Network helpers
export function pushNetworkRequest(request) {
  networkRequests.push(request);
  networkRequests = capArray(networkRequests, CAPS.network);
}

export function completeNetworkRequest(requestId, patch) {
  const req = networkRequests.find(r => r.id === requestId);
  if (req) Object.assign(req, patch);
  return req || null;
}

export function errorNetworkRequest(requestId, patch) {
  const req = networkRequests.find(r => r.id === requestId);
  if (req) Object.assign(req, patch);
  return req || null;
}

// Cookie
export function pushCookieChange(change) {
  cookieChanges.push(change);
  cookieChanges = capArray(cookieChanges, CAPS.others);
}

// Console
export function pushConsoleLog(entry) {
  consoleLogs.push(entry);
  consoleLogs = capArray(consoleLogs, CAPS.others);
}

// Storage
export function pushStorageChange(change) {
  storageChanges.push(change);
  storageChanges = capArray(storageChanges, CAPS.others);
}

// Clear helpers
export function clearData(type) {
  if (type === 'network' || type === 'all') {
    networkRequests = [];
  }
  if (type === 'cookies' || type === 'all') {
    cookieChanges = [];
  }
  if (type === 'storage' || type === 'all') {
    storageChanges = [];
  }
  if (type === 'console' || type === 'all') {
    consoleLogs = [];
  }
}

// Cleanup
export function cleanupTab(tabId) {
  networkRequests = networkRequests.filter(r => r.tabId !== tabId);
  consoleLogs = consoleLogs.filter(l => l.tabId !== tabId);
  storageChanges = storageChanges.filter(s => s.tabId !== tabId);
  // cookieChanges are global; keep them
}
