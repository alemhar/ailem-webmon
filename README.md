# Web Monitor Pro - Chrome Extension

A powerful Chrome extension that monitors network requests, console logs, cookies, and storage changes in real-time for web development and debugging.

## Features

- 🌐 **Network Request Monitoring**: Track all HTTP requests with detailed information including headers, status codes, and response times
- 📝 **Console Log Capture**: Monitor all console logs, warnings, and errors with stack traces
- 🍪 **Cookie Tracking**: Real-time monitoring of cookie changes (additions, updates, deletions)
- 💾 **Storage Monitoring**: Track localStorage and sessionStorage changes
- 🎨 **Modern UI**: Clean, responsive interface with filtering and search capabilities
- 🔄 **Real-time Updates**: Live monitoring without page refresh
- 🧹 **Data Management**: Clear individual data types or all data at once

## Installation

### Method 1: Load Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select the folder containing the extension files
5. The extension should now appear in your extensions list
### Method 2: Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store soon.

## Usage

### Accessing the Extension

1. **Popup Interface**: Click the extension icon in the Chrome toolbar
2. **Open Window**: From the popup, click "Open Window" to keep a persistent view while interacting with the page
3. **DevTools Panel**: Open Chrome DevTools (F12) and look for the "Web Monitor" tab

### Interface Overview

The extension provides four main tabs:

{{ ... }}
## Technical Details

### Permissions Required

The extension requires the following permissions:
- `activeTab`: Access to the current active tab
- `tabs`: Resolve the active tab and scope monitoring
- `storage`: Chrome storage API access
- `cookies`: Cookie monitoring capabilities
- `webRequest`: Network request interception
- `webNavigation`: Navigation event monitoring
- `scripting`: Content script injection
- `<all_urls>`: Access to all websites for comprehensive monitoring

### Architecture

- **Background Script** (`background.js`): Service worker that handles network monitoring and data storage
- **Content Script** (`content.js`): Injected into web pages to monitor console logs and storage changes
{{ ... }}
- Network requests: Last 1000 requests stored in memory
- Console logs: Last 500 logs per tab
- Cookie changes: Last 500 changes stored
- Storage changes: Last 500 changes stored

Data is automatically cleaned up to prevent memory issues.

### Backend Submission (Optional)

- Configure placeholders in `src/config.js`:
  - `BACKEND_ENDPOINT = 'https://example.com/api/logs'`
  - `BACKEND_BEARER_TOKEN = 'Bearer YOUR_API_KEY_HERE'`
- In the popup/Open Window, enable "Submit to backend" and choose a retry interval (Off/20s/1m/5m).
- When Off, a new head event will attempt once (e.g., on page reload) to avoid spam. When On, attempts run periodically.
- Submission success/failure toasts appear while the UI is open.
- Payload structure: see `references/backend_payload_reference.md`.

### Test Page (for quick validation)

`test_page/` contains `index.html` and `script.js` that generate console, network (GET/POST/XHR, 404, CORS, network fail), storage, and cookie events.

- Open in Chrome (enable "Allow access to file URLs" for the extension) or serve via a local server.
- Open the extension popup or use Open Window; set submission toggle and retry, then interact with the page.


## Privacy & Security

- **Local Processing**: All data is processed locally in your browser
- **No External Servers**: No data is sent to external servers
{{ ... }}
### No Data Appearing
- Make sure you're on a webpage (not chrome:// pages)
- Check that the extension has necessary permissions
- Try refreshing the page and the extension popup

### Console Logs Not Showing
- Ensure the popup/Open Window was opened on the target tab (tab-scoped)
- Page-world console hook is injected by `src/content.js`; try refreshing the page
- Check background service worker and content script consoles for errors


## Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
{{ ... }}
2. Look for similar issues in the project repository
3. Create a new issue with detailed information about your problem

## Changelog

### Version 1.0.0
- Initial release
- Network/Console/Cookies/Storage monitoring with tab-scoped view
- Page-world console capture
- Open Window mode
- Session persistence
- Optional backend submission with retry control and toasts

