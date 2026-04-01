let keywords = [];
let accounts = [];
let currentAccountId = 'legacy-default';
let currentEditingKeyword = null;

// Extract API key from URL query param or localStorage
const urlParams = new URLSearchParams(window.location.search);
const urlKey = urlParams.get('key');
let apiKey = urlKey || localStorage.getItem('adminApiKey') || '';
if (urlKey) localStorage.setItem('adminApiKey', urlKey);

const navItems = document.querySelectorAll('.nav-item');
const tabs = document.querySelectorAll('.tab');
const modal = document.getElementById('kw-modal');
const statusMsg = document.getElementById('status-msg');
const apiKeyInput = document.getElementById('api-key-input');

function headers() {
  return apiKey ? { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  if (apiKey) apiKeyInput.value = apiKey;
  loadData();
  loadStatus();
});

function setupEventListeners() {
  navItems.forEach(item => item.addEventListener('click', () => switchTab(item.dataset.tab)));
  document.getElementById('save-btn').addEventListener('click', saveAll);
  document.getElementById('add-kw-btn').addEventListener('click', () => openKeywordModal());
  document.getElementById('add-account-btn').addEventListener('click', createNewAutomation);
  document.getElementById('account-selector').addEventListener('change', async (e) => {
    currentAccountId = e.target.value;
    await loadKeywords();
    await loadConfig();
    renderAccounts();
  });
  document.querySelector('.close-btn').addEventListener('click', closeKeywordModal);
  document.getElementById('cancel-kw-btn').addEventListener('click', closeKeywordModal);
  document.getElementById('save-kw-btn').addEventListener('click', saveKeyword);
  document.getElementById('delete-kw-btn').addEventListener('click', deleteKeyword);
  document.getElementById('kw-response-type').addEventListener('change', (e) => {
    document.getElementById('response-buttons-section').style.display = e.target.value === 'button' ? 'block' : 'none';
  });
  document.getElementById('kw-followup-type').addEventListener('change', (e) => {
    document.getElementById('followup-buttons-section').style.display = e.target.value === 'button' ? 'block' : 'none';
  });
  document.getElementById('add-response-btn').addEventListener('click', () => addButton('response'));
  document.getElementById('add-followup-btn').addEventListener('click', () => addButton('followup'));
  apiKeyInput.addEventListener('change', (e) => {
    apiKey = e.target.value;
    localStorage.setItem('adminApiKey', apiKey);
  });
  document.querySelectorAll('.toggle-secret').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.classList.toggle('visible', isPassword);
      btn.textContent = isPassword ? '🙈' : '👁';
    });
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeKeywordModal(); });
}

function switchTab(tabName) {
  navItems.forEach(item => item.classList.remove('active'));
  tabs.forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
  const titles = { automations: 'Automatizaciones', keywords: 'Keywords', config: 'Configuración', status: 'Estado' };
  document.getElementById('page-title').textContent = titles[tabName] || 'InstaBot';
  if (tabName === 'status') loadStatus();
}

async function loadData() {
  await loadAccounts();
  await loadKeywords();
  await loadConfig();
}

async function loadAccounts() {
  try {
    const res = await fetch('/api/admin/accounts', { headers: apiKey ? { 'X-API-Key': apiKey } : {} });
    if (!res.ok) return;
    accounts = await res.json();
    if (!accounts.find(a => a.id === currentAccountId)) {
      currentAccountId = accounts[0]?.id || 'legacy-default';
    }
    renderAccountSelector();
    renderAccounts();
  } catch (err) {
    console.error(err);
  }
}

async function loadKeywords() {
  try {
    const res = await fetch(`/api/admin/keywords?accountId=${encodeURIComponent(currentAccountId)}`, { headers: apiKey ? { 'X-API-Key': apiKey } : {} });
    if (!res.ok) return;
    keywords = await res.json();
    renderKeywords();
  } catch (err) {
    console.error(err);
  }
}

