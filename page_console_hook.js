// Injected into the page's MAIN world to capture console output
(function(){
  try {
    const original = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    function serializeArg(arg) {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        try { return String(arg); } catch { return '[Unserializable]'; }
      }
    }

    function makeHandler(level) {
      return function(...args) {
        try {
          const msg = {
            source: 'WMP',
            type: 'CONSOLE',
            level,
            timestamp: new Date().toISOString(),
            url: window.location && window.location.href,
            message: args.map(serializeArg).join(' '),
            stack: level === 'error' ? (new Error()).stack : null
          };
          window.postMessage(msg, '*');
        } catch {}
        return original[level].apply(console, args);
      };
    }

    console.log = makeHandler('log');
    console.warn = makeHandler('warn');
    console.error = makeHandler('error');
    console.info = makeHandler('info');
    console.debug = makeHandler('debug');
  } catch (e) {
    try { console.warn('[WMP] page_console_hook failed to initialize', e); } catch {}
  }
})();
