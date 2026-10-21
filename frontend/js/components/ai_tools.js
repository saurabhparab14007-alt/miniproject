// AI Tools Suite: Voice-to-Case, Ask Patient's Case, Handover Mode, FHIR Transfer
import { apiRequest } from '../api.js';

// ==================== 1. DOCTOR VOICE-TO-CASE ====================
export function openVoiceToCaseModal(onStructuredParsed) {
  // Remove existing if any
  document.getElementById('voice-case-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'voice-case-modal';

  modal.innerHTML = `
    <div class="modal-content wide" style="max-width: 720px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>🎙️</span> Doctor Voice-to-Case Clinical Dictation
        </div>
        <button class="btn btn-outline btn-sm" id="close-voice-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Speak or dictate clinical observations naturally. The AI engine automatically parses unstructured speech into Chief Complaint, Symptoms, Medical History, Diagnosis, and Treatment Plan.
        </p>

        <!-- Recording Control & Live Wave -->
        <div style="background: var(--bg); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 18px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-danger" id="btn-toggle-mic" style="border-radius: 50%; width: 50px; height: 50px; padding:0; display:flex; align-items:center; justify-content:center; font-size: 20px;">
              🎙️
            </button>
            <div>
              <div id="mic-status-label" style="font-weight: 700; font-size: 14px; color: var(--text-main);">Click Mic to Start Speaking</div>
              <div style="font-size: 12px; color: var(--text-secondary);" id="mic-sub-label">Web Speech Recognition (Hindi / English / Marathi)</div>
            </div>
          </div>

          <div id="recording-anim" class="recording-wave" style="display: none;">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
        </div>

        <!-- Dictated raw text box -->
        <div class="form-group">
          <label class="form-label">Dictated Speech Transcript (You can also type or edit here)</label>
          <textarea id="voice-transcript-text" class="form-control" rows="3" placeholder="Speak into microphone or select a quick clinical sample below..."></textarea>
        </div>

        <!-- Quick Demo Clinical Presets -->
        <div style="margin-bottom: 20px;">
          <label class="form-label" style="font-size: 12px; color: var(--text-secondary);">⚡ Click to Load Real Clinical Dictation Samples:</label>
          <div style="display:flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm preset-btn" data-preset="Patient has high fever for three days, mild cough, known history of bronchial asthma, allergic to penicillin, prescribe foracort inhaler and paracetamol 650.">
              Sample 1: Acute Asthma & Fever
            </button>
            <button class="btn btn-outline btn-sm preset-btn" data-preset="Patient reports bilateral knee joint pain and morning stiffness for one month, history of hypertension, no known drug allergy, order RA factor and start hydroxychloroquine 200mg.">
              Sample 2: Joint Pain & RA
            </button>
            <button class="btn btn-outline btn-sm preset-btn" data-preset="Patient complains of chest heaviness on climbing stairs, known diabetic and CAD with stent, allergic to aspirin, advised stress echocardiogram, continue clopidogrel 75mg.">
              Sample 3: Exertional Angina
            </button>
          </div>
        </div>

        <!-- Parsed Structured Output Preview -->
        <div id="parsed-results-box" style="display: none; background: #FFFFFF; border: 1.5px solid var(--accent); border-radius: var(--radius-md); padding: 18px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--primary); margin-bottom: 12px;">
            ✨ AI Structured Clinical Case Extraction:
          </div>
          <div id="parsed-fields-container" style="font-size: 13px; line-height: 1.6;"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-cancel-voice">Close</button>
        <button class="btn btn-secondary" id="btn-parse-voice">Extract Structure with AI</button>
        <button class="btn btn-primary" id="btn-apply-voice" style="display: none;">Apply to Case Undertaking</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const transcriptBox = modal.querySelector('#voice-transcript-text');
  const micBtn = modal.querySelector('#btn-toggle-mic');
  const micStatus = modal.querySelector('#mic-status-label');
  const micSubLabel = modal.querySelector('#mic-sub-label');
  const waveAnim = modal.querySelector('#recording-anim');
  let isRecording = false;
  let recognition = null;

  // Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) transcriptBox.value = (transcriptBox.value + ' ' + finalTranscript).trim();
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error", e);
        micStatus.textContent = "Click a sample below or type";
        micSubLabel.textContent = "Mic input error (fallback to text / samples)";
        isRecording = false;
        waveAnim.style.display = 'none';
        micBtn.style.backgroundColor = "var(--danger)";
      };
    } catch (e) {
      console.warn("Speech API init:", e);
    }
  } else {
    micStatus.textContent = "Type or select a clinical preset";
    micSubLabel.textContent = "Web Speech API not supported in this browser; text parsing active";
  }

  micBtn.onclick = () => {
    if (!isRecording) {
      if (recognition) {
        try { recognition.start(); } catch(e){}
      }
      isRecording = true;
      micStatus.textContent = "Listening... Speak now";
      micBtn.style.backgroundColor = "var(--primary)";
      waveAnim.style.display = "flex";
    } else {
      if (recognition) {
        try { recognition.stop(); } catch(e){}
      }
      isRecording = false;
      micStatus.textContent = "Recording Paused (Click to speak)";
      micBtn.style.backgroundColor = "var(--danger)";
      waveAnim.style.display = "none";
    }
  };

  // Preset buttons
  modal.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      transcriptBox.value = btn.getAttribute('data-preset');
      modal.querySelector('#btn-parse-voice').click();
    };
  });

  // AI Parse
  let lastParsedData = null;
  modal.querySelector('#btn-parse-voice').onclick = async () => {
    const text = transcriptBox.value.trim();
    if (!text) {
      alert("Please dictate into microphone or choose a sample first.");
      return;
    }
    const parseBtn = modal.querySelector('#btn-parse-voice');
    parseBtn.textContent = "Extracting Structure...";
    parseBtn.disabled = true;

    try {
      const parsed = await apiRequest('/api/cases/voice-parse', 'POST', { spoken_text: text });
      lastParsedData = parsed;

      modal.querySelector('#parsed-results-box').style.display = 'block';
      modal.querySelector('#parsed-fields-container').innerHTML = `
        <div style="background:#F5FAFC; border:1px solid #D9E2EC; border-radius:8px; padding:12px; margin-bottom:8px;">
          <strong style="color:var(--primary);">Chief Complaint:</strong> ${parsed.chief_complaint || 'N/A'}<br>
          <strong style="color:var(--primary);">Symptoms:</strong> ${parsed.symptoms || 'N/A'}<br>
          <strong style="color:var(--primary);">Medical History:</strong> ${parsed.medical_history || 'N/A'}<br>
          <strong style="color:var(--primary);">Working Diagnosis:</strong> <span style="font-weight:700; color:#2E7D32;">${parsed.diagnosis || 'N/A'}</span><br>
          <strong style="color:var(--primary);">Treatment Plan:</strong> ${parsed.treatment_plan || 'N/A'}
        </div>
      `;

      modal.querySelector('#btn-apply-voice').style.display = 'inline-flex';
    } catch (e) {
      alert("Parsing error: " + e.message);
    } finally {
      parseBtn.textContent = "Extract Structure with AI";
      parseBtn.disabled = false;
    }
  };

  // Apply button
  modal.querySelector('#btn-apply-voice').onclick = () => {
    if (lastParsedData) {
      if (onStructuredParsed) {
        onStructuredParsed(lastParsedData);
      }
      alert("✓ Voice dictation successfully applied to clinical case undertaking!");
    }
    modal.remove();
  };

  modal.querySelector('#close-voice-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-voice').onclick = () => modal.remove();
}

// ==================== 2. 30-SECOND DOCTOR HANDOVER ====================
export async function openDoctorHandoverModal(caseId) {
  document.getElementById('handover-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'handover-modal';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 620px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>⭐</span> 30-Second Doctor Handover Card
        </div>
        <button class="btn btn-outline btn-sm" id="close-handover-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body" id="handover-body">
        <p style="text-align: center; color: var(--text-secondary);">Generating rapid clinical handover summary...</p>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-copy-handover">📋 Copy Handover Card</button>
        <button class="btn btn-primary" id="btn-close-handover">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-handover-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-close-handover').onclick = () => modal.remove();

  try {
    const data = await apiRequest(`/api/cases/${caseId}/handover`);
    const body = modal.querySelector('#handover-body');

    body.innerHTML = `
      <div style="border-left: 4px solid var(--primary); padding-left: 14px; margin-bottom: 18px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main);">${data.patient_name} (${data.age}${data.gender[0]})</h3>
        <div style="font-size: 12px; color: var(--text-secondary);">Case ID: ${data.case_id}</div>
      </div>

      <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 14px;">
        <strong style="color: var(--primary); font-size: 13px;">Diagnosis:</strong>
        <p style="font-size: 13.5px; font-weight: 600; margin-top: 4px; color: var(--text-main);">${data.diagnosis}</p>
      </div>

      <div style="background: var(--danger-bg); border: 1px solid var(--danger); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px;">
        <strong style="color: var(--danger); font-size: 12.5px;">🚨 Critical Allergies / Alerts:</strong>
        <p style="font-size: 13px; font-weight: 700; color: var(--danger); margin-top: 2px;">${data.critical_allergies}</p>
      </div>

      <div style="margin-bottom: 14px;">
        <strong style="font-size: 13px; color: var(--text-main);">Clinical Handover Brief:</strong>
        <p style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin-top: 4px;">${data.handover_summary}</p>
      </div>

      <div style="background: #FFFFFF; border: 1.5px solid var(--accent); border-radius: var(--radius-sm); padding: 14px;">
        <strong style="font-size: 13px; color: var(--primary);">Immediate Next Actions (Next Shift):</strong>
        <ul style="padding-left: 20px; font-size: 12.5px; margin-top: 6px; line-height: 1.8;">
          ${(data.immediate_next_steps || []).map(step => `<li><strong>${step}</strong></li>`).join('')}
        </ul>
      </div>
    `;

    modal.querySelector('#btn-copy-handover').onclick = () => {
      navigator.clipboard.writeText(`HANDOVER CARD: ${data.patient_name} (${data.case_id})
Diagnosis: ${data.diagnosis}
Allergies: ${data.critical_allergies}
Brief: ${data.handover_summary}`);
      alert("Handover summary copied to clipboard!");
    };
  } catch (err) {
    modal.querySelector('#handover-body').innerHTML = `<p style="color:var(--danger);">Error loading handover card: ${err.message}</p>`;
  }
}

// ==================== 3. ASK PATIENT'S CASE AI ASSISTANT ====================
export function openAskPatientCaseModal(patientId, caseId) {
  document.getElementById('ask-case-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'ask-case-modal';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 640px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>🤖</span> Ask This Patient's Case (AI Clinical Query)
        </div>
        <button class="btn btn-outline btn-sm" id="close-ask-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">
          Ask natural clinical questions across this patient's case records, prior visits, allergies, and uploaded lab investigations.
        </p>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 16px;">
          <button class="btn btn-outline btn-sm quick-q-btn" data-q="What are the patient's critical drug allergies and contraindications?">
            Allergies & Contraindications?
          </button>
          <button class="btn btn-outline btn-sm quick-q-btn" data-q="What is the latest blood sugar and renal status?">
            Latest Labs & Creatinine?
          </button>
          <button class="btn btn-outline btn-sm quick-q-btn" data-q="Summarize current treatment and pending follow-up date.">
            Active Treatment Plan?
          </button>
        </div>

        <form id="ask-case-form">
          <div class="form-group">
            <input type="text" class="form-control" id="ask-query-input" placeholder="Type your clinical question about this patient..." required>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-submit-ask" style="width:100%;">Ask Case Assistant</button>
        </form>

        <div id="ask-response-box" style="display:none; margin-top: 18px; background: var(--bg); border: 1.5px solid var(--primary); border-radius: var(--radius-sm); padding: 16px;">
          <strong style="color: var(--primary); font-size: 13px;">Clinical Answer:</strong>
          <p id="ask-response-text" style="font-size: 13.5px; line-height: 1.6; margin-top: 6px;"></p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-close-ask">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-ask-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-close-ask').onclick = () => modal.remove();

  const queryInput = modal.querySelector('#ask-query-input');
  modal.querySelectorAll('.quick-q-btn').forEach(btn => {
    btn.onclick = () => {
      queryInput.value = btn.getAttribute('data-q');
      modal.querySelector('#btn-submit-ask').click();
    };
  });

  modal.querySelector('#ask-case-form').onsubmit = async (e) => {
    e.preventDefault();
    const q = queryInput.value.trim();
    if (!q) return;

    const btn = modal.querySelector('#btn-submit-ask');
    btn.disabled = true;
    btn.textContent = "Querying authorized records...";

    try {
      const res = await apiRequest('/api/cases/ask', 'POST', {
        case_id: caseId,
        patient_id: patientId,
        query: q
      });

      modal.querySelector('#ask-response-box').style.display = 'block';
      modal.querySelector('#ask-response-text').textContent = res.answer || "No specific details found in authorized records.";
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Ask Case Assistant";
    }
  };
}

// ==================== 4. FHIR R4 CASE TRANSFER ====================
export async function openFhirTransferModal(caseId) {
  document.getElementById('fhir-transfer-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'fhir-transfer-modal';

  modal.innerHTML = `
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-title">
          <span>🏥</span> Inter-Facility FHIR R4 Clinical Case Transfer
        </div>
        <button class="btn btn-outline btn-sm" id="close-fhir-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Exports full case undertaking into standard HL7 FHIR R4 Bundle format for secure transfer to District Civil Hospitals or PMJAY Tertiary Centres.
        </p>

        <form id="fhir-transfer-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Receiving Healthcare Institution *</label>
              <select class="form-control" name="to_facility" required>
                <option value="District Civil Hospital, Alibaug">District Civil Hospital, Alibaug</option>
                <option value="KEM Hospital & Medical College, Mumbai">KEM Hospital & Medical College, Mumbai</option>
                <option value="AIIMS Nagpur Tertiary Centre">AIIMS Nagpur Tertiary Centre</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Transfer Urgency / Priority *</label>
              <select class="form-control" name="priority">
                <option value="URGENT">🔴 Urgent (Immediate Bed Booking)</option>
                <option value="ROUTINE">🟢 Routine Referral</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Clinical Transfer Justification *</label>
            <textarea class="form-control" name="reason" rows="2" required placeholder="e.g. Higher-tier ICU management, advanced coronary angiography..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary" id="btn-submit-fhir" style="width:100%;">
            🚀 Generate FHIR Bundle & Dispatch Transfer
          </button>
        </form>

        <div id="fhir-bundle-preview" style="display:none; margin-top:20px;">
          <h4 style="font-size: 14px; font-weight:700; color:var(--text-main); margin-bottom:8px;">Standard FHIR R4 Bundle Payload Preview:</h4>
          <pre id="fhir-json-code" style="background:#0B1F33; color:#A7F3D0; padding:16px; border-radius:8px; font-size:12px; max-height:240px; overflow:auto;"></pre>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-close-fhir">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-fhir-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-close-fhir').onclick = () => modal.remove();

  modal.querySelector('#fhir-transfer-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const btn = modal.querySelector('#btn-submit-fhir');
    btn.disabled = true;
    btn.textContent = "Generating FHIR Bundle...";

    try {
      const res = await apiRequest('/api/transfer/fhir-bundle', 'POST', {
        case_id: caseId,
        from_facility: "Raigad Sub-District Hospital",
        to_facility: formData.get('to_facility'),
        reason: formData.get('reason'),
        priority: formData.get('priority')
      });

      modal.querySelector('#fhir-bundle-preview').style.display = 'block';
      modal.querySelector('#fhir-json-code').textContent = JSON.stringify(res.fhir_bundle, null, 2);
      alert(`✓ FHIR Transfer dispatched! Transfer ID: ${res.transfer_id}`);
    } catch (err) {
      alert("Transfer error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "🚀 Generate FHIR Bundle & Dispatch Transfer";
    }
  };
}
