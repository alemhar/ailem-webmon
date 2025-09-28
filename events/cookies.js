// Cookies event listener
import { pushCookieChange } from '../state/dataStore.js';
import { enqueueEvent } from '../queue/submissionQueue.js';

export function registerCookieListener(scheduleSave) {
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const change = {
      timestamp: new Date().toISOString(),
      removed: changeInfo.removed,
      cookie: changeInfo.cookie,
      cause: changeInfo.cause
    };
    pushCookieChange(change);
    try { scheduleSave(); } catch {}
    chrome.runtime.sendMessage({ type: 'COOKIE_CHANGE', data: change }).catch(() => {});
    enqueueEvent('cookie', change);
  });
}
