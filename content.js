// Content script for Web Monitor Pro
(function() {
  'use strict';
  
  // Inject page-world console hook so page scripts' console.* are captured
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page_console_hook.js');
    // Ensure execution as early as possible
    (document.head || document.documentElement).appendChild(s);
    s.onload = () => s.remove();
  } catch (e) {
    // ignore injection failures
  }

  // Relay page-world console messages sent via window.postMessage
  window.addEventListener('message', (event) => {
    try {
      if (event.source !== window) return; // only accept from same page
      const msg = event.data;
      if (!msg || msg.source !== 'WMP' || msg.type !== 'CONSOLE') return;
      const logEntry = {
        level: msg.level || 'log',
        timestamp: msg.timestamp || new Date().toISOString(),
        message: String(msg.message || ''),
        url: msg.url || window.location.href,
        stack: msg.stack || null
      };
      chrome.runtime.sendMessage({ type: 'CONSOLE_LOG', data: logEntry }).catch(() => {});
    } catch (_) { /* noop */ }
  }, false);
  
  let consoleLogs = [];
  
  // Override console methods to capture logs
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };
  
  function captureConsoleLog(level, args) {
    const logEntry = {
      level: level,
      timestamp: new Date().toISOString(),
      message: Array.from(args).map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '),
      url: window.location.href,
      stack: level === 'error' ? new Error().stack : null
    };
    
    consoleLogs.push(logEntry);
    
    // Keep only last 500 logs to prevent memory issues
    if (consoleLogs.length > 500) {
      consoleLogs = consoleLogs.slice(-500);
    }
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'CONSOLE_LOG',
      data: logEntry
    }).catch(() => {});
  }
  
  // Override console methods
  console.log = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string' && (args[0].includes('warn') || args[0].includes('error'))) {
      captureConsoleLog('warn', args);
    } else {
      captureConsoleLog('log', args);
    }
    return originalConsole.log.apply(console, args);
  };
  
  console.warn = function(...args) {
    captureConsoleLog('warn', args);
    return originalConsole.warn.apply(console, args);
  };
  
  console.error = function(...args) {
    captureConsoleLog('error', args);
    return originalConsole.error.apply(console, args);
  };
  
  console.info = function(...args) {
    captureConsoleLog('info', args);
    return originalConsole.info.apply(console, args);
  };
  
  console.debug = function(...args) {
    captureConsoleLog('debug', args);
    return originalConsole.debug.apply(console, args);
  };
  
  // Monitor localStorage changes
  const originalLocalStorage = {
    setItem: localStorage.setItem,
    removeItem: localStorage.removeItem,
    clear: localStorage.clear
  };
  
  localStorage.setItem = function(key, value) {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'localStorage',
        action: 'setItem',
        key: key,
        value: value,
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalLocalStorage.setItem.call(this, key, value);
  };
  
  localStorage.removeItem = function(key) {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'localStorage',
        action: 'removeItem',
        key: key,
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalLocalStorage.removeItem.call(this, key);
  };
  
  localStorage.clear = function() {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'localStorage',
        action: 'clear',
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalLocalStorage.clear.call(this);
  };
  
  // Monitor sessionStorage changes
  const originalSessionStorage = {
    setItem: sessionStorage.setItem,
    removeItem: sessionStorage.removeItem,
    clear: sessionStorage.clear
  };
  
  sessionStorage.setItem = function(key, value) {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'sessionStorage',
        action: 'setItem',
        key: key,
        value: value,
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalSessionStorage.setItem.call(this, key, value);
  };
  
  sessionStorage.removeItem = function(key) {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'sessionStorage',
        action: 'removeItem',
        key: key,
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalSessionStorage.removeItem.call(this, key);
  };
  
  sessionStorage.clear = function() {
    chrome.runtime.sendMessage({
      type: 'STORAGE_CHANGE',
      data: {
        storageType: 'sessionStorage',
        action: 'clear',
        url: window.location.href
      }
    }).catch(() => {});
    
    return originalSessionStorage.clear.call(this);
  };
  
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    captureConsoleLog('error', [
      `Uncaught ${event.error?.name || 'Error'}: ${event.message}`,
      `at ${event.filename}:${event.lineno}:${event.colno}`
    ]);
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureConsoleLog('error', [
      `Unhandled Promise Rejection: ${event.reason}`
    ]);
  });
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CONSOLE_LOGS') {
      sendResponse({ logs: consoleLogs });
    }
    
    if (message.type === 'CLEAR_CONSOLE_LOGS') {
      consoleLogs = [];
      sendResponse({ success: true });
    }
  });
  
})();
