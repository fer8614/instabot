// Admin Panel State
let keywords = [];
let config = {};
let currentEditingKeyword = null;
let apiKey = localStorage.getItem('adminApiKey') || '';

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabs = document.querySelectorAll('.tab');
const modal = document.getElementById('kw-modal');
const statusMsg = document.getElementById('status-msg');
const apiKeyInput = document.getElementById('api-key-input');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
  loadStatus();
  
  // Load saved API key
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
});

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  
  // Save all
  document.getElementById('save-btn').addEventListener('click', saveAll);
  
  // Keywords
  document.getElementById('add-kw-btn').addEventListener('click', () => openKeywordModal());
  
  // Modal
  document.querySelector('.close-btn').addEventListener('click', closeKeywordModal);
  document.getElementById('cancel-kw-btn').addEventListener('click', closeKeywordModal);
  document.getElementById('save-kw-btn').addEventListener('click', saveKeyword);
  document.getElementById('delete-kw-btn').addEventListener('click', deleteKeyword);
  
  // Response type toggle
  document.getElementById('kw-response-type').addEventListener('change', (e) => {
    document.getElementById('response-buttons-section').style.display = 
      e.target.value === 'button' ? 'block' : 'none';
  });
  
  // Followup type toggle
  document.getElementById('kw-followup-type').addEventListener('change', (e) => {
    document.getElementById('followup-buttons-section').style.display = 
      e.target.value === 'button' ? 'block' : 'none';
  });
  
  // Add buttons
  document.getElementById('add-response-btn').addEventListener('click', () => addButton('response'));
  document.getElementById('add-followup-btn').addEventListener('click', () => addButton('followup'));
  
  // API Key input
  apiKeyInput.addEventListener('change', (e) => {
    apiKey = e.target.value;
    localStorage.setItem('adminApiKey', apiKey);
  });
  
  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeKeywordModal();
  });
}

// Switch Tab
function switchTab(tabName) {
  navItems.forEach(item => item.classList.remove('active'));
  tabs.forEach(tab => tab.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  const titles = {
    keywords: 'Keywords',
    config: 'Configuración',
    status: 'Estado'
  };
  document.getElementById('page-title').textContent = titles[tabName] || 'InstaBot';
  
  if (tabName === 'status') {
    loadStatus();
  }
}

// Load Data
async function loadData() {
  try {
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};
    
    const [kwRes, cfgRes] = await Promise.all([
      fetch('/api/admin/keywords', { headers }),
      fetch('/api/admin/config', { headers })
    ]);
    
    if (kwRes.ok) {
      keywords = await kwRes.json();
      renderKeywords();
    } else if (kwRes.status === 401) {
      showStatus('API Key inválida o no configurada', 'error');
    }
    
    if (cfgRes.ok) {
      config = await cfgRes.json();
      populateConfigForm();
    }
  } catch (err) {
    showStatus('Error cargando datos', 'error');
    console.error('Load error:', err);
  }
}

