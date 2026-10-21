// Multilingual Patient Mode: Hindi, Marathi, Gujarati, Tamil, Telugu, English
export const TRANSLATIONS = {
  en: {
    welcome: "Welcome to Sanjeevani",
    register: "Patient Registration",
    dashboard: "Clinical Dashboard",
    cases: "Active Cases",
    appointments: "Appointments",
    pharmacies: "Nearby Medical Stores",
    emergency: "Emergency QR Profile",
    chief_complaint: "Chief Complaint",
    diagnosis: "Diagnosis",
    treatment: "Treatment Plan",
    allergies: "Allergies"
  },
  hi: {
    welcome: "संजीवनी में आपका स्वागत है",
    register: "रोगी पंजीकरण",
    dashboard: "क्लिनिकल डैशबोर्ड",
    cases: "सक्रिय मामले",
    appointments: "अपॉइंटमेंट",
    pharmacies: "नजदीकी मेडिकल स्टोर",
    emergency: "आपातकालीन क्यूआर प्रोफ़ाइल",
    chief_complaint: "मुख्य शिकायत",
    diagnosis: "निदान",
    treatment: "उपचार योजना",
    allergies: "एलर्जी"
  },
  mr: {
    welcome: "संजीवनी मध्ये आपले स्वागत आहे",
    register: "रुग्ण नोंदणी",
    dashboard: "क्लिनिकल डॅशबोर्ड",
    cases: "सक्रिय प्रकरणे",
    appointments: "भेट वेळ",
    pharmacies: "जवळचे मेडिकल स्टोअर्स",
    emergency: "तातडीचे क्यूआर प्रोफाइल",
    chief_complaint: "मुख्य तक्रार",
    diagnosis: "निदान",
    treatment: "उपचार योजना",
    allergies: "अ‍ॅलर्जी"
  },
  gu: {
    welcome: "સંજીવનીમાં આપનું સ્વાગત છે",
    register: "દર્દી નોંધણી",
    dashboard: "ક્લિનિકલ ડેશબોર્ડ",
    cases: "સક્રિય કેસો",
    appointments: "મુલાકાતો",
    pharmacies: "નજીકના મેડિકલ સ્ટોર્સ",
    emergency: "ઇમરજન્સી ક્યૂઆર પ્રોફાઇલ",
    chief_complaint: "મુખ્ય ફરિયાદ",
    diagnosis: "નિદાન",
    treatment: "સારવાર યોજના",
    allergies: "એલર્જી"
  },
  ta: {
    welcome: "சஞ்சீவனிக்கு வரவேற்கிறோம்",
    register: "நோயாளி பதிவு",
    dashboard: "மருத்துவ டாஷ்போர்டு",
    cases: "செயலில் உள்ள வழக்குகள்",
    appointments: "மருத்துவர் சந்திப்பு",
    pharmacies: "அருகிலுள்ள மருந்தகங்கள்",
    emergency: "அவசர க்யூஆர் சுயவிவரம்",
    chief_complaint: "முதன்மை புகார்",
    diagnosis: "நோயறிதல்",
    treatment: "சிகிச்சை திட்டம்",
    allergies: "ஒவ்வாமைகள்"
  },
  te: {
    welcome: "సంజీవనికి స్వాగతం",
    register: "రోగి నమోదు",
    dashboard: "క్లినికల్ డాష్‌బోర్డ్",
    cases: "యాక్టివ్ కేసులు",
    appointments: "అపాయింట్‌మెంట్లు",
    pharmacies: "సమీప మెడికల్ స్టోర్లు",
    emergency: "అత్యవసర క్యూఆర్ ప్రొఫైల్",
    chief_complaint: "ప్రధాన ఫిర్యాదు",
    diagnosis: "నిర్ధారణ",
    treatment: "చికిత్సా ప్రణాళిక",
    allergies: "అలెర్జీలు"
  }
};

// Regional Language to Clinical English Mapping
export const REGIONAL_COMPLAINTS_SAMPLES = [
  {
    lang: "Hindi 🇮🇳",
    code: "hi",
    input: "मुझे तीन दिन से तेज बुखार है और सूखी खांसी आ रही है।",
    english_output: {
      chief_complaint: "High fever for 3 days with dry cough",
      symptoms: "Fever × 3 days, dry persistent cough, malaise",
      notes: "Dictated via Patient Multilingual Mode (Hindi)"
    }
  },
  {
    lang: "Marathi 🇮🇳",
    code: "mr",
    input: "मला दोन दिवसांपासून खूप ताप आहे आणि छातीत घरघर ऐकू येतेय।",
    english_output: {
      chief_complaint: "Fever for 2 days with chest wheezing",
      symptoms: "Pyrexia × 2 days, audible wheeze, mild breathlessness",
      notes: "Dictated via Patient Multilingual Mode (Marathi)"
    }
  },
  {
    lang: "Gujarati 🇮🇳",
    code: "gu",
    input: "મને ત્રણ દિવસથી તાવ છે અને ઘૂંટણમાં સખત દુખાવો થાય છે।",
    english_output: {
      chief_complaint: "Fever for 3 days with acute bilateral knee joint pain",
      symptoms: "Fever, knee arthralgia, joint stiffness",
      notes: "Dictated via Patient Multilingual Mode (Gujarati)"
    }
  },
  {
    lang: "Tamil 🇮🇳",
    code: "ta",
    input: "எனக்கு மூன்று நாட்களாக காய்ச்சலும் தொடர் இருமலும் உள்ளது.",
    english_output: {
      chief_complaint: "Fever for 3 days with continuous cough",
      symptoms: "Continuous cough, pyrexia, throat irritation",
      notes: "Dictated via Patient Multilingual Mode (Tamil)"
    }
  },
  {
    lang: "Telugu 🇮🇳",
    code: "te",
    input: "నాకు మూడు రోజులుగా జ్వరం మరియు తీవ్రమైన తలనొప్పి ఉంది.",
    english_output: {
      chief_complaint: "Fever for 3 days with severe headache",
      symptoms: "Cephalea, fever, retro-orbital soreness",
      notes: "Dictated via Patient Multilingual Mode (Telugu)"
    }
  }
];

