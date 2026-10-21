// ASHA Rural Health Worker Controller
import { apiRequest } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  loadTodaysWork();
  loadFamilyGraph();
  setupAudioSynthesis();
  setupSignout();
});

function setupSignout() {
  const btn = document.getElementById('btn-asha-signout');
  if (btn) {
    btn.onclick = () => {
      localStorage.removeItem('sanjeevani_token');
      localStorage.removeItem('sanjeevani_user');
      window.location.href = '/login?msg=logged_out';
    };
  }
}

async function loadTodaysWork() {
  const container = document.getElementById('visits-list-container');
  try {
    const data = await apiRequest('/api/rural/todays-work');
    document.getElementById('count-visits').textContent = data.stats.patients_to_visit || 0;
    document.getElementById('count-followups').textContent = data.stats.followups_due || 0;
    document.getElementById('count-vaccines').textContent = data.stats.vaccinations_pending || 0;
    document.getElementById('count-priority').textContent = data.stats.high_priority_cases || 0;

    if (!data.priority_visits || data.priority_visits.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px;">आज कोणतीही तातडीची भेट शिल्लक नाही.</div>`;
      return;
    }

    container.innerHTML = data.priority_visits.map(p => `
      <div style="background:#FFFFFF; border:1.5px solid ${p.high_priority ? 'var(--danger)' : 'var(--border)'}; border-radius:10px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="font-size:15px; color:var(--text-main);">${p.name} (${p.age} वर्षे, ${p.gender})</strong>
            <span class="badge ${p.high_priority ? 'badge-danger' : 'badge-info'}">${p.relation}</span>
            ${p.is_pregnant_anc ? `<span class="badge badge-warning">🤰 ANC गरोदर माता</span>` : ''}
            ${p.immunization_status === 'Overdue' ? `<span class="badge badge-danger">💉 लसीकरण बाकी</span>` : ''}
          </div>
          <div style="font-size:12.5px; color:var(--text-secondary); margin-top:3px;">
            घर: ${p.head_name} | पत्ता: ${p.address} (${p.village_name})
          </div>
          <div style="font-size:13px; color:var(--primary); font-weight:600; margin-top:4px;">
            ⚠️ आरोग्य स्थिती: ${p.chronic_condition}
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm btn-speak-patient" data-name="${p.name}" data-cond="${p.chronic_condition}">
            🔊 ऐका
          </button>
          <button class="btn btn-primary btn-sm btn-send-keypad-sms" data-phone="+91 98205 11223" data-name="${p.name}">
            💬 कीपॅड SMS पाठवा
          </button>
          <button class="btn btn-secondary btn-sm btn-trigger-voice-call" data-phone="+91 98205 11223" data-name="${p.name}" data-cond="${p.chronic_condition}">
            📞 व्हॉईस कॉल करा
          </button>
        </div>
      </div>
    `).join('');

    // Attach actions
    container.querySelectorAll('.btn-speak-patient').forEach(btn => {
      btn.onclick = () => {
        speakText(`रुग्ण ${btn.getAttribute('data-name')}. स्थिती: ${btn.getAttribute('data-cond')}. आज तपासणी आवश्यक.`);
      };
    });

    container.querySelectorAll('.btn-send-keypad-sms').forEach(btn => {
      btn.onclick = async () => {
        const name = btn.getAttribute('data-name');
        const phone = btn.getAttribute('data-phone');
        try {
          const res = await apiRequest('/api/sms/send', 'POST', {
            phone: phone,
            patient_name: name,
            template_key: 'asha_visit',
            language: 'mr'
          });
          alert(`कीपॅड फोनवर एसएमएस पाठवला गेला:\n"${res.content}"`);
        } catch (e) {
          alert("SMS Error: " + e.message);
        }
      };
    });

    container.querySelectorAll('.btn-trigger-voice-call').forEach(btn => {
      btn.onclick = async () => {
        const name = btn.getAttribute('data-name');
        const phone = btn.getAttribute('data-phone');
        const msg = `नमस्कार ${name}. मी आशा सेविका सुनीता. आज तुमच्या घरी आरोग्य तपासणीसाठी येत आहे.`;
        try {
          await apiRequest('/api/sms/call', 'POST', {
            phone: phone,
            patient_name: name,
            spoken_message: msg,
            language: 'mr'
          });
          speakText(msg);
          alert(`ऑटोमेटेड फोन कॉल लागला आहे: "${msg}"`);
        } catch (e) {
          alert("Call Error: " + e.message);
        }
      };
    });

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);">${err.message}</div>`;
  }
}

async function loadFamilyGraph() {
  const container = document.getElementById('family-graph-container');
  try {
    const households = await apiRequest('/api/rural/households');

    container.innerHTML = households.map(h => `
      <div class="household-card">
        <div class="household-header">
          <div>
            <strong style="font-size:15px; color:var(--text-main);">🏠 ${h.head_name} कुटुंब (${h.household_id})</strong>
            <div style="font-size:12px; color:var(--text-secondary);">${h.address} | रेशन: ${h.ration_card_type}</div>
          </div>
          <span class="badge ${h.high_risk_flag ? 'badge-danger' : 'badge-success'}">
            ${h.high_risk_flag ? '🚨 उच्च जोखीम कुटुंब (High Risk)' : '✓ सुरक्षित'}
          </span>
        </div>

        <div class="family-members-row">
          ${h.members.map(m => `
            <div class="member-bubble ${m.high_priority ? 'high-risk' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${m.name}</strong>
                <span class="badge badge-info" style="font-size:10px;">${m.relation}</span>
              </div>
              <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">
                वय: ${m.age} Y | ${m.gender}
              </div>
              <div style="font-size:11.5px; color:var(--text-main); margin-top:3px;">
                ${m.is_pregnant_anc ? '🤰 <strong>ANC गरोदर</strong><br>' : ''}
                ${m.chronic_condition !== 'None' ? `⚠️ ${m.chronic_condition}` : 'निरोगी (Healthy)'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div style="color:var(--danger);">${e.message}</div>`;
  }
}

function setupAudioSynthesis() {
  document.getElementById('btn-play-welcome-speech')?.addEventListener('click', () => {
    speakText("नमस्कार. आज आशा सेविकेसाठी ३ घरोघरी भेटी, ४ पुढील तपासण्या, आणि २ बाल लसीकरण बाकी आहेत.");
  });

  document.getElementById('btn-listen-visits-list')?.addEventListener('click', () => {
    speakText("आजची भेट यादी: सावित्री जाधव गरोदर तपासणी, आरव जाधव पेन्टाव्हॅलेंट लसीकरण, शांताबाई शिंदे उच्च रक्तदाब तपासणी.");
  });
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'mr-IN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } else {
    alert("Audio: " + text);
  }
}
