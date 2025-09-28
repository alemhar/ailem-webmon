// Network event listeners
import { pushNetworkRequest, completeNetworkRequest, errorNetworkRequest } from '../state/dataStore.js';
import { enqueueEvent } from '../queue/submissionQueue.js';

export function registerNetworkListeners(scheduleSave) {
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
      pushNetworkRequest(request);
      try { scheduleSave(); } catch {}
      chrome.runtime.sendMessage({ type: 'NETWORK_REQUEST', data: request }).catch(() => {});
      enqueueEvent('network_request', request);
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      const request = completeNetworkRequest(details.requestId, {
        status: 'completed',
        statusCode: details.statusCode,
        responseHeaders: details.responseHeaders,
        completedTimestamp: new Date().toISOString()
      });
      if (request) {
        chrome.runtime.sendMessage({ type: 'NETWORK_RESPONSE', data: request }).catch(() => {});
        try { scheduleSave(); } catch {}
        enqueueEvent('network_response', request);
      }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
  );

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      const request = errorNetworkRequest(details.requestId, {
        status: 'error',
        error: details.error,
        completedTimestamp: new Date().toISOString()
      });
      if (request) {
        chrome.runtime.sendMessage({ type: 'NETWORK_ERROR', data: request }).catch(() => {});
        try { scheduleSave(); } catch {}
        enqueueEvent('network_error', request);
      }
    },
    { urls: ["<all_urls>"] }
  );
}
