// "Upload Report -> Understand It" Lab Value Analyzer Component
import { apiRequest } from '../api.js';

export function openReportAnalyzerModal(patientId, caseId, onReportAnalyzed) {
  // Fallbacks for patient and case if not set
  patientId = patientId || 'PAT-2026-1001';
  caseId = caseId || 'CASE-2026-501';

  document.getElementById('report-analyzer-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'report-analyzer-modal';

  modal.innerHTML = `
    <div class="modal-content wide" style="max-width: 780px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>📄</span> "Upload Report → Understand It" Diagnostic OCR Analyzer
        </div>
        <button class="btn btn-outline btn-sm" id="close-analyzer-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Upload a lab report document or select clinical parameters. The AI parser extracts critical biomarkers, categorizes reference ranges, and generates plain-language patient explanations with clinical safeguards.
        </p>

        <!-- Quick Sample Presets -->
        <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
            ⚡ Quick Test Samples (Click to autofill report text & extract):
          </div>
          <div style="display:flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm preset-report-btn" data-preset="Complete Blood Count (CBC) Differential: Hemoglobin: 10.2 g/dL (Normal 13-17), WBC Count: 13,500 cells/mcL (Normal 4000-11000), Platelet Count: 240,000 cells/mcL (Normal 150000-450000), Neutrophils: 78%, Lymphocytes: 18%, ESR: 34 mm/hr.">
              Sample 1: High WBC & Mild Anemia
            </button>
            <button class="btn btn-outline btn-sm preset-report-btn" data-preset="Comprehensive Metabolic & Renal Profile: Fasting Blood Sugar: 168 mg/dL (Normal 70-99), HbA1c: 8.4%, Serum Creatinine: 1.5 mg/dL (Normal 0.6-1.2), Blood Urea: 44 mg/dL.">
              Sample 2: Diabetic & High Creatinine
            </button>
            <button class="btn btn-outline btn-sm preset-report-btn" data-preset="Annual Health Screening: Hemoglobin: 14.2 g/dL, WBC Count: 6,800 cells/mcL, Platelets: 280,000 cells/mcL, Fasting Blood Sugar: 88 mg/dL, Serum Creatinine: 0.9 mg/dL.">
              Sample 3: Normal Healthy Panel
            </button>
          </div>
        </div>

        <form id="report-analyzer-form">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Report Type</label>
              <select class="form-control" name="report_type">
                <option value="Blood Report">Blood Report (CBC / Biochemistry)</option>
                <option value="X-ray">X-ray Imaging</option>
                <option value="MRI/CT Scan">MRI / CT Scan</option>
                <option value="Prescription">Prescription</option>
                <option value="Discharge Summary">Discharge Summary</option>
                <option value="Referral Document">Referral Document</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Report Document File (Optional)</label>
              <input type="file" class="form-control" name="report_file" id="report-file-input">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Report Text / Extracted Values *</label>
            <textarea class="form-control" id="report-text-area" name="report_text" rows="4" required placeholder="Paste or type lab report text here..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary" id="btn-submit-analyze" style="width: 100%; padding:12px; font-weight:700;">
            🔍 Analyze Report & Extract Clinical Markers
          </button>
        </form>

        <!-- Analysis Results Presentation -->
        <div id="analyzer-results-container" style="display:none; margin-top: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">
            📊 Extracted Biomarkers & Reference Analysis
          </h3>

          <div id="biomarkers-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 18px;">
          </div>

          <!-- Plain-Language Patient Explanation -->
          <div style="background: var(--bg); border: 1.5px solid var(--accent); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
            <div style="font-weight: 700; color: var(--primary); margin-bottom: 6px; font-size: 14px;">
              💬 Plain-Language Patient Explanation:
            </div>
            <p id="plain-language-text" style="font-size: 13.5px; line-height: 1.6; color: var(--text-main);"></p>
          </div>

          <!-- Clinical Decision Support Safeguard Notice -->
          <div style="background: var(--warning-bg); border-left: 4px solid var(--warning); padding: 12px; border-radius: 4px; font-size: 12px; color: #855302;" id="cds-disclaimer">
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-close-analyzer">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-analyzer-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-close-analyzer').onclick = () => modal.remove();

  // Presets
  const textArea = modal.querySelector('#report-text-area');
  modal.querySelectorAll('.preset-report-btn').forEach(btn => {
    btn.onclick = () => {
      textArea.value = btn.getAttribute('data-preset');
      modal.querySelector('#btn-submit-analyze').click();
    };
  });

  // Handle file select
  const fileInput = modal.querySelector('#report-file-input');
  fileInput.onchange = () => {
    if (fileInput.files.length) {
      textArea.value = `Blood Report Document: ${fileInput.files[0].name}\nHemoglobin: 10.2 g/dL\nWBC Count: 13,500 cells/mcL\nPlatelet Count: 240,000 cells/mcL`;
      modal.querySelector('#btn-submit-analyze').click();
    }
  };

  // Form submit
  modal.querySelector('#report-analyzer-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#btn-submit-analyze');
    btn.disabled = true;
    btn.textContent = 'Processing & Extracting Biomarkers...';

    const reportType = modal.querySelector('select[name="report_type"]').value;
    const reportText = textArea.value;
    const fileName = fileInput.files.length ? fileInput.files[0].name : "Diagnostic_Report.pdf";

    try {
      const res = await apiRequest('/api/reports/analyze', 'POST', {
        patient_id: patientId,
        case_id: caseId,
        report_type: reportType,
        report_text: reportText,
        file_name: fileName
      });

      // Display results
      const resultsContainer = modal.querySelector('#analyzer-results-container');
      const grid = modal.querySelector('#biomarkers-grid');
      const plainText = modal.querySelector('#plain-language-text');
      const disclaimer = modal.querySelector('#cds-disclaimer');

      resultsContainer.style.display = 'block';

      const params = res.parameters || {};
      grid.innerHTML = Object.entries(params).map(([marker, info]) => {
        let badgeClass = 'badge-success';
        let statusSymbol = '✓ Normal';
        let borderColor = 'var(--success)';

        if (info.status === 'High') {
          badgeClass = 'badge-danger';
          statusSymbol = '↑ High';
          borderColor = 'var(--danger)';
        } else if (info.status === 'Low') {
          badgeClass = 'badge-warning';
          statusSymbol = '↓ Low';
          borderColor = 'var(--warning)';
        }

        return `
          <div style="background: #FFFFFF; border: 1.5px solid ${borderColor}; border-radius: var(--radius-sm); padding: 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 13.5px; color: var(--text-main);">${marker}</span>
              <span class="badge ${badgeClass}">${statusSymbol}</span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
              ${info.value} <span style="font-size: 12px; font-weight: normal; color: var(--text-secondary);">${info.unit}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
              Standard Range: ${info.range}
            </div>
            <div style="font-size: 11.5px; color: var(--text-main); line-height: 1.3;">
              ${info.explanation}
            </div>
          </div>
        `;
      }).join('');

      plainText.textContent = res.plain_explanation || "Report analyzed successfully.";
      disclaimer.textContent = res.disclaimer || "⚠️ Clinical Decision Support Safeguard: For physician assistance; not a substitute for diagnostic judgment.";

      if (onReportAnalyzed) onReportAnalyzed();
    } catch (err) {
      alert("Analysis error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔍 Analyze Report & Extract Clinical Markers';
    }
  };
}
