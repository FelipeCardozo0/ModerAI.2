document.addEventListener('DOMContentLoaded', initPopup);

function initPopup() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const toggleSwitch = document.getElementById('toggle-switch');
  
  checkAuthState();
  
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  toggleSwitch.addEventListener('change', handleToggle);

  function checkAuthState() {
    chrome.identity.getAuthToken({ interactive: false }, token => {
      if (token) {
        showControls();
        loadUserInfo();
        loadToggleState();
      } else {
        showLogin();
      }
    });
  }

  function handleLogin() {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      if (token) {
        showControls();
        loadUserInfo();
        loadToggleState();
      }
    });
  }

  function handleLogout() {
    chrome.identity.removeCachedAuthToken({ token: '' }, () => {
      chrome.storage.local.clear();
      showLogin();
    });
  }

  function handleToggle(e) {
    chrome.storage.local.set({ enabled: e.target.checked });
  }

  function showControls() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('controls').classList.remove('hidden');
  }

  function showLogin() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('controls').classList.add('hidden');
  }

  function loadUserInfo() {
    chrome.identity.getProfileUserInfo(info => {
      document.getElementById('user-email').textContent = info.email;
    });
  }

  function loadToggleState() {
    chrome.storage.local.get('enabled', data => {
      toggleSwitch.checked = data.enabled !== undefined ? data.enabled : true;
    });
  }
}