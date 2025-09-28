import { BACKEND_ENDPOINT, BACKEND_BEARER_TOKEN, QUEUE_RETRY_INTERVAL_MS, SAVE_DEBOUNCE_MS } from './config.js';
import { loadAll as sessionLoadAll, scheduleSaveFactory } from './persistence/sessionStore.js';
import {
  enqueueEvent,
  processSubmissionQueue,
  startPeriodicRetry,
  restoreQueueState,
  getQueueState,
  setPersistCallback as setQueuePersistCallback,
  getSubmissionEnabled,
  setSubmissionEnabled
} from './queue/submissionQueue.js';
import { registerNetworkListeners } from './events/network.js';
import {
  cleanupTab,
  restoreFromSnapshot,
  getStateSnapshot
} from './state/dataStore.js';
import { registerCookieListener } from './events/cookies.js';
import { registerMessageHandlers } from './messaging/handlers.js';
// Background service worker for Web Monitor Pro (state is managed in dataStore)

// Persistence (session-only) to survive service worker restarts
const __getStateForSave = () => ({
  ...getStateSnapshot(),
  ...getQueueState()
});
const __scheduleSave = scheduleSaveFactory(__getStateForSave, SAVE_DEBOUNCE_MS);

// Start periodic retry in queue module
startPeriodicRetry();

async function __loadAll() {
  const data = await sessionLoadAll([
    'networkRequests', 'cookieChanges', 'storageChanges', 'consoleLogs',
    'submissionQueue', 'eventSeq', 'batchId', 'submissionEnabled'
  ]);
  restoreFromSnapshot({
    networkRequests: Array.isArray(data?.networkRequests) ? data.networkRequests : [],
    cookieChanges: Array.isArray(data?.cookieChanges) ? data.cookieChanges : [],
    storageChanges: Array.isArray(data?.storageChanges) ? data.storageChanges : [],
    consoleLogs: Array.isArray(data?.consoleLogs) ? data.consoleLogs : []
  });
  restoreQueueState({
    submissionQueue: Array.isArray(data?.submissionQueue) ? data.submissionQueue : [],
    eventSeq: typeof data?.eventSeq === 'number' ? data.eventSeq : 0,
    batchId: typeof data?.batchId === 'string' ? data.batchId : undefined,
    submissionEnabled: typeof data?.submissionEnabled === 'boolean' ? data.submissionEnabled : false
  });
}

// Load persisted state on service worker startup
__loadAll();

// Ensure queue persistence uses the same debounced saver
setQueuePersistCallback(__scheduleSave);

// Register network listeners (moved to events/network.js)
registerNetworkListeners(__scheduleSave);

// Register cookies listener
registerCookieListener(__scheduleSave);



// Message handlers (moved to messaging/handlers.js)
registerMessageHandlers(__scheduleSave);
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Monitor Pro installed');
});

// Clean up data when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove data associated with closed tab
  cleanupTab(tabId);
  __scheduleSave();
});

// Removed side panel and action click overrides; popup will open by default via manifest action
