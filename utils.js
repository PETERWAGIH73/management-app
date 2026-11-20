function getClientId() {
  let id = localStorage[CLIENT_ID_KEY];
  if (!id) {
    id = "client-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage[CLIENT_ID_KEY] = id;
  }
  return id;
}

function ensureAllFields(obj) {
  if (!obj || typeof obj !== "object") obj = {};
  obj.traders ||= [];
  obj.customStores ||= [];
  obj.deletedStoreIds ||= [];
  obj.viewMode ||= "desktop";
  obj.stores ||= {};
  Object.keys(obj.stores).forEach(sid => {
    const s = obj.stores[sid];
    if (!s || typeof s !== "object") obj.stores[sid] = blank();
    else {
      const ss = obj.stores[sid];
      ss.sales ||= [];
      ss.exchange ||= [];
      ss.traderTx ||= [];
      ss.sellers ||= [];
      ss.fixedSellers ||= [];
      ss.items ||= [];
      ss.expenses ||= [];
      ss.withdrawals ||= [];
      ss.partners ||= [];
      ss.salaryMode ||= "percent";
      ss.commissionPercent ||= 0;
      ss.salaryFixedTotal ||= 0;
    }
  });
  return obj;
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage[LS_KEY] || localStorage["h1group"]);
    if (saved) return ensureAllFields(saved);
  } catch (e) { console.error(e); }
  return ensureAllFields({
    traders: [], customStores: [], deletedStoreIds: [], viewMode: "desktop",
    stores: {}
  });
}

function saveLocal() {
  try {
    localStorage[LS_KEY] = JSON.stringify(data);
    localStorage[LS_BACKUP_KEY] = JSON.stringify(data);
  } catch (e) { console.error("Local save failed:", e); }
}

function save() {
  saveLocal();
  if (isAdmin) saveRemote();
}

function saveRemote() {
  if (!fbDB || !isAdmin) return Promise.resolve();
  isSyncing = true;
  updateSyncUI();
  return fbDB.ref(FB_PATH).set({
    ...data,
    _lastUpdate: { clientId, time: Date.now() }
  }).then(() => {
    localStorage[LS_LAST_SYNC] = Date.now().toString();
  }).catch(e => {
    console.error("Firebase save failed:", e);
  }).finally(() => {
    isSyncing = false;
    updateSyncUI();
  });
}

