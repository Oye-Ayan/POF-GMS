/* ════════════════════════════════════════════════════════════════════
   POF GMS — Application Logic
   Author: Muhammad Ayan Khan | Software Engineer
   ════════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════
const CONFIG = {
  STORE_KEY:    'pof_gms_v3',
  SHIFTS_KEY:   'pof_gms_shifts_v3',
  CRED_KEY:     'pof_gms_credentials',
  THEME_KEY:    'pof_gms_theme',
  DEFAULT_USER: 'manager',
  DEFAULT_PASS: 'pofgym123',
};

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

// ═══════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════
const storage = {
  getDB:     ()  => { try { return JSON.parse(localStorage.getItem(CONFIG.STORE_KEY))  || []; } catch(e){ return []; } },
  saveDB:    (d) => localStorage.setItem(CONFIG.STORE_KEY, JSON.stringify(d)),
  getShifts: ()  => { try { return JSON.parse(localStorage.getItem(CONFIG.SHIFTS_KEY)) || defaultShifts(); } catch(e){ return defaultShifts(); } },
  saveShifts:(s) => localStorage.setItem(CONFIG.SHIFTS_KEY, JSON.stringify(s)),
  getCreds:  ()  => { try { return JSON.parse(localStorage.getItem(CONFIG.CRED_KEY)) || { user: CONFIG.DEFAULT_USER, pass: CONFIG.DEFAULT_PASS }; } catch(e){ return { user: CONFIG.DEFAULT_USER, pass: CONFIG.DEFAULT_PASS }; } },
  saveCreds: (c) => localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(c)),
  getTheme:  ()  => localStorage.getItem(CONFIG.THEME_KEY) || 'dark',
  saveTheme: (t) => localStorage.setItem(CONFIG.THEME_KEY, t),
};

function defaultShifts() {
  const base = { morning: ['06:00','10:00'], evening: ['16:00','20:00'], night: ['20:00','22:00'] };
  return {
    'POF Employee':         { ...base },
    'Son of POF Employee':  { ...base },
    'Civilian':             { ...base },
  };
}

// ═══════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════
function attemptLogin() {
  const user  = document.getElementById('login-user').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const creds = storage.getCreds();
  const err   = document.getElementById('login-error');

  if (user === creds.user && pass === creds.pass) {
    err.style.display = 'none';
    const authScreen = document.getElementById('auth-screen');
    authScreen.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => {
      authScreen.style.display = 'none';
      document.getElementById('app-container').style.display = 'flex';
      initApp();
    }, 380);
  } else {
    err.style.display = 'block';
    err.style.animation = 'none';
    requestAnimationFrame(() => { err.style.animation = 'shake 0.4s ease'; });
  }
}

function resetPassword() {
  if (confirm('Reset credentials to default?\n\nUsername: manager\nPassword: pofgym123')) {
    storage.saveCreds({ user: CONFIG.DEFAULT_USER, pass: CONFIG.DEFAULT_PASS });
    document.getElementById('login-pass').value = CONFIG.DEFAULT_PASS;
    showToast('Password Reset', 'Credentials reset to default', 'success');
  }
}

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
function initTheme() {
  const theme = storage.getTheme();
  applyTheme(theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.checked = (theme === 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  storage.saveTheme(theme);
  const thumb = document.querySelector('.toggle-thumb');
  if (thumb) thumb.textContent = theme === 'light' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = storage.getTheme();
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast('Theme Changed', `Switched to ${next} mode`, 'info');
}

// ═══════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════
function seedIfEmpty() {
  if (DB.length > 0) return;
  const samples = [
    { name:'Col. Ahmed Raza',    phone:'0300-1234567', address:'POF Colony Block A', category:'POF Employee',        shift:'Morning', fee:2000, status:'Paid',    joindate:'2023-01-15', cnic:'36302-1234567-1' },
    { name:'Lt. Haris Khan',     phone:'0312-9876543', address:'POF Quarters Gate 3',category:'POF Employee',        shift:'Evening', fee:2000, status:'Pending',  joindate:'2023-03-10', cnic:'36302-7654321-3' },
    { name:'Maj. Tariq Mirza',   phone:'0333-5678901', address:'Officers Colony C2', category:'POF Employee',        shift:'Morning', fee:2000, status:'Paid',    joindate:'2022-11-01', cnic:'36302-5678901-9' },
    { name:'Usman Ahmed',        phone:'0345-1122334', address:'Main Bazaar, Wah',   category:'Son of POF Employee', shift:'Morning', fee:1500, status:'Paid',    joindate:'2023-06-01', cnic:'36302-1122334-5' },
    { name:'Ali Hassan',         phone:'0321-5544332', address:'Taxila Road',        category:'Son of POF Employee', shift:'Night',   fee:1500, status:'Paid',    joindate:'2024-01-20', cnic:'' },
    { name:'Zaid Malik',         phone:'0317-8899001', address:'Wah Cantt Area',     category:'Son of POF Employee', shift:'Evening', fee:1500, status:'Pending', joindate:'2024-03-15', cnic:'' },
    { name:'Imran Butt',         phone:'0336-9988776', address:'Cantt Area',         category:'Civilian',            shift:'Evening', fee:3000, status:'Pending', joindate:'2024-04-05', cnic:'' },
    { name:'Bilal Malik',        phone:'0311-2233445', address:'Hasan Abdal Road',   category:'Civilian',            shift:'Morning', fee:3000, status:'Paid',    joindate:'2024-07-12', cnic:'' },
    { name:'Faisal Qureshi',     phone:'0323-6677889', address:'GTS Chowk',          category:'Civilian',            shift:'Night',   fee:3000, status:'Paid',    joindate:'2024-09-01', cnic:'' },
  ];
  DB = samples.map((s, i) => ({
    id: Date.now() + i,
    srNo: i + 1,
    ...s,
    feeHistory: buildSampleHistory(),
  }));
  storage.saveDB(DB);
}

function buildSampleHistory() {
  const h   = {};
  h[CUR_YEAR] = {};
  for (let m = 0; m <= CUR_MONTH; m++) {
    h[CUR_YEAR][m] = Math.random() > 0.25 ? 'Paid' : 'Pending';
  }
  h[CUR_YEAR - 1] = {};
  for (let m = 0; m < 12; m++) {
    h[CUR_YEAR - 1][m] = Math.random() > 0.15 ? 'Paid' : 'Pending';
  }
  return h;
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function showPage(name, el) {
  // Pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');

  // Sidebar active state
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    // Auto-activate sidebar item
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.dataset.page === name) item.classList.add('active');
    });
  }

  // Render page content
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

  // Recent members
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
      : `<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet.</p></div>`;
  }

  // Shift summary
  const shiftCont = document.getElementById('dash-shifts');
  if (shiftCont) {
    shiftCont.innerHTML = ['POF Employee','Son of POF Employee','Civilian'].map(cat => {
      const sh    = SHIFTS[cat];
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

// Animated number counter
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start    = 0;
  const duration = 700;
  const startTime = performance.now();

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
          <button class="btn btn-outline btn-sm btn-icon" title="View Details"  onclick="event.stopPropagation(); openDetail(${m.id})">👁</button>
          <button class="btn btn-outline btn-sm btn-icon" title="Edit Member"   onclick="event.stopPropagation(); openEditModal(${m.id})">✏️</button>
          <button class="btn btn-danger  btn-sm btn-icon" title="Delete Member" onclick="event.stopPropagation(); deleteMember(${m.id})">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  updateSidebar();
  updateMenuBadge();
}

// ═══════════════════════════════════════════
// ADD / EDIT MEMBER MODAL
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

function saveMember() {
  const get  = id => document.getElementById(id);
  const name = get('f-name').value.trim();
  if (!name) { showToast('Validation Error', 'Please enter a member name', 'danger'); return; }

  const data = {
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

  if (editingId) {
    const idx = DB.findIndex(x => x.id === editingId);
    DB[idx] = { ...DB[idx], ...data };
    showToast('Member Updated', `${name} has been updated successfully`, 'success');
  } else {
    const srNo = DB.length ? Math.max(...DB.map(x => x.srNo)) + 1 : 1;
    const feeHistory = { [CUR_YEAR]: { [CUR_MONTH]: data.status } };
    DB.push({ id: Date.now(), srNo, ...data, feeHistory });
    showToast('Member Added', `${name} has been added to the system`, 'success');
  }

  storage.saveDB(DB);
  closeModal('add-modal');
  renderTable();
  renderDashboard();
}

function deleteMember(id) {
  const m = DB.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Delete "${m.name}"?\n\nThis action cannot be undone.`)) return;
  DB = DB.filter(x => x.id !== id);
  // Re-number
  DB.forEach((x, i) => { x.srNo = i + 1; });
  storage.saveDB(DB);
  renderTable();
  renderDashboard();
  showToast('Member Deleted', `${m.name} has been removed`, 'danger');
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
    <span>📋 Sr. #${m.srNo}</span>
    <span class="cat-badge ${catClass(m.category)}">${m.category}</span>
    <span>🕐 ${m.shift} Shift</span>
    <span class="badge ${m.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.status}</span>`;

  document.getElementById('det-info-grid').innerHTML = `
    <div class="detail-field">
      <div class="detail-field-label">📞 Phone</div>
      <div class="detail-field-value font-mono">${m.phone || '—'}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">🪪 CNIC / Employee ID</div>
      <div class="detail-field-value font-mono">${m.cnic || '—'}</div>
    </div>
    <div class="detail-field" style="grid-column:1/-1">
      <div class="detail-field-label">📍 Address</div>
      <div class="detail-field-value">${m.address || '—'}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">📅 Join Date</div>
      <div class="detail-field-value">${formatDate(m.joindate)}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">💰 Monthly Fee</div>
      <div class="detail-field-value text-gold">PKR ${(m.fee || 0).toLocaleString()}</div>
    </div>`;

  // Fee summary
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

  // Fee History Grid
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
          return `<div class="month-box ${paid ? 'month-paid' : 'month-pending'}" onclick="toggleMonthFee(${id},${y},${i})" title="${paid ? 'Paid ✓' : 'Pending ✗'} · Click to toggle">
            <div>${paid ? '✓' : '✗'}</div>
            <div class="month-name">${mn}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  openModal('detail-modal');
}

function toggleMonthFee(memberId, year, month) {
  const m = DB.find(x => x.id === memberId);
  if (!m || !m.feeHistory?.[year]) return;
  const cur = m.feeHistory[year][month];
  const next = cur === 'Paid' ? 'Pending' : 'Paid';
  m.feeHistory[year][month] = next;
  if (year == CUR_YEAR && month == CUR_MONTH) m.status = next;
  storage.saveDB(DB);
  openDetail(memberId);
  showToast(
    `${MONTHS_SHORT[month]} ${year}`,
    `Fee marked as ${next}`,
    next === 'Paid' ? 'success' : 'danger'
  );
}

function markFeeFromDetail(status) {
  if (!detailId) return;
  const m = DB.find(x => x.id === detailId);
  if (!m) return;
  m.status = status;
  if (!m.feeHistory)           m.feeHistory = {};
  if (!m.feeHistory[CUR_YEAR]) m.feeHistory[CUR_YEAR] = {};
  m.feeHistory[CUR_YEAR][CUR_MONTH] = status;
  storage.saveDB(DB);
  openDetail(detailId);
  renderTable();
  renderDashboard();
  showToast('Fee Status Updated', `Current month marked as ${status}`, status === 'Paid' ? 'success' : 'danger');
}

function editFromDetail() {
  closeModal('detail-modal');
  openEditModal(detailId);
}

// ═══════════════════════════════════════════
// SHIFTS PAGE
// ═══════════════════════════════════════════
function renderShifts() {
  const cards  = document.getElementById('shift-cards');
  const cats   = ['POF Employee','Son of POF Employee','Civilian'];
  const scCls  = ['sc-pof','sc-son','sc-civ'];
  const emojis = ['🏛️','👨‍👦','🏙️'];

  if (cards) {
    cards.innerHTML = cats.map((cat, i) => {
      const sh    = SHIFTS[cat];
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
            <span class="slot-label">🌅 Morning</span>
            <span class="slot-time">${fmt12(sh.morning[0])} – ${fmt12(sh.morning[1])}</span>
          </div>
          <div class="shift-slot">
            <span class="slot-label">🌇 Evening</span>
            <span class="slot-time">${fmt12(sh.evening[0])} – ${fmt12(sh.evening[1])}</span>
          </div>
          <div class="shift-slot">
            <span class="slot-label">🌙 Night</span>
            <span class="slot-time">${fmt12(sh.night[0])} – ${fmt12(sh.night[1])}</span>
          </div>
          <button class="btn btn-outline btn-sm" style="width:100%; margin-top:8px" onclick="openShiftModal('${cat}')">✏️ Edit Timings</button>
        </div>
      </div>`;
    }).join('');
  }

  const listCont = document.getElementById('shift-member-list');
  if (listCont) {
    listCont.innerHTML = ['Morning','Evening','Night'].map(shiftName => {
      const members = DB.filter(m => m.shift === shiftName);
      const icon    = shiftName === 'Morning' ? '🌅' : shiftName === 'Evening' ? '🌇' : '🌙';
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

function saveShift() {
  if (!editShiftCat) return;
  SHIFTS[editShiftCat] = {
    morning: [document.getElementById('sh-morn-start').value,  document.getElementById('sh-morn-end').value],
    evening: [document.getElementById('sh-eve-start').value,   document.getElementById('sh-eve-end').value],
    night:   [document.getElementById('sh-night-start').value, document.getElementById('sh-night-end').value],
  };
  storage.saveShifts(SHIFTS);
  closeModal('shift-modal');
  renderShifts();
  renderDashboard();
  showToast('Shift Updated', `${editShiftCat} timings saved`, 'success');
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
      : `<div class="empty-state" style="padding:32px;"><div class="empty-state-icon">🎉</div><p>All fees are cleared!</p></div>`;
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
    showToast('All Clear!', 'No pending fees. Great work! 🎉', 'success');
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

// Close modals on backdrop click
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

  const icons = { success: '✅', danger: '⚠️', info: 'ℹ️', warning: '🔔' };
  icon.textContent = icons[type] || icons.info;
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

  // Update mini progress bars
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
});

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
function initApp() {
  DB     = storage.getDB();
  SHIFTS = storage.getShifts();
  seedIfEmpty();
  updateTopDate();
  setInterval(updateTopDate, 60000);
  initTheme();
  showPage('dashboard');
  updateMenuBadge();
  console.log('%c POF GMS v2.0 ', 'background:#06b6d4;color:#fff;font-size:16px;padding:4px 12px;border-radius:4px;font-weight:bold;');
  console.log('%c Developed by Muhammad Ayan Khan | Software Engineer ', 'color:#f59e0b;font-size:12px;');
}

// CSS for row animation (injected)
const rowStyle = document.createElement('style');
rowStyle.textContent = `
@keyframes rowFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes cardIn    { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeOut   { from { opacity:1; } to { opacity:0; } }
`;
document.head.appendChild(rowStyle);
