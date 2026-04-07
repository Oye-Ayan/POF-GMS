/* ════════════════════════════════════════════════════════════════════
   POF GMS v3.0 — Application Logic (API-Connected)
   Author: Muhammad Ayan Khan | Software Engineer
   
   *** PREVIOUS VERSION (localStorage) is preserved in app.js ***
   This version connects to the Node.js/MySQL backend via api.js
   ════════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NOW          = new Date();
const CUR_YEAR     = NOW.getFullYear();
const CUR_MONTH    = NOW.getMonth();

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let DB         = [];
let SHIFTS     = {};
let editingId  = null;
let detailId   = null;
let editShiftCat = null;
let toastTimer = null;

// Theme is still stored in localStorage (client preference)
const themeStorage = {
  getTheme: () => localStorage.getItem('pof_gms_theme') || 'dark',
  saveTheme: (t) => localStorage.setItem('pof_gms_theme', t),
};

// ═══════════════════════════════════════════
// AUTHENTICATION (API-Connected)
// ═══════════════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form-container').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('form-login').classList.add('active');
  } else {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('form-register').classList.add('active');
  }
}

async function attemptRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const user  = document.getElementById('reg-user').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const err   = document.getElementById('reg-error');
  const btn   = document.querySelector('#form-register .btn-login');

  if (!name || !user || !email || !pass) {
    err.textContent = 'All fields are required.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> CREATING...';

  try {
    const data = await API.register(name, user, email, pass);
    if (data.success) {
      err.style.display = 'none';
      const authScreen = document.getElementById('auth-screen');
      authScreen.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => {
        authScreen.style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
        showToast('Welcome!', 'Your account has been created successfully.', 'success');
      }, 380);
    }
  } catch (error) {
    err.textContent = error.message || 'Registration failed. Please try again.';
    err.style.display = 'block';
    err.style.animation = 'none';
    requestAnimationFrame(() => { err.style.animation = 'shake 0.4s ease'; });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-shine"></span>CREATE ACCOUNT';
  }
}

async function attemptLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-error');
  const btn  = document.querySelector('#form-login .btn-login');

  if (!user || !pass) {
    err.textContent = 'Please enter both username and password.';
    err.style.display = 'block';
    return;
  }

  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> AUTHENTICATING...';

  try {
    const data = await API.login(user, pass);

    if (data.success) {
      err.style.display = 'none';
      const authScreen = document.getElementById('auth-screen');
      authScreen.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => {
        authScreen.style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
      }, 380);
    }
  } catch (error) {
    err.textContent = error.message || 'Invalid username or password. Please try again.';
    err.style.display = 'block';
    err.style.animation = 'none';
    requestAnimationFrame(() => { err.style.animation = 'shake 0.4s ease'; });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-shine"></span>LOGIN TO DASHBOARD';
  }
}

function showAuthScreen() {
  API.clearToken();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('auth-screen').style.animation = '';
  document.getElementById('app-container').style.display = 'none';
}

// ═══════════════════════════════════════════
// FORGOT PASSWORD (Real SMTP Email)
// ═══════════════════════════════════════════
function openForgotPasswordModal() {
  document.getElementById('forgot-modal').classList.add('open');
  // Reset to step 1
  document.getElementById('fp-step1').style.display = 'block';
  document.getElementById('fp-step2').style.display = 'none';
  document.getElementById('fp-step3').style.display = 'none';
  document.getElementById('fp-email').value = '';
  document.getElementById('fp-error').style.display = 'none';
}

function closeForgotPasswordModal() {
  document.getElementById('forgot-modal').classList.remove('open');
}

async function sendResetEmail() {
  const email = document.getElementById('fp-email').value.trim();
  const errEl = document.getElementById('fp-error');
  const btn   = document.getElementById('fp-send-btn');

  if (!email) {
    errEl.textContent = 'Please enter your email address.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> SENDING...';

  try {
    await API.forgotPassword(email);
    // Always show success (security: don't reveal if email exists)
    document.getElementById('fp-step1').style.display = 'none';
    document.getElementById('fp-step2').style.display = 'block';
    document.getElementById('fp-sent-email').textContent = email;
  } catch (error) {
    errEl.textContent = error.message || 'Failed to send reset email. Check SMTP settings.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'SEND RESET LINK';
  }
}

// Handle reset token from URL (when user clicks the email link)
function checkResetToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('resetToken');
  if (token) {
    // Show the reset password form
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('reset-screen').style.display = 'flex';
    document.getElementById('reset-token-input').value = token;
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function submitNewPassword() {
  const token   = document.getElementById('reset-token-input').value;
  const newPass = document.getElementById('rp-new-pass').value;
  const confirm = document.getElementById('rp-confirm-pass').value;
  const errEl   = document.getElementById('rp-error');
  const btn     = document.getElementById('rp-submit-btn');

  if (newPass.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }

  if (newPass !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> RESETTING...';

  try {
    const data = await API.resetPassword(token, newPass);
    if (data.success) {
      document.getElementById('reset-screen').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      showToast('Password Reset', 'Your password has been changed. Please login.', 'success');
    }
  } catch (error) {
    errEl.textContent = error.message || 'Invalid or expired token.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'SET NEW PASSWORD';
  }
}

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
function initTheme() {
  const theme = themeStorage.getTheme();
  applyTheme(theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.checked = (theme === 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeStorage.saveTheme(theme);
  const thumb = document.querySelector('.toggle-thumb');
  if (thumb) thumb.innerHTML = theme === 'light' ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function toggleTheme() {
  const current = themeStorage.getTheme();
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast('Theme Changed', `Switched to ${next} mode`, 'info');
}

// ═══════════════════════════════════════════
// DATA LOADING (From MySQL via API)
// ═══════════════════════════════════════════
async function loadMembers() {
  try {
    const data = await API.getMembers();
    if (data.success) {
      DB = data.data;
    }
  } catch (error) {
    console.error('Failed to load members:', error);
    showToast('Error', 'Failed to load members from server.', 'danger');
  }
}

async function loadShifts() {
  try {
    const data = await API.getShifts();
    if (data.success) {
      SHIFTS = data.data;
    }
  } catch (error) {
    console.error('Failed to load shifts:', error);
    // Fallback to defaults
    SHIFTS = defaultShifts();
  }
}

function defaultShifts() {
  const base = { morning: ['06:00','10:00'], evening: ['16:00','20:00'], night: ['20:00','22:00'] };
  return {
    'POF Employee':         { ...base },
    'Son of POF Employee':  { ...base },
    'Civilian':             { ...base },
  };
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');

  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.dataset.page === name) item.classList.add('active');
    });
  }

  const renderers = {
    dashboard: renderDashboard,
    members:   renderTable,
    shifts:    renderShifts,
    reports:   () => { renderReports(); setTimeout(animateReportBars, 150); },
    about:     () => {},
  };
  if (renderers[name]) renderers[name]();
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function renderDashboard() {
  const total   = DB.length;
  const paid    = DB.filter(m => m.status === 'Paid').length;
  const pending = DB.filter(m => m.status === 'Pending').length;

  animateCount('kpi-total',   total);
  animateCount('kpi-paid',    paid);
  animateCount('kpi-pending', pending);
  animateCount('kpi-shifts',  3);
  updateSidebar();

  const recent = [...DB].reverse().slice(0, 7);
  const cont = document.getElementById('dash-recent');
  if (cont) {
    cont.innerHTML = recent.length
      ? recent.map(m => `
        <div class="recent-item" onclick="openDetail(${m.id})">
          <div class="avatar ${avClass(m.category)}">${initials(m.name)}</div>
          <div class="recent-info">
            <div class="recent-name">${m.name}</div>
            <div class="recent-meta">${m.category} · ${m.shift} Shift</div>
          </div>
          <span class="badge ${m.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.status}</span>
        </div>`).join('')
      : `<div class="empty-state"><div class="empty-state-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><p>No members yet.</p></div>`;
  }

  const shiftCont = document.getElementById('dash-shifts');
  if (shiftCont) {
    shiftCont.innerHTML = ['POF Employee','Son of POF Employee','Civilian'].map(cat => {
      const sh    = SHIFTS[cat];
      if (!sh) return '';
      const count = DB.filter(m => m.category === cat).length;
      return `<div class="shift-row">
        <div>
          <div class="shift-cat">${cat}</div>
          <div class="shift-time">${fmt12(sh.morning[0])} – ${fmt12(sh.morning[1])}</div>
        </div>
        <span class="cat-badge ${catClass(cat)}">${count} members</span>
      </div>`;
    }).join('');
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 700, startTime = performance.now();
  function update(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  }
  requestAnimationFrame(update);
}

// ═══════════════════════════════════════════
// MEMBERS TABLE
// ═══════════════════════════════════════════
function renderTable() {
  const q  = (document.getElementById('search-input')?.value || '').toLowerCase();
  const cf = document.getElementById('cat-filter')?.value    || '';
  const ff = document.getElementById('fee-filter')?.value    || '';

  let filtered = DB.filter(m => {
    const mQ = !q  || m.name.toLowerCase().includes(q) || (m.phone||'').includes(q) || (m.cnic||'').includes(q);
    const mC = !cf || m.category === cf;
    const mF = !ff || m.status   === ff;
    return mQ && mC && mF;
  });

  const tbody = document.getElementById('members-tbody');
  const empty = document.getElementById('empty-members');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map((m, i) => `
    <tr class="row-clickable" ondblclick="openDetail(${m.id})" style="animation: rowFadeIn 0.3s ease ${i * 0.03}s both">
      <td style="color:var(--text-muted); font-family:var(--font-mono); font-size:12px">${m.srNo}</td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar ${avClass(m.category)}" style="width:30px;height:30px;font-size:11px">${initials(m.name)}</div>
          <span style="font-weight:600">${m.name}</span>
        </div>
      </td>
      <td><span class="cat-badge ${catClass(m.category)}">${m.category}</span></td>
      <td style="color:var(--text-muted); font-family:var(--font-mono); font-size:12px">${m.phone||'—'}</td>
      <td style="color:var(--text-muted); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${m.address||''}">${m.address||'—'}</td>
      <td>
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); background:var(--bg-layer3); padding:3px 8px; border-radius:var(--r-sm); border:1px solid var(--border)">
          ${m.shift}
        </span>
      </td>
      <td><span class="badge ${m.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.status}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-outline btn-sm btn-icon" title="View Details"  onclick="event.stopPropagation(); openDetail(${m.id})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn btn-outline btn-sm btn-icon" title="Edit Member"   onclick="event.stopPropagation(); openEditModal(${m.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-danger  btn-sm btn-icon" title="Delete Member" onclick="event.stopPropagation(); deleteMember(${m.id})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </div>
      </td>
    </tr>`).join('');

  updateSidebar();
  updateMenuBadge();
}

// ═══════════════════════════════════════════
// ADD / EDIT MEMBER (API-Connected)
// ═══════════════════════════════════════════
function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent  = 'ADD NEW MEMBER';
  document.getElementById('save-btn').textContent     = 'SAVE MEMBER';
  clearForm();
  document.getElementById('f-joindate').value = NOW.toISOString().split('T')[0];
  openModal('add-modal');
}

function openEditModal(id) {
  const m = DB.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'EDIT MEMBER';
  document.getElementById('save-btn').textContent    = 'UPDATE MEMBER';
  document.getElementById('f-name').value     = m.name;
  document.getElementById('f-phone').value    = m.phone;
  document.getElementById('f-address').value  = m.address;
  document.getElementById('f-category').value = m.category;
  document.getElementById('f-shift').value    = m.shift;
  document.getElementById('f-fee').value      = m.fee;
  document.getElementById('f-status').value   = m.status;
  document.getElementById('f-joindate').value = m.joindate;
  document.getElementById('f-cnic').value     = m.cnic || '';
  openModal('add-modal');
}

async function saveMember() {
  const get  = id => document.getElementById(id);
  const name = get('f-name').value.trim();
  if (!name) { showToast('Validation Error', 'Please enter a member name', 'danger'); return; }

  const memberData = {
    name,
    phone:    get('f-phone').value.trim(),
    address:  get('f-address').value.trim(),
    category: get('f-category').value,
    shift:    get('f-shift').value,
    fee:      parseInt(get('f-fee').value) || 0,
    status:   get('f-status').value,
    joindate: get('f-joindate').value,
    cnic:     get('f-cnic').value.trim(),
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true;

  try {
    if (editingId) {
      // Preserve existing feeHistory
      const existing = DB.find(x => x.id === editingId);
      memberData.feeHistory = existing?.feeHistory || {};
      await API.updateMember(editingId, memberData);
      showToast('Member Updated', `${name} has been updated successfully`, 'success');
    } else {
      const feeHistory = { [CUR_YEAR]: { [CUR_MONTH]: memberData.status } };
      memberData.feeHistory = feeHistory;
      await API.createMember(memberData);
      showToast('Member Added', `${name} has been added to the system`, 'success');
    }

    // Reload data from server
    await loadMembers();
    closeModal('add-modal');
    renderTable();
    renderDashboard();
  } catch (error) {
    showToast('Error', error.message || 'Failed to save member.', 'danger');
  } finally {
    btn.disabled = false;
  }
}

async function deleteMember(id) {
  const m = DB.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Delete "${m.name}"?\n\nThis action cannot be undone.`)) return;

  try {
    await API.deleteMember(id);
    await loadMembers();
    renderTable();
    renderDashboard();
    showToast('Member Deleted', `${m.name} has been removed`, 'danger');
  } catch (error) {
    showToast('Error', error.message || 'Failed to delete member.', 'danger');
  }
}

// ═══════════════════════════════════════════
// MEMBER DETAIL MODAL
// ═══════════════════════════════════════════
function openDetail(id) {
  const m = DB.find(x => x.id === id);
  if (!m) return;
  detailId = id;

  const avCls  = avClass(m.category);
  const init   = initials(m.name);

  document.getElementById('det-avatar').className  = `detail-avatar ${avCls}`;
  document.getElementById('det-avatar').textContent = init;
  document.getElementById('det-name').textContent  = m.name;
  document.getElementById('det-meta').innerHTML    = `
    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Sr. #${m.srNo}</span>
    <span class="cat-badge ${catClass(m.category)}">${m.category}</span>
    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${m.shift} Shift</span>
    <span class="badge ${m.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.status}</span>`;

  document.getElementById('det-info-grid').innerHTML = `
    <div class="detail-field">
      <div class="detail-field-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Phone</div>
      <div class="detail-field-value font-mono">${m.phone || '—'}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="3"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="19" y2="14"/></svg> CNIC / Employee ID</div>
      <div class="detail-field-value font-mono">${m.cnic || '—'}</div>
    </div>
    <div class="detail-field" style="grid-column:1/-1">
      <div class="detail-field-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Address</div>
      <div class="detail-field-value">${m.address || '—'}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Join Date</div>
      <div class="detail-field-value">${formatDate(m.joindate)}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Monthly Fee</div>
      <div class="detail-field-value text-gold">PKR ${(m.fee || 0).toLocaleString()}</div>
    </div>`;

  const fh     = m.feeHistory || {};
  const years  = Object.keys(fh).sort((a, b) => b - a);
  let totalPaid = 0, totalPending = 0;
  years.forEach(y => Object.values(fh[y]).forEach(v => v === 'Paid' ? totalPaid++ : totalPending++));

  document.getElementById('det-fee-summary').innerHTML = `
    <div class="fee-sum-item">
      <div class="fee-sum-val" style="color:var(--success)">${totalPaid}</div>
      <div class="fee-sum-label">Months Paid</div>
    </div>
    <div class="fee-sum-item">
      <div class="fee-sum-val" style="color:var(--danger)">${totalPending}</div>
      <div class="fee-sum-label">Months Pending</div>
    </div>
    <div class="fee-sum-item">
      <div class="fee-sum-val" style="color:var(--gold)">PKR ${(totalPaid * (m.fee || 0)).toLocaleString()}</div>
      <div class="fee-sum-label">Total Collected</div>
    </div>`;

  document.getElementById('det-fee-history').innerHTML = years.map(y => {
    const months = fh[y];
    return `<div class="fee-year">
      <div class="fee-year-label">${y}</div>
      <div class="months-grid">
        ${MONTHS_SHORT.map((mn, i) => {
          if (!months.hasOwnProperty(i)) {
            return `<div class="month-box" style="opacity:0.15; cursor:default;"><div>—</div><div class="month-name">${mn}</div></div>`;
          }
          const paid = months[i] === 'Paid';
          return `<div class="month-box ${paid ? 'month-paid' : 'month-pending'}" onclick="toggleMonthFee(${id},${y},${i})" title="${paid ? 'Paid <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : 'Pending <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'} · Click to toggle">
            <div>${paid ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}</div>
            <div class="month-name">${mn}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  openModal('detail-modal');
}

async function toggleMonthFee(memberId, year, month) {
  const m = DB.find(x => x.id === memberId);
  if (!m || !m.feeHistory?.[year]) return;
  const cur = m.feeHistory[year][month];
  const next = cur === 'Paid' ? 'Pending' : 'Paid';

  try {
    await API.updateMemberFee(memberId, year, month, next);
    // Refresh local data
    await loadMembers();
    openDetail(memberId);
    showToast(
      `${MONTHS_SHORT[month]} ${year}`,
      `Fee marked as ${next}`,
      next === 'Paid' ? 'success' : 'danger'
    );
  } catch (error) {
    showToast('Error', error.message || 'Failed to update fee.', 'danger');
  }
}

async function markFeeFromDetail(status) {
  if (!detailId) return;
  try {
    await API.updateMemberFee(detailId, CUR_YEAR, CUR_MONTH, status);
    await loadMembers();
    openDetail(detailId);
    renderTable();
    renderDashboard();
    showToast('Fee Status Updated', `Current month marked as ${status}`, status === 'Paid' ? 'success' : 'danger');
  } catch (error) {
    showToast('Error', error.message || 'Failed to update fee.', 'danger');
  }
}

function editFromDetail() {
  closeModal('detail-modal');
  openEditModal(detailId);
}

// ═══════════════════════════════════════════
// SHIFTS PAGE (API-Connected)
// ═══════════════════════════════════════════
function renderShifts() {
  const cards  = document.getElementById('shift-cards');
  const cats   = ['POF Employee','Son of POF Employee','Civilian'];
  const scCls  = ['sc-pof','sc-son','sc-civ'];
  const emojis = [[`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22"/><line x1="15" y1="22" x2="15" y2="22"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="9" y2="18"/><line x1="15" y1="18" x2="15" y2="18"/></svg>`,`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="10" width="6" height="12"/><rect x="8" y="2" width="8" height="20"/><rect x="16" y="14" width="6" height="8"/></svg>`]];

  if (cards) {
    cards.innerHTML = cats.map((cat, i) => {
      const sh    = SHIFTS[cat];
      if (!sh) return '';
      const count = DB.filter(m => m.category === cat).length;
      return `<div class="shift-card ${scCls[i]}" style="animation: cardIn 0.4s ease ${i * 0.1}s both">
        <div class="shift-card-top">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px">
            <span style="font-size:22px">${emojis[i]}</span>
            <div>
              <div class="shift-cat-title">${cat}</div>
              <div class="shift-cat-sub">${count} active members</div>
            </div>
          </div>
        </div>
        <div class="shift-card-body">
          <div class="shift-slot">
            <span class="slot-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Morning</span>
            <span class="slot-time">${fmt12(sh.morning[0])} – ${fmt12(sh.morning[1])}</span>
          </div>
          <div class="shift-slot">
            <span class="slot-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Evening</span>
            <span class="slot-time">${fmt12(sh.evening[0])} – ${fmt12(sh.evening[1])}</span>
          </div>
          <div class="shift-slot">
            <span class="slot-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Night</span>
            <span class="slot-time">${fmt12(sh.night[0])} – ${fmt12(sh.night[1])}</span>
          </div>
          <button class="btn btn-outline btn-sm ${!API.isManager() ? 'restricted' : ''}" style="width:100%; margin-top:8px" onclick="${API.isManager() ? `openShiftModal('${cat}')` : ''}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Timings</button>
        </div>
      </div>`;
    }).join('');
  }

  const listCont = document.getElementById('shift-member-list');
  if (listCont) {
    listCont.innerHTML = ['Morning','Evening','Night'].map(shiftName => {
      const members = DB.filter(m => m.shift === shiftName);
      const icon    = shiftName === 'Morning' ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` : shiftName === 'Evening' ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      return `<div style="padding:12px 18px; border-bottom:1px solid var(--border)">
        <div style="font-family:var(--font-display); font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:10px; letter-spacing:1.5px; text-transform:uppercase">
          ${icon} ${shiftName} Shift
          <span style="color:var(--text-dim); font-weight:400; margin-left:6px; font-size:11px">${members.length} member${members.length !== 1 ? 's' : ''}</span>
        </div>
        ${members.length
          ? `<div style="display:flex; flex-wrap:wrap; gap:7px;">
              ${members.map(m => `
                <div onclick="openDetail(${m.id})" style="display:flex; align-items:center; gap:7px; background:var(--bg-layer3); border:1px solid var(--border); border-radius:var(--r-md); padding:6px 12px; cursor:pointer; transition:var(--ease-fast);" onmouseover="this.style.borderColor='var(--brand)'; this.style.background='var(--brand-subtle)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--bg-layer3)'">
                  <div class="avatar ${avClass(m.category)}" style="width:24px;height:24px;font-size:9px;border-radius:50%">${initials(m.name)}</div>
                  <span style="font-size:12px; font-weight:600">${m.name}</span>
                  <span class="badge ${m.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.status}</span>
                </div>`).join('')}
            </div>`
          : `<span style="font-size:12px; color:var(--text-dim)">No members assigned to this shift</span>`}
      </div>`;
    }).join('');
  }
}

function openShiftModal(cat) {
  editShiftCat = cat;
  const sh     = SHIFTS[cat];
  document.getElementById('shift-modal-title').textContent = `EDIT TIMINGS`;
  document.getElementById('shift-modal-cat').textContent   = `Category: ${cat}`;
  document.getElementById('sh-morn-start').value  = sh.morning[0];
  document.getElementById('sh-morn-end').value    = sh.morning[1];
  document.getElementById('sh-eve-start').value   = sh.evening[0];
  document.getElementById('sh-eve-end').value     = sh.evening[1];
  document.getElementById('sh-night-start').value = sh.night[0];
  document.getElementById('sh-night-end').value   = sh.night[1];
  openModal('shift-modal');
}

async function saveShift() {
  if (!editShiftCat) return;
  const timings = {
    morning: [document.getElementById('sh-morn-start').value,  document.getElementById('sh-morn-end').value],
    evening: [document.getElementById('sh-eve-start').value,   document.getElementById('sh-eve-end').value],
    night:   [document.getElementById('sh-night-start').value, document.getElementById('sh-night-end').value],
  };

  try {
    await API.updateShift(editShiftCat, timings);
    await loadShifts();
    closeModal('shift-modal');
    renderShifts();
    renderDashboard();
    showToast('Shift Updated', `${editShiftCat} timings saved`, 'success');
  } catch (error) {
    showToast('Error', error.message || 'Failed to save shift timings.', 'danger');
  }
}

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════
function renderReports() {
  const total = DB.length || 1;

  renderBarChart('chart-cat', [
    { label: 'POF Employee',  val: DB.filter(m => m.category === 'POF Employee').length,        color: 'var(--brand)' },
    { label: 'Son of POF',    val: DB.filter(m => m.category === 'Son of POF Employee').length, color: 'var(--gold)' },
    { label: 'Civilian',      val: DB.filter(m => m.category === 'Civilian').length,             color: '#fb923c' },
  ], total);

  renderBarChart('chart-fee', [
    { label: 'Paid',    val: DB.filter(m => m.status === 'Paid').length,    color: 'var(--success)' },
    { label: 'Pending', val: DB.filter(m => m.status === 'Pending').length, color: 'var(--danger)' },
  ], total);

  renderBarChart('chart-shift', [
    { label: 'Morning', val: DB.filter(m => m.shift === 'Morning').length, color: '#38bdf8' },
    { label: 'Evening', val: DB.filter(m => m.shift === 'Evening').length, color: '#fb923c' },
    { label: 'Night',   val: DB.filter(m => m.shift === 'Night').length,   color: '#a78bfa' },
  ], total);

  const pendingMembers = DB.filter(m => m.status === 'Pending');
  const pendingEl = document.getElementById('report-pending-list');
  if (pendingEl) {
    pendingEl.innerHTML = pendingMembers.length
      ? pendingMembers.map(m => `
          <div class="recent-item" onclick="openDetail(${m.id})">
            <div class="avatar ${avClass(m.category)}" style="width:30px;height:30px;font-size:11px">${initials(m.name)}</div>
            <div class="recent-info">
              <div class="recent-name">${m.name}</div>
              <div class="recent-meta">${m.category}</div>
            </div>
            <span style="font-family:var(--font-mono); font-size:12px; color:var(--danger); font-weight:700">PKR ${(m.fee||0).toLocaleString()}</span>
          </div>`).join('')
      : `<div class="empty-state" style="padding:32px;"><div class="empty-state-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><p>All fees are cleared!</p></div>`;
  }
}

function renderBarChart(containerId, data, total) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = data.map(d => `
    <div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track">
        <div class="bar-fill" data-width="${total ? Math.round(d.val / total * 100) : 0}" style="width:0%; background:${d.color}"></div>
      </div>
      <div class="bar-val" style="color:${d.color}">${d.val}</div>
    </div>`).join('');
}

function animateReportBars() {
  document.querySelectorAll('.bar-fill').forEach(bar => {
    const w = bar.dataset.width;
    requestAnimationFrame(() => { bar.style.width = w + '%'; });
  });
}

// ═══════════════════════════════════════════
// FEE ALERT TOOL
// ═══════════════════════════════════════════
function markPendingFees() {
  const pending = DB.filter(m => m.status === 'Pending');
  if (!pending.length) {
    showToast('All Clear!', 'No pending fees. Great work! <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', 'success');
    return;
  }
  showToast('Fee Alert', `${pending.length} member(s) have pending fees`, 'danger');
  const menuItems = document.querySelectorAll('.menu-item');
  let membersItem = null;
  menuItems.forEach(item => { if (item.dataset.page === 'members') membersItem = item; });
  showPage('members', membersItem);
  setTimeout(() => {
    const feeFilter = document.getElementById('fee-filter');
    if (feeFilter) { feeFilter.value = 'Pending'; renderTable(); }
  }, 200);
}

// ═══════════════════════════════════════════
// MODAL UTILITIES
// ═══════════════════════════════════════════
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-bg')) e.target.classList.remove('open');
});

// ═══════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════
function showToast(title, msg, type = 'info') {
  const t    = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const ttl  = document.getElementById('toast-title');
  const tmsg = document.getElementById('toast-msg');

  if (!t) return;

  const icons = { success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', danger: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>️', info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>️', warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' };
  icon.innerHTML = icons[type] || icons.info;
  ttl.textContent  = title;
  tmsg.textContent = msg;

  t.className = `toast toast-${type}`;
  t.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function initials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avClass(cat) {
  if (cat === 'POF Employee')       return 'av-pof';
  if (cat === 'Son of POF Employee') return 'av-son';
  return 'av-civ';
}
function catClass(cat) {
  if (cat === 'POF Employee')       return 'cat-pof';
  if (cat === 'Son of POF Employee') return 'cat-son';
  return 'cat-civ';
}
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' });
  } catch(e) { return dateStr; }
}
function clearForm() {
  ['f-name','f-phone','f-address','f-fee','f-cnic','f-joindate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cat = document.getElementById('f-category');
  const sh  = document.getElementById('f-shift');
  const st  = document.getElementById('f-status');
  if (cat) cat.value = 'POF Employee';
  if (sh)  sh.value  = 'Morning';
  if (st)  st.value  = 'Paid';
}
function updateSidebar() {
  const total   = DB.length;
  const paid    = DB.filter(m => m.status === 'Paid').length;
  const pending = DB.filter(m => m.status === 'Pending').length;

  const elTotal   = document.getElementById('sb-total');
  const elPaid    = document.getElementById('sb-paid');
  const elPending = document.getElementById('sb-pending');
  if (elTotal)   elTotal.textContent   = total;
  if (elPaid)    elPaid.textContent    = paid;
  if (elPending) elPending.textContent = pending;

  if (total > 0) {
    const paidBar    = document.getElementById('sb-paid-bar');
    const pendingBar = document.getElementById('sb-pending-bar');
    if (paidBar)    paidBar.style.width    = (paid    / total * 100) + '%';
    if (pendingBar) pendingBar.style.width = (pending / total * 100) + '%';
  }
}
function updateMenuBadge() {
  const pending = DB.filter(m => m.status === 'Pending').length;
  const badge   = document.getElementById('pending-badge');
  if (badge) {
    badge.textContent   = pending;
    badge.style.display = pending > 0 ? 'inline-flex' : 'none';
  }
}
function updateTopDate() {
  const d  = new Date();
  const el = document.getElementById('topDate');
  if (el) {
    el.textContent = d.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}

// ═══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open'));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const search = document.getElementById('search-input');
    if (search && document.getElementById('page-members')?.classList.contains('active')) {
      search.focus();
    }
  }
  if (e.key === 'Enter' && document.getElementById('add-modal')?.classList.contains('open')) {
    const focusedEl = document.activeElement;
    if (focusedEl && focusedEl.tagName !== 'BUTTON') saveMember();
  }
});

// Login enter key
document.addEventListener('DOMContentLoaded', () => {
  const loginPass = document.getElementById('login-pass');
  if (loginPass) {
    loginPass.addEventListener('keypress', e => { if (e.key === 'Enter') attemptLogin(); });
  }
  const loginUser = document.getElementById('login-user');
  if (loginUser) {
    loginUser.addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('login-pass')?.focus(); });
  }

  // Check for reset token in URL
  checkResetToken();

  // If already logged in (valid JWT), skip auth screen
  if (API.isLoggedIn()) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    initApp();
  }
});

// ═══════════════════════════════════════════
// DRAWER (MOBILE SIDEBAR)
// ═══════════════════════════════════════════
function toggleDrawer() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('drawer-open')) closeDrawer();
  else openDrawer();
}
function openDrawer() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('drawer-overlay');
  if (sidebar) sidebar.classList.add('drawer-open');
  if (overlay) { overlay.style.display = 'block'; requestAnimationFrame(() => overlay.classList.add('open')); }
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('drawer-overlay');
  if (sidebar) sidebar.classList.remove('drawer-open');
  if (overlay) { overlay.classList.remove('open'); setTimeout(() => { overlay.style.display = 'none'; }, 300); }
  document.body.style.overflow = '';
}

function setMobActive(id) {
  document.querySelectorAll('.mob-nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// Swipe to close drawer
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (dx < -60 && document.querySelector('.sidebar')?.classList.contains('drawer-open')) {
    closeDrawer();
  }
}, { passive: true });

// ═══════════════════════════════════════════
// INIT (API-Connected)
// ═══════════════════════════════════════════
async function initApp() {
  // Show loading overlay
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'flex';

  try {
    await Promise.all([loadMembers(), loadShifts()]);
  } catch (error) {
    console.error('Failed to load data:', error);
  }

  // --- ROLE LOGIC ---
  const user = API.getUser();
  if (user) {
    // Update topbar identity
    const nameEl = document.querySelector('.admin-name');
    const avEl = document.querySelector('.admin-avatar');
    if (nameEl) nameEl.textContent = 'LOGOUT';
    if (avEl) avEl.textContent = initials(user.fullName || user.username || 'User');
    
    // Create / Update Role Badge near name
    let badge = document.getElementById('topbar-role-badge');
    const adminBadgeContainer = document.querySelector('.admin-badge');
    if (!badge && adminBadgeContainer) {
      badge = document.createElement('span');
      badge.id = 'topbar-role-badge';
      adminBadgeContainer.before(badge);
    }
    if (badge) {
      badge.textContent = user.role;
      badge.className = `role-badge ${user.role}`;
    }

    // Apply UI restrictions if not manager
    const isManager = API.isManager();
    document.body.classList.toggle('role-staff', !isManager);
    
    // Hide/Restrict "Add Member" buttons for staff
    document.querySelectorAll('.btn-primary, [onclick="openAddModal()"]').forEach(el => {
      if (!el.closest('.modal')) { // Ignore inside modals
        el.classList.toggle('restricted', !isManager);
      }
    });
  }
  // ------------------

  if (loader) loader.style.display = 'none';

  updateTopDate();
  setInterval(updateTopDate, 60000);
  initTheme();
  showPage('dashboard');
  updateMenuBadge();
  console.log('%c POF GMS v3.0 ', 'background:#06b6d4;color:#fff;font-size:16px;padding:4px 12px;border-radius:4px;font-weight:bold;');
  console.log('%c Full-Stack Edition · MySQL + Express + JWT ', 'color:#f59e0b;font-size:12px;');
  console.log('%c Developed by Muhammad Ayan Khan | Software Engineer ', 'color:#94a3b8;font-size:11px;');
}

// CSS for animations (injected)
const rowStyle = document.createElement('style');
rowStyle.textContent = `
@keyframes rowFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes cardIn    { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeOut   { from { opacity:1; } to { opacity:0; } }
@keyframes spinLoader { to { transform: rotate(360deg); } }
.btn-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinLoader 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}
`;
document.head.appendChild(rowStyle);