function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function n(v) { return Number(v) || 0; }
function m(v) {
  const r = Math.round(n(v) * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
function q(sid) { return document.getElementById(sid); }
function st() { return data.stores[store] || blank(); }
function meta() { return stores.find(s => s[0] === store); }

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function parts(v) {
  const x = (v || today()).split("-");
  return { y: n(x[0]) || new Date().getFullYear(), m: n(x[1]) || new Date().getMonth()+1, d: n(x[2]) || new Date().getDate() };
}

function dateBox(prefix, value) {
  const p = parts(value);
  const cy = new Date().getFullYear();
  let years = "", months = "", days = "";
  for (let y = cy - 6; y <= cy + 2; y++) years += `<option value="${y}" ${p.y===y?"selected":""}>${y}</option>`;
  for (let mo = 1; mo <= 12; mo++) months += `<option value="${mo}" ${p.m===mo?"selected":""}>${mo}</option>`;
  for (let d = 1; d <= 31; d++) days += `<option value="${d}" ${p.d===d?"selected":""}>${d}</option>`;
  return `<div class="datebox"><select id="${prefix}Y">${years}</select><select id="${prefix}M">${months}</select><select id="${prefix}D">${days}</select></div>`;
}

function dateValue(prefix) {
  const y = n(q(prefix+"Y").value);
  const mo = n(q(prefix+"M").value);
  let d = n(q(prefix+"D").value);
  const last = new Date(y, mo, 0).getDate();
  if (d > last) d = last;
  const v = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  if (store) localStorage[`managementDate:${store}:${prefix}`] = v;
  return v;
}

function thisMonth() {
  const d = new Date();
  const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,"0");
  const last = new Date(y, d.getMonth()+1, 0).getDate();
  return { from: `${y}-${mo}-01`, to: `${y}-${mo}-${last}` };
}

function loadSavedPeriod() {
  try {
    const s = JSON.parse(localStorage.managementPeriod);
    if (s?.from && s?.to) return s;
  } catch (e) {}
  return thisMonth();
}

function setPeriod(p) { period = p; localStorage.managementPeriod = JSON.stringify(period); }
function rememberedDate(prefix) { return localStorage[`managementDate:${store}:${prefix}`] || today(); }
function inP(d) { return d && (!period.from || d >= period.from) && (!period.to || d <= period.to); }
function fl(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(x => inP(x.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function unifiedOutflows() {
  const shop = st();
  return [
    ...fl(shop.expenses).map(x => ({ 
      ...x, 
      source: "expenses", 
      type: x.type || "مصروفات كاش", 
      item: x.item 
    })),
    ...fl(shop.traderTx).filter(x => x.kind === "payment").map(x => ({ ...x, source: "traderTx", type: "دفعة تاجر", item: `دفعة تاجر - ${x.name}` })),
    ...fl(shop.withdrawals).map(x => ({ ...x, source: "withdrawals", type: "مسحوبات", item: `مسحوبات - ${x.seller}` }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function unifiedOutflowTotal() {
  return unifiedOutflows().reduce((s, x) => s + n(x.amount), 0);
}

function syncCustomStores() {
  data.customStores ||= [];
  data.deletedStoreIds ||= [];
  data.stores ||= {};

  const baseStores = [
    ["cleopatra", "كليوباترا", 0],
    ["aladdin", "علاء الدين", 0],
    ["lobby", "اللوبي", 1],
    ["bardi", "البردي", 1],
    ["sindbad", "البيسين", 1],
    ["portofino", "بورتوفينو", 1]
  ];

  stores.length = 0;

  baseStores.forEach(s => {
    if (!data.deletedStoreIds.includes(s[0])) {
      stores.push(s);
      if (!data.stores[s[0]]) data.stores[s[0]] = blank();
      const ss = data.stores[s[0]];
      ss.sales ||= [];
      ss.exchange ||= [];
      ss.traderTx ||= [];
      ss.sellers ||= [];
      ss.fixedSellers ||= [];
      ss.items ||= [];
      ss.expenses ||= [];
      ss.withdrawals ||= [];
      ss.partners ||= [];
      ss.salaryMode ||= "percent";
      ss.commissionPercent ||= 0;
      ss.salaryFixedTotal ||= 0;
    }
  });

  data.customStores.forEach(s => {
    if (!Array.isArray(s) || !s[0] || !s[1]) return;
    if (data.deletedStoreIds.includes(s[0])) return;
    if (stores.some(x => x[0] === s[0])) return;
    stores.push([s[0], s[1], s[2] ? 1 : 0]);
    if (!data.stores[s[0]]) data.stores[s[0]] = blank();
    const ss = data.stores[s[0]];
    ss.sales ||= [];
    ss.exchange ||= [];
    ss.traderTx ||= [];
    ss.sellers ||= [];
    ss.fixedSellers ||= [];
    ss.items ||= [];
    ss.expenses ||= [];
    ss.withdrawals ||= [];
    ss.partners ||= [];
    ss.salaryMode ||= "percent";
    ss.commissionPercent ||= 0;
    ss.salaryFixedTotal ||= 0;
  });
}

function applyViewMode() {
  const mode = data.viewMode === "mobile" ? "mobile" : "desktop";
  document.body.classList.remove("mode-mobile", "mode-desktop");
  document.body.classList.add(mode === "mobile" ? "mode-mobile" : "mode-desktop");
  const btn = document.getElementById("modeToggleBtn");
  if (btn) btn.textContent = mode === "mobile" ? " فون" : " كمبيوتر";
}

function toggleViewMode() {
  data.viewMode = data.viewMode === "mobile" ? "desktop" : "mobile";
  save();
  applyViewMode();
}

function updateSyncUI() {
  const el = document.getElementById("syncStatus");
  const txt = document.getElementById("syncText");
  if (!el || !txt) return;
  el.classList.remove("online", "offline", "syncing");
  if (isSyncing) { el.classList.add("syncing"); txt.textContent = "جاري المزامنة..."; }
  else if (isOnline) { el.classList.add("online"); txt.textContent = "متصل"; }
  else { el.classList.add("offline"); txt.textContent = "غير متصل"; }
}