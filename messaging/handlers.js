// Messaging handlers: routes runtime messages for data fetch/clear and submission toggle
import { networkRequests, cookieChanges, storageChanges, consoleLogs, clearData as storeClearData } from '../state/dataStore.js';
import { getSubmissionEnabled, setSubmissionEnabled } from '../queue/submissionQueue.js';
import { handleConsoleMessage } from '../events/console.js';
import { handleStorageMessage } from '../events/storage.js';

export function registerMessageHandlers(scheduleSave) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward console/storage events to their handlers
    if (message.type === 'CONSOLE_LOG') {
      handleConsoleMessage(sender, message, scheduleSave);
      return true;
    }
    if (message.type === 'STORAGE_CHANGE') {
      handleStorageMessage(sender, message, scheduleSave);
      return true;
    }

    // Data retrieval
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

    // Submission toggle
    if (message.type === 'GET_SUBMISSION_ENABLED') {
      sendResponse({ enabled: getSubmissionEnabled() });
    }
    if (message.type === 'SET_SUBMISSION_ENABLED') {
      setSubmissionEnabled(Boolean(message.enabled));
      try { scheduleSave(); } catch {}
      sendResponse({ success: true, enabled: getSubmissionEnabled() });
    }

    // Clear data
    if (message.type === 'CLEAR_DATA') {
      storeClearData(message.dataType);
      try { scheduleSave(); } catch {}
      sendResponse({ success: true });
    }

    // Return true to allow async sendResponse if needed
    return true;
  });
}
