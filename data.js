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