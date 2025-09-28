// Storage change handler (from content script messages)
import { pushStorageChange } from '../state/dataStore.js';
import { enqueueEvent } from '../queue/submissionQueue.js';

export function handleStorageMessage(sender, message, scheduleSave) {
  const change = {
    timestamp: new Date().toISOString(),
    tabId: sender.tab?.id,
    url: sender.tab?.url,
    ...message.data
  };
  pushStorageChange(change);
  try { scheduleSave(); } catch {}
  chrome.runtime.sendMessage({ type: 'STORAGE_CHANGE', data: change }).catch(() => {});
  enqueueEvent('storage', change);
}
