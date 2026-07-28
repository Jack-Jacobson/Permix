document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('currentDomain');
  const statusBadgeEl = document.getElementById('statusBadge');

  // Query the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    currentDomainEl.innerText = 'Internal Page';
    statusBadgeEl.innerText = 'Disabled';
    statusBadgeEl.style.color = '#94a3b8';
    disableAllToggles();
    return;
  }

  const url = new URL(tab.url);
  currentDomainEl.innerText = url.hostname;

  const primaryPattern = `${url.protocol}//${url.hostname}/*`;

  // Map permissions to UI input IDs
  const permissions = [
    { type: 'camera', elementId: 'toggleCamera' },
    { type: 'microphone', elementId: 'toggleMic' },
    { type: 'location', elementId: 'toggleLocation' },
    { type: 'notifications', elementId: 'toggleNotifications' }
  ];

  // Initialize state and event listeners for each switch
  permissions.forEach(({ type, elementId }) => {
    initPermissionToggle(type, elementId, tab.url, primaryPattern);
  });
});


function initPermissionToggle(type, elementId, currentUrl, primaryPattern) {
  const toggle = document.getElementById(elementId);
  if (!toggle || !chrome.contentSettings || !chrome.contentSettings[type]) return;

  // 1. Fetch current setting for the site
  chrome.contentSettings[type].get({ primaryUrl: currentUrl }, (details) => {
    if (chrome.runtime.lastError) {
      console.warn(`Could not read ${type} setting:`, chrome.runtime.lastError.message);
      return;
    }
    // Set checked if permission is explicitly 'allow'
    toggle.checked = details && details.setting === 'allow';
  });

  // Listen for switch toggles
  toggle.addEventListener('change', (e) => {
    const settingValue = e.target.checked ? 'allow' : 'block';

    chrome.contentSettings[type].set({
      primaryPattern: primaryPattern,
      setting: settingValue
    }, () => {
      if (chrome.runtime.lastError) {
        // Revert switch position if setting failed
        toggle.checked = !e.target.checked;
        showToast(`Failed to update ${type}`);
        console.error(chrome.runtime.lastError);
      } else {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        showToast(`${label} set to ${settingValue}`);
      }
    });
  });
}

function disableAllToggles() {
  const toggles = document.querySelectorAll('.switch input');
  toggles.forEach(toggle => {
    toggle.disabled = true;
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}