async function loadConfig() {
  try {
    const res = await fetch(`/api/admin/config?accountId=${encodeURIComponent(currentAccountId)}`, { headers: apiKey ? { 'X-API-Key': apiKey } : {} });
    if (!res.ok) return;
    const config = await res.json();
    document.getElementById('account-name').value = config.name || '';
    document.getElementById('meta-app-secret').value = config.appSecret || config.META_APP_SECRET || '';
    document.getElementById('meta-verify-token').value = config.verifyToken || config.META_VERIFY_TOKEN || '';
    document.getElementById('instagram-token').value = config.accessToken || config.INSTAGRAM_PAGE_ACCESS_TOKEN || '';
    document.getElementById('instagram-page-id').value = config.pageId || config.INSTAGRAM_PAGE_ID || '';
    document.getElementById('resend-api-key').value = config.resendApiKey || config.RESEND_API_KEY || '';
    document.getElementById('email-from').value = config.emailFrom || config.EMAIL_FROM || '';
    document.getElementById('welcome-template').value = config.welcomeEmailTemplate || config.WELCOME_EMAIL_TEMPLATE || '';
  } catch (err) {
    console.error(err);
  }
}

function renderAccountSelector() {
  const selector = document.getElementById('account-selector');
  selector.innerHTML = accounts.map(account => `<option value="${account.id}" ${account.id === currentAccountId ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('');
}

function renderAccounts() {
  const container = document.getElementById('accounts-container');
  if (!accounts.length) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 40px; text-align: center;">No hay automatizaciones.</p>';
    return;
  }
  container.innerHTML = accounts.map(account => `
    <div class="keyword-card ${account.id === currentAccountId ? '' : 'disabled'}" data-account-id="${account.id}">
      <div class="keyword-card-header">
        <div class="keyword-card-title"><h4>${escapeHtml(account.name)}</h4><span class="badge ${account.enabled ? 'badge-enabled' : 'badge-disabled'}">${account.enabled ? 'Activo' : 'Inactivo'}</span></div>
      </div>
      <div class="keyword-card-meta"><span>Page ID: ${escapeHtml(account.pageId || account.page_id || '')}</span></div>
      <div class="keyword-card-preview">Cuenta ${account.id === 'legacy-default' ? 'legacy' : 'gestionada desde panel'}</div>
    </div>
  `).join('');
  document.querySelectorAll('[data-account-id]').forEach(card => {
    card.addEventListener('click', async () => {
      currentAccountId = card.dataset.accountId;
      renderAccountSelector();
      await loadKeywords();
      await loadConfig();
      renderAccounts();
      switchTab('keywords');
    });
  });
}

function renderKeywords() {
  const container = document.getElementById('keywords-container');
  if (keywords.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 40px; text-align: center;">No hay keywords para esta automatización.</p>';
    return;
  }
  container.innerHTML = keywords.map(kw => `
    <div class="keyword-card ${kw.enabled ? '' : 'disabled'}" data-id="${kw.id}">
      <div class="keyword-card-header"><div class="keyword-card-title"><h4>${escapeHtml(kw.keyword)}</h4><span class="badge ${kw.enabled ? 'badge-enabled' : 'badge-disabled'}">${kw.enabled ? 'Activo' : 'Inactivo'}</span><span class="badge badge-match">${kw.matchType}</span></div></div>
      <div class="keyword-card-meta"><span>Prioridad: ${kw.priority}</span><span>Cooldown: ${kw.cooldownMinutes}min</span>${kw.askEmail ? '<span>📧 Email</span>' : ''}</div>
      <div class="keyword-card-preview">${escapeHtml((kw.response?.text || 'Sin mensaje').substring(0, 100))}...</div>
    </div>
  `).join('');
  document.querySelectorAll('.keyword-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const keyword = keywords.find(k => k.id === card.dataset.id);
      if (keyword) openKeywordModal(keyword);
    });
  });
}

function createNewAutomation() {
  currentAccountId = `acc_${Date.now()}`;
  document.getElementById('account-name').value = '';
  document.getElementById('meta-app-secret').value = '';
  document.getElementById('meta-verify-token').value = '';
  document.getElementById('instagram-token').value = '';
  document.getElementById('instagram-page-id').value = '';
  document.getElementById('resend-api-key').value = '';
  document.getElementById('email-from').value = '';
  document.getElementById('welcome-template').value = 'bienvenido.html';
  keywords = [];
  renderKeywords();
  switchTab('config');
  showStatus('Nueva automatización lista para configurar', 'success');
}

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
    document.getElementById('kw-response-type').value = keyword.response?.type || 'button';
    document.getElementById('kw-response-text').value = keyword.response?.text || '';
    renderButtons('response', keyword.response?.buttons || []);
    document.getElementById('kw-followup-type').value = keyword.followUp?.type || 'button';
    document.getElementById('kw-followup-text').value = keyword.followUp?.text || '';
    renderButtons('followup', keyword.followUp?.buttons || []);
  } else {
    document.getElementById('kw-id').value = '';
    document.getElementById('kw-keyword').value = '';
    document.getElementById('kw-aliases').value = '';
    document.getElementById('kw-match-type').value = 'contains';
    document.getElementById('kw-priority').value = 1;
    document.getElementById('kw-cooldown').value = 60;
    document.getElementById('kw-enabled').checked = true;
    document.getElementById('kw-ask-email').checked = true;
    document.getElementById('kw-response-type').value = 'button';
    document.getElementById('kw-response-text').value = '';
    document.getElementById('kw-followup-type').value = 'button';
    document.getElementById('kw-followup-text').value = '';
    document.getElementById('response-buttons-section').style.display = 'block';
    document.getElementById('followup-buttons-section').style.display = 'block';
    renderButtons('response', []);
    renderButtons('followup', []);
  }
  modal.classList.add('active');
}

function closeKeywordModal() { modal.classList.remove('active'); currentEditingKeyword = null; }

function renderButtons(type, buttons) {
  const container = document.getElementById(`${type}-buttons`);
  container.innerHTML = buttons.map((btn, idx) => `
    <div class="button-item" data-idx="${idx}">
      <div class="button-row"><input type="text" placeholder="Título" value="${escapeHtml(btn.title || '')}" class="btn-title"><select class="btn-type"><option value="postback" ${btn.type === 'postback' ? 'selected' : ''}>Postback</option><option value="web_url" ${btn.type === 'web_url' ? 'selected' : ''}>URL Web</option></select><button type="button" class="remove-btn" onclick="removeButton('${type}', ${idx})">×</button></div>
      <div class="button-row"><input type="text" placeholder="payload o URL" value="${escapeHtml(btn.payload || btn.url || '')}" class="btn-payload" style="grid-column: 1 / -1;"></div>
    </div>`).join('');
}

function addButton(type) {
  const container = document.getElementById(`${type}-buttons`);
  const idx = container.querySelectorAll('.button-item').length;
  const div = document.createElement('div');
  div.className = 'button-item';
  div.dataset.idx = idx;
  div.innerHTML = `<div class="button-row"><input type="text" placeholder="Título" class="btn-title"><select class="btn-type"><option value="postback">Postback</option><option value="web_url">URL Web</option></select><button type="button" class="remove-btn" onclick="removeButton('${type}', ${idx})">×</button></div><div class="button-row"><input type="text" placeholder="payload o URL" class="btn-payload" style="grid-column: 1 / -1;"></div>`;
  container.appendChild(div);
}

function removeButton(type, idx) {
  const container = document.getElementById(`${type}-buttons`);
  const items = container.querySelectorAll('.button-item');
  if (items[idx]) items[idx].remove();
}
window.removeButton = removeButton;

async function saveKeyword() {
  const id = document.getElementById('kw-id').value.trim();
  const keyword = document.getElementById('kw-keyword').value.trim();
  if (!id || !keyword) return alert('ID y Keyword son requeridos');
  const aliases = document.getElementById('kw-aliases').value.split(',').map(s => s.trim()).filter(Boolean);
  const collectButtons = (type) => Array.from(document.getElementById(`${type}-buttons`).querySelectorAll('.button-item')).map(item => {
    const title = item.querySelector('.btn-title').value.trim();
    const btnType = item.querySelector('.btn-type').value;
    const payload = item.querySelector('.btn-payload').value.trim();
    if (!title || !payload) return null;
    return btnType === 'web_url' ? { type: 'web_url', title, url: payload } : { type: 'postback', title, payload };
  }).filter(Boolean);
  const newKeyword = {
    id, keyword, aliases,
    matchType: document.getElementById('kw-match-type').value,
    priority: parseInt(document.getElementById('kw-priority').value) || 1,
    enabled: document.getElementById('kw-enabled').checked,
    cooldownMinutes: parseInt(document.getElementById('kw-cooldown').value) || 60,
    askEmail: document.getElementById('kw-ask-email').checked,
    response: { type: document.getElementById('kw-response-type').value, text: document.getElementById('kw-response-text').value.trim() },
    followUp: { type: document.getElementById('kw-followup-type').value, text: document.getElementById('kw-followup-text').value.trim() },
  };
  if (newKeyword.response.type === 'button') newKeyword.response.buttons = collectButtons('response');
  if (newKeyword.followUp.type === 'button') newKeyword.followUp.buttons = collectButtons('followup');
  const existingIdx = keywords.findIndex(k => k.id === id);
  if (existingIdx >= 0) keywords[existingIdx] = newKeyword; else keywords.push(newKeyword);
  renderKeywords();
  closeKeywordModal();
  await persistKeywords();
  showStatus('Keyword guardado', 'success');
}

async function deleteKeyword() {
  if (!currentEditingKeyword) return;
  if (!confirm(`¿Eliminar keyword "${currentEditingKeyword.keyword}"?`)) return;
  keywords = keywords.filter(k => k.id !== currentEditingKeyword.id);
  renderKeywords();
  closeKeywordModal();
  await persistKeywords();
  showStatus('Keyword eliminado', 'success');
}

async function persistKeywords() {
  if (!apiKey) return;
  try {
    const res = await fetch(`/api/admin/keywords?accountId=${encodeURIComponent(currentAccountId)}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ accountId: currentAccountId, rules: keywords }),
    });
    if (!res.ok) showStatus('Error guardando keywords', 'error');
  } catch (err) {
    console.error(err);
    showStatus('Error guardando keywords', 'error');
  }
}

