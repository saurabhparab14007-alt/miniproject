// Sanjeevani Full-Stack Application Orchestrator
import { apiRequest, setSimulatedOffline, isAppOnline, triggerSync } from './api.js';
import { initOfflineDB, getPendingSyncCount, cacheData } from './offline_store.js';
import { renderDashboard } from './components/dashboard.js';
import { openPatientRegistrationModal } from './components/patient_reg.js';
import { renderCaseFile } from './components/case_file.js';
import { openVoiceToCaseModal, openDoctorHandoverModal, openAskPatientCaseModal, openFhirTransferModal } from './components/ai_tools.js';
import { openReportAnalyzerModal } from './components/report_analyzer.js';
import { openEmergencyQRModal } from './components/emergency_qr.js';
import { renderMedicationSchedule } from './components/med_schedule.js';
import { renderFollowupIntelligence } from './components/followup_flow.js';
import { openMultilingualTranslatorModal, TRANSLATIONS } from './components/multilingual.js';
import { renderPharmaciesLocator } from './components/pharmacies.js';
import { openDoctorSignupModal } from './components/doctor_signup.js';

// Application State
const state = {
  currentView: 'dashboard',
  selectedCaseId: 'CASE-2026-501',
  selectedPatientId: 'PAT-2026-1001',
  currentRole: 'doctor',
  isOfflineSimulated: false,
  pendingSyncCount: 0,
  currentUser: {
    name: 'Dr. Rajesh Kulkarni, MD',
    role: 'doctor',
    verified: true,
    regNumber: 'NMC/MCI-84920/2012',
    aadhaarMasked: 'XXXX-XXXX-4819'
  }
};

const viewport = document.getElementById('main-content-viewport');

// Initialize Application
async function initApp() {
  try {
    await initOfflineDB();
  } catch (e) {
    console.warn("IndexedDB init note:", e);
  }

  // Pre-seed offline cache with initial records if online
  if (navigator.onLine && !state.isOfflineSimulated) {
    try {
      const [patients, cases] = await Promise.all([
        apiRequest('/api/patients').catch(() => []),
        apiRequest('/api/cases').catch(() => [])
      ]);
      if (patients.length) {
        cacheData('patients', patients).catch(() => {});
        state.selectedPatientId = patients[0].patient_id;
      }
      if (cases.length) {
        cacheData('cases', cases).catch(() => {});
        state.selectedCaseId = cases[0].case_id;
      }
    } catch (e) {}
  }

  setupUserProfile();
  setupNavigation();
  setupRoleSwitcher();
  setupGlobalSearch();
  setupOfflineModeControls();
  setupQuickNavButtons();
  updateSyncBadge();

  // Render initial dashboard
  navigateTo('dashboard');
}

function setupUserProfile() {
  const savedUser = localStorage.getItem('sanjeevani_user');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      state.currentUser = {
        name: u.full_name || u.username,
        role: u.role || 'doctor',
        verified: u.is_verified || true,
        regNumber: u.registration_number || 'NMC Verified',
        aadhaarMasked: u.aadhaar_masked || 'XXXX-XXXX-4819'
      };

      const nameEl = document.querySelector('.user-meta-name');
      if (nameEl) nameEl.textContent = state.currentUser.name;

      const badgeEl = document.querySelector('.user-meta-badge');
      if (badgeEl) badgeEl.textContent = state.currentUser.verified ? `✓ ${state.currentUser.regNumber}` : 'Clinical Staff';

      const avatarEl = document.querySelector('.user-avatar');
      if (avatarEl) {
        const initials = state.currentUser.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials || 'DR';
      }
    } catch (e) {
      console.warn("Could not parse saved user:", e);
    }
  }

  // Sign out button
  const signoutBtn = document.getElementById('btn-doctor-signout');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('sanjeevani_token');
      localStorage.removeItem('sanjeevani_user');
      window.location.href = '/login?msg=logged_out';
    });
  }
}

