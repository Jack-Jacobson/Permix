document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('currentDomain');
  const statusTextEl = document.getElementById('statusText');
  const permissionsCard = document.getElementById('permissionsCard');
  const cleanupCard = document.getElementById('cleanupCard');

  // Query the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Handle internal browser pages (e.g., chrome:// extensions) or empty tabs
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    currentDomainEl.innerText = 'Internal Page';
    statusTextEl.innerText = 'Permix is inactive.';
    permissionsCard.classList.add('disabled');
    cleanupCard.classList.add('disabled');
    return;
  }

  const url = new URL(tab.url);
  currentDomainEl.innerText = url.hostname;
  statusTextEl.innerText = 'Monitoring site...';

  // Define the pattern required for setting content settings (e.g., "https://example.com/*")
  const primaryPattern = `${url.protocol}//${url.hostname}/*`;
  const primaryUrl = url.origin; // Origin required for data cleanup

  // Map permissions to UI input IDs
  const permissionsMap = [
    { type: 'camera', elementId: 'toggleCamera' },
    { type: 'microphone', elementId: 'toggleMic' },
    { type: 'location', elementId: 'toggleLocation' },
    { type: 'notifications', elementId: 'toggleNotifications' }
  ];

  // Initialize Permissions Toggles
  permissionsMap.forEach(perm => {
    initPermissionSwitch(perm.type, perm.elementId, url.href, primaryPattern);
  });

  // --- Initialize Cleanup Buttons ---

  // 1. Clear Cache (Note: Global browser action)
  document.getElementById('btnClearCache').addEventListener('click', () => {
    statusTextEl.innerText = 'Clearing global cache...';
    // Clears the entire browser cache
    chrome.browsingData.removeCache({ "since": 0 }, () => {
      showToast('Global cache cleared!');
      statusTextEl.innerText = 'Monitoring site...';
    });
  });

  // 2. Clear Cookies for this Origin
  document.getElementById('btnClearCookies').addEventListener('click', () => {
    statusTextEl.innerText = `Clearing cookies for ${url.hostname}...`;
    // Origin-specific cookie removal
    chrome.browsingData.removeCookies({
      "origins": [primaryUrl]
    }, () => {
      showToast(`Cookies cleared for ${url.hostname}`);
      statusTextEl.innerText = 'Monitoring site...';
    });
  });

  // 3. Purge Site Data for this Origin
  document.getElementById('btnClearAll').addEventListener('click', () => {
    statusTextEl.innerText = `Purging all data for ${url.hostname}...`;
    // Removes multiple types of data specific to this origin
    chrome.browsingData.remove({
      "origins": [primaryUrl]
    }, {
      "cache": true, // Origin specific if possible
      "cookies": true,
      "fileSystems": true,
      "indexedDB": true,
      "localStorage": true,
      "serviceWorkers": true,
      "webSQL": true
    }, () => {
      showToast(`All data purged for ${url.hostname}`);
      statusTextEl.innerText = 'Monitoring site...';
    });
  });
});

/**
 * Robust function to fetch current setting and initialize the switch logic
 */
function initPermissionSwitch(type, elementId, currentUrl, primaryPattern) {
  const toggle = document.getElementById(elementId);
  const statusTextEl = document.getElementById('statusText');
  
  if (!toggle || !chrome.contentSettings || !chrome.contentSettings[type]) return;

  // 1. Fetch current setting
  chrome.contentSettings[type].get({ primaryUrl: currentUrl }, (details) => {
    if (chrome.runtime.lastError) {
      console.warn(`Could not fetch initial state for ${type}:`, chrome.runtime.lastError.message);
      return;
    }
    toggle.checked = (details && details.setting === 'allow');
  });

  // 2. Listen for change event
  toggle.addEventListener('change', (e) => {
    const settingValue = e.target.checked ? 'allow' : 'block';
    
    statusTextEl.innerText = `Updating ${type} permission...`;

    // 3. Apply setting via API
    chrome.contentSettings[type].set({
      primaryPattern: primaryPattern,
      setting: settingValue
    }, () => {
      if (chrome.runtime.lastError) {
        // Handle failure (revert UI)
        toggle.checked = !e.target.checked;
        showToast(`Failed to update ${type}. Check console.`);
        console.error(chrome.runtime.lastError.message);
        statusTextEl.innerText = 'Monitoring site...';
      } else {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        showToast(`${label} now ${settingValue}ed.`);
        statusTextEl.innerText = 'Setting applied.';
        // Reset subtext after a short delay
        setTimeout(() => statusTextEl.innerText = 'Monitoring site...', 1000);
      }
    });
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}