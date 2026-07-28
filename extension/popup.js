document.addEventListener('DOMContentLoaded', async () => {
    const currentDomainEl = document.getElementById('currentDomain');
    const cleanupCard = document.getElementById('cleanupCard');

    // Query the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Handle internal browser pages safely
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
        currentDomainEl.innerText = 'Internal Page';
        cleanupCard.classList.add('disabled');
        return;
    }

    const url = new URL(tab.url);
    currentDomainEl.innerText = url.hostname;
    const primaryUrl = url.origin; // e.g., https://example.com

    // Browser compatibility logic
    // Firefox requires 'hostnames', Chrome requires 'origins'
    const isFirefox = navigator.userAgent.includes('Firefox');
    const targetSiteOptions = isFirefox 
        ? { "hostnames": [url.hostname] } 
        : { "origins": [primaryUrl] };

    // 1. Clear Cache (Global in browser extensions)
    document.getElementById('btnClearCache').addEventListener('click', () => {
        chrome.browsingData.removeCache({ "since": 0 }, () => {
            showToast('Global cache cleared!');
        });
    });

    // 2. Clear Cookies for this specific origin/hostname
    document.getElementById('btnClearCookies').addEventListener('click', () => {
        chrome.browsingData.remove(targetSiteOptions, {
            "cookies": true
        }, () => {
            showToast(`Cookies cleared for ${url.hostname}`);
        });
    });

    // 3. Purge all Site Data for this specific origin/hostname
    document.getElementById('btnClearAll').addEventListener('click', () => {
        chrome.browsingData.remove(targetSiteOptions, {
            "cache": true,
            "cookies": true,
            "fileSystems": true,
            "indexedDB": true,
            "localStorage": true,
            "serviceWorkers": true,
            "webSQL": true // Deprecated in modern browsers, but safe to leave for older Chrome versions
        }, () => {
            showToast(`All data purged for ${url.hostname}`);
        });
    });
});

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    // Hide toast after 2.2 seconds
    setTimeout(() => toast.classList.remove('show'), 2200);
}