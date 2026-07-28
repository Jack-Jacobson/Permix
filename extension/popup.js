document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
    document.getElementById('currentDomain').innerText = 'Internal Page';
    document.getElementById('statusBadge').innerText = 'Disabled';
    document.getElementById('statusBadge').style.color = '#94a3b8';
    return;
  }

  const url = new URL(tab.url);
  const origin = `${url.protocol}//${url.hostname}/*`;
  document.getElementById('currentDomain').innerText = url.hostname;

  // Sync initial permission states
  syncPermission('camera', 'toggleCamera', origin);
  syncPermission('microphone', 'toggleMic', origin);
  syncPermission('location', 'toggleLocation', origin);
  syncPermission('notifications', 'toggleNotifications', origin);

  // Toggle switch listeners
  setupToggle('camera', 'toggleCamera', origin);
  setupToggle('microphone', 'toggleMic', origin);
  setupToggle('location', 'toggleLocation', origin);
  setupToggle('notifications', 'toggleNotifications', origin);

  // Data Cleanup Handlers
  document.getElementById('btnClearCache').addEventListener('click', () => {
    chrome.browsingData.removeCache({ since: 0 }, () => showToast('Cache cleared!'));
  });

  document.getElementById('btnClearCookies').addEventListener('click', () => {
    chrome.browsingData.removeCookies({ origins: [url.origin] }, () => showToast('Cookies cleared for site!'));
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    chrome.browsingData.remove({
      origins: [url.origin]
    }, {
      cache: true,
      cookies: true,
      fileSystems: true,
      indexedDB: true,
      localStorage: true,
      serviceWorkers: true
    }, () => showToast('All site data purged!'));
  });
});

function syncPermission(type, elementId, origin) {
  if (!chrome.contentSettings[type]) return;
  
  chrome.contentSettings[type].get({ primaryUrl: origin }, (details) => {
    const toggle = document.getElementById(elementId);
    if (toggle && details) {
      toggle.checked = (details.setting === 'allow');
    }
  });
}

function setupToggle(type, elementId, origin) {
  const toggle = document.getElementById(elementId);
  if (!toggle || !chrome.contentSettings[type]) return;

  toggle.addEventListener('change', (e) => {
    const settingValue = e.target.checked ? 'allow' : 'block';
    chrome.contentSettings[type].set({
      primaryPattern: origin,
      setting: settingValue
    }, () => {
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${settingValue}`);
    });
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}