// Navigation Router
function navigateTo(view, params = {}) {
  state.currentView = view;
  if (params.caseId) state.selectedCaseId = params.caseId;
  if (params.patientId) state.selectedPatientId = params.patientId;

  // Update active sidebar link
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update active mobile bottom nav link
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    if (item.getAttribute('data-bottom-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render view
  renderCurrentView();
}

function renderCurrentView() {
  if (!viewport) return;
  viewport.innerHTML = '';

  // Render Offline banner if low-internet / offline mode active
  if (!isAppOnline() || state.isOfflineSimulated) {
    const offlineBanner = document.createElement('div');
    offlineBanner.className = 'offline-banner';
    offlineBanner.style.cssText = 'background:#FFF8E1; border:1.5px solid #FFE082; color:#795548; padding:12px 18px; border-radius:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-size:13px;';
    offlineBanner.innerHTML = `
      <div>
        <strong>📴 Low-Internet / Rural Offline Mode Active:</strong>
        All clinical undertakings, voice dictations, and reports are persisted safely in your local encrypted IndexedDB vault.
        <span class="badge" style="background:#FFE082; color:#5D4037; font-size:11px; margin-left:8px;">IndexedDB Vault Active</span>
      </div>
      <button class="btn btn-sm btn-outline" id="btn-sync-now-banner" style="background:#fff; color:#795548; font-weight:700; border-color:#BCAAA4;">
        🔄 Sync Pending Records (${state.pendingSyncCount || 0})
      </button>
    `;
    viewport.appendChild(offlineBanner);

    offlineBanner.querySelector('#btn-sync-now-banner').onclick = async () => {
      setSimulatedOffline(false);
      state.isOfflineSimulated = false;
      updateOfflineUI(true);
      const res = await triggerSync();
      alert(`✓ Synchronized ${res.synced || 0} offline clinical changes to hospital server!`);
      await updateSyncBadge();
      renderCurrentView();
    };
  }

  const container = document.createElement('div');
  viewport.appendChild(container);

  const callbacks = {
    onOpenRegister: () => openPatientRegistrationModal((newPatId, newCaseId) => {
      if (newCaseId) {
        state.selectedCaseId = newCaseId;
        state.selectedPatientId = newPatId;
        navigateTo('case-detail', { caseId: newCaseId, patientId: newPatId });
      } else {
        navigateTo('cases');
      }
    }),
    onOpenCase: (caseId) => {
      state.selectedCaseId = caseId;
      navigateTo('case-detail', { caseId });
    },
    onOpenEmergencyQR: (patientId) => openEmergencyQRModal(patientId || state.selectedPatientId),
    onOpenHandover: (caseId) => openDoctorHandoverModal(caseId || state.selectedCaseId),
    onOpenAskCase: (patId, caseId) => openAskPatientCaseModal(patId || state.selectedPatientId, caseId || state.selectedCaseId),
    onExportFHIR: (caseId) => openFhirTransferModal(caseId || state.selectedCaseId),
    onOpenAnalyzer: (patId, caseId) => openReportAnalyzerModal(patId || state.selectedPatientId, caseId || state.selectedCaseId, () => renderCurrentView()),
    onOpenVoice: (onParsed) => openVoiceToCaseModal(onParsed),
    onOpenPharmacies: () => navigateTo('pharmacies'),
    onOpenAppointments: () => navigateTo('appointments'),
    onRenderMedSchedule: (root, rxText) => renderMedicationSchedule(root, rxText),
    onRenderAudit: (root, patId, cId) => renderAuditTrail(root, patId, cId)
  };

  switch (state.currentView) {
    case 'dashboard':
      renderDashboard(container, callbacks);
      break;
    case 'cases':
      renderPatientsAndCasesList(container, callbacks);
      break;
    case 'case-detail':
      renderCaseFile(container, state.selectedCaseId, callbacks);
      break;
    case 'appointments':
      renderFollowupIntelligence(container, callbacks);
      break;
    case 'pharmacies':
      renderPharmaciesLocator(container);
      break;
    case 'audit':
      renderAuditManagement(container);
      break;
    default:
      renderDashboard(container, callbacks);
  }
}

// Render Patients & Active Cases Registry View
async function renderPatientsAndCasesList(container, callbacks) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main);">📋 Patient Cases & Clinical Undertakings</h1>
        <p style="font-size: 13px; color: var(--text-secondary);">Comprehensive patient lifecycle repository with DPDP-compliant consent tracking</p>
      </div>
      <button class="btn btn-primary" id="btn-new-patient-registry">
        <span>✚</span> New Patient Undertaking
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">All Registered Patients</div>
        <span class="badge badge-info" id="patients-count-badge">Loading...</span>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name / DOB</th>
              <th>Age / Gender</th>
              <th>Phone</th>
              <th>Emergency Contact</th>
              <th>Blood Group</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="patients-list-tbody">
            <tr><td colspan="7" style="text-align: center;">Loading records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-patient-registry').onclick = () => callbacks.onOpenRegister();

  try {
    const patients = await apiRequest('/api/patients');
    const tbody = container.querySelector('#patients-list-tbody');
    const badge = container.querySelector('#patients-count-badge');
    badge.textContent = `${patients.length} Registered Patients`;

    if (!patients.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No patients registered.</td></tr>';
      return;
    }

    tbody.innerHTML = patients.map(p => `
      <tr>
        <td><strong>${p.patient_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${p.name}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">DOB: ${p.dob}</div>
        </td>
        <td>${p.age} Y / ${p.gender}</td>
        <td>${p.phone}</td>
        <td>${p.emergency_contact}</td>
        <td><span class="badge" style="background:var(--danger-bg); color:var(--danger);">${p.blood_group}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary btn-sm open-pat-case-btn" data-patientid="${p.patient_id}">
              Open Case File
            </button>
            <button class="btn btn-outline btn-sm open-pat-qr-btn" data-patientid="${p.patient_id}">
              QR Card
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.open-pat-case-btn').forEach(btn => {
      btn.onclick = async () => {
        const patId = btn.getAttribute('data-patientid');
        try {
          const patData = await apiRequest(`/api/patients/${patId}`);
          if (patData.cases && patData.cases.length > 0) {
            callbacks.onOpenCase(patData.cases[0].case_id);
          } else {
            alert("No active case yet for this patient. Click 'New Patient Undertaking' to initiate.");
          }
        } catch (e) {
          callbacks.onOpenCase('CASE-2026-501');
        }
      };
    });

    tbody.querySelectorAll('.open-pat-qr-btn').forEach(btn => {
      btn.onclick = () => callbacks.onOpenEmergencyQR(btn.getAttribute('data-patientid'));
    });
  } catch (e) {
    console.warn("Failed to load patients", e);
  }
}

// Render Audit Trail inside Case File
async function renderAuditTrail(root, patientId, caseId) {
  try {
    const [logs, consents] = await Promise.all([
      apiRequest('/api/audit/logs').catch(() => []),
      apiRequest(`/api/audit/consents/${patientId}`).catch(() => [])
    ]);

    root.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 14px; font-weight:700; margin-bottom: 12px; color: var(--text-main);">
          📜 DPDP Act 2023 Purpose-Specific Consent Directives
        </h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          ${(consents || []).map(c => `
            <div style="background: #FFFFFF; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span style="font-weight:700; font-size:13px;">${c.consent_type}</span>
                <span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-danger'}">${c.status}</span>
              </div>
              <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">${c.purpose}</p>
              <button class="btn btn-outline btn-sm toggle-consent-btn" data-id="${c.id}" data-current="${c.status}">
                ${c.status === 'Active' ? 'Revoke Consent' : 'Re-grant Consent'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-size: 14px; font-weight:700; margin-bottom: 12px; color: var(--text-main);">
          🔒 Immutable Clinical Access Trail (Audit Log)
        </h4>
        <div style="max-height: 260px; overflow-y:auto; border: 1px solid var(--border); border-radius: var(--radius-sm);">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${(logs || []).slice(0, 15).map(l => `
                <tr>
                  <td style="font-size:11px;">${l.timestamp}</td>
                  <td><strong>${l.username}</strong> (${l.role})</td>
                  <td><span class="badge badge-info">${l.action}</span></td>
                  <td>${l.resource}</td>
                  <td style="font-size:12px;">${l.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    root.querySelectorAll('.toggle-consent-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const current = btn.getAttribute('data-current');
        const nextStatus = current === 'Active' ? 'Revoked' : 'Active';
        await apiRequest('/api/audit/consents/toggle', 'POST', { consent_id: id, status: nextStatus });
        renderAuditTrail(root, patientId, caseId);
      };
    });

  } catch (e) {
    root.innerHTML = `<div style="color:var(--danger);">Failed to load audit logs: ${e.message}</div>`;
  }
}

// Standalone Audit & Compliance Management View
async function renderAuditManagement(container) {
  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-size:22px; font-weight:800; color:var(--text-main);">🔒 Security, Privacy & Indian Health-Data Compliance</h1>
      <p style="font-size:13px; color:var(--text-secondary);">
        Digital Personal Data Protection (DPDP) Act 2023 & Ayushman Bharat Digital Mission (ABDM) Auditing
      </p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card teal">
        <div class="kpi-info">
          <h4>Encryption Standard</h4>
          <div class="kpi-value">AES-256</div>
        </div>
        <div class="kpi-icon-bubble">🔐</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-info">
          <h4>Aadhaar Storage</h4>
          <div class="kpi-value">UIDAI Masked</div>
        </div>
        <div class="kpi-icon-bubble">🆔</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-info">
          <h4>ABDM Consent Status</h4>
          <div class="kpi-value">100% Granted</div>
        </div>
        <div class="kpi-icon-bubble">📜</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-info">
          <h4>Audit Trail Logs</h4>
          <div class="kpi-value" id="kpi-total-audit-count">--</div>
        </div>
        <div class="kpi-icon-bubble">⚖️</div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <div class="card-header">
        <div class="card-title">Complete Immutable System Audit Log</div>
      </div>
      <div id="full-audit-table-wrapper" style="max-height: 400px; overflow-y:auto;">Loading logs...</div>
    </div>
  `;

  try {
    const logs = await apiRequest('/api/audit/logs');
    container.querySelector('#kpi-total-audit-count').textContent = logs.length;
    container.querySelector('#full-audit-table-wrapper').innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Username</th>
            <th>Role</th>
            <th>Action</th>
            <th>Resource Type</th>
            <th>Resource ID</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td>#${l.id}</td>
              <td style="font-size:11px;">${l.timestamp}</td>
              <td><strong>${l.username}</strong></td>
              <td><span class="badge badge-info">${l.role}</span></td>
              <td><strong>${l.action}</strong></td>
              <td>${l.resource_type || 'System'}</td>
              <td>${l.resource_id || '-'}</td>
              <td style="font-size:12px;">${l.details}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    container.querySelector('#full-audit-table-wrapper').innerHTML = `<p style="color:var(--danger);">${e.message}</p>`;
  }
}

// Navigation Wiring with Mobile Drawer & Bottom Bar Support
function setupNavigation() {
  const sidebar = document.getElementById('doctor-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const closeBtn = document.getElementById('btn-close-sidebar');

  const openMobileSidebar = () => {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  };

  const closeMobileSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  };

  // Sidebar Links
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      navigateTo(view);
      closeMobileSidebar();
    });
  });

  // Mobile Hamburger Toggle
  if (toggleBtn) toggleBtn.addEventListener('click', openMobileSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);
  if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

  // Mobile Bottom Nav Bar
  document.querySelectorAll('.bottom-nav-item[data-bottom-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-bottom-view');
      navigateTo(view);
      closeMobileSidebar();
    });
  });

  const bottomVoiceBtn = document.getElementById('bottom-btn-voice');
  if (bottomVoiceBtn) {
    bottomVoiceBtn.addEventListener('click', () => {
      openVoiceToCaseModal();
      closeMobileSidebar();
    });
  }

  const bottomMenuBtn = document.getElementById('bottom-btn-menu');
  if (bottomMenuBtn) {
    bottomMenuBtn.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }
}

