// Medication Schedule Generator & Voice Pill Reminders
export function renderMedicationSchedule(container, prescriptionText) {
  const schedule = parsePrescriptionToDailySchedule(prescriptionText);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap:wrap; gap:10px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">💊 Automated Daily Medication Schedule</h3>
        <p style="font-size: 12px; color: var(--text-secondary);">Generates patient dosage timeline (8 AM, 1 PM, 8 PM) with voice audio alerts & SMS notifications</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" id="btn-play-voice-reminder" style="font-size:12px;">
          🔊 Test Voice Audio
        </button>
        <button class="btn btn-primary btn-sm" id="btn-send-med-sms-action" style="font-size:12px; background:#0284C7; border-color:#0284C7;">
          📱 Send Schedule SMS to My Phone
        </button>
      </div>
    </div>

    <!-- Daily Slots Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <!-- Morning Slot 8:00 AM -->
      <div style="background: #FFFFFF; border: 1.5px solid var(--accent); border-radius: var(--radius-md); padding: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <div style="font-weight: 800; color: var(--primary); font-size: 15px;">🌅 8:00 AM (Morning)</div>
          <span class="badge badge-info">After Breakfast</span>
        </div>
        <ul style="padding-left: 20px; font-size: 13.5px; color: var(--text-main); line-height: 1.8;">
          ${schedule.morning.map(m => `<li><strong>${m.name}</strong> - ${m.instructions}</li>`).join('')}
        </ul>
        <button class="btn btn-outline btn-sm test-slot-voice" data-slot="morning" style="margin-top: 12px; width: 100%;">
          🔊 Play Morning Reminder
        </button>
      </div>

      <!-- Afternoon Slot 1:00 PM -->
      <div style="background: #FFFFFF; border: 1.5px solid var(--secondary); border-radius: var(--radius-md); padding: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <div style="font-weight: 800; color: var(--secondary); font-size: 15px;">☀️ 1:00 PM (Afternoon)</div>
          <span class="badge badge-info">Post Lunch</span>
        </div>
        <ul style="padding-left: 20px; font-size: 13.5px; color: var(--text-main); line-height: 1.8;">
          ${schedule.afternoon.map(m => `<li><strong>${m.name}</strong> - ${m.instructions}</li>`).join('')}
        </ul>
        <button class="btn btn-outline btn-sm test-slot-voice" data-slot="afternoon" style="margin-top: 12px; width: 100%;">
          🔊 Play Afternoon Reminder
        </button>
      </div>

      <!-- Evening Slot 8:00 PM -->
      <div style="background: #FFFFFF; border: 1.5px solid var(--primary); border-radius: var(--radius-md); padding: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <div style="font-weight: 800; color: var(--text-main); font-size: 15px;">🌙 8:00 PM (Night)</div>
          <span class="badge badge-info">Post Dinner</span>
        </div>
        <ul style="padding-left: 20px; font-size: 13.5px; color: var(--text-main); line-height: 1.8;">
          ${schedule.evening.map(m => `<li><strong>${m.name}</strong> - ${m.instructions}</li>`).join('')}
        </ul>
        <button class="btn btn-outline btn-sm test-slot-voice" data-slot="evening" style="margin-top: 12px; width: 100%;">
          🔊 Play Evening Reminder
        </button>
      </div>
    </div>

    <!-- Raw Prescription Reference -->
    <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px;">
      <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">ORIGINAL CLINICAL RX TEXT:</span>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: var(--text-main); margin-top: 6px;">${prescriptionText || 'No active prescription entered.'}</pre>
    </div>
  `;

  // Voice speech triggers
  const speakReminder = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Audio: " + text);
    }
  };

  container.querySelector('#btn-play-voice-reminder')?.addEventListener('click', () => {
    speakReminder("Hello. It is time to take your evening medicine. Please drink water and take prescribed medicines.");
  });

  container.querySelectorAll('.test-slot-voice').forEach(btn => {
    btn.onclick = () => {
      const slot = btn.getAttribute('data-slot');
      if (slot === 'morning') speakReminder("Good morning. It is time to take your morning medicines.");
      if (slot === 'afternoon') speakReminder("Good afternoon. It is time to take your afternoon medicines after lunch.");
      if (slot === 'evening') speakReminder("Good evening. It is time to take your evening medicine.");
    };
  });

  container.querySelector('#btn-send-med-sms-action')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Sending SMS...';
    try {
      const token = localStorage.getItem('sanjeevani_token');
      const res = await fetch('/api/sms/send-my-schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to dispatch medication SMS');
      alert(`✓ ${data.message}\nCheck your keypad phone handset or view the live incoming message in the Keypad Phone Simulator at /keypad.`);
    } catch(err) {
      alert('SMS Dispatch Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
}

function parsePrescriptionToDailySchedule(prescription) {
  const text = (prescription || '').toLowerCase();
  const rawLines = (prescription || '').split('\n').filter(l => l.trim().length > 0);

  const morning = [];
  const afternoon = [];
  const evening = [];

  // Parse custom structured lines from doctor intake
  rawLines.forEach(line => {
    const l = line.toLowerCase();
    // Clean leading numbers e.g. "1. "
    const cleanLine = line.replace(/^[0-9]+[.\)]\s*/, '').trim();

    if (l.includes('morning') || l.includes('8:00 am') || l.includes('8 am') || l.includes('breakfast') || l.includes('7:00 am') || l.includes('empty stomach')) {
      morning.push({ name: cleanLine.split(' at ')[0].split(' - ')[0], instructions: cleanLine });
    } else if (l.includes('afternoon') || l.includes('1:00 pm') || l.includes('1 pm') || l.includes('lunch') || l.includes('2:00 pm')) {
      afternoon.push({ name: cleanLine.split(' at ')[0].split(' - ')[0], instructions: cleanLine });
    } else if (l.includes('night') || l.includes('evening') || l.includes('8:00 pm') || l.includes('8 pm') || l.includes('dinner') || l.includes('bedtime') || l.includes('10:00 pm')) {
      evening.push({ name: cleanLine.split(' at ')[0].split(' - ')[0], instructions: cleanLine });
    }
  });

  // Pharmacotherapy keyword matches
  if (text.includes('foracort') || text.includes('inhaler') || text.includes('budesonide')) {
    if (!morning.some(m => m.name.toLowerCase().includes('foracort'))) morning.push({ name: 'Foracort 200 Inhaler', instructions: '1 puff with spacer after breakfast' });
    if (!evening.some(m => m.name.toLowerCase().includes('foracort'))) evening.push({ name: 'Foracort 200 Inhaler', instructions: '1 puff with spacer before bedtime' });
  }

  if (text.includes('paracetamol') || text.includes('pcm') || text.includes('650')) {
    if (!morning.some(m => m.name.toLowerCase().includes('paracetamol'))) morning.push({ name: 'Tab Paracetamol 650mg', instructions: '1 tablet post breakfast' });
    if (!evening.some(m => m.name.toLowerCase().includes('paracetamol'))) evening.push({ name: 'Tab Paracetamol 650mg', instructions: '1 tablet post dinner' });
  }

  if (text.includes('azithromycin') || text.includes('antibiotic')) {
    if (!morning.some(m => m.name.toLowerCase().includes('azithromycin'))) morning.push({ name: 'Tab Azithromycin 500mg', instructions: '1 tablet once daily x 3 days' });
  }

  if (text.includes('montelukast')) {
    if (!evening.some(m => m.name.toLowerCase().includes('montelukast'))) evening.push({ name: 'Tab Montelukast 10mg', instructions: '1 tablet at bedtime' });
  }

  if (text.includes('amlodipine')) {
    if (!morning.some(m => m.name.toLowerCase().includes('amlodipine'))) morning.push({ name: 'Tab Amlodipine 5mg', instructions: '1 tablet morning' });
  }

  if (text.includes('cough') || text.includes('syrup')) {
    if (!afternoon.some(m => m.name.toLowerCase().includes('cough'))) afternoon.push({ name: 'Cough Relief Syrup', instructions: '10ml after lunch' });
    if (!evening.some(m => m.name.toLowerCase().includes('cough'))) evening.push({ name: 'Cough Relief Syrup', instructions: '10ml before sleep' });
  }

  // Fallbacks if nothing matched
  if (!morning.length && !afternoon.length && !evening.length) {
    morning.push({ name: 'Prescribed Morning Medication', instructions: 'Take post-breakfast as advised by doctor' });
    afternoon.push({ name: 'Supportive Hydration & Fluids', instructions: 'Drink warm water and maintain nutrition' });
    evening.push({ name: 'Prescribed Evening Medication', instructions: 'Take post-dinner as advised by doctor' });
  }

  return { morning, afternoon, evening };
}