// Hospital & Clinical Facility Controller
import { apiRequest } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Immediately show registered hospital name if logged in
  const savedUser = localStorage.getItem('sanjeevani_user');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      if (u.full_name && (u.role === 'hospital' || u.role === 'admin')) {
        const hName = document.getElementById('fac-name-heading');
        if (hName) hName.textContent = u.full_name;
        const nOff = document.getElementById('fac-nodal-officer');
        if (nOff) nOff.textContent = `Nodal Medical Officer (${u.full_name})`;
      }
    } catch(e) {}
  }

  setupSignout();
  loadDashboardData();
  setupAdmitModal();
});

function setupSignout() {
  const btn = document.getElementById('btn-hospital-signout');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('sanjeevani_token');
      localStorage.removeItem('sanjeevani_user');
      window.location.href = '/login?msg=logged_out';
    };
  }
}

async function loadDashboardData() {
  try {
    const data = await apiRequest('/api/hospital/dashboard');

    // 1. Facility & KPIs
    const fac = data.facility || {};
    const kpis = data.kpis || {};

    document.getElementById('fac-name-heading').textContent = fac.name || 'Raigad Sub-District Hospital';
    document.getElementById('fac-nodal-officer').textContent = fac.nodal_officer || 'Dr. V. P. Deshmukh';

    const total = kpis.total_beds || 120;
    const occupied = kpis.occupied_beds || 94;
    const pct = kpis.occupancy_rate_pct || 78;

    document.getElementById('fac-bed-ratio').textContent = `${occupied} / ${total} Beds (${pct}%)`;
    document.getElementById('fac-bed-meter').style.width = `${Math.min(100, pct)}%`;

    document.getElementById('kpi-total-beds').textContent = total;
    document.getElementById('kpi-occupied-beds').textContent = occupied;
    document.getElementById('kpi-avail-beds').textContent = kpis.available_beds || (total - occupied);
    document.getElementById('kpi-red-triage').textContent = kpis.red_triage_count || 0;

    // 2. Inpatient Admissions Table
    const tbody = document.getElementById('tbody-admissions');
    const admissions = data.admissions || [];
    if (admissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No active inpatients.</td></tr>';
    } else {
      tbody.innerHTML = admissions.map(a => `
        <tr>
          <td><strong>${a.admission_id}</strong></td>
          <td>${a.patient_name} <small style="color:var(--text-secondary);">(${a.age}${a.gender[0]})</small></td>
          <td><span class="badge badge-info">${a.ward_type}</span> <strong>${a.bed_number}</strong></td>
          <td>
            <span class="${a.triage_level === 'Red' ? 'triage-badge-red' : a.triage_level === 'Amber' ? 'triage-badge-amber' : 'triage-badge-green'}">
              ${a.triage_level === 'Red' ? '🔴 RED' : a.triage_level === 'Amber' ? '🟠 AMBER' : '🟢 GREEN'}
            </span>
          </td>
          <td>${a.admitting_doctor}</td>
          <td>${a.diagnosis}</td>
        </tr>
      `).join('');
    }

    // 3. Clinical Staff On-Duty
    const staffContainer = document.getElementById('container-staff');
    const staff = data.staff || [];
    staffContainer.innerHTML = staff.map(s => `
      <div style="background:#F5FAFC; border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:var(--text-main); font-size:13px;">${s.full_name}</strong>
          <div style="font-size:11.5px; color:var(--text-secondary);">${s.department}</div>
          <span style="font-size:10.5px; color:var(--primary); font-weight:700;">✓ NMC / Lic: ${s.registration_number}</span>
        </div>
        <span class="badge ${s.role === 'doctor' ? 'badge-info' : 'badge-success'}">${s.role.toUpperCase()}</span>
      </div>
    `).join('');

    // 4. Inter-Facility Transfers
    const trfContainer = document.getElementById('container-transfers');
    const transfers = data.transfers || [];
    if (transfers.length === 0) {
      trfContainer.innerHTML = '<div style="color:var(--text-secondary); font-size:13px;">No active facility transfers.</div>';
    } else {
      trfContainer.innerHTML = transfers.map(t => `
        <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${t.transfer_id}</strong>
            <span class="badge ${t.status === 'ACCEPTED' ? 'badge-success' : 'badge-warning'}">${t.status}</span>
          </div>
          <div style="font-size:12.5px; margin:4px 0;">${t.from_facility} ➔ <strong>${t.to_facility}</strong></div>
          <div style="font-size:12px; color:var(--text-secondary);">Reason: ${t.reason}</div>
        </div>
      `).join('');
    }

    // 5. Rural Outreach Camps
    const campContainer = document.getElementById('container-camps');
    const camps = data.camps || [];
    campContainer.innerHTML = camps.map(c => `
      <div style="background:#F5FAFC; border:1px solid var(--border); border-left:4px solid var(--accent); border-radius:8px; padding:10px 12px; margin-bottom:10px;">
        <div style="font-weight:700; color:var(--text-main); font-size:13px;">${c.camp_name}</div>
        <div style="font-size:12px; color:var(--primary); font-weight:600;">📍 ${c.village_name} • 📅 ${c.scheduled_date}</div>
        <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">Lead: ${c.team_lead_doctor}</div>
      </div>
    `).join('');

  } catch (err) {
    console.error("Hospital dashboard load error:", err);
  }
}

function setupAdmitModal() {
  const modal = document.getElementById('modal-admit');
  const btnOpen = document.getElementById('btn-open-admit-modal');
  const btnClose = document.getElementById('modal-admit-close');
  const form = document.getElementById('form-admit-inpatient');

  if (btnOpen) btnOpen.onclick = () => modal.style.display = 'flex';
  if (btnClose) btnClose.onclick = () => modal.style.display = 'none';

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        patient_id: fd.get('patient_id'),
        patient_name: fd.get('patient_name'),
        age: parseInt(fd.get('age')),
        gender: fd.get('gender'),
        ward_type: fd.get('ward_type'),
        bed_number: fd.get('bed_number'),
        admitting_doctor: fd.get('admitting_doctor'),
        diagnosis: fd.get('diagnosis'),
        triage_level: fd.get('triage_level')
      };

      try {
        const res = await apiRequest('/api/hospital/admit-patient', 'POST', payload);
        alert(res.message);
        modal.style.display = 'none';
        form.reset();
        loadDashboardData();
      } catch (err) {
        alert("Admission error: " + err.message);
      }
    };
  }
}