// Role Switcher (safe null guard)
function setupRoleSwitcher() {
  const roleSelect = document.getElementById('global-role-select') || document.getElementById('topbar-role-select');
  if (!roleSelect) return;

  const avatar = document.getElementById('topbar-user-avatar');
  const userName = document.getElementById('topbar-user-name');
  const verifiedBadge = document.getElementById('topbar-user-verified');

  roleSelect.value = state.currentRole;

  roleSelect.addEventListener('change', () => {
    state.currentRole = roleSelect.value;
    if (avatar && userName && verifiedBadge) {
      if (state.currentRole === 'doctor') {
        avatar.textContent = 'DR';
        userName.textContent = 'Dr. Rajesh Kulkarni, MD';
        verifiedBadge.textContent = '✓ NMC Verified (Aadhaar Linked)';
      }
    }
    renderCurrentView();
  });
}

// Global Instant Search
function setupGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (q.length > 1) {
      if (state.currentView !== 'cases') {
        navigateTo('cases');
      }
      try {
        const results = await apiRequest(`/api/patients?search=${encodeURIComponent(q)}`);
        const tbody = document.getElementById('patients-list-tbody');
        if (tbody) {
          if (!results.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No patient records matched "${q}".</td></tr>`;
          } else {
            tbody.innerHTML = results.map(p => `
              <tr style="background: rgba(8,126,139,0.04);">
                <td><strong>${p.patient_id}</strong></td>
                <td><strong style="color:var(--primary);">${p.name}</strong><br><small>${p.dob}</small></td>
                <td>${p.age} Y / ${p.gender}</td>
                <td>${p.phone}</td>
                <td>${p.emergency_contact}</td>
                <td><span class="badge" style="background:var(--danger-bg); color:var(--danger);">${p.blood_group}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm search-select-pat" data-id="${p.patient_id}">Select Case</button>
                </td>
              </tr>
            `).join('');

            tbody.querySelectorAll('.search-select-pat').forEach(btn => {
              btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                const full = await apiRequest(`/api/patients/${id}`);
                if (full.cases && full.cases.length) {
                  navigateTo('case-detail', { caseId: full.cases[0].case_id });
                }
              };
            });
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  });
}

// Low-Internet Rural Offline Mode Controls & Auto-Sync
function setupOfflineModeControls() {
  const toggleBtn = document.getElementById('btn-toggle-offline-mode');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    state.isOfflineSimulated = !state.isOfflineSimulated;
    setSimulatedOffline(state.isOfflineSimulated);
    updateOfflineUI(!state.isOfflineSimulated);
    renderCurrentView();
  });

  window.addEventListener('offline', () => updateOfflineUI(false));
  window.addEventListener('network-status-changed', (e) => {
    updateOfflineUI(e.detail.isOnline);
    updateSyncBadge();
  });
  window.addEventListener('online', async () => {
    updateOfflineUI(!state.isOfflineSimulated);
    // Automatic background synchronization on internet return
    try {
      const res = await triggerSync();
      if (res && res.synced > 0) {
        console.log(`✓ Auto-synchronized ${res.synced} offline mutations to server!`);
      }
    } catch(e) {}
    await updateSyncBadge();
    renderCurrentView();
  });

  window.addEventListener('offline-mutation-queued', async () => {
    await updateSyncBadge();
    renderCurrentView();
  });
}

function updateOfflineUI(isOnline) {
  const badge = document.getElementById('sidebar-net-badge');
  const dot = document.getElementById('sidebar-status-dot');
  const netText = document.getElementById('sidebar-net-text');
  const toggleBtn = document.getElementById('btn-toggle-offline-mode');

  // Topbar Connection Pill
  const topPill = document.getElementById('topbar-connection-indicator');
  const topDot = document.getElementById('topbar-status-dot');
  const topTxt = document.getElementById('topbar-status-txt');

  if (isOnline) {
    if (badge) badge.className = 'network-status-badge online';
    if (dot) dot.className = 'status-dot online';
    if (netText) netText.textContent = 'Online (Connected)';
    if (toggleBtn) {
      toggleBtn.textContent = '📴 Simulate Rural Offline Mode';
      toggleBtn.style.color = '#BCCCDC';
    }
    if (topPill) topPill.className = 'rural-network-indicator online';
    if (topDot) topDot.className = 'status-dot online';
    if (topTxt) topTxt.textContent = 'Online';
  } else {
    if (badge) badge.className = 'network-status-badge offline';
    if (dot) dot.className = 'status-dot offline';
    if (netText) netText.textContent = 'Low-Internet (Offline Vault)';
    if (toggleBtn) {
      toggleBtn.textContent = '🌐 Restore Online Connection';
      toggleBtn.style.color = '#FFD54F';
    }
    if (topPill) topPill.className = 'rural-network-indicator offline';
    if (topDot) topDot.className = 'status-dot offline';
    if (topTxt) topTxt.textContent = 'Rural Offline Vault Active';
  }
}

async function updateSyncBadge() {
  try {
    state.pendingSyncCount = await getPendingSyncCount();
  } catch (e) {
    state.pendingSyncCount = 0;
  }
}

// Quick Navigation Buttons in Sidebar & Topbar
function setupQuickNavButtons() {
  document.getElementById('btn-open-doctor-signup')?.addEventListener('click', () => {
    openDoctorSignupModal((user) => {
      alert(`Doctor registration verified for ${user.full_name} (${user.registration_number})!`);
      const nameEl = document.getElementById('topbar-user-name');
      if (nameEl) nameEl.textContent = user.full_name;
    });
  });

  // DOCTOR VOICE-TO-CASE
  document.getElementById('nav-btn-voice')?.addEventListener('click', () => {
    openVoiceToCaseModal((parsed) => {
      // If currently on case-detail view, populate fields
      const cc = document.querySelector('#edit-chief-complaint');
      if (cc && parsed.chief_complaint) cc.value = parsed.chief_complaint;
      const sym = document.querySelector('#edit-symptoms');
      if (sym && parsed.symptoms) sym.value = parsed.symptoms;
      const hist = document.querySelector('#edit-history');
      if (hist && parsed.medical_history) hist.value = parsed.medical_history;
      const diag = document.querySelector('#edit-diagnosis');
      if (diag && parsed.diagnosis) diag.value = parsed.diagnosis;
      const rx = document.querySelector('#edit-treatment-plan');
      if (rx && parsed.treatment_plan) rx.value = parsed.treatment_plan;

      if (!cc) {
        if (confirm(`✓ Voice Dictation Parsed!\nDiagnosis: ${parsed.diagnosis}\nTreatment: ${parsed.treatment_plan}\n\nWould you like to open the case undertaking file now?`)) {
          navigateTo('case-detail', { caseId: state.selectedCaseId });
        }
      }
    });
  });

  // REPORT OCR ANALYZER
  document.getElementById('nav-btn-analyzer')?.addEventListener('click', () => {
    openReportAnalyzerModal(state.selectedPatientId, state.selectedCaseId, () => renderCurrentView());
  });

  document.getElementById('nav-btn-multilingual')?.addEventListener('click', () => {
    openMultilingualTranslatorModal();
  });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', initApp);
