// DevTools integration for Web Monitor Pro
chrome.devtools.panels.create(
    'Web Monitor',
    'icons/icon16.png',
    'popup.html',
    (panel) => {
        console.log('Web Monitor Pro DevTools panel created');
    }
);
