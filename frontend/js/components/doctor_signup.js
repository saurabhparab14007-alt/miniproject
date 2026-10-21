// Doctor & Hospital Clinical Signup with Aadhaar & Medical Council Verification
import { apiRequest, setAuthToken } from '../api.js';

export function openDoctorSignupModal(onSuccess) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'doctor-signup-modal';

  modal.innerHTML = `
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-title">
          <span>🩺</span> Doctor & Hospital Clinical Onboarding
        </div>
        <button class="btn btn-outline btn-sm" id="close-signup-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <div style="background: rgba(8, 126, 139, 0.08); border-left: 4px solid var(--primary); padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <div style="font-weight: 700; color: var(--primary); font-size: 13.5px; margin-bottom: 3px;">
            🇮🇳 Mandatory Clinical Identity Verification
          </div>
          <p style="font-size: 12.5px; color: var(--text-main); line-height: 1.4;">
            As per Indian National Medical Commission (NMC) regulations and DPDP Act 2023, all medical practitioners and hospital administrators must verify their <strong>12-digit Aadhaar Card</strong> and <strong>State Medical Council / MCI / Clinical Establishment Registration Number</strong>.
          </p>
        </div>

        <form id="doctor-signup-form">
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label class="form-label">Full Clinical Name *</label>
              <input type="text" class="form-control" name="full_name" required placeholder="e.g. Dr. Rajesh Kulkarni, MD">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Role *</label>
              <select class="form-control" name="role" id="signup-role-select">
                <option value="doctor">Physician / Doctor</option>
                <option value="admin">Hospital Administrator</option>
                <option value="nurse">Clinical Nurse</option>
                <option value="receptionist">Receptionist / Front Desk</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Choose Username *</label>
              <input type="text" class="form-control" name="username" required placeholder="e.g. dr_kulkarni">
            </div>
            <div class="form-group">
              <label class="form-label">Password *</label>
              <input type="password" class="form-control" name="password" required placeholder="••••••••">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" class="form-control" name="email" required placeholder="doctor@hospital.in">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number *</label>
              <input type="tel" class="form-control" name="phone" required placeholder="+91 98201 23456">
            </div>
          </div>

          <!-- AADHAAR CARD VERIFICATION (Mandatory for Doctor/Admin) -->
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label" style="color: var(--primary);">
                🆔 12-Digit Aadhaar Card Number *
              </label>
              <input type="text" class="form-control" name="aadhaar_number" id="signup-aadhaar" maxlength="14" required placeholder="e.g. 5481 9283 4819">
              <div id="aadhaar-feedback" style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                Strict UIDAI Verhoeff validation applied; stored securely masked as XXXX-XXXX-1234
              </div>
            </div>

            <!-- MEDICAL COUNCIL / HOSPITAL REGISTRATION NUMBER -->
            <div class="form-group" style="flex: 1;">
              <label class="form-label" style="color: var(--primary);">
                📜 Medical Registration Number (NMC / MCI / State Council) *
              </label>
              <input type="text" class="form-control" name="registration_number" id="signup-reg" required placeholder="e.g. NMC/MCI-84920/2012 or MMC-48912">
              <div id="reg-feedback" style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                State Medical Council or National Medical Commission verified ID
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Clinical Department</label>
            <input type="text" class="form-control" name="department" placeholder="e.g. General Medicine / Pulmonology / Cardiology / Emergency Care">
          </div>

          <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top: 20px; background: transparent;">
            <button type="button" class="btn btn-outline" id="btn-cancel-signup">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-signup">
              🛡️ Verify Credentials & Register
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#close-signup-modal').onclick = closeModal;
  modal.querySelector('#btn-cancel-signup').onclick = closeModal;

  // Form submit
  modal.querySelector('#doctor-signup-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#btn-submit-signup');
    btn.disabled = true;
    btn.textContent = 'Verifying Credentials...';

    const formData = new FormData(e.target);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password'),
      role: formData.get('role'),
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      aadhaar_number: formData.get('aadhaar_number'),
      registration_number: formData.get('registration_number'),
      department: formData.get('department') || 'General Medicine'
    };

    try {
      const res = await apiRequest('/api/auth/register', 'POST', payload);
      alert(res.message);
      if (res.token) {
        setAuthToken(res.token);
      }
      closeModal();
      if (onSuccess) onSuccess(res.user);
    } catch (err) {
      alert("Registration & Verification Error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🛡️ Verify Credentials & Register';
    }
  };
}
