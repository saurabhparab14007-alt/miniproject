// Patient Registration & Comprehensive Clinical Intake Component
import { apiRequest } from '../api.js';

export function openPatientRegistrationModal(onSuccess) {
  document.getElementById('patient-reg-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'patient-reg-modal';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 860px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="position: sticky; top: 0; background: #fff; z-index: 10; border-bottom: 2px solid var(--border);">
        <div>
          <div class="modal-title" style="font-size: 18px; font-weight: 800; color: var(--text-main);">
            <span>📝</span> Doctor Clinical Intake & Patient Registration
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
            Record patient demographics, baseline vitals, working diagnosis, and prescribed medicine timetable.
          </div>
        </div>
        <button class="btn btn-outline btn-sm" id="close-reg-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body" style="padding-top: 16px;">
        <form id="patient-registration-form">

          <!-- SECTION 1: PATIENT DEMOGRAPHICS -->
          <div style="background: #F8FBFC; border: 1px solid #D9E2EC; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 13.5px; font-weight: 800; color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>👤</span> 1. Patient Demographics & Contact
              <span class="badge badge-info" style="font-size: 10.5px;">Patient Login Identifier</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Full Legal Name *</label>
                <input type="text" class="form-control" name="name" required placeholder="e.g. Ramesh Narayan Verma">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Date of Birth *</label>
                <input type="date" class="form-control" name="dob" id="reg-dob" required value="1995-05-15">
              </div>
              <div class="form-group" style="flex: 0.8;">
                <label class="form-label">Age *</label>
                <input type="number" class="form-control" name="age" id="reg-age" required value="31">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Gender *</label>
                <select class="form-control" name="gender" required>
                  <option value="Male" selected>Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group" style="flex: 1.5;">
                <label class="form-label" style="color:var(--primary); font-weight:800;">
                  Mobile Phone Number * (Used for Patient Portal Access)
                </label>
                <input type="tel" class="form-control" name="phone" id="reg-phone" required placeholder="+91 98234 56789">
                <small style="font-size: 11px; color: #627D98;">Patient can access all their details on /login with this phone number</small>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Blood Group *</label>
                <select class="form-control" name="blood_group" required>
                  <option value="B+" selected>B Positive (B+)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Residential Address</label>
                <input type="text" class="form-control" name="address" value="Village Kusgaon, Taluka Pen, District Raigad">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Emergency Contact Name & Phone</label>
                <input type="text" class="form-control" name="emergency_contact" value="Family (+91 98234 56780)">
              </div>
            </div>
          </div>

          <!-- SECTION 2: BASELINE CLINICAL VITALS -->
          <div style="background: #F0FBFB; border: 1.5px solid #B2EBF2; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
              <div style="font-size: 13.5px; font-weight: 800; color: #00695C; display: flex; align-items: center; gap: 8px;">
                <span>🩺</span> 2. Baseline Clinical Vitals (Immediate Charting)
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-outline btn-sm quick-vitals-preset" data-preset="normal" style="font-size:11px; padding:2px 8px;">Normal Baseline</button>
                <button type="button" class="btn btn-outline btn-sm quick-vitals-preset" data-preset="fever" style="font-size:11px; padding:2px 8px;">Fever Vitals</button>
                <button type="button" class="btn btn-outline btn-sm quick-vitals-preset" data-preset="htn" style="font-size:11px; padding:2px 8px;">Hypertensive</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <!-- Heart Rate -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">❤️ Heart Rate (Pulse)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" class="form-control" name="heart_rate" id="v-hr" value="76" min="40" max="220" required>
                  <span style="font-size:12px; color:var(--text-secondary); white-space:nowrap;">BPM</span>
                </div>
              </div>

              <!-- Blood Pressure -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">🩺 Blood Pressure (Sys / Dia)</label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" class="form-control" name="systolic_bp" id="v-sys" value="120" placeholder="Sys" style="flex:1;" required>
                  <span>/</span>
                  <input type="number" class="form-control" name="diastolic_bp" id="v-dia" value="80" placeholder="Dia" style="flex:1;" required>
                  <span style="font-size:11px; color:var(--text-secondary);">mmHg</span>
                </div>
              </div>

              <!-- Oxygen SpO2 -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">🫁 Oxygen SpO2 (%)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" class="form-control" name="spo2" id="v-spo2" value="98" min="70" max="100" required>
                  <span style="font-size:12px; color:var(--text-secondary);">%</span>
                </div>
              </div>

              <!-- Body Temperature -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">🌡️ Body Temp (°F)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" step="0.1" class="form-control" name="temp_f" id="v-temp" value="98.4" required>
                  <span style="font-size:12px; color:var(--text-secondary);">°F</span>
                </div>
              </div>

              <!-- Blood Sugar -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">🩸 Fasting Blood Sugar</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" class="form-control" name="fasting_glucose" id="v-sugar" value="105" required>
                  <span style="font-size:11px; color:var(--text-secondary);">mg/dL</span>
                </div>
              </div>

              <!-- Weight -->
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">⚖️ Body Weight (kg)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" step="0.5" class="form-control" name="weight_kg" id="v-weight" value="68.0" required>
                  <span style="font-size:12px; color:var(--text-secondary);">kg</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 3: CLINICAL DIAGNOSIS & ALLERGIES -->
          <div style="background: #FFFDE7; border: 1px solid #FFF59D; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 13.5px; font-weight: 800; color: #F57F17; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>📋</span> 3. Clinical Diagnosis & Critical Allergies
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Working Diagnosis *</label>
                <input type="text" class="form-control" name="diagnosis" id="reg-diag" required value="Acute Bronchitis & Seasonal Upper Respiratory Infection">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label" style="color:var(--danger); font-weight:800;">Critical Drug Allergies ⚠️</label>
                <input type="text" class="form-control" name="allergies" id="reg-allergies" value="No known drug allergies" style="border-color:#EF9A9A;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Chief Complaint & Symptoms</label>
              <textarea class="form-control" name="chief_complaint" rows="2" placeholder="e.g. Cough, low-grade fever, chest tightness for 4 days">Productive cough, low-grade fever, and nocturnal breathlessness for 3 days.</textarea>
            </div>
          </div>

          <!-- SECTION 4: PRESCRIBED MEDICINES & EXACT DOSAGE TIMING -->
          <div style="background: #EDE7F6; border: 1.5px solid #D1C4E9; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
              <div>
                <div style="font-size: 13.5px; font-weight: 800; color: #4527A0; display: flex; align-items: center; gap: 8px;">
                  <span>💊</span> 4. Prescribed Medicines & Exact Daily Timings
                </div>
                <div style="font-size: 11.5px; color: #5E35B1;">
                  These medicines and exact timing slots will power the Patient's Dosage Timetable with voice pill audio reminders.
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary" id="btn-add-med-row" style="background:#5E35B1; border-color:#5E35B1; font-size:12px;">
                ✚ Add Another Medicine
              </button>
            </div>

            <!-- Quick Prescription Presets Chips -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <span style="font-size:11px; font-weight:700; color:#5E35B1; align-self:center;">Rapid Presets:</span>
              <button type="button" class="btn btn-outline btn-sm rx-preset-btn" data-preset="resp" style="font-size:11px; padding:2px 8px; background:#fff;">Respiratory & Cough</button>
              <button type="button" class="btn btn-outline btn-sm rx-preset-btn" data-preset="fever" style="font-size:11px; padding:2px 8px; background:#fff;">Fever & Infection</button>
              <button type="button" class="btn btn-outline btn-sm rx-preset-btn" data-preset="cardio" style="font-size:11px; padding:2px 8px; background:#fff;">Hypertension & Heart</button>
            </div>

            <!-- Medication Dynamic Rows Container -->
            <div id="med-rows-container" style="display:flex; flex-direction:column; gap:10px;">
              <!-- Default Row 1 -->
              <div class="med-row card" style="padding:10px 14px; background:#FFFFFF; border:1px solid #D1C4E9; margin:0;">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1.6fr 1.6fr 36px; gap:8px; align-items:center;">
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Medicine Name</label>
                    <input type="text" class="form-control med-name" value="Tab Paracetamol 650mg" required style="font-size:12.5px;">
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Dosage</label>
                    <input type="text" class="form-control med-dose" value="1 Tablet" style="font-size:12.5px;">
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Scheduled Time</label>
                    <select class="form-control med-time" style="font-size:12px;">
                      <option value="Morning 8:00 AM (Post-Breakfast)" selected>🌅 Morning 8:00 AM</option>
                      <option value="Afternoon 1:00 PM (Post-Lunch)">☀️ Afternoon 1:00 PM</option>
                      <option value="Night 8:00 PM (Post-Dinner)">🌙 Night 8:00 PM</option>
                      <option value="Bedtime 10:00 PM">🛏️ Bedtime 10:00 PM</option>
                      <option value="Empty Stomach 7:00 AM">☕ Empty Stomach 7:00 AM</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Instructions</label>
                    <input type="text" class="form-control med-inst" value="Take with warm water after food" style="font-size:12px;">
                  </div>
                  <button type="button" class="btn btn-outline btn-sm remove-med-btn" style="border:none; color:var(--danger); font-size:16px; margin-top:16px; padding:0;" title="Remove row">✕</button>
                </div>
              </div>

              <!-- Default Row 2 -->
              <div class="med-row card" style="padding:10px 14px; background:#FFFFFF; border:1px solid #D1C4E9; margin:0;">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1.6fr 1.6fr 36px; gap:8px; align-items:center;">
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Medicine Name</label>
                    <input type="text" class="form-control med-name" value="Foracort 200 Inhaler" required style="font-size:12.5px;">
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Dosage</label>
                    <input type="text" class="form-control med-dose" value="1 Puff" style="font-size:12.5px;">
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Scheduled Time</label>
                    <select class="form-control med-time" style="font-size:12px;">
                      <option value="Morning 8:00 AM (Post-Breakfast)">🌅 Morning 8:00 AM</option>
                      <option value="Afternoon 1:00 PM (Post-Lunch)">☀️ Afternoon 1:00 PM</option>
                      <option value="Night 8:00 PM (Post-Dinner)" selected>🌙 Night 8:00 PM</option>
                      <option value="Bedtime 10:00 PM">🛏️ Bedtime 10:00 PM</option>
                      <option value="Empty Stomach 7:00 AM">☕ Empty Stomach 7:00 AM</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label" style="font-size:11px; margin-bottom:2px;">Instructions</label>
                    <input type="text" class="form-control med-inst" value="Rinse mouth after inhalation" style="font-size:12px;">
                  </div>
                  <button type="button" class="btn btn-outline btn-sm remove-med-btn" style="border:none; color:var(--danger); font-size:16px; margin-top:16px; padding:0;" title="Remove row">✕</button>
                </div>
              </div>
            </div>
          </div>

          <!-- KEYPAD SMS & PATIENT PORTAL ACCESS NOTICE -->
          <div style="background:#E8F5E9; border:1px solid #C8E6C9; border-radius:8px; padding:12px 16px; margin-bottom:18px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#2E7D32; cursor:pointer;">
              <input type="checkbox" id="reg-send-sms" name="send_sms" checked>
              <span>📱 Dispatch instant vernacular SMS alert to patient's keypad phone with medicine schedule</span>
            </label>
            <div style="font-size:11.5px; color:#388E3C; margin-top:4px; padding-left:22px;">
              ✨ <strong>Seamless Patient Access:</strong> Once registered here, the patient can view their vitals, medicines, and QR code anytime just by entering this mobile number on the login page!
            </div>
          </div>

          <div class="modal-footer" style="padding-left:0; padding-right:0; padding-bottom:0; display:flex; justify-content:space-between; align-items:center;">
            <button type="button" class="btn btn-outline" id="btn-cancel-reg">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-reg" style="padding:12px 24px; font-weight:800; font-size:14px;">
              💾 Complete Intake & Open Patient Case File →
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('#close-reg-modal').onclick = closeModal;
  modal.querySelector('#btn-cancel-reg').onclick = closeModal;

  // Auto age calculate from DOB
  const dobInput = modal.querySelector('#reg-dob');
  const ageInput = modal.querySelector('#reg-age');
  dobInput.addEventListener('change', () => {
    if (dobInput.value) {
      const birth = new Date(dobInput.value);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      const calcAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calcAge >= 0 && calcAge < 120) {
        ageInput.value = calcAge;
      }
    }
  });

  // Vitals quick presets
  modal.querySelectorAll('.quick-vitals-preset').forEach(btn => {
    btn.onclick = () => {
      const p = btn.getAttribute('data-preset');
      if (p === 'normal') {
        modal.querySelector('#v-hr').value = 72;
        modal.querySelector('#v-sys').value = 118;
        modal.querySelector('#v-dia').value = 78;
        modal.querySelector('#v-spo2').value = 99;
        modal.querySelector('#v-temp').value = 98.4;
        modal.querySelector('#v-sugar').value = 95;
      } else if (p === 'fever') {
        modal.querySelector('#v-hr').value = 96;
        modal.querySelector('#v-sys').value = 124;
        modal.querySelector('#v-dia').value = 82;
        modal.querySelector('#v-spo2').value = 97;
        modal.querySelector('#v-temp').value = 101.5;
        modal.querySelector('#v-sugar').value = 110;
      } else if (p === 'htn') {
        modal.querySelector('#v-hr').value = 84;
        modal.querySelector('#v-sys').value = 146;
        modal.querySelector('#v-dia').value = 92;
        modal.querySelector('#v-spo2').value = 98;
        modal.querySelector('#v-temp').value = 98.6;
        modal.querySelector('#v-sugar').value = 135;
      }
    };
  });

  // Dynamic Medicine Rows Logic
  const medContainer = modal.querySelector('#med-rows-container');

  function createMedRow(name = '', dose = '1 Tablet', time = 'Morning 8:00 AM (Post-Breakfast)', inst = 'Take with water after food') {
    const row = document.createElement('div');
    row.className = 'med-row card';
    row.style.cssText = 'padding:10px 14px; background:#FFFFFF; border:1px solid #D1C4E9; margin:0;';
    row.innerHTML = `
      <div style="display:grid; grid-template-columns: 2fr 1fr 1.6fr 1.6fr 36px; gap:8px; align-items:center;">
        <div>
          <label class="form-label" style="font-size:11px; margin-bottom:2px;">Medicine Name</label>
          <input type="text" class="form-control med-name" value="${name}" required placeholder="e.g. Tab Azithromycin 500mg" style="font-size:12.5px;">
        </div>
        <div>
          <label class="form-label" style="font-size:11px; margin-bottom:2px;">Dosage</label>
          <input type="text" class="form-control med-dose" value="${dose}" placeholder="1 Tablet" style="font-size:12.5px;">
        </div>
        <div>
          <label class="form-label" style="font-size:11px; margin-bottom:2px;">Scheduled Time</label>
          <select class="form-control med-time" style="font-size:12px;">
            <option value="Morning 8:00 AM (Post-Breakfast)" ${time.includes('Morning') ? 'selected' : ''}>🌅 Morning 8:00 AM</option>
            <option value="Afternoon 1:00 PM (Post-Lunch)" ${time.includes('Afternoon') ? 'selected' : ''}>☀️ Afternoon 1:00 PM</option>
            <option value="Night 8:00 PM (Post-Dinner)" ${time.includes('Night') ? 'selected' : ''}>🌙 Night 8:00 PM</option>
            <option value="Bedtime 10:00 PM" ${time.includes('Bedtime') ? 'selected' : ''}>🛏️ Bedtime 10:00 PM</option>
            <option value="Empty Stomach 7:00 AM" ${time.includes('Empty') ? 'selected' : ''}>☕ Empty Stomach 7:00 AM</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-size:11px; margin-bottom:2px;">Instructions</label>
          <input type="text" class="form-control med-inst" value="${inst}" style="font-size:12px;">
        </div>
        <button type="button" class="btn btn-outline btn-sm remove-med-btn" style="border:none; color:var(--danger); font-size:16px; margin-top:16px; padding:0;" title="Remove row">✕</button>
      </div>
    `;
    row.querySelector('.remove-med-btn').onclick = () => row.remove();
    return row;
  }

  // Hook remove on default rows
  modal.querySelectorAll('.remove-med-btn').forEach(b => {
    b.onclick = () => b.closest('.med-row')?.remove();
  });

  // Add med row button
  modal.querySelector('#btn-add-med-row').onclick = () => {
    medContainer.appendChild(createMedRow('', '1 Tablet', 'Afternoon 1:00 PM (Post-Lunch)', 'Take after meals'));
  };

  // Prescription presets
  modal.querySelectorAll('.rx-preset-btn').forEach(btn => {
    btn.onclick = () => {
      const p = btn.getAttribute('data-preset');
      medContainer.innerHTML = '';
      if (p === 'resp') {
        medContainer.appendChild(createMedRow('Foracort 200 Inhaler', '1 Puff', 'Morning 8:00 AM (Post-Breakfast)', 'Use with spacer'));
        medContainer.appendChild(createMedRow('Cough Relief Syrup', '10 ml', 'Afternoon 1:00 PM (Post-Lunch)', 'Drink warm water after syrup'));
        medContainer.appendChild(createMedRow('Tab Montelukast 10mg', '1 Tablet', 'Night 8:00 PM (Post-Dinner)', 'Take at night before sleep'));
      } else if (p === 'fever') {
        medContainer.appendChild(createMedRow('Tab Paracetamol 650mg', '1 Tablet', 'Morning 8:00 AM (Post-Breakfast)', 'Take with food for fever/body ache'));
        medContainer.appendChild(createMedRow('Tab Azithromycin 500mg', '1 Tablet', 'Afternoon 1:00 PM (Post-Lunch)', 'Once daily after lunch x 3 days'));
        medContainer.appendChild(createMedRow('Tab Paracetamol 650mg', '1 Tablet', 'Night 8:00 PM (Post-Dinner)', 'If temperature > 99°F'));
      } else if (p === 'cardio') {
        medContainer.appendChild(createMedRow('Tab Amlodipine 5mg', '1 Tablet', 'Morning 8:00 AM (Post-Breakfast)', 'Daily morning BP control'));
        medContainer.appendChild(createMedRow('Tab Clopidogrel 75mg', '1 Tablet', 'Afternoon 1:00 PM (Post-Lunch)', 'Take post lunch with water'));
        medContainer.appendChild(createMedRow('Tab Atorvastatin 20mg', '1 Tablet', 'Bedtime 10:00 PM', 'Cholesterol management at bedtime'));
      }
    };
  });

  // Submit Handler
  modal.querySelector('#patient-registration-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector('#btn-submit-reg');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Vitals & Registering...';

    const fd = new FormData(e.target);

    // Collect structured medicines
    const medications = [];
    modal.querySelectorAll('.med-row').forEach(row => {
      const name = row.querySelector('.med-name')?.value.trim();
      const dose = row.querySelector('.med-dose')?.value.trim();
      const time = row.querySelector('.med-time')?.value;
      const inst = row.querySelector('.med-inst')?.value.trim();
      if (name) {
        medications.push({ name, dosage: dose, time_slot: time, instructions: inst });
      }
    });

    const payload = {
      name: fd.get('name'),
      dob: fd.get('dob'),
      age: parseInt(fd.get('age')) || 30,
      gender: fd.get('gender'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      emergency_contact: fd.get('emergency_contact'),
      emergency_phone: fd.get('phone'),
      blood_group: fd.get('blood_group'),
      insurance_provider: 'Ayushman Bharat (PMJAY)',
      insurance_policy_no: 'PMJAY-MH-2026',
      abha_id: `14-${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}`,
      // Vitals
      heart_rate: parseInt(fd.get('heart_rate')) || 76,
      systolic_bp: parseInt(fd.get('systolic_bp')) || 120,
      diastolic_bp: parseInt(fd.get('diastolic_bp')) || 80,
      spo2: parseInt(fd.get('spo2')) || 98,
      temp_f: parseFloat(fd.get('temp_f')) || 98.4,
      fasting_glucose: parseInt(fd.get('fasting_glucose')) || 105,
      weight_kg: parseFloat(fd.get('weight_kg')) || 68.0,
      // Clinical Case
      chief_complaint: fd.get('chief_complaint'),
      diagnosis: fd.get('diagnosis'),
      allergies: fd.get('allergies'),
      medications: medications,
      send_sms: modal.querySelector('#reg-send-sms')?.checked
    };

    try {
      const res = await apiRequest('/api/patients', 'POST', payload);
      alert(`✓ Patient ${payload.name} successfully registered!\n• Vitals Recorded: BP ${payload.systolic_bp}/${payload.diastolic_bp}, HR ${payload.heart_rate} bpm\n• Prescribed Medicines: ${medications.length} items\n• Case ID: ${res.case_id || 'Active'}`);
      closeModal();
      if (onSuccess) onSuccess(res.patient_id, res.case_id);
    } catch (err) {
      alert("Registration Error: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Complete Intake & Open Patient Case File →';
    }
  };
}
