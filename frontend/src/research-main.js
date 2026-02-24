// Research Assistant main controller
import { handleLogin, handleLogout } from './research-auth.js';
import { onAuthChange } from './auth.js';
import { config } from './research-config.js';
import { initTranslationUI } from './translation-ui.js';
import { initPapersUI } from './papers-ui.js';
import { initSettingsUI } from './settings-ui.js';

/**
 * Initialize Research section
 */
export function initResearch() {
  const researchSection = document.getElementById('research');
  const loginUI = document.getElementById('research-login');
  const dashboard = document.getElementById('research-dashboard');

  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const showResearch = urlParams.get('research') === 'true';

  if (!showResearch) {
    researchSection.style.display = 'none';
    return;
  }

  // Show research section
  researchSection.style.display = 'flex';

  // Initialize auth state listener
  onAuthChange((user) => {
    if (user) {
      // User logged in - show dashboard
      loginUI.style.display = 'none';
      dashboard.style.display = 'block';
      document.getElementById('user-email').textContent = user.email;

      // Initialize research features
      initTabs();
      initTranslationTab();
      initTranslationUI();
      initPapersUI();
      initSettingsUI();
    } else {
      // User logged out - show login
      loginUI.style.display = 'flex';
      dashboard.style.display = 'none';
    }
  });

  // Setup login form
  const loginForm = document.getElementById('research-login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('research-email').value;
    const password = document.getElementById('research-password').value;
    const errorDiv = document.getElementById('login-error');

    const result = await handleLogin(email, password);

    if (result.success) {
      errorDiv.style.display = 'none';
      console.log('Login successful:', result.user.email);
    } else {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
    }
  });

  // Setup logout button
  const logoutBtn = document.getElementById('research-logout-btn');
  logoutBtn.addEventListener('click', async () => {
    await handleLogout();
    console.log('Logged out');
  });
}

/**
 * Initialize tab navigation
 */
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.research-tab');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Update active button
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Show corresponding tab
      tabs.forEach((tab) => {
        if (tab.id === `${tabName}-tab`) {
          tab.style.display = 'block';
          tab.classList.add('active');
        } else {
          tab.style.display = 'none';
          tab.classList.remove('active');
        }
      });

      // Refresh translation tab metadata when switching to it
      if (tabName === 'translation') {
        initTranslationTab();
      }
    });
  });
}

/**
 * Initialize translation tab metadata
 */
function initTranslationTab() {
  const modelInfo = document.getElementById('translation-model');
  modelInfo.textContent = config.llm.enabled
    ? `(Model: ${config.llm.models.translation})`
    : '(Claude API key not set - go to Settings tab)';
}
