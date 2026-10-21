// Dashboard KPI Component
import { apiRequest } from '../api.js';
import { openScheduleFollowupModal } from './followup_flow.js';

export async function renderDashboard(container, callbacks) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">Clinical Overview Dashboard</h1>
        <p style="font-size: 13px; color: var(--text-secondary);">Enterprise Patient Case Undertaking & Clinical Decision Support System</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-outline" id="btn-quick-pharmacies">
          📍 Nearby Medical Stores
        </button>
        <button class="btn btn-primary" id="btn-register-patient-top">
          + New Patient Undertaking
        </button>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div class="kpi-grid">
      <div class="kpi-card teal">
        <div class="kpi-info">
          <h4>Total Patients</h4>
          <div class="kpi-value" id="kpi-total-patients">--</div>
        </div>
        <div class="kpi-icon-bubble">👥</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-info">
          <h4>Active Cases</h4>
          <div class="kpi-value" id="kpi-active-cases">--</div>
        </div>
        <div class="kpi-icon-bubble">📋</div>
      </div>
      <div class="kpi-card amber" style="cursor:pointer;" title="Click to view Follow-up Intelligence" id="kpi-card-appts">
        <div class="kpi-info">
          <h4>Today's Appointments</h4>
          <div class="kpi-value" id="kpi-today-appts">--</div>
        </div>
        <div class="kpi-icon-bubble">📅</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-info">
          <h4>Analyzed Reports</h4>
          <div class="kpi-value" id="kpi-total-reports">--</div>
        </div>
        <div class="kpi-icon-bubble">🧪</div>
      </div>
      <div class="kpi-card red" style="cursor:pointer;" title="Click to view Follow-up Intelligence" id="kpi-card-followups">
        <div class="kpi-info">
          <h4>Follow-ups Due / Escalated</h4>
          <div class="kpi-value" id="kpi-followups-due">--</div>
        </div>
        <div class="kpi-icon-bubble">🚨</div>
      </div>
    </div>

    <!-- Quick Standout Clinical Tools Bar -->
    <div class="card" style="padding: 18px 24px; background: linear-gradient(135deg, #0B1F33, #087E8B); color: #fff; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div>
          <span class="badge" style="background: rgba(56, 178, 172, 0.3); color: #38B2AC; margin-bottom: 6px;">🚀 STANDOUT CLINICAL SUITE</span>
          <h3 style="font-size: 17px; font-weight: 700; color: #fff;">Rapid Doctor Intelligence & Care Tools</h3>
          <p style="font-size: 12px; color: #BCCCDC; margin-top: 2px;">Voice-to-case, 30-sec handover, report understanding, emergency QR & low-internet sync</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-sm" style="background: #FFF; color: #087E8B; font-weight: 700;" id="btn-quick-schedule-dash">
            📅 Schedule Follow-up
          </button>
          <button class="btn btn-sm" style="background: #38B2AC; color: #0B1F33; font-weight: 700;" id="btn-quick-voice">
            🎙️ Voice-to-Case
          </button>
          <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff;" id="btn-quick-handover">
            ⭐ 30s Doctor Handover
          </button>
          <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff;" id="btn-quick-analyzer">
            📄 Upload & Understand Report
          </button>
          <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff;" id="btn-quick-emergency-qr">
            📱 Emergency QR
          </button>
        </div>
      </div>
    </div>

    <!-- Active Undertakings & Patient Cases List -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span>📋</span> Active Patient Undertaking Cases
        </div>
        <span class="badge badge-info" id="active-cases-badge">Loading cases...</span>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Patient</th>
              <th>Age/Gender</th>
              <th>Diagnosis / Undertaking</th>
              <th>Blood Group</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="dashboard-cases-tbody">
            <tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Loading patient records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach quick action listeners
  document.getElementById('btn-quick-schedule-dash')?.addEventListener('click', () => {
    openScheduleFollowupModal(null, null, () => renderDashboard(container, callbacks));
  });
  document.getElementById('btn-register-patient-top')?.addEventListener('click', () => callbacks.onOpenRegister());
  document.getElementById('btn-quick-pharmacies')?.addEventListener('click', () => callbacks.onOpenPharmacies());
  document.getElementById('kpi-card-appts')?.addEventListener('click', () => callbacks.onOpenAppointments && callbacks.onOpenAppointments());
  document.getElementById('kpi-card-followups')?.addEventListener('click', () => callbacks.onOpenAppointments && callbacks.onOpenAppointments());
  // Fetch KPI data
  let topCaseId = null;
  let topPatientId = null;

  document.getElementById('btn-quick-handover')?.addEventListener('click', () => callbacks.onOpenHandover(topCaseId));
  document.getElementById('btn-quick-analyzer')?.addEventListener('click', () => callbacks.onOpenAnalyzer(topPatientId, topCaseId));
  document.getElementById('btn-quick-emergency-qr')?.addEventListener('click', () => callbacks.onOpenEmergencyQR(topPatientId));
  try {
    const stats = await apiRequest('/api/dashboard/stats');
    document.getElementById('kpi-total-patients').textContent = stats.total_patients || 0;
    document.getElementById('kpi-active-cases').textContent = stats.active_cases || 0;
    document.getElementById('kpi-today-appts').textContent = stats.today_appointments || 0;
    document.getElementById('kpi-total-reports').textContent = stats.total_reports || 0;
    document.getElementById('kpi-followups-due').textContent = stats.followups_due || 0;
  } catch (e) {
    console.warn("Failed to load dashboard stats", e);
  }

  // Fetch Cases
  try {
    const cases = await apiRequest('/api/cases');
    if (cases && cases.length > 0) {
      topCaseId = cases[0].case_id;
      topPatientId = cases[0].patient_id;
    }
    const tbody = document.getElementById('dashboard-cases-tbody');
    document.getElementById('active-cases-badge').textContent = `${cases.length} Total Undertakings`;

    if (!cases || cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No patient cases registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = cases.map(c => `
      <tr>
        <td><strong>${c.case_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${c.patient_name}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${c.patient_id}</div>
        </td>
        <td>${c.age} / ${c.gender}</td>
        <td>
          <div style="font-weight: 600; color: var(--primary);">${c.diagnosis}</div>
          <div style="font-size: 12px; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.chief_complaint}</div>
        </td>
        <td><span class="badge badge-info">${c.blood_group || 'O+'}</span></td>
        <td>
          <span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm view-case-btn" data-caseid="${c.case_id}">
            Open Case File
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.view-case-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const caseId = btn.getAttribute('data-caseid');
        callbacks.onOpenCase(caseId);
      });
    });
  } catch (err) {
    console.warn("Error fetching cases", err);
  }
}
