// Session storage helpers for MV3 service worker persistence
// Uses chrome.storage.session to survive service worker restarts within a browser session.

import { SAVE_DEBOUNCE_MS } from '../config.js';

let __timer = null;

export function scheduleSaveFactory(getState, debounceMs = SAVE_DEBOUNCE_MS) {
  return function scheduleSave() {
    try {
      if (__timer) clearTimeout(__timer);
      __timer = setTimeout(async () => {
        __timer = null;
        const state = await Promise.resolve(getState());
        try {
          await chrome.storage.session.set(state);
        } catch (_) {}
      }, debounceMs);
    } catch (_) {}
  };
}

export async function loadAll(keys) {
  try {
    const data = await chrome.storage.session.get(keys);
    return data || {};
  } catch (_) {
    return {};
  }
}
