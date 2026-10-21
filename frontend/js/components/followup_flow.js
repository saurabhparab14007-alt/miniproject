// Follow-up Intelligence Workflow Component
import { apiRequest } from '../api.js';

export async function renderFollowupIntelligence(container, callbacks) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
      <div>
        <h1 style="font-size:22px; font-weight:800; color:var(--text-main); margin:0;">🔄 Follow-up Intelligence & Care Continuity</h1>
        <p style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
          Automated clinical return tracking: Treatment Started → Due → Missed → Reminder → Staff Escalation
        </p>
      </div>
      <button class="btn btn-primary" id="btn-book-followup" style="padding:10px 18px; font-weight:700; font-size:13.5px; background:var(--primary);">
        📅 + Schedule New Follow-up
      </button>
    </div>

    <!-- Visual Follow-up Funnel Stages -->
    <div class="card" style="margin-bottom: 24px; padding: 20px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:14px; letter-spacing:0.5px;">
        Care Continuity Lifecycle Pipeline
      </h3>
      <div style="display: flex; align-items: center; justify-content: space-between; position: relative; flex-wrap: wrap; gap: 10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge badge-info" style="padding:6px 12px; font-size:12px;">1. Treatment Started</span>
          <span style="color:#BCCCDC;">→</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge badge-warning" style="padding:6px 12px; font-size:12px;">2. Follow-up Due</span>
          <span style="color:#BCCCDC;">→</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge badge-danger" style="padding:6px 12px; font-size:12px;">3. Missed Appointment</span>
          <span style="color:#BCCCDC;">→</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge" style="background:#FFF9C4; color:#B78103; padding:6px 12px; font-size:12px;">4. Reminder Triggered</span>
          <span style="color:#BCCCDC;">→</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge badge-danger" style="padding:6px 12px; font-size:12px;">5. Flag for Staff</span>
          <span style="color:#BCCCDC;">→</span>
        </div>
        <div>
          <span class="badge badge-success" style="padding:6px 12px; font-size:12px;">6. Attended & Resolved</span>
        </div>
      </div>
    </div>

    <!-- Active Follow-up Appointments Table -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Tracked Follow-up Appointments</div>
        <span class="badge badge-info" id="appointments-count-badge">Loading...</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date & Time</th>
              <th>Reason for Visit</th>
              <th>Current Stage</th>
              <th>Automated Actions</th>
            </tr>
          </thead>
          <tbody id="followup-table-body">
            <tr><td colspan="6" style="text-align:center;">Loading follow-up records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach "+ Schedule New Follow-up" button listener
  container.querySelector('#btn-book-followup')?.addEventListener('click', () => {
    openScheduleFollowupModal(null, null, () => renderFollowupIntelligence(container, callbacks));
  });

  // Fetch appointments
  try {
    const list = await apiRequest('/api/appointments');
    const tbody = container.querySelector('#followup-table-body');
    const badge = container.querySelector('#appointments-count-badge');
    if (badge) badge.textContent = `${list.length} Appointments`;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-secondary);">No appointments scheduled yet. Click "+ Schedule New Follow-up" to book one.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(a => `
      <tr>
        <td>
          <strong style="color:var(--text-main); font-size:13.5px;">${a.patient_name}</strong>
          <div style="font-size:11px; color:var(--text-secondary);">${a.patient_id}</div>
        </td>
        <td>${a.doctor_name}</td>
        <td>
          <strong style="color:var(--primary);">${a.appointment_date}</strong>
          <div style="font-size:11.5px; color:var(--text-secondary);">${a.appointment_time}</div>
        </td>
        <td>
          <div style="max-width:240px; font-size:13px;">${a.reason}</div>
          ${a.notes ? `<small style="color:var(--text-secondary);">Note: ${a.notes}</small>` : ''}
        </td>
        <td>
          <span class="badge ${getFollowupBadgeClass(a.follow_up_status)}">
            ${a.follow_up_status}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${renderActionButtons(a)}
          </div>
        </td>
      </tr>
    `).join('');

    // Attach advance triggers
    tbody.querySelectorAll('.advance-stage-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const nextStage = btn.getAttribute('data-stage');
        await apiRequest(`/api/appointments/${id}/advance-followup?new_status=${encodeURIComponent(nextStage)}`, 'POST');
        renderFollowupIntelligence(container, callbacks);
      };
    });

  } catch (e) {
    console.warn("Failed to load follow-up flow", e);
  }
}

function getFollowupBadgeClass(status) {
  switch (status) {
    case 'Treatment Started': return 'badge-info';
    case 'Follow-up Due': return 'badge-warning';
    case 'Missed Appointment': return 'badge-danger';
    case 'Reminder Sent': return 'badge-warning';
    case 'Staff Escalated': return 'badge-danger';
    case 'Attended': return 'badge-success';
    default: return 'badge-info';
  }
}

function renderActionButtons(appt) {
  const id = appt.id;
  const status = appt.follow_up_status;

  if (status === 'Treatment Started') {
    return `<button class="btn btn-outline btn-sm advance-stage-btn" data-id="${id}" data-stage="Follow-up Due">Mark Due</button>`;
  }
  if (status === 'Follow-up Due') {
    return `
      <button class="btn btn-outline btn-sm advance-stage-btn" data-id="${id}" data-stage="Missed Appointment">Patient Missed</button>
      <button class="btn btn-success btn-sm advance-stage-btn" data-id="${id}" data-stage="Attended">Attended</button>
    `;
  }
  if (status === 'Missed Appointment') {
    return `
      <button class="btn btn-secondary btn-sm advance-stage-btn" data-id="${id}" data-stage="Reminder Sent">📱 Send Reminder</button>
      <button class="btn btn-danger btn-sm advance-stage-btn" data-id="${id}" data-stage="Staff Escalated">🚨 Flag for Staff</button>
    `;
  }
  if (status === 'Reminder Sent') {
    return `
      <button class="btn btn-danger btn-sm advance-stage-btn" data-id="${id}" data-stage="Staff Escalated">🚨 Flag Staff</button>
      <button class="btn btn-success btn-sm advance-stage-btn" data-id="${id}" data-stage="Attended">Attended</button>
    `;
  }
  if (status === 'Staff Escalated') {
    return `
      <span style="font-size:11px; color:var(--danger); font-weight:700;">📞 Outreach Team Alerted</span>
      <button class="btn btn-success btn-sm advance-stage-btn" data-id="${id}" data-stage="Attended">Resolved</button>
    `;
  }
  return `<span style="font-size:11px; color:var(--success); font-weight:700;">✓ Completed</span>`;
}

// ==================== MODAL: SCHEDULE NEW FOLLOW-UP ====================
export async function openScheduleFollowupModal(defaultPatientId, defaultPatientName, onScheduled) {
  document.getElementById('schedule-followup-modal')?.remove();

  // Calculate default date: 7 days from today
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 7);
  const defaultDateStr = targetDate.toISOString().split('T')[0];

  // Try to load patients list
  let patientsList = [];
  try {
    patientsList = await apiRequest('/api/patients');
  } catch (e) {
    patientsList = [
      { patient_id: "PAT-2026-1001", name: "Aarnav Sharma", phone: "+91 98765 43210" },
      { patient_id: "PAT-2026-1002", name: "Priya Patel", phone: "+91 98765 43211" },
      { patient_id: "PAT-2026-1003", name: "Ramesh Verma", phone: "+91 98765 43212" }
    ];
  }

  // Get current logged-in user name
  let defaultDoctor = "Dr. Rajesh Kulkarni, MD";
  try {
    const savedUser = localStorage.getItem('sanjeevani_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      if (u.full_name) defaultDoctor = u.full_name;
    }
  } catch (e) {}

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'schedule-followup-modal';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 620px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>📅</span> Schedule Patient Follow-up Appointment
        </div>
        <button class="btn btn-outline btn-sm" id="close-followup-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Set up a clinical review visit. This automatically triggers automated reminders, keypad phone SMS alerts, and enters the care continuity pipeline.
        </p>

        <form id="form-schedule-followup">
          <!-- Patient Selector -->
          <div class="form-group">
            <label class="form-label">Patient *</label>
            <select class="form-control" id="followup-patient-select" required>
              ${patientsList.map(p => `
                <option value="${p.patient_id}" data-name="${p.name}" data-phone="${p.phone || ''}" ${defaultPatientId === p.patient_id ? 'selected' : ''}>
                  ${p.name} (${p.patient_id}) - ${p.phone || ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Doctor Attending -->
          <div class="form-group">
            <label class="form-label">Consulting Physician *</label>
            <input type="text" class="form-control" id="followup-doctor-name" value="${defaultDoctor}" required>
          </div>

          <!-- Date & Quick Presets -->
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="margin-bottom:0;">Follow-up Date *</label>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-outline btn-sm quick-date-btn" data-days="3" style="font-size:11px; padding:2px 8px;">+3 Days</button>
                <button type="button" class="btn btn-outline btn-sm quick-date-btn active" data-days="7" style="font-size:11px; padding:2px 8px; border-color:var(--primary); color:var(--primary); font-weight:700;">+1 Week</button>
                <button type="button" class="btn btn-outline btn-sm quick-date-btn" data-days="14" style="font-size:11px; padding:2px 8px;">+2 Weeks</button>
                <button type="button" class="btn btn-outline btn-sm quick-date-btn" data-days="30" style="font-size:11px; padding:2px 8px;">+1 Month</button>
              </div>
            </div>
            <input type="date" class="form-control" id="followup-date-input" value="${defaultDateStr}" required>
          </div>

          <!-- Time Slot Selection -->
          <div class="form-group">
            <label class="form-label">Appointment Time Slot *</label>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:8px;" id="time-slot-grid">
              <button type="button" class="btn btn-outline btn-sm slot-btn" data-time="09:30 AM">09:30 AM</button>
              <button type="button" class="btn btn-primary btn-sm slot-btn active" data-time="10:30 AM">10:30 AM</button>
              <button type="button" class="btn btn-outline btn-sm slot-btn" data-time="02:30 PM">02:30 PM</button>
              <button type="button" class="btn btn-outline btn-sm slot-btn" data-time="04:30 PM">04:30 PM</button>
            </div>
            <input type="hidden" id="followup-time-input" value="10:30 AM">
          </div>

          <!-- Reason for Follow-up & Quick Clinical Presets -->
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="margin-bottom:0;">Reason for Follow-up / Clinical Goal *</label>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
              <button type="button" class="btn btn-outline btn-sm quick-reason-btn" data-reason="Review of respiratory symptoms & inhaler compliance" style="font-size:11px; padding:3px 7px;">
                Review Inhaler Response
              </button>
              <button type="button" class="btn btn-outline btn-sm quick-reason-btn" data-reason="Assess joint mobility and repeat inflammatory markers (ESR/CRP)" style="font-size:11px; padding:3px 7px;">
                Joint Mobility & Bloods
              </button>
              <button type="button" class="btn btn-outline btn-sm quick-reason-btn" data-reason="Post-treatment vital signs and cardiovascular check" style="font-size:11px; padding:3px 7px;">
                BP & Cardio Check
              </button>
            </div>
            <textarea class="form-control" id="followup-reason-input" rows="2" required placeholder="e.g. Clinical review of response to inhaled therapy and fever resolution">Review of respiratory symptoms & inhaler compliance</textarea>
          </div>

          <!-- Initial Status -->
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Initial Pipeline Stage</label>
              <select class="form-control" id="followup-status-select">
                <option value="Follow-up Due" selected>Follow-up Due (Active Tracking)</option>
                <option value="Treatment Started">Treatment Started</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Patient Instructions / Notes</label>
              <input type="text" class="form-control" id="followup-notes-input" placeholder="e.g. Bring fasting blood report">
            </div>
          </div>

          <!-- Keypad Phone SMS Checkbox -->
          <div style="background:#F0FBFB; border:1px solid #B2EBF2; border-radius:8px; padding:12px; margin-bottom:18px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:#00695C; cursor:pointer;">
              <input type="checkbox" id="followup-send-sms" checked>
              <span>📱 Send automated SMS confirmation to patient's keypad phone</span>
            </label>
            <div style="font-size:11px; color:#00897B; margin-top:4px; padding-left:22px;">
              Dispatches ≤160 character vernacular SMS reminder: <em>"संजीवनी स्वास्थ्य सूचना: आपकी डॉक्टर जांच {date} को {time} बजे निर्धारित है। अपनी पुरानी पर्चियां साथ लाएं।"</em>
            </div>
          </div>

          <div class="modal-footer" style="padding-left:0; padding-right:0; padding-bottom:0;">
            <button type="button" class="btn btn-outline" id="btn-cancel-followup">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-followup" style="padding:10px 20px; font-weight:700;">
              Confirm & Schedule Follow-up →
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-followup-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-followup').onclick = () => modal.remove();

  // Quick date presets
  const dateInput = modal.querySelector('#followup-date-input');
  modal.querySelectorAll('.quick-date-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.quick-date-btn').forEach(b => {
        b.classList.remove('active');
        b.style.fontWeight = 'normal';
        b.style.borderColor = 'var(--border)';
        b.style.color = 'inherit';
      });
      btn.classList.add('active');
      btn.style.fontWeight = '700';
      btn.style.borderColor = 'var(--primary)';
      btn.style.color = 'var(--primary)';

      const days = parseInt(btn.getAttribute('data-days'));
      const d = new Date();
      d.setDate(d.getDate() + days);
      dateInput.value = d.toISOString().split('T')[0];
    };
  });

  // Time slot buttons
  const timeInput = modal.querySelector('#followup-time-input');
  modal.querySelectorAll('.slot-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.slot-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline');
      });
      btn.classList.add('btn-primary', 'active');
      btn.classList.remove('btn-outline');
      timeInput.value = btn.getAttribute('data-time');
    };
  });

  // Reason presets
  const reasonInput = modal.querySelector('#followup-reason-input');
  modal.querySelectorAll('.quick-reason-btn').forEach(btn => {
    btn.onclick = () => {
      reasonInput.value = btn.getAttribute('data-reason');
    };
  });

  // Form submit
  modal.querySelector('#form-schedule-followup').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector('#btn-submit-followup');
    submitBtn.disabled = true;
    submitBtn.textContent = "Scheduling...";

    const patSelect = modal.querySelector('#followup-patient-select');
    const selectedOpt = patSelect.options[patSelect.selectedIndex];
    const patientId = patSelect.value;
    const patientName = selectedOpt?.getAttribute('data-name') || defaultPatientName || "Patient";
    const patientPhone = selectedOpt?.getAttribute('data-phone') || "+91 98765 43210";

    const payload = {
      patient_id: patientId,
      patient_name: patientName,
      doctor_name: modal.querySelector('#followup-doctor-name').value,
      appointment_date: dateInput.value,
      appointment_time: timeInput.value,
      reason: reasonInput.value,
      follow_up_status: modal.querySelector('#followup-status-select').value,
      notes: modal.querySelector('#followup-notes-input').value
    };

    try {
      await apiRequest('/api/appointments', 'POST', payload);

      // Trigger SMS if checked
      const sendSms = modal.querySelector('#followup-send-sms').checked;
      if (sendSms && patientPhone) {
        try {
          await apiRequest('/api/sms/send', 'POST', {
            phone: patientPhone,
            patient_name: patientName,
            template_key: "followup_scheduled",
            language: "hi",
            appointment_date: dateInput.value,
            appointment_time: timeInput.value
          });
        } catch (smsErr) {
          console.warn("SMS send note:", smsErr);
        }
      }

      alert(`✓ Follow-up appointment successfully scheduled for ${patientName} on ${dateInput.value} at ${timeInput.value}!`);
      modal.remove();

      if (onScheduled) onScheduled();
    } catch (err) {
      alert("Scheduling error: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm & Schedule Follow-up →";
    }
  };
}