// Render Keywords
function renderKeywords() {
  const container = document.getElementById('keywords-container');
  
  if (keywords.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 40px; text-align: center;">No hay keywords. Haz clic en "Agregar Keyword" para comenzar.</p>';
    return;
  }
  
  container.innerHTML = keywords.map(kw => `
    <div class="keyword-card ${kw.enabled ? '' : 'disabled'}" data-id="${kw.id}">
      <div class="keyword-card-header">
        <div class="keyword-card-title">
          <h4>${escapeHtml(kw.keyword)}</h4>
          <span class="badge ${kw.enabled ? 'badge-enabled' : 'badge-disabled'}">
            ${kw.enabled ? 'Activo' : 'Inactivo'}
          </span>
          <span class="badge badge-match">${kw.matchType}</span>
        </div>
      </div>
      <div class="keyword-card-meta">
        <span>Prioridad: ${kw.priority}</span>
        <span>Cooldown: ${kw.cooldownMinutes}min</span>
        ${kw.askEmail ? '<span>📧 Email</span>' : ''}
      </div>
      <div class="keyword-card-preview">
        ${escapeHtml((kw.response?.text || 'Sin mensaje').substring(0, 100))}...
      </div>
      ${kw.aliases?.length ? `
        <div class="keyword-card-aliases">
          Alias: ${kw.aliases.join(', ')}
        </div>
      ` : ''}
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.keyword-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const keyword = keywords.find(k => k.id === id);
      if (keyword) openKeywordModal(keyword);
    });
  });
}

// Populate Config Form
function populateConfigForm() {
  document.getElementById('meta-app-secret').value = config.META_APP_SECRET || '';
  document.getElementById('meta-verify-token').value = config.META_VERIFY_TOKEN || '';
  document.getElementById('instagram-token').value = config.INSTAGRAM_PAGE_ACCESS_TOKEN || '';
  document.getElementById('instagram-page-id').value = config.INSTAGRAM_PAGE_ID || '';
  document.getElementById('admin-api-key').value = config.ADMIN_API_KEY || '';
  document.getElementById('resend-api-key').value = config.RESEND_API_KEY || '';
  document.getElementById('email-from').value = config.EMAIL_FROM || '';
  document.getElementById('welcome-template').value = config.WELCOME_EMAIL_TEMPLATE || '';
  document.getElementById('database-url').value = config.DATABASE_URL || '';
  document.getElementById('port').value = config.PORT || 3000;
  document.getElementById('log-level').value = config.LOG_LEVEL || 'info';
}

// Open Keyword Modal
function openKeywordModal(keyword = null) {
  currentEditingKeyword = keyword;
  
  document.getElementById('modal-title').textContent = keyword ? 'Editar Keyword' : 'Nuevo Keyword';
  document.getElementById('delete-kw-btn').style.display = keyword ? 'block' : 'none';
  
  if (keyword) {
    document.getElementById('kw-id').value = keyword.id;
    document.getElementById('kw-keyword').value = keyword.keyword;
    document.getElementById('kw-aliases').value = (keyword.aliases || []).join(', ');
    document.getElementById('kw-match-type').value = keyword.matchType || 'contains';
    document.getElementById('kw-priority').value = keyword.priority || 1;
    document.getElementById('kw-cooldown').value = keyword.cooldownMinutes || 60;
    document.getElementById('kw-enabled').checked = keyword.enabled !== false;
    document.getElementById('kw-ask-email').checked = keyword.askEmail !== false;
    
    // Response
    const response = keyword.response || {};
    document.getElementById('kw-response-type').value = response.type || 'button';
    document.getElementById('kw-response-text').value = response.text || '';
    document.getElementById('response-buttons-section').style.display = 
      response.type === 'text' ? 'none' : 'block';
    renderButtons('response', response.buttons || []);
    
    // FollowUp
    const followUp = keyword.followUp || {};
    document.getElementById('kw-followup-type').value = followUp.type || 'button';
    document.getElementById('kw-followup-text').value = followUp.text || '';
    document.getElementById('followup-buttons-section').style.display = 
      followUp.type === 'text' ? 'none' : 'block';
    renderButtons('followup', followUp.buttons || []);
  } else {
    // Reset form
    document.getElementById('kw-form').reset();
    document.getElementById('kw-priority').value = 1;
    document.getElementById('kw-cooldown').value = 60;
    document.getElementById('kw-enabled').checked = true;
    document.getElementById('kw-ask-email').checked = true;
    renderButtons('response', []);
    renderButtons('followup', []);
  }
  
  modal.classList.add('active');
}

// Close Keyword Modal
function closeKeywordModal() {
  modal.classList.remove('active');
  currentEditingKeyword = null;
}

// Render Buttons
function renderButtons(type, buttons) {
  const container = document.getElementById(`${type}-buttons`);
  
  if (buttons.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = buttons.map((btn, idx) => `
    <div class="button-item" data-idx="${idx}">
      <div class="button-row">
        <input type="text" placeholder="Título" value="${escapeHtml(btn.title || '')}" class="btn-title">
        <select class="btn-type">
          <option value="postback" ${btn.type === 'postback' ? 'selected' : ''}>Postback</option>
          <option value="web_url" ${btn.type === 'web_url' ? 'selected' : ''}>URL Web</option>
        </select>
        <button type="button" class="remove-btn" onclick="removeButton('${type}', ${idx})">×</button>
      </div>
      <div class="button-row">
        <input type="text" placeholder="${btn.type === 'web_url' ? 'https://...' : 'payload'}" 
               value="${escapeHtml(btn.payload || btn.url || '')}" class="btn-payload" style="grid-column: 1 / -1;">
      </div>
    </div>
  `).join('');
}

// Add Button
function addButton(type) {
  const container = document.getElementById(`${type}-buttons`);
  const idx = container.querySelectorAll('.button-item').length;
  
  const div = document.createElement('div');
  div.className = 'button-item';
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="button-row">
      <input type="text" placeholder="Título" class="btn-title">
      <select class="btn-type">
        <option value="postback">Postback</option>
        <option value="web_url">URL Web</option>
      </select>
      <button type="button" class="remove-btn" onclick="removeButton('${type}', ${idx})">×</button>
    </div>
    <div class="button-row">
      <input type="text" placeholder="payload o URL" class="btn-payload" style="grid-column: 1 / -1;">
    </div>
  `;
  container.appendChild(div);
}

// Remove Button
function removeButton(type, idx) {
  const container = document.getElementById(`${type}-buttons`);
  const items = container.querySelectorAll('.button-item');
  if (items[idx]) {
    items[idx].remove();
  }
}

// Save Keyword
async function saveKeyword() {
  const id = document.getElementById('kw-id').value.trim();
  const keyword = document.getElementById('kw-keyword').value.trim();
  
  if (!id || !keyword) {
    alert('ID y Keyword son requeridos');
    return;
  }
  
  const aliases = document.getElementById('kw-aliases').value
    .split(',')
    .map(s => s.trim())
    .filter(s => s);
  
  const collectButtons = (type) => {
    const container = document.getElementById(`${type}-buttons`);
    return Array.from(container.querySelectorAll('.button-item')).map(item => {
      const title = item.querySelector('.btn-title').value.trim();
      const btnType = item.querySelector('.btn-type').value;
      const payload = item.querySelector('.btn-payload').value.trim();
      if (!title || !payload) return null;
      return btnType === 'web_url' 
        ? { type: 'web_url', title, url: payload }
        : { type: 'postback', title, payload };
    }).filter(Boolean);
  };
  
  const newKeyword = {
    id,
    keyword,
    aliases,
    matchType: document.getElementById('kw-match-type').value,
    priority: parseInt(document.getElementById('kw-priority').value) || 1,
    enabled: document.getElementById('kw-enabled').checked,
    cooldownMinutes: parseInt(document.getElementById('kw-cooldown').value) || 60,
    askEmail: document.getElementById('kw-ask-email').checked,
    response: {
      type: document.getElementById('kw-response-type').value,
      text: document.getElementById('kw-response-text').value.trim(),
    },
    followUp: {
      type: document.getElementById('kw-followup-type').value,
      text: document.getElementById('kw-followup-text').value.trim(),
    }
  };
  
  if (newKeyword.response.type === 'button') {
    newKeyword.response.buttons = collectButtons('response');
  }
  
  if (newKeyword.followUp.type === 'button') {
    newKeyword.followUp.buttons = collectButtons('followup');
  }
  
  const existingIdx = keywords.findIndex(k => k.id === id);
  if (existingIdx >= 0) {
    keywords[existingIdx] = newKeyword;
  } else {
    keywords.push(newKeyword);
  }
  
  renderKeywords();
  closeKeywordModal();
  showStatus('Keyword guardado', 'success');
}

// Delete Keyword
function deleteKeyword() {
  if (!currentEditingKeyword) return;
  
  if (!confirm(`¿Eliminar keyword "${currentEditingKeyword.keyword}"?`)) return;
  
  keywords = keywords.filter(k => k.id !== currentEditingKeyword.id);
  renderKeywords();
  closeKeywordModal();
  showStatus('Keyword eliminado', 'success');
}

// Save All
async function saveAll() {
  if (!apiKey) {
    showStatus('Ingresa tu API Key primero', 'error');
    return;
  }
  
  try {
    const newConfig = {
      META_APP_SECRET: document.getElementById('meta-app-secret').value,
      META_VERIFY_TOKEN: document.getElementById('meta-verify-token').value,
      INSTAGRAM_PAGE_ACCESS_TOKEN: document.getElementById('instagram-token').value,
      INSTAGRAM_PAGE_ID: document.getElementById('instagram-page-id').value,
      ADMIN_API_KEY: document.getElementById('admin-api-key').value,
      RESEND_API_KEY: document.getElementById('resend-api-key').value,
      EMAIL_FROM: document.getElementById('email-from').value,
      WELCOME_EMAIL_TEMPLATE: document.getElementById('welcome-template').value,
      DATABASE_URL: document.getElementById('database-url').value,
      PORT: parseInt(document.getElementById('port').value) || 3000,
      LOG_LEVEL: document.getElementById('log-level').value,
    };
    
    const headers = { 
      'Content-Type': 'application/json',
      'X-API-Key': apiKey 
    };
    
    const [kwRes, cfgRes] = await Promise.all([
      fetch('/api/admin/keywords', {
        method: 'POST',
        headers,
        body: JSON.stringify(keywords)
      }),
      fetch('/api/admin/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(newConfig)
      })
    ]);
    
    if (kwRes.ok && cfgRes.ok) {
      showStatus('¡Todo guardado exitosamente!', 'success');
      config = newConfig;
    } else if (kwRes.status === 401 || cfgRes.status === 401) {
      showStatus('API Key inválida', 'error');
    } else {
      throw new Error('Save failed');
    }
  } catch (err) {
    showStatus('Error guardando', 'error');
    console.error('Save error:', err);
  }
}

// Load Status
async function loadStatus() {
  try {
    const res = await fetch('/health');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('server-status').textContent = data.status === 'ok' ? 'Online' : 'Error';
      document.getElementById('server-status').className = `status-value ${data.status === 'ok' ? 'online' : 'offline'}`;
      document.getElementById('uptime').textContent = formatUptime(data.uptime);
      document.getElementById('version').textContent = data.version || '1.0.0';
    }
  } catch (err) {
    document.getElementById('server-status').textContent = 'Offline';
    document.getElementById('server-status').className = 'status-value offline';
  }
}

// Helpers
function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
  setTimeout(() => {
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