async function saveAll() {
  if (!apiKey) return showStatus('Ingresa tu API Key primero', 'error');
  try {
    const accountPayload = {
      id: currentAccountId === 'legacy-default' ? undefined : currentAccountId,
      name: document.getElementById('account-name').value || 'Nueva automatización',
      pageId: document.getElementById('instagram-page-id').value,
      accessToken: document.getElementById('instagram-token').value,
      verifyToken: document.getElementById('meta-verify-token').value,
      appSecret: document.getElementById('meta-app-secret').value,
      resendApiKey: document.getElementById('resend-api-key').value,
      emailFrom: document.getElementById('email-from').value,
      welcomeEmailTemplate: document.getElementById('welcome-template').value,
      enabled: true,
    };
    let savedAccountId = currentAccountId;
    if (currentAccountId !== 'legacy-default') {
      const accountRes = await fetch('/api/admin/accounts', { method: 'POST', headers: headers(), body: JSON.stringify(accountPayload) });
      if (!accountRes.ok) throw new Error('account save failed');
      const saved = await accountRes.json();
      savedAccountId = saved.id;
      currentAccountId = saved.id;
    }
    const kwRes = await fetch(`/api/admin/keywords?accountId=${encodeURIComponent(savedAccountId)}`, { method: 'POST', headers: headers(), body: JSON.stringify({ accountId: savedAccountId, rules: keywords }) });
    if (!kwRes.ok) throw new Error('keyword save failed');
    const preservedId = currentAccountId;
    await loadAccounts();
    currentAccountId = preservedId;
    await loadKeywords();
    renderAccountSelector();
    showStatus('Automatización guardada', 'success');
  } catch (err) {
    console.error(err);
    showStatus('Error guardando', 'error');
  }
}

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
  } catch {
    document.getElementById('server-status').textContent = 'Offline';
    document.getElementById('server-status').className = 'status-value offline';
  }
}

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
  setTimeout(() => { statusMsg.textContent = ''; statusMsg.className = 'status-msg'; }, 3000);
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
