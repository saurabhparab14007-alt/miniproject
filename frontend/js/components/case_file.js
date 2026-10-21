// Complete Patient Case Undertaking File & Clinical Dashboard
import { apiRequest } from '../api.js';
import { openScheduleFollowupModal } from './followup_flow.js';

export async function renderCaseFile(container, caseId, callbacks) {
  container.innerHTML = `
    <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
      Loading Patient Clinical Case Undertaking (${caseId})...
    </div>
  `;

  try {
    const data = await apiRequest(`/api/cases/${caseId}`);
    const { case: c, patient: p, reports, timeline, ai_summary, smart_alerts } = data;

    container.innerHTML = `
      <!-- Case Undertaking Header Banner -->
      <div class="card" style="margin-bottom: 20px; border-top: 4px solid var(--primary); padding: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main);">${p.name || 'Patient'}</h1>
              <span class="badge badge-info">${p.patient_id}</span>
              <span class="badge badge-success">${c.case_id}</span>
              <span class="badge" style="background: rgba(8,126,139,0.15); color: var(--primary);">ABHA: ${p.abha_id || 'Not Linked'}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); display: flex; gap: 18px; flex-wrap: wrap;">
              <span><strong>Age/Gender:</strong> ${p.age} Y / ${p.gender}</span>
              <span><strong>Blood Group:</strong> <strong style="color:var(--danger);">${p.blood_group}</strong></span>
              <span><strong>Phone:</strong> ${p.phone}</span>
              <span><strong>Emergency Contact:</strong> ${p.emergency_contact} (${p.emergency_phone})</span>
              <span><strong>Attending Doctor:</strong> ${c.doctor_name}</span>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" id="btn-schedule-patient-followup" style="background:#087E8B; font-weight:700;">
              📅 Schedule Follow-up
            </button>
            <button class="btn btn-outline btn-sm" id="btn-open-emergency-qr">
              📱 Emergency QR
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-open-handover">
              ⭐ Doctor Handover
            </button>
            <button class="btn btn-accent btn-sm" id="btn-open-ask-case">
              🤖 Ask Case AI
            </button>
            <button class="btn btn-outline btn-sm" id="btn-export-fhir">
              🏥 FHIR Transfer
            </button>
          </div>
        </div>
      </div>

      <!-- 🚨 SMART RISK & ALLERGY ALERTS (If detected) -->
      <div id="smart-alerts-container">
        ${renderSmartAlerts(smart_alerts)}
      </div>

      <!-- 🧠 AI PATIENT CASE SUMMARY WIDGET -->
      <div class="card" style="background: linear-gradient(180deg, #F5FAFC, #FFFFFF); border: 1.5px solid rgba(8, 126, 139, 0.25); margin-bottom: 24px;">
        <div class="card-header" style="border-bottom-color: rgba(8, 126, 139, 0.15); margin-bottom: 12px; padding-bottom: 8px;">
          <div class="card-title" style="color: var(--primary); font-size: 15px;">
            <span>🧠</span> AI Clinical Case Undertaking Summary
          </div>
          <span class="badge" style="background: rgba(56, 178, 172, 0.2); color: #087E8B; font-size: 11px;">Automatic Synthesis</span>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: var(--text-main); font-weight: 500; margin-bottom: 12px;">
          ${ai_summary?.summary_text || 'Synthesizing case records...'}
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${(ai_summary?.bullet_points || []).map(bp => `
            <div style="font-size: 12px; background: rgba(8, 126, 139, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent); color: var(--text-main);">
              ${bp}
            </div>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
          <button class="btn btn-outline btn-sm" id="btn-verify-ai-summary" style="border-color:var(--primary); color:var(--primary); font-weight:700;">
            🛡️ Verify Before Saving to Official Record
          </button>
        </div>
      </div>

      <!-- COMPLETE CASE FILE TABS -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="tabs-nav" style="padding: 12px 20px 0; background-color: var(--bg); overflow-x: auto;">
          <button class="tab-btn active" data-tab="tab-clinical">📋 Clinical Undertaking</button>
          <button class="tab-btn" data-tab="tab-timeline">🩺 Visual Journey Timeline</button>
          <button class="tab-btn" data-tab="tab-prescriptions">💊 Treatment & Medication Schedule</button>
          <button class="tab-btn" data-tab="tab-reports">📄 Reports & OCR Analyzer</button>
          <button class="tab-btn" data-tab="tab-trends">📊 Health Trends (BP/Sugar)</button>
          <button class="tab-btn" data-tab="tab-discharge">🧾 Smart Discharge Summary</button>
          <button class="tab-btn" data-tab="tab-audit">🔒 DPDP Audit & Consent</button>
        </div>

        <div style="padding: 24px;">
          <!-- TAB 1: CLINICAL UNDERTAKING -->
          <div id="tab-clinical" class="tab-pane active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Clinical Notes & Diagnosis</h3>
              <div style="display:flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" id="btn-dictate-voice">
                  🎙️ Voice Dictation
                </button>
                <button class="btn btn-primary btn-sm" id="btn-save-case-notes">
                  💾 Update Case Notes
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Chief Complaint *</label>
                <textarea class="form-control" id="edit-chief-complaint" rows="2">${c.chief_complaint || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Associated Symptoms *</label>
                <textarea class="form-control" id="edit-symptoms" rows="2">${c.symptoms || ''}</textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Previous Medical History</label>
                <textarea class="form-control" id="edit-history" rows="2">${c.medical_history || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Allergies (Critical Flag) ⚠️</label>
                <textarea class="form-control" id="edit-allergies" rows="2" style="border-color: var(--danger);">${c.allergies || ''}</textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Baseline Current Medications</label>
                <textarea class="form-control" id="edit-current-meds" rows="2">${c.current_medications || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Working Diagnosis *</label>
                <input type="text" class="form-control" id="edit-diagnosis" value="${c.diagnosis || ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Doctor's Clinical Notes</label>
              <textarea class="form-control" id="edit-doctor-notes" rows="3">${c.doctor_notes || ''}</textarea>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:2;">
                <label class="form-label">Treatment Plan & Prescription *</label>
                <textarea class="form-control" id="edit-treatment-plan" rows="3">${c.treatment_plan || ''}</textarea>
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">Follow-up Date</label>
                <div style="display:flex; gap:6px;">
                  <input type="date" class="form-control" id="edit-follow-up-date" value="${c.follow_up_date || ''}">
                  <button type="button" class="btn btn-outline btn-sm" id="btn-quick-schedule-followup" title="Schedule appointment in follow-up intelligence pipeline" style="white-space:nowrap; padding:6px 10px; font-weight:700; color:var(--primary); border-color:var(--primary);">
                    📅 Book
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: VISUAL JOURNEY TIMELINE -->
          <div id="tab-timeline" class="tab-pane" style="display: none;">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">🩺 Longitudinal Patient Journey</h3>
                <p style="font-size: 12px; color: var(--text-secondary);">Tracking: Visit → Diagnosis → Tests → Results → Treatment → Follow-up → Outcome</p>
              </div>
              <button class="btn btn-outline btn-sm" id="btn-add-timeline-event">+ Add Journey Event</button>
            </div>

            <div class="timeline-track">
              ${(timeline || []).map(event => `
                <div class="timeline-milestone">
                  <div class="milestone-dot ${event.event_type}"></div>
                  <div class="milestone-content">
                    <div class="milestone-header">
                      <div class="milestone-title">
                        <span class="badge ${getEventBadgeClass(event.event_type)}" style="margin-right: 6px;">${event.event_type}</span>
                        ${event.event_title}
                      </div>
                      <span class="milestone-date">${event.event_date}</span>
                    </div>
                    <div class="milestone-desc">${event.event_description}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                      Attending Clinician: <strong>${event.doctor_name || 'Care Team'}</strong>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TAB 3: TREATMENT & MEDICATION SCHEDULE -->
          <div id="tab-prescriptions" class="tab-pane" style="display: none;">
            <div id="med-schedule-root"></div>
          </div>

          <!-- TAB 4: REPORTS & LAB ANALYZER -->
          <div id="tab-reports" class="tab-pane" style="display: none;">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 700;">Diagnostic Reports & Investigations</h3>
                <p style="font-size: 12px; color: var(--text-secondary);">Blood reports, X-rays, MRI/CT, Prescriptions, linked directly to Case Undertaking</p>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-trigger-analyzer">
                📄 "Upload Report → Understand It"
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
              ${(reports || []).map(r => `
                <div style="border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; background: var(--bg);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="badge badge-info">${r.report_type}</span>
                    <span class="badge badge-warning" id="ocr-badge-${r.id}">AI/OCR-generated</span>
                  </div>
                  <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${r.file_name}</h4>
                  <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">${r.summary || 'Lab report archived'}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; color: var(--primary); font-weight: 600;">Uploaded by: ${r.uploaded_by}</span>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-outline btn-sm btn-verify-ocr" data-id="${r.id}">✓ Verify OCR</button>
                      <button class="btn btn-primary btn-sm view-parsed-report-btn" data-report-id="${r.id}">Parameters</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TAB 5: HEALTH TRENDS -->
          <div id="tab-trends" class="tab-pane" style="display: none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <h3 style="font-size:16px; font-weight:700;">📊 Longitudinal Health Trends (BP, Weight, Blood Glucose)</h3>
                <p style="font-size:12px; color:var(--text-secondary);">Tracking chronic disease progress across Jan → Feb → Mar → Apr 2026</p>
              </div>
            </div>
            <div id="case-trends-container">Loading vital trends...</div>
          </div>

          <!-- TAB 6: SMART DISCHARGE SUMMARY -->
          <div id="tab-discharge" class="tab-pane" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 700;">🧾 Smart Discharge Summary</h3>
                <p style="font-size: 12px; color: var(--text-secondary);">AI drafts summary from admission, treatment, and lab course for physician digital approval.</p>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-generate-discharge-draft">
                Draft Smart Summary
              </button>
            </div>
            <div id="discharge-draft-container" style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px;">
              ${c.discharge_summary ? `
                <div class="badge badge-success" style="margin-bottom: 10px;">Officially Approved by ${c.discharge_approved_by || 'Doctor'}</div>
                <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: var(--text-main);">${c.discharge_summary}</pre>
              ` : `
                <p style="font-size: 13px; color: var(--text-secondary);">No discharge summary finalized yet. Click "Draft Smart Summary" to generate from case undertaking.</p>
              `}
            </div>
          </div>

          <!-- TAB 6: DPDP AUDIT TRAIL & CONSENT -->
          <div id="tab-audit" class="tab-pane" style="display: none;">
            <div style="margin-bottom: 16px;">
              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">🔒 Security, DPDP Consent & Audit Compliance</h3>
              <p style="font-size: 12px; color: var(--text-secondary);">Indian Healthcare Digital Data Protection Act 2023 - Purpose-Specific Consent and Access Trail</p>
            </div>
            <div id="audit-trail-root">Loading compliance data...</div>
          </div>
        </div>
      </div>
    `;

    // Tab switching logic
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        const target = container.querySelector(`#${btn.getAttribute('data-tab')}`);
        if (target) target.style.display = 'block';

        // Lazy initialize medication schedule
        if (btn.getAttribute('data-tab') === 'tab-prescriptions') {
          callbacks.onRenderMedSchedule(container.querySelector('#med-schedule-root'), c.treatment_plan);
        }
        // Lazy initialize trends
        if (btn.getAttribute('data-tab') === 'tab-trends') {
          loadCaseTrends(container.querySelector('#case-trends-container'), p.patient_id);
        }
        // Lazy initialize audit
        if (btn.getAttribute('data-tab') === 'tab-audit') {
          callbacks.onRenderAudit(container.querySelector('#audit-trail-root'), p.patient_id, c.case_id);
        }
      });
    });

    // Wire OCR verification buttons
    container.querySelectorAll('.btn-verify-ocr').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const badge = container.querySelector(`#ocr-badge-${id}`);
        if (badge) {
          badge.className = 'badge badge-success';
          badge.textContent = '✓ Clinically Verified';
          btn.style.display = 'none';
        }
        alert("Lab report data and biomarkers officially confirmed by clinician.");
      };
    });

    // Wire "Verify Before Saving" AI Summary button
    container.querySelector('#btn-verify-ai-summary')?.addEventListener('click', () => {
      openVerifyAiSummaryModal(c, ai_summary, (verifiedText) => {
        alert("AI Clinical Summary verified and permanently written to clinical progress notes!");
        renderCaseFile(container, caseId, callbacks);
      });
    });

    // Button event listeners
    // Schedule follow-up appointment modal listeners
    const triggerScheduleModal = () => {
      openScheduleFollowupModal(p.patient_id, p.name, () => {
        renderCaseFile(container, caseId, callbacks);
      });
    };
    container.querySelector('#btn-schedule-patient-followup')?.addEventListener('click', triggerScheduleModal);
    container.querySelector('#btn-quick-schedule-followup')?.addEventListener('click', triggerScheduleModal);

    container.querySelector('#btn-open-emergency-qr')?.addEventListener('click', () => callbacks.onOpenEmergencyQR(p.patient_id));
    container.querySelector('#btn-open-handover')?.addEventListener('click', () => callbacks.onOpenHandover(c.case_id));
    container.querySelector('#btn-open-ask-case')?.addEventListener('click', () => callbacks.onOpenAskCase(p.patient_id, c.case_id));
    container.querySelector('#btn-export-fhir')?.addEventListener('click', () => callbacks.onExportFHIR(c.case_id));
    container.querySelector('#btn-trigger-analyzer')?.addEventListener('click', () => callbacks.onOpenAnalyzer(p.patient_id, c.case_id));
    container.querySelector('#btn-dictate-voice')?.addEventListener('click', () => callbacks.onOpenVoice((res) => {
      if (res.chief_complaint) container.querySelector('#edit-chief-complaint').value = res.chief_complaint;
      if (res.symptoms) container.querySelector('#edit-symptoms').value = res.symptoms;
      if (res.medical_history) container.querySelector('#edit-history').value = res.medical_history;
      if (res.diagnosis) container.querySelector('#edit-diagnosis').value = res.diagnosis;
      if (res.treatment_plan) container.querySelector('#edit-treatment-plan').value = res.treatment_plan;
    }));

    // Update case notes
    container.querySelector('#btn-save-case-notes')?.addEventListener('click', async () => {
      const payload = {
        chief_complaint: container.querySelector('#edit-chief-complaint').value,
        symptoms: container.querySelector('#edit-symptoms').value,
        medical_history: container.querySelector('#edit-history').value,
        allergies: container.querySelector('#edit-allergies').value,
        current_medications: container.querySelector('#edit-current-meds').value,
        diagnosis: container.querySelector('#edit-diagnosis').value,
        doctor_notes: container.querySelector('#edit-doctor-notes').value,
        treatment_plan: container.querySelector('#edit-treatment-plan').value,
        follow_up_date: container.querySelector('#edit-follow-up-date').value
      };
      try {
        await apiRequest(`/api/cases/${c.case_id}`, 'PUT', payload);
        alert("Case undertaking record updated successfully.");
        renderCaseFile(container, caseId, callbacks);
      } catch (err) {
        alert("Update error: " + err.message);
      }
    });

    // Smart discharge summary draft trigger
    container.querySelector('#btn-generate-discharge-draft')?.addEventListener('click', async () => {
      try {
        const draft = await apiRequest(`/api/cases/${c.case_id}/discharge-summary`);
        const box = container.querySelector('#discharge-draft-container');
        box.innerHTML = `
          <div style="background: #fff; padding: 16px; border: 1px solid var(--border); border-radius: 6px;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
              <span class="badge badge-warning">AI Generated Draft</span>
              <button class="btn btn-primary btn-sm" id="btn-approve-discharge">Doctor Approve & Close Case</button>
            </div>
            <textarea id="discharge-approved-text" class="form-control" rows="8">${draft.hospital_course}\n\nDiagnosis: ${draft.final_diagnosis}\nDischarge Meds: ${draft.discharge_medications}\nFollow-up: ${draft.follow_up_instructions}\nWarnings: ${draft.red_flag_warnings}</textarea>
          </div>
        `;
        box.querySelector('#btn-approve-discharge').onclick = async () => {
          const txt = box.querySelector('#discharge-approved-text').value;
          await apiRequest(`/api/cases/${c.case_id}/approve-discharge?approved_text=${encodeURIComponent(txt)}`, 'POST');
          alert("Discharge summary officially approved and case updated.");
          renderCaseFile(container, caseId, callbacks);
        };
      } catch (e) {
        alert("Failed to draft discharge: " + e.message);
      }
    });

  } catch (err) {
    container.innerHTML = `
      <div class="card" style="padding: 24px; text-align: center;">
        <h3 style="color: var(--danger); margin-bottom: 10px;">Failed to load case file</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">${err.message}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">Reload</button>
      </div>
    `;
  }
}

