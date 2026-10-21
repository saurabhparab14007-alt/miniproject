// Nearby Medical Stores & Pharmacies Locator Component
import { apiRequest } from '../api.js';

export async function renderPharmaciesLocator(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
      <div>
        <h1 style="font-size:22px; font-weight:800; color:var(--text-main);">📍 Nearby Medical Stores & Pharmacies</h1>
        <p style="font-size:13px; color:var(--text-secondary);">
          Locate nearby chemists for emergency medicines with phone numbers and 24x7 stock availability
        </p>
      </div>
      <div style="background:var(--danger-bg); border:1px solid var(--danger); padding:8px 14px; border-radius:var(--radius-sm); font-size:12px; color:var(--danger); font-weight:700;">
        🚨 National Ambulance Helpline: 108 | Emergency: 112
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="card" style="padding:16px 20px; margin-bottom:20px;">
      <div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
        <div style="flex:1; min-width:240px;">
          <input type="text" id="pharmacy-med-search" class="form-control" placeholder="Search by required medicine (e.g. Inhaler, Insulin, Paracetamol, Azithromycin)...">
        </div>
        <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; cursor:pointer;">
          <input type="checkbox" id="filter-24h-checkbox"> 🌙 24x7 Pharmacies Only
        </label>
        <button class="btn btn-primary" id="btn-search-pharmacies">Search Stores</button>
      </div>
    </div>

    <!-- Pharmacies Cards Grid -->
    <div id="pharmacies-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
      <div style="text-align:center; padding:30px; color:var(--text-secondary);">Loading nearby medical stores...</div>
    </div>
  `;

  const searchInput = container.querySelector('#pharmacy-med-search');
  const checkbox24 = container.querySelector('#filter-24h-checkbox');
  const searchBtn = container.querySelector('#btn-search-pharmacies');

  const loadStores = async () => {
    const med = searchInput.value.trim();
    const only24 = checkbox24.checked;
    let url = `/api/pharmacies?only_24h=${only24}`;
    if (med) url += `&medicine=${encodeURIComponent(med)}`;

    try {
      const data = await apiRequest(url);
      const grid = container.querySelector('#pharmacies-cards-grid');

      if (!data.pharmacies || data.pharmacies.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px;">No medical stores found matching criteria.</div>`;
        return;
      }

      grid.innerHTML = data.pharmacies.map(store => `
        <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between; border-top: 3px solid ${store.is_24_hours ? 'var(--primary)' : 'var(--secondary)'};">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${store.name}</h3>
              <span class="badge ${store.is_24_hours ? 'badge-success' : 'badge-info'}">
                ${store.is_24_hours ? '24 Hours Open' : store.open_hours}
              </span>
            </div>

            <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:10px;">
              📍 ${store.address} (${store.distance_km} km away)
            </div>

            <!-- Phone Numbers with Click-to-Call -->
            <div style="background:var(--bg); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:10px; margin-bottom:12px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:4px;">
                Direct Contact & Ordering
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:700; color:var(--text-main);">${store.phone}</span>
                <a href="tel:${store.phone}" class="btn btn-primary btn-sm" style="text-decoration:none;">
                  📞 Call Store
                </a>
              </div>
              ${store.emergency_phone ? `
                <div style="font-size:11.5px; color:var(--secondary); margin-top:4px;">
                  Emergency Hotline: <a href="tel:${store.emergency_phone}" style="color:var(--secondary); font-weight:600;">${store.emergency_phone}</a>
                </div>
              ` : ''}
            </div>

            <!-- In-stock emergency medicines -->
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px;">
                Verified In-Stock Meds:
              </div>
              <div style="font-size:12px; color:var(--text-main); line-height:1.4;">
                ${store.emergency_medicines.split(',').map(m => `<span class="badge" style="background:#E6FFFA; color:#087E8B; margin-right:4px; margin-bottom:4px;">${m.trim()}</span>`).join(' ')}
              </div>
            </div>
          </div>

          <div style="margin-top:14px; border-top:1px solid var(--border-light); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--success); font-weight:700;">🟢 ${store.stock_status}</span>
            <span style="font-size:12px; color:var(--text-secondary);">⭐ ${store.rating} Rating</span>
          </div>
        </div>
      `).join('');

    } catch (e) {
      console.warn("Failed to load pharmacies", e);
    }
  };

  searchBtn.onclick = loadStores;
  searchInput.onkeydown = (e) => { if (e.key === 'Enter') loadStores(); };
  checkbox24.onchange = loadStores;

  loadStores();
}
