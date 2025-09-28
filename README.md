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
2. **DevTools Panel**: Open Chrome DevTools (F12) and look for the "Web Monitor" tab

### Interface Overview

The extension provides four main tabs:

#### Network Tab
- View all network requests made by the current page
- Filter by request type (XHR, Fetch, Scripts, Stylesheets, Images)
- See request methods, URLs, status codes, and response headers
- Monitor request timing and errors

#### Console Tab
- Capture all console output (logs, warnings, errors, info)
- Filter by log level
- View stack traces for errors
- Monitor unhandled promise rejections

#### Cookies Tab
- Track cookie additions, updates, and deletions
- See cookie details including domain, path, and values
- Monitor cookie expiration and security settings

#### Storage Tab
- Monitor localStorage and sessionStorage changes
- Filter by storage type
- Track key-value pairs and operations (set, remove, clear)

### Controls

- **Refresh**: Reload all monitoring data
- **Clear All**: Remove all captured data across all tabs
- **Individual Clear**: Clear data for specific tabs using the "Clear" buttons
- **Filters**: Use dropdown filters to focus on specific data types

## Technical Details

### Permissions Required

The extension requires the following permissions:
- `activeTab`: Access to the current active tab
- `storage`: Chrome storage API access
- `cookies`: Cookie monitoring capabilities
- `webRequest`: Network request interception
- `webNavigation`: Navigation event monitoring
- `scripting`: Content script injection
- `<all_urls>`: Access to all websites for comprehensive monitoring

### Architecture

- **Background Script** (`background.js`): Service worker that handles network monitoring and data storage
- **Content Script** (`content.js`): Injected into web pages to monitor console logs and storage changes
- **Popup Interface** (`popup.html/js/css`): Main user interface for viewing monitored data
- **DevTools Integration** (`devtools.html/js`): Integration with Chrome DevTools

### Data Storage

- Network requests: Last 1000 requests stored in memory
- Console logs: Last 500 logs per tab
- Cookie changes: Last 500 changes stored
- Storage changes: Last 500 changes stored

Data is automatically cleaned up to prevent memory issues.

## Privacy & Security

- **Local Processing**: All data is processed locally in your browser
- **No External Servers**: No data is sent to external servers
- **Memory Management**: Automatic cleanup prevents excessive memory usage
- **Secure Storage**: Uses Chrome's secure storage APIs

## Development

### File Structure

```
web-monitor-pro/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for page monitoring
├── popup.html            # Main popup interface
├── popup.css             # Styling for popup
├── popup.js              # Popup functionality
├── devtools.html         # DevTools integration
├── devtools.js           # DevTools panel creation
├── icons/                # Extension icons
└── README.md             # This file
```

### Building from Source

1. Clone or download the source code
2. Make any desired modifications
3. Load the extension using Chrome's "Load unpacked" feature
4. Test thoroughly before distribution

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Other Browsers**: Not currently supported

## Troubleshooting

### Extension Not Working
- Ensure Developer mode is enabled in Chrome extensions
- Check that all files are present in the extension directory
- Reload the extension if you made changes

### No Data Appearing
- Make sure you're on a webpage (not chrome:// pages)
- Check that the extension has necessary permissions
- Try refreshing the page and the extension popup

### Console Logs Not Showing
- The content script may not have loaded properly
- Try refreshing the webpage
- Check Chrome's extension console for errors

## Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Look for similar issues in the project repository
3. Create a new issue with detailed information about your problem

## Changelog

### Version 1.0.0
- Initial release
- Network request monitoring
- Console log capture
- Cookie tracking
- Storage monitoring
- Modern UI with filtering
- Real-time updates
# ailem-webmon
