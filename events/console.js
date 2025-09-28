// Console log handler (from content script messages)
import { pushConsoleLog } from '../state/dataStore.js';
import { enqueueEvent } from '../queue/submissionQueue.js';

export function handleConsoleMessage(sender, message, scheduleSave) {
  const entry = {
    timestamp: new Date().toISOString(),
    tabId: sender.tab?.id,
    url: sender.tab?.url,
    ...message.data
  };
  pushConsoleLog(entry);
  try { scheduleSave(); } catch {}
  chrome.runtime.sendMessage({ type: 'CONSOLE_LOG', data: entry }).catch(() => {});
  enqueueEvent('console', entry);
}