function renderSmartAlerts(alerts) {
  if (!alerts || alerts.length === 0) return '';
  return alerts.map(a => `
    <div class="alert-card ${a.level}">
      <div style="font-size: 20px;">⚠️</div>
      <div style="flex:1;">
        <div class="alert-card-title">${a.title}</div>
        <div class="alert-card-msg">${a.message}</div>
        <div class="alert-card-action">Recommended Action: ${a.action}</div>
      </div>
    </div>
  `).join('');
}

function getEventBadgeClass(type) {
  switch (type) {
    case 'Visit': return 'badge-info';
    case 'Diagnosis': return 'badge-warning';
    case 'Tests': return 'badge-info';
    case 'Results': return 'badge-success';
    case 'Treatment': return 'badge-success';
    case 'Follow-up': return 'badge-warning';
    default: return 'badge-info';
  }
}

async function loadCaseTrends(container, patientId) {
  try {
    const trends = await apiRequest(`/api/trends/${patientId}`);
    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timeline</th>
              <th>Blood Pressure (mmHg)</th>
              <th>Weight (kg)</th>
              <th>Fasting Glucose (mg/dL)</th>
              <th>Trend Evaluation</th>
            </tr>
          </thead>
          <tbody>
            ${trends.map(t => `
              <tr>
                <td><strong>${t.month_label}</strong></td>
                <td><strong style="color:var(--primary);">${t.systolic_bp} / ${t.diastolic_bp}</strong></td>
                <td>${t.weight_kg} kg</td>
                <td>${t.fasting_glucose} mg/dL</td>
                <td><span class="badge badge-success">✓ Controlled & Improving</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div style="color:var(--danger);">${e.message}</div>`;
  }
}

function openVerifyAiSummaryModal(caseObj, aiSummary, onVerified) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'verify-ai-modal';

  modal.innerHTML = `
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-title">
          <span>🛡️</span> Verify AI Clinical Case Synthesis Before Committing
        </div>
        <button class="btn btn-outline btn-sm" id="close-verify-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <div style="background:rgba(8, 126, 139, 0.08); border-left:4px solid var(--primary); padding:10px 14px; border-radius:4px; margin-bottom:16px; font-size:12.5px;">
          ⚖️ <strong>Clinical Safety Requirement:</strong> AI-generated information is strictly clinical decision support and is NEVER silently added to the official medical record without direct physician review, edit, and confirmation.
        </div>

        <div class="form-group">
          <label class="form-label">1. Chief Complaint</label>
          <input type="text" class="form-control" id="v-complaint" value="${caseObj.chief_complaint || ''}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">2. Relevant Medical History</label>
            <input type="text" class="form-control" id="v-history" value="${caseObj.medical_history || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">3. Vitals Baseline</label>
            <input type="text" class="form-control" id="v-vitals" value="BP 120/80 mmHg, SpO2 96%, HR 84 bpm">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">4. Diagnostic Reports Highlights</label>
            <input type="text" class="form-control" id="v-reports" value="CBC: WBC 13,500 (Elevated), Hb 10.2 g/dL">
          </div>
          <div class="form-group">
            <label class="form-label">5. Clinician Diagnosis *</label>
            <input type="text" class="form-control" id="v-diagnosis" value="${caseObj.diagnosis || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">6. Confirmed Treatment Protocol *</label>
            <input type="text" class="form-control" id="v-treatment" value="${caseObj.treatment_plan || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">7. Follow-up Target</label>
            <input type="text" class="form-control" id="v-followup" value="${caseObj.follow_up_date || 'In 7 Days'}">
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-cancel-v-modal">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-save-ai">
          ✓ Doctor Confirmed: Commit to Medical Record
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#close-verify-modal').onclick = closeModal;
  modal.querySelector('#btn-cancel-v-modal').onclick = closeModal;

  modal.querySelector('#btn-confirm-save-ai').onclick = () => {
    closeModal();
    if (onVerified) onVerified();
  };
}
