// Keypad Feature Phone Simulator Logic
import { apiRequest } from './api.js';

const lcd = document.getElementById('phone-lcd');
const lcdText = document.getElementById('lcd-screen-text');
const lcdLeftSoft = document.getElementById('lcd-left-soft');
const lcdRightSoft = document.getElementById('lcd-right-soft');
const btnCall = document.getElementById('btn-phone-call');
const btnEnd = document.getElementById('btn-phone-end');

let currentActiveCallMessage = "";
let isRinging = false;

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 30000);
  setupKeypadButtons();
  setupSMSTriggers();
  loadLatestSMS();
});

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const clockEl = document.getElementById('lcd-clock');
  if (clockEl) clockEl.textContent = timeStr;
}

function setupKeypadButtons() {
  document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playKeypadBeep();
      const val = btn.getAttribute('data-key');
      // If idle, show dialed number
      if (!isRinging) {
        lcdText.innerHTML = `
          <div style="font-size:16px; padding-top:12px; text-align:center;">
            Dialing: <strong>${val}</strong>...
          </div>
        `;
      }
    });
  });

  btnCall.addEventListener('click', () => {
    playKeypadBeep(600);
    if (isRinging) {
      // Answer call
      isRinging = false;
      lcd.style.background = '#86EFAC';
      lcdText.innerHTML = `
        <div style="text-align:center; padding-top:10px;">
          <div>🔊 CALL CONNECTED</div>
          <div style="font-size:11px; margin-top:6px;">Primary Health Center</div>
          <div style="font-size:10.5px; margin-top:10px; color:#064E3B;">
            "${currentActiveCallMessage}"
          </div>
        </div>
      `;
      speakText(currentActiveCallMessage);
      lcdLeftSoft.textContent = "Mute";
      lcdRightSoft.textContent = "End";
    }
  });

  btnEnd.addEventListener('click', () => {
    playKeypadBeep(300);
    isRinging = false;
    window.speechSynthesis?.cancel();
    lcd.style.background = '#A3E635';
    lcdLeftSoft.textContent = "Options";
    lcdRightSoft.textContent = "Back";
    loadLatestSMS();
  });
}

async function loadLatestSMS() {
  try {
    const logs = await apiRequest('/api/sms/logs');
    if (logs && logs.length > 0) {
      const latest = logs[0];
      displaySMSOnLCD(latest);
    }
  } catch (e) {
    console.warn("Could not load SMS logs", e);
  }
}

function displaySMSOnLCD(sms) {
  lcd.style.background = '#A3E635';
  lcdText.innerHTML = `
    <div style="font-size:11px; margin-bottom:4px; font-weight:800; border-bottom:1px solid #0F172A; padding-bottom:2px;">
      📩 SMS: ${sms.patient_name}
    </div>
    <div style="font-size:12px; line-height:1.35; padding-top:2px;">
      ${sms.content}
    </div>
  `;
}

function setupSMSTriggers() {
  document.querySelectorAll('.test-sms-trigger').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-type');
      const lang = btn.getAttribute('data-lang');
      try {
        const res = await apiRequest('/api/sms/send', 'POST', {
          phone: "+91 98765 43210",
          patient_name: "Aarnav Sharma",
          template_key: type,
          language: lang,
          medicine_name: "Foracort Inhaler 200",
          dose_time: "8:00 PM"
        });
        displaySMSOnLCD(res);
        playSMSBeep();
      } catch (e) {
        alert("Failed to dispatch SMS: " + e.message);
      }
    });
  });

  document.getElementById('btn-trigger-test-call')?.addEventListener('click', async () => {
    const msg = "नमस्ते अर्णव। प्राथमिक स्वास्थ्य केंद्र से सूचना: आपकी रात 8 बजे की दवा का समय हो गया है। कृपया समय पर दवा लें।";
    currentActiveCallMessage = msg;
    isRinging = true;

    // Trigger ring visual
    lcd.style.background = '#FDE047';
    lcdText.innerHTML = `
      <div style="text-align:center; padding-top:14px; animation:blink 0.8s infinite;">
        <div style="font-size:16px;">📞 INCOMING CALL</div>
        <div style="font-size:12px; margin-top:8px;">Govt Health Centre</div>
        <div style="font-size:10px; margin-top:14px;">Press [CALL] to Answer</div>
      </div>
    `;
    lcdLeftSoft.textContent = "Answer";
    lcdRightSoft.textContent = "Reject";
    playRingtone();
  });
}

function playKeypadBeep(freq = 440) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playSMSBeep() {
  playKeypadBeep(880);
  setTimeout(() => playKeypadBeep(1100), 100);
}

function playRingtone() {
  playKeypadBeep(520);
  setTimeout(() => playKeypadBeep(650), 200);
  setTimeout(() => playKeypadBeep(780), 400);
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}