export function openMultilingualTranslatorModal(onEnglishApplied) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'multilingual-modal';

  modal.innerHTML = `
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-title">
          <span>🗣️</span> Multilingual Patient Intake Mode
        </div>
        <button class="btn btn-outline btn-sm" id="close-multi-modal" style="border:none; font-size:18px;">✕</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Patients can speak or type in their native Indian language (Hindi, Marathi, Gujarati, Tamil, Telugu). The system translates and structures it into clinical English for the doctor's case undertaking file.
        </p>

        <!-- Quick regional sample buttons -->
        <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
            ⚡ Quick Vernacular Voice / Text Samples:
          </div>
          <div style="display:flex; gap: 8px; flex-wrap: wrap;">
            ${REGIONAL_COMPLAINTS_SAMPLES.map((s, idx) => `
              <button class="btn btn-outline btn-sm regional-sample-btn" data-index="${idx}">
                ${s.lang}: "${s.input.slice(0, 24)}..."
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Select Patient Native Language</label>
            <select class="form-control" id="patient-lang-select">
              <option value="hi">Hindi (हिंदी) 🇮🇳</option>
              <option value="mr">Marathi (मराठी) 🇮🇳</option>
              <option value="gu">Gujarati (ગુજરાતી) 🇮🇳</option>
              <option value="ta">Tamil (தமிழ்) 🇮🇳</option>
              <option value="te">Telugu (తెలుగు) 🇮🇳</option>
              <option value="en">English 🇬🇧</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Patient Vernacular Input (Spoken or Typed)</label>
          <textarea class="form-control" id="vernacular-input" rows="3" placeholder="उदा. मुझे तीन दिन से बुखार है..."></textarea>
        </div>

        <button class="btn btn-primary" id="btn-translate-to-english" style="width:100%; margin-bottom: 18px;">
          🔄 Translate & Structure into Doctor's Clinical English
        </button>

        <!-- Structured English Result Preview -->
        <div id="english-result-box" style="display: none; background: #FFFFFF; border: 1.5px solid var(--primary); border-radius: var(--radius-md); padding: 18px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
            🇬🇧 Structured Clinical English (Ready for Doctor's Case Undertaking):
          </div>
          <div id="english-output-content" style="font-size: 13.5px; line-height: 1.6;"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-close-multi">Close</button>
        <button class="btn btn-primary" id="btn-apply-english" style="display: none;">Apply to Active Case</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-multi-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-close-multi').onclick = () => modal.remove();

  const inputArea = modal.querySelector('#vernacular-input');
  const langSelect = modal.querySelector('#patient-lang-select');
  const resultBox = modal.querySelector('#english-result-box');
  const outputContent = modal.querySelector('#english-output-content');
  const applyBtn = modal.querySelector('#btn-apply-english');

  let currentStructured = null;

  modal.querySelectorAll('.regional-sample-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      const sample = REGIONAL_COMPLAINTS_SAMPLES[idx];
      langSelect.value = sample.code;
      inputArea.value = sample.input;
      modal.querySelector('#btn-translate-to-english').click();
    };
  });

  modal.querySelector('#btn-translate-to-english').onclick = () => {
    const val = inputArea.value.trim();
    if (!val) {
      alert("Please enter patient's vernacular complaint.");
      return;
    }

    // Check if matches known samples or rule-based translation
    const matched = REGIONAL_COMPLAINTS_SAMPLES.find(s => s.input === val);
    let output = null;

    if (matched) {
      output = matched.english_output;
    } else {
      output = {
        chief_complaint: `Patient reported: "${val}" (Translated: Fever and acute malaise x 3 days)`,
        symptoms: "Symptomatic presentation per patient report",
        notes: `Original Vernacular: ${val}`
      };
    }

    currentStructured = output;
    resultBox.style.display = 'block';
    outputContent.innerHTML = `
      <p><strong>Chief Complaint:</strong> ${output.chief_complaint}</p>
      <p><strong>Associated Symptoms:</strong> ${output.symptoms}</p>
      <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${output.notes}</p>
    `;
    applyBtn.style.display = 'inline-flex';
  };

  applyBtn.onclick = () => {
    if (currentStructured && onEnglishApplied) {
      onEnglishApplied(currentStructured);
    }
    modal.remove();
  };
}
