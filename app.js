/* =========================================================
   شاشة تسجيل الدخول
   ========================================================= */
function renderAuthScreen() {
  document.getElementById("root").innerHTML = `
    <div class="auth-screen">
      <div class="auth-box">
        <h1>MANAGEMENT</h1>
        <p class="subtitle">سجل دخولك للمتابعة</p>
        <div class="auth-tabs">
          <button class="auth-tab on" id="tabLogin" onclick="switchAuthTab('login')">تسجيل دخول</button>
          <button class="auth-tab" id="tabSignup" onclick="switchAuthTab('signup')">إنشاء حساب</button>
        </div>
        <div id="authForm">
          <label>الإيميل
            <input type="email" id="authEmail" placeholder="example@email.com" autocomplete="email">
          </label>
          <br>
          <label>الباسورد
            <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password">
          </label>
          <br>
          <label id="authNameWrap" style="display:none">الاسم
            <input type="text" id="authName" placeholder="ادخل اسم">
          </label>
          <br id="authNameBr" style="display:none">
          <button id="authSubmit" onclick="submitAuth()" style="width:100%;min-height:46px">تسجيل الدخول</button>
        </div>
        <div class="auth-msg" id="authMsg"></div>
        <div class="auth-link"><a onclick="resetPassword()">نسيت كلمة السر؟</a></div>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById("authEmail")?.focus(), 100);
  ["authEmail", "authPassword"].forEach(id => {
    document.getElementById(id)?.addEventListener("keypress", e => {
      if (e.key === "Enter") submitAuth();
    });
  });
}

function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById("tabLogin").classList.toggle("on", mode === "login");
  document.getElementById("tabSignup").classList.toggle("on", mode === "signup");
  document.getElementById("authNameWrap").style.display = mode === "signup" ? "" : "none";
  document.getElementById("authNameBr").style.display = mode === "signup" ? "" : "none";
  document.getElementById("authSubmit").textContent = mode === "login" ? "تسجيل الدخول" : "إنشاء حساب";
  document.getElementById("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  hideAuthMsg();
}

function showAuthMsg(text, type = "error") {
  const el = document.getElementById("authMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "auth-msg " + type;
}

function hideAuthMsg() {
  const el = document.getElementById("authMsg");
  if (el) { el.className = "auth-msg"; el.textContent = ""; }
}

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName")?.value.trim() || "";

  if (!email || !password) { showAuthMsg("اكتب الإيميل والباسورد"); return; }
  if (password.length < 6) { showAuthMsg("الباسورد لازم يكون 6 حروف على الأقل"); return; }

  const btn = document.getElementById("authSubmit");
  btn.disabled = true;
  btn.textContent = "...";

  try {
    if (authMode === "login") {
      await fbAuth.signInWithEmailAndPassword(email, password);
    } else {
      const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
      await fbDB.ref(`${USERS_PATH}/${cred.user.uid}`).set({
        email: email,
        name: name || email.split("@")[0],
        status: "pending",
        role: "viewer",
        blocked: false,
        createdAt: Date.now()
      });
      if (name) {
        try { await cred.user.updateProfile({ displayName: name }); } catch (e) {}
      }
    }
  } catch (e) {
    console.error(e);
    let msg = "حدث خطأ";
    const code = e.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      msg = "الإيميل أو الباسورد غلط";
    } else if (code === "auth/invalid-email") msg = "الإيميل غير صالح";
    else if (code === "auth/email-already-in-use") msg = "الإيميل ده مستخدم بالفعل. جرب تسجيل الدخول";
    else if (code === "auth/weak-password") msg = "الباسورد ضعيف، استخدم 6 حروف على الأقل";
    else if (code === "auth/too-many-requests") msg = "محاولات كثيرة، جرب بعد شوية";
    else if (code === "auth/network-request-failed") msg = "تحقق من اتصالك بالإنترنت";
    else msg = e.message || "حدث خطأ غير متوقع";
    showAuthMsg(msg);
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب";
  }
}

async function resetPassword() {
  const email = document.getElementById("authEmail").value.trim();
  if (!email) { showAuthMsg("اكتب الإيميل الأول"); return; }
  try {
    await fbAuth.sendPasswordResetEmail(email);
    showAuthMsg("تم إرسال رابط إعادة التعيين على إيميلك", "success");
  } catch (e) {
    showAuthMsg("فشل الإرسال. تأكد من الإيميل");
  }
}

function logout() {
  if (!confirm("تسجيل الخروج؟")) return;
  fbAuth.signOut().catch(e => console.error(e));
}

function renderWaitingScreen(status) {
  const isBlocked = status === "blocked";
  document.getElementById("root").innerHTML = `
    <div class="waiting-screen">
      <div class="waiting-box">
        <span class="waiting-icon">${isBlocked ? "⛔" : "⏳"}</span>
        <h2>${isBlocked ? "تم حظر حسابك" : "حسابك في انتظار الموافقة"}</h2>
        <p>${isBlocked
          ? "تم حظر حسابك. ."
          : "تم إنشاء حساب بنجاح ✅<br>انت في انتظار الموافقة."
        }</p>
        <button class="light" onclick="logout()" style="width:100%;min-height:46px">  خروج</button>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const userName = currentUserData?.name || currentUser?.email?.split("@")[0] || "مستخدم";
  const roleLabel = isAdmin ? " admin" : " visitor";

  document.getElementById("root").innerHTML = `
    <header class="top">
      <div class="top-right">
        <b>T.P</b>
        <div class="actions">
${currentUser.uid === ADMIN_UID ? `<button onclick="renderUsersPage()" style="background: #1a1a24; color: #8a7e9b; border: 1px solid #2c2c3e; font-weight: 900; letter-spacing: 1px;"> الأعضاء</button>` : ""}
          <button class="light" onclick="home()">الرئيسية</button>
          ${isAdmin ? `
            <button class="gray" onclick="backup()">نسخ احتياطي</button>
            <button onclick="document.getElementById('restoreFile').click()">استرجاع</button>
            <input class="file" id="restoreFile" type="file" accept="application/json" onchange="restore(event)">
            
          ` : ""}
          <button class="mode-toggle" id="modeToggleBtn" onclick="toggleViewMode()"> فون</button>
          <span class="sync-status" id="syncStatus" onclick="manualSync()" title="مزامنة">
            <span class="sync-dot"></span>
            <span id="syncText">جاري الاتصال...</span>
          </span>
          <span class="user-badge ${isAdmin ? 'admin' : ''}">${roleLabel} - ${userName}</span>
          <button class="light" onclick="logout()"> خروج</button>
        </div>
      </div>
      ${isAdmin ? `<button class="danger" onclick="clearAllData()">حذف كل البيانات</button>` : ""}
    </header>
    <main class="page" id="app"></main>
  `;
  applyViewMode();
  home();
}

function startDataSync() {
  if (!fbDB) return;

  if (!fbConnListener) {
    fbConnListener = fbDB.ref(".info/connected");
    fbConnListener.on("value", snap => {
      isOnline = snap.val() === true;
      updateSyncUI();
    });
  }

  const dataRef = fbDB.ref(FB_PATH);

  if (isAdmin) {
    if (fbDataListener) dataRef.off("value", fbDataListener);
    fbDataListener = dataRef.on("value", snap => {
      const remote = snap.val();
      if (!remote) { saveRemote(); return; }
      if (remote._lastUpdate?.clientId === clientId) return;
      delete remote._lastUpdate;
      data = ensureAllFields(remote);
      syncCustomStores();
      saveLocal();
      if (document.getElementById("app")) {
        if (store) draw();
        else home();
      }
    }, err => console.error("Read error:", err));
  } else if (canView) {
    fbDB.ref(FB_PATH).once("value").then(snap => {
      const remote = snap.val();
      if (remote) {
        delete remote._lastUpdate;
        data = ensureAllFields(remote);
        syncCustomStores();
        saveLocal();
        if (store) draw();
        else home();
      }
    }).catch(err => console.error("Viewer read error:", err));

    if (fbDataListener) dataRef.off("value", fbDataListener);
    fbDataListener = dataRef.on("value", snap => {
      const remote = snap.val();
      if (!remote) return;
      delete remote._lastUpdate;
      data = ensureAllFields(remote);
      syncCustomStores();
      saveLocal();
      if (document.getElementById("app")) {
        if (store) draw();
        else home();
      }
    }, err => console.error("Viewer read error:", err));
  }
}

function stopDataSync() {
  if (fbDataListener) {
    fbDB.ref(FB_PATH).off("value", fbDataListener);
    fbDataListener = null;
  }
}

function setupAuthListener() {
  if (authListenerSet) return;
  authListenerSet = true;

  fbAuth.onAuthStateChanged(async user => {
    stopDataSync();

    if (!user) {
      currentUser = null;
      currentUserData = null;
      isAdmin = false;
      canView = false;
      userRole = "guest";
      data = loadLocal();
      syncCustomStores();
      renderAuthScreen();
      return;
    }

    currentUser = user;
    // تسجيل حالة الاتصال
    const userStatusRef = fbDB.ref(`${USERS_PATH}/${user.uid}/status`);
    const lastSeenRef = fbDB.ref(`${USERS_PATH}/${user.uid}/lastSeen`);
    
    // تحديث لحظي
    userStatusRef.set("online");
    lastSeenRef.set(Date.now());

    // أغلاق لحظي
    userStatusRef.onDisconnect().set("offline");
    lastSeenRef.onDisconnect().set(Date.now());

    try {
      const snap = await fbDB.ref(`${USERS_PATH}/${user.uid}`).once("value");
      let userData = snap.val();

      if (!userData) {
        if (user.uid === ADMIN_UID) {
          userData = {
            email: user.email, name: user.displayName || user.email.split("@")[0],
            status: "approved", role: "admin", blocked: false, createdAt: Date.now()
          };
          await fbDB.ref(`${USERS_PATH}/${user.uid}`).set(userData);
        } else {
          userData = {
            email: user.email, name: user.displayName || user.email.split("@")[0],
            status: "pending", role: "viewer", blocked: false, createdAt: Date.now()
          };
          await fbDB.ref(`${USERS_PATH}/${user.uid}`).set(userData);
        }
      }

      currentUserData = userData;

      if (user.uid === ADMIN_UID) {
        isAdmin = true;
        canView = true;
        userRole = "admin";
        if (userData.status !== "approved" || userData.role !== "admin") {
          await fbDB.ref(`${USERS_PATH}/${user.uid}`).update({
            status: "approved", role: "admin", blocked: false
          });
        }
        data = loadLocal();
        syncCustomStores();
        period = loadSavedPeriod();
        renderDashboard();
        startDataSync();
        return;
      }

      if (userData.blocked === true) {
        userRole = "blocked"; isAdmin = false; canView = false;
        renderWaitingScreen("blocked");
        return;
      }

      if (userData.status !== "approved") {
        userRole = "pending"; isAdmin = false; canView = false;
        renderWaitingScreen("pending");
        return;
      }

      userRole = "viewer"; isAdmin = false; canView = true;
      data = loadLocal();
      syncCustomStores();
      period = loadSavedPeriod();
      renderDashboard();
      startDataSync();
    } catch (e) {
      console.error("Auth state error:", e);
      renderAuthScreen();
    }
  });
}

/* =========================================================
   التنقل والصفحات
   ========================================================= */
function home() {
  store = "";
  edit = null;
  history.replaceState(null, "", "#MANAGEMENT");

  document.getElementById("app").innerHTML = `
    <h1 class="title">MANAGEMENT</h1>
    <section class="stores">
      ${stores.map(s => `
        <div class="store-tile">
          <button class="store" onclick="openStore('${s[0]}')">${s[1]}</button>
          ${isAdmin ? `<button class="danger delete-store" onclick="deleteStore('${s[0]}')">حذف</button>` : ""}
        </div>
      `).join("")}
    </section>
    ${isAdmin ? `
      <section class="panel">
        <h2>إضافة محل</h2>
        <div class="grid grid3">
          <label>اسم المحل <input id="newStoreName" placeholder="...*N*..."></label>
          <button onclick="addStore()">إضافة </button>
        </div>
      </section>
    ` : ""}
    <button class="wide" onclick="collections()"> الخزنة</button>
    <button class="wide" onclick="traderTotals()">أرصدة التجار</button>
        ${isAdmin ? `<button class="wide" onclick="auditLog()" style="border: 2px solid var(--yellow); color: #fff;"> ✧ . RV . ✧ </button>` : ""}  `;
}

function addStore() {
  const name = q("newStoreName").value.trim();
  if (!name) return alert("اكتب اسم المحل");
  if (stores.some(s => s[1] === name)) return alert(" المحل موجود بالفعل");
  const newStore = [`store-${id()}`, name, 1];
  stores.push(newStore);
  data.customStores ||= [];
  data.customStores.push(newStore);
  data.stores[newStore[0]] = blank();
  save();
  home();
}

function deleteStore(storeId) {
  if (!isAdmin) return;
  const index = stores.findIndex(s => s[0] === storeId);
  if (index < 0) return;
  const name = stores[index][1];
  if (!confirm(`حذف محل ${name} وكل بياناته؟`)) return;
  stores.splice(index, 1);
  delete data.stores[storeId];
  data.customStores = (data.customStores || []).filter(s => s[0] !== storeId);
  if (!storeId.startsWith("store-") && !(data.deletedStoreIds || []).includes(storeId)) {
    data.deletedStoreIds ||= [];
    data.deletedStoreIds.push(storeId);
  }
  save();
  home();
}
    /* =========================================================
       مراجعة العمليات خلال اليوم
       ========================================================= */

    function auditLog() {
      if (!isAdmin) return alert("هذه الصفحة للأدمن فقط");
      
      store = "";
      edit = null;
      history.replaceState(null, "", "#MANAGEMENT-AUDIT");

      // (بيبدأ بتاريخ اليوم افتراضياً)
      const selectedDate = sessionStorage.auditDate || today();

      const shopsData = stores.map(s => {
        const shop = ensureAllFields({ stores: { [s[0]]: data.stores[s[0]] } }).stores[s[0]];
        // الفلترة على يوم واحد بس
        const inDateRange = (item) => item.date === selectedDate;

        return {
          name: s[1],
          sales: (shop.sales || []).filter(inDateRange),
          exchange: (shop.exchange || []).filter(inDateRange),
          traderTx: (shop.traderTx || []).filter(inDateRange),
          expenses: (shop.expenses || []).filter(inDateRange),
          withdrawals: (shop.withdrawals || []).filter(inDateRange)
        };
      }).filter(s => 
        s.sales.length > 0 || s.exchange.length > 0 || s.traderTx.length > 0 || s.expenses.length > 0 || s.withdrawals.length > 0
      );

      const sum = (list, field) => list.reduce((total, item) => total + n(item[field]), 0);

      document.getElementById("app").innerHTML = `
        <div class="head"><h1>✧ D. REVIEW  ✧</h1><button class="light" onclick="home()">رجوع</button></div>
        <section class="panel">
          <div class="grid">
            <label>التاريخ ${dateBox("aud", selectedDate)}</label>
            <button onclick="setAuditDay()">عرض</button>
            <button class="light" onclick="sessionStorage.auditDate='${today()}'; auditLog()">اليوم</button>
          </div>

          <div style="margin-top: 20px; font-size: 16px; line-height: 2;">
            <h3 style="color: var(--orange); border-bottom: 1px solid var(--line); padding-bottom: 10px;"> ${selectedDate}</h3>
            
            ${shopsData.length ? shopsData.map(shop => `
              <div style="background: var(--panel-soft); border: 1px solid var(--orange); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: var(--orange); margin-top: 0;">※ ${shop.name}</h3>
                
                ${shop.sales.length ? `
                  <p><strong> اليومية:</strong> 
                    ${shop.sales.map(x => `
                      ${x.euro ? `يورو: ${m(x.euro)} | ` : ""}
                      ${x.dollar ? `دولار: ${m(x.dollar)} | ` : ""}
                      ${x.gbp ? `إسترليني: ${m(x.gbp)} | ` : ""}
                      ${x.egp ? `جنيه: ${m(x.egp)} | ` : ""}
                      ${x.visa ? `فيزا: ${m(x.visa)}` : ""}
                    `).join(" | ")}
                  </p>
                ` : ""}

                ${shop.exchange.length ? `
                  <p><strong>تغيير عملة:</strong> 
                    ${shop.exchange.map(x => `
                      ${x.ea ? `${m(x.ea)} يورو بسعر ${m(x.er)} | ` : ""}
                      ${x.da ? `${m(x.da)} دولار بسعر ${m(x.dr)} | ` : ""}
                      ${x.ba ? `${m(x.ba)} إسترليني بسعر ${m(x.br)}` : ""}
                    `).join(" | ")}
                  </p>
                ` : ""}

                ${shop.traderTx.length ? `
                  <p><strong>معاملات التجار:</strong> 
                    ${shop.traderTx.map(x => `${x.name} (${traderKindLabel(x.kind)}: ${m(x.amount)})`).join(" | ")}
                  </p>
                ` : ""}

                ${shop.expenses.length ? `
                  <p><strong>مصروفات المحل:</strong> 
                    ${shop.expenses.map(x => `${x.item} (${m(x.amount)})`).join(" | ")}
                    <br><span style="color:var(--red); font-size: 14px;">إجمالي المصروفات: ${m(sum(shop.expenses, 'amount'))}</span>
                  </p>
                ` : ""}

                ${shop.withdrawals.length ? `
                  <p><strong>مسحوبات البائعين:</strong> 
                    ${shop.withdrawals.map(x => `${x.seller} سحب (${m(x.amount)})`).join(" | ")}
                  </p>
                ` : ""}
              </div>
            `).join("") : `<div class="card" style="text-align:center; margin-top:20px;">.₰ . . ✦  Peter ✦ . . ₰.</div>`}
          </div>
        </section>
      `;
    }

    function setAuditDay() {
      // بناخد التاريخ من الخانات ونحفظه في السيشن
      sessionStorage.auditDate = dateValue("aud");
      auditLog();
    }

    function setAuditPeriod() {
      sessionStorage.auditFrom = dateValue("auf");
      sessionStorage.auditTo = dateValue("aut");
      auditLog();
    }

function storeCollectionTotals(storeId) {
  const shop = ensureAllFields({ stores: { [storeId]: data.stores[storeId] } }).stores[storeId];
  const sales = shop.sales.filter(x => inP(x.date));
  const exchanged = shop.exchange.filter(x => inP(x.date));
  const expenses = shop.expenses.filter(x => inP(x.date));
  const withdrawals = shop.withdrawals.filter(x => inP(x.date));
  const traderPayments = shop.traderTx.filter(x => inP(x.date) && x.kind === "payment");
  
  const sum = (list, field) => list.reduce((total, item) => total + n(item[field]), 0);
  
  const euroSales = sum(sales, "euro");
  const dollarSales = sum(sales, "dollar");
  const gbpSales = sum(sales, "gbp");
  
  const euroChanged = sum(exchanged, "ea");
  const dollarChanged = sum(exchanged, "da");
  const gbpChanged = sum(exchanged, "ba");

  let totalConvertedEgp = 0;
  exchanged.forEach(x => {
    totalConvertedEgp += (n(x.ea) * n(x.er)) + (n(x.da) * n(x.dr)) + (n(x.ba) * n(x.br));
  });

  const cashOut = sum(expenses, "amount") + sum(withdrawals, "amount") + sum(traderPayments, "amount");

  return {
    euroSales, dollarSales, gbpSales, euroChanged, dollarChanged, gbpChanged,
    euro: euroSales - euroChanged, dollar: dollarSales - dollarChanged, gbp: gbpSales - gbpChanged,
    egp: sum(sales, "egp"), visa: sum(sales, "visa"), totalConvertedEgp, cashOut
  };
}

function selectedCollectionStoreIds() {
  const availableIds = stores.map(s => s[0]);
  try {
    const saved = JSON.parse(localStorage.managementCollectionStores);
    if (Array.isArray(saved)) return new Set(saved.filter(id => availableIds.includes(id)));
  } catch (e) {}
  return new Set(availableIds);
}

function toggleCollectionStore(storeId, checked) {
  const selected = selectedCollectionStoreIds();
  if (checked) selected.add(storeId); else selected.delete(storeId);
  localStorage.managementCollectionStores = JSON.stringify([...selected]);
  collections();
}

function selectAllCollectionStores() {
  localStorage.managementCollectionStores = JSON.stringify(stores.map(s => s[0]));
  collections();
}

function collections() {
  store = "";
  edit = null;
  history.replaceState(null, "", "#MANAGEMENT-COLLECTIONS");
  const selectedIds = selectedCollectionStoreIds();
  const rows = stores.filter(s => selectedIds.has(s[0])).map(s => ({ id: s[0], name: s[1], totals: storeCollectionTotals(s[0]) }));
  
  const total = rows.reduce((all, row) => {
    Object.keys(all).forEach(key => all[key] += row.totals[key]);
    return all;
  }, { euroSales: 0, dollarSales: 0, gbpSales: 0, euroChanged: 0, dollarChanged: 0, gbpChanged: 0, euro: 0, dollar: 0, gbp: 0, egp: 0, visa: 0, totalConvertedEgp: 0, cashOut: 0 });

  const allPartners = {};
  stores.filter(s => selectedIds.has(s[0])).forEach(s => {
    const shop = ensureAllFields({ stores: { [s[0]]: data.stores[s[0]] } }).stores[s[0]];
    const savedStore = store;
    store = s[0]; 
    const p = profitCalc();
    store = savedStore;

    (shop.partners || []).forEach(partner => {
      const profitShare = p.netProfit * (n(partner.percent) / 100);
      allPartners[partner.name] = (allPartners[partner.name] || 0) + profitShare;
    });
  });

  document.getElementById("app").innerHTML = `
    <div class="head"><h1>تحصيل المحلات</h1><button class="light" onclick="home()">رجوع</button></div>
    <section class="panel">
      <div class="grid">
        <label>من ${dateBox("from", period.from)}</label>
        <label>إلى ${dateBox("to", period.to)}</label>
        <button onclick="setPeriod({from:dateValue('from'),to:dateValue('to')}); collections()">الفترة المحددة</button>
        <button class="light" onclick="setPeriod(thisMonth()); collections()">الشهر الحالي</button>
      </div>
      <div class="row">
        <button class="gray" onclick="selectAllCollectionStores()">اختيار كل المحلات</button>
        ${stores.map(s => `<label class="shop-choice"><input type="checkbox" ${selectedIds.has(s[0]) ? "checked" : ""} onchange="toggleCollectionStore('${s[0]}', this.checked)">${s[1]}</label>`).join("")}
      </div>
      <div class="row"><button onclick="exportCollectionsPdf()">PDF</button></div>
      
      <div class="cards">
        <div class="card" style="border: 2px solid var(--green);">إجمالي التغيير (L.E) <strong>${m(total.totalConvertedEgp)}</strong></div>
        <div class="card" style="border: 2px solid var(--red);">مصاريف المحلات <strong>${m(total.cashOut)}</strong></div>
        <div class="card">صافي اليورو <strong>${m(total.euro)}</strong></div>
        <div class="card">صافي الدولار <strong>${m(total.dollar)}</strong></div>
        <div class="card">صافي الإسترليني <strong>${m(total.gbp)}</strong></div>
        <div class="card">إجمالي الجنيه <strong>${m(total.egp)}</strong></div>
                   <div class="card" style="border: 1px solid var(--orange);">
              إجمالي الفيزا <strong>${m(total.visa)}</strong>
              <div style="font-size:12px; margin-top:5px; color:var(--orange);">بعد خصم 3%: <b>${m(total.visa * 0.97)}</b></div>
            </div>
      </div>

      <h2>تفاصيل تحصيل المحلات</h2>
      <div class="table-scroll">
        <table>
          <tr><th>المحل</th><th> € </th><th> EX </th><th> R </th><th> $ </th><th> EX </th><th> R </th><th> £ </th><th> EX </th><th> R </th><th>L.E</th><th>VISA</th><th>إجمالي التغيير (L.E)</th><th>مصاريف</th></tr>
          ${rows.map(row => `<tr><td>${row.name}</td><td>${m(row.totals.euroSales)}</td><td>${m(row.totals.euroChanged)}</td><td>${m(row.totals.euro)}</td><td>${m(row.totals.dollarSales)}</td><td>${m(row.totals.dollarChanged)}</td><td>${m(row.totals.dollar)}</td><td>${m(row.totals.gbpSales)}</td><td>${m(row.totals.gbpChanged)}</td><td>${m(row.totals.gbp)}</td><td>${m(row.totals.egp)}</td><td>${m(row.totals.visa)}</td><td><b style="color:var(--green)">${m(row.totals.totalConvertedEgp)}</b></td><td><b style="color:var(--red)">${m(row.totals.cashOut)}</b></td></tr>`).join("") || `<tr><td colspan="14">اختر محلًا واحدًا على الأقل لعرض التحصيل</td></tr>`}
          <tr class="total"><td>الإجمالي</td><td>${m(total.euroSales)}</td><td>${m(total.euroChanged)}</td><td>${m(total.euro)}</td><td>${m(total.dollarSales)}</td><td>${m(total.dollarChanged)}</td><td>${m(total.dollar)}</td><td>${m(total.gbpSales)}</td><td>${m(total.gbpChanged)}</td><td>${m(total.gbp)}</td><td>${m(total.egp)}</td><td>${m(total.visa)}</td><td><b style="color:var(--green)">${m(total.totalConvertedEgp)}</b></td><td><b style="color:var(--red)">${m(total.cashOut)}</b></td></tr>
        </table>
      </div>

      ${isAdmin ? `
      <hr>
      <h2> اجمالي أرباح الشركاء </h2>
      <div class="table-scroll">
        <table>
          <tr><th>اسم الشريك</th><th>إجمالي الأرباح</th></tr>
          ${Object.entries(allPartners).map(([name, profit]) => `<tr><td>${name}</td><td><b style="color:var(--green)">${m(profit)}</b></td></tr>`).join("") || `<tr><td colspan="2">لا يوجد شركاء مسجلين في المحلات المختارة</td></tr>`}
        </table>
      </div>
      ` : ""}
    </section>
  `;
}

function render() {
  const s = meta();
  if (!s) { home(); return; }
  history.replaceState(null, "", `#MANAGEMENT-${encodeURIComponent(s[1])}`);
  document.getElementById("app").innerHTML = `
    <div class="head">
      <h1>${s[1]}</h1>
      <button class="light" onclick="home()">رجوع</button>
    </div>
    <div class="tabs">
      ${Object.entries(tabNames).map(([key, value]) => `
        <button class="tab ${tab === key ? "on" : ""}" onclick="switchTab('${key}')">${value}</button>
      `).join("")}
    </div>
    <section class="panel">
      ${dates()}
      <div id="body"></div>
    </section>
  `;
  draw();
}

function switchTab(key) { 
  tab = key; 
  edit = null; 
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(`managementDate:${store}:`)) {
      delete localStorage[k];
    }
  });
  render(); 
}

function dates() {
  return `
    <div class="grid">
      <label>من ${dateBox("from", period.from)}</label>
      <label>إلى ${dateBox("to", period.to)}</label>
      <button onclick="setPeriod({from:dateValue('from'),to:dateValue('to')}); render()">الفترة المحددة</button>
      <button class="light" onclick="setPeriod(thisMonth()); render()">الشهر الحالي</button>
    </div>
  `;
}

function openStore(storeId) {
  store = storeId;
  tab = "sales";
  edit = null;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(`managementDate:${store}:`)) {
      delete localStorage[key];
    }
  });

  if (!data.stores[storeId]) data.stores[storeId] = blank();
  const ss = data.stores[storeId];
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
  render();
}

function draw() {
  const pages = { sales, exchange, traders, sellers, expenses, profits };
  const bodyEl = document.getElementById("body");
  if (!bodyEl) return;
  try {
    bodyEl.innerHTML = pages[tab]();
  } catch (err) {
    console.error("Draw error in tab " + tab + ":", err);
    bodyEl.innerHTML = `<div class="card bad">حدث خطأ في تحميل الصفحة: ${err.message}</div>`;
  }
}

function up(list, item) {
  if (!isAdmin) return alert("ليس لديك صلاحية للتعديل");
  
  const isSalesOrExchange = item.hasOwnProperty("euro") || item.hasOwnProperty("visa") || item.hasOwnProperty("ea");

  for (const key in item) {
    if (key === "id" || key === "pieces" || key === "type") continue;
    
    const val = item[key];
    
    if (val === "" || val === null || val === undefined) {
      if (isSalesOrExchange) continue; 
      return alert("لا يمكن الحفظ. يوجد خانات فارغة يجب ملؤها.");
    }
    
    if (["amount", "euro", "dollar", "gbp", "egp", "visa", "ea", "da", "ba", "er", "dr", "br", "qty", "value"].includes(key)) {
       if (n(val) === 0) {
         if (isSalesOrExchange) continue; 
         return alert("لم يتم ادخال قيمة");
       }
    }
  }

  if (item.amount !== undefined && n(item.amount) < 0) return alert("المبلغ لا يمكن أن يكون بالسالب.");
  if (item.value !== undefined && n(item.value) < 0) return alert("سعر القطع لا يمكن أن يكون بالسالب.");

  const index = list.findIndex(x => x.id === item.id);
  if (index > -1) list[index] = item; else list.push(item);
  save(); edit = null; draw();
}

function del(type, itemId) {
  if (!isAdmin) return alert("ليس لديك صلاحية للحذف");
  if (!confirm("حذف ؟")) return;
  st()[type] = st()[type].filter(x => x.id !== itemId);
  save(); draw();
}

function edt(type, itemId) {
  if (!isAdmin) return;
  edit = { type, id: itemId };
  draw();
}

function box(id) {
  const element = q(id);
  if (element) element.style.display = element.style.display === "none" ? "" : "none";
}

/* =========================================================
   شيت المبيعات
   ========================================================= */
function totals() {
  return fl(st().sales).reduce((a, x) => {
    a.euro += n(x.euro); a.dollar += n(x.dollar); a.gbp += n(x.gbp);
    a.egp += n(x.egp); a.visa += n(x.visa); a.pieces += n(x.pieces);
    return a;
  }, { euro: 0, dollar: 0, gbp: 0, egp: 0, visa: 0, pieces: 0 });
}

function sales() {
  const r = edit?.type === "sales" ? st().sales.find(x => x.id === edit.id) : {};
  const hasPieces = meta()[2];
  const t = totals();
  const visaAfterDisc = t.visa * 0.97;
  const list = fl(st().sales);

  return `
    <h2>المبيعات اليومية</h2>
    ${isAdmin ? `
      <div class="grid">
        <label>التاريخ ${dateBox("sd", r.date || rememberedDate("sd"))}</label>
        <label>اليورو <input id="se" type="number" step="0.01" value="${r.euro || ""}"></label>
        <label>الدولار <input id="su" type="number" step="0.01" value="${r.dollar || ""}"></label>
        <label>الجنيه الإنجليزي <input id="sb" type="number" step="0.01" value="${r.gbp || ""}"></label>
        <label>الجنيه <input id="sg" type="number" step="0.01" value="${r.egp || ""}"></label>
        <label>الفيزا <input id="sv" type="number" step="0.01" value="${r.visa || ""}"></label>
        ${hasPieces ? `<label>إجمالي سعر القطع المباعة <input id="sp" type="number" step="0.01" value="${r.pieces || ""}"></label>` : ""}
      </div>
      <div class="row">
        <button onclick="saveSale()">${r.id ? "تعديل" : "حفظ"}</button>
        <button class="gray" onclick="box('sum')">إجمالي الشهر</button>
        <button class="gray" onclick="box('list')">عرض كل الأيام</button>
        <button onclick="exportSalesPdf()">PDF</button>
      </div>
    ` : `
      <div class="row">
        <button class="gray" onclick="box('sum')">إجمالي الشهر</button>
        <button class="gray" onclick="box('list')">عرض كل الأيام</button>
        <button onclick="exportSalesPdf()">PDF</button>
      </div>
    `}

    <div id="sum" class="cards" style="display:none">
      <div class="card">اليورو <strong>${m(t.euro)}</strong></div>
      <div class="card">الدولار <strong>${m(t.dollar)}</strong></div>
      <div class="card">الجنيه الإنجليزي <strong>${m(t.gbp)}</strong></div>
      <div class="card">الجنيه <strong>${m(t.egp)}</strong></div>
      <div class="card" style="border: 1px solid var(--orange);">
        إجمالي الفيزا <strong>${m(t.visa)}</strong>
        <div style="font-size:12px; margin-top:5px; color:var(--orange);">بعد خصم 3%: <b>${m(visaAfterDisc)}</b></div>
      </div>
      ${hasPieces ? `<div class="card">سعر القطع <strong>${m(t.pieces)}</strong></div>` : ""}
    </div>

    <div id="list" style="display:none">
      <div class="table-scroll">
        ${table(list, "sales",
          ["التاريخ", "يورو", "دولار", "جنيه إنجليزي", "جنيه مصري", "فيزا"].concat(hasPieces ? ["قطع"] : []),
          x => [x.date, m(x.euro), m(x.dollar), m(x.gbp), m(x.egp), m(x.visa)].concat(hasPieces ? [m(x.pieces)] : [])
        )}
      </div>
    </div>
  `;
}

function saveSale() {
  if (!isAdmin) return;
  up(st().sales, {
    id: edit?.type === "sales" ? edit.id : id(),
    date: dateValue("sd"),
    euro: n(se.value), dollar: n(su.value), gbp: n(sb.value),
    egp: n(sg.value), visa: n(sv.value),
    pieces: meta()[2] ? n(sp.value) : 0
  });
}

function exportSalesPdf() {
  if (tab !== "sales") return;
  const hasPieces = meta()[2];
  const t = totals();
  const rows = fl(st().sales).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const headers = ["#", "التاريخ", "يورو", "دولار", "جنيه إنجليزي", "جنيه مصري", "فيزا"].concat(hasPieces ? ["قطع"] : []);
  const bodyRows = rows.map((x, i) => [i + 1, x.date, m(x.euro), m(x.dollar), m(x.gbp), m(x.egp), m(x.visa)].concat(hasPieces ? [m(x.pieces)] : []));
  const summary = [
    ["عدد الأيام", rows.length], ["إجمالي اليورو", m(t.euro)], ["إجمالي الدولار", m(t.dollar)],
    ["إجمالي الجنيه الإنجليزي", m(t.gbp)], ["إجمالي الجنيه المصري", m(t.egp)], ["إجمالي الفيزا", m(t.visa)],
    ["الفيزا بعد خصم 3%", m(t.visa * 0.97)]
  ].concat(hasPieces ? [["إجمالي سعر القطع", m(t.pieces)]] : []);
  const content = `
    <div class="summary-grid">${summary.map(x => `<div class="metric">${x[0]}<b>${x[1]}</b></div>`).join("")}</div>
    <h2>تفاصيل المبيعات اليومية</h2>
    <table><thead><tr>${headers.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>
      ${bodyRows.map(row => `<tr>${row.map(x => `<td>${x}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${headers.length}">لا توجد مبيعات خلال الفترة المختارة</td></tr>`}
    </tbody></table>`;
  printPdf(`تقرير اليوميات - ${meta()[1]}`, `الفترة: من ${period.from} إلى ${period.to}`, content);
}

/* =========================================================
   شيت تغيير العملة
   ========================================================= */
function exStats() {
  const list = fl(st().exchange);
  let euroAmount = 0, euroTotal = 0, dollarAmount = 0, dollarTotal = 0, gbpAmount = 0, gbpTotal = 0;
  list.forEach(x => {
    euroAmount += n(x.ea); euroTotal += n(x.ea) * n(x.er);
    dollarAmount += n(x.da); dollarTotal += n(x.da) * n(x.dr);
    gbpAmount += n(x.ba); gbpTotal += n(x.ba) * n(x.br);
  });
  return {
    eavg: euroAmount ? euroTotal / euroAmount : 0,
    davg: dollarAmount ? dollarTotal / dollarAmount : 0,
    bavg: gbpAmount ? gbpTotal / gbpAmount : 0,
    et: euroTotal, dt: dollarTotal, bt: gbpTotal
  };
}

function exchange() {
  const r = edit?.type === "exchange" ? st().exchange.find(x => x.id === edit.id) : {};
  const x = exStats();
  const list = fl(st().exchange);
  
  let totalEuro = 0, totalEuroEgp = 0;
  let totalDollar = 0, totalDollarEgp = 0;
  let totalGbp = 0, totalGbpEgp = 0;

  list.forEach(item => {
    const ea = n(item.ea), er = n(item.er);
    const da = n(item.da), dr = n(item.dr);
    const ba = n(item.ba), br = n(item.br);

    totalEuro += ea;
    totalEuroEgp += (ea * er);

    totalDollar += da;
    totalDollarEgp += (da * dr);

    totalGbp += ba;
    totalGbpEgp += (ba * br);
  });

  const totalEgpOverall = totalEuroEgp + totalDollarEgp + totalGbpEgp;

  return `
    <h2>تغيير العملة</h2>
    ${isAdmin ? `
      <div class="grid">
        <label>التاريخ ${dateBox("ed", r.date || rememberedDate("ed"))}</label>
        <label>عدد اليورو <input id="ea" type="number" step="0.01" value="${r.ea || ""}"></label>
        <label>سعر اليورو <input id="er" type="number" step="0.01" value="${r.er || ""}"></label>
        <label>عدد الدولار <input id="da" type="number" step="0.01" value="${r.da || ""}"></label>
        <label>سعر الدولار <input id="dr" type="number" step="0.01" value="${r.dr || ""}"></label>
        <label>عدد الجنيه الإنجليزي <input id="ba" type="number" step="0.01" value="${r.ba || ""}"></label>
        <label>سعر الجنيه الإنجليزي <input id="br" type="number" step="0.01" value="${r.br || ""}"></label>
      </div>
      <div class="row">
        <button onclick="saveEx()">${r.id ? "تعديل" : "حفظ"}</button>
        <button class="gray" onclick="box('exsum')">متوسط الشهر</button>
        <button class="gray" onclick="box('exlist')">أيام التغيير</button>
      </div>
    ` : `
      <div class="row">
        <button class="gray" onclick="box('exsum')">متوسط الشهر</button>
        <button class="gray" onclick="box('exlist')">أيام التغيير</button>
      </div>
    `}

    <div id="exsum" class="cards" style="display:none">
      <div class="card">متوسط اليورو <strong>${m(x.eavg)}</strong></div>
      <div class="card">متوسط الدولار <strong>${m(x.davg)}</strong></div>
      <div class="card">متوسط الجنيه الإنجليزي <strong>${m(x.bavg)}</strong></div>
    </div>

    <div class="cards" style="margin-bottom: 15px; grid-template-columns: repeat(2, 1fr);">
      <div class="card" style="border: 1px solid var(--green);">إجمالي اليورو  <strong>${m(totalEuro)} €</strong></div>
      <div class="card" style="border: 1px solid var(--green);">المصري <strong>${m(totalEuroEgp)} L.E</strong></div>

      <div class="card" style="border: 1px solid var(--green);">إجمالي الدولار  <strong>${m(totalDollar)} $</strong></div>
      <div class="card" style="border: 1px solid var(--green);">المصري <strong>${m(totalDollarEgp)} L.E</strong></div>

      <div class="card" style="border: 1px solid var(--green);">إجمالي  الإنجليزي  <strong>${m(totalGbp)} £</strong></div>
      <div class="card" style="border: 1px solid var(--green);"> المصري  <strong>${m(totalGbpEgp)} L.E</strong></div>
      
      <div class="card" style="border: 2px solid #ff4d4d; grid-column: span 2;">إجمالي المصري الكلي  <strong>${m(totalEgpOverall)} L.E</strong></div>
    </div>

    <div id="exlist" style="display:none">
      <div class="table-scroll">
        ${table(list, "exchange",
          ["التاريخ", "يورو", "سعر التغيير", "الأجمالي", "دولار", "سعر التغيير", "الأجمالي", "جنيه إنجليزي", "سعر التغيير", "الأجمالي"],
          rr => [rr.date, m(rr.ea), m(rr.er), m(n(rr.ea) * n(rr.er)), m(rr.da), m(rr.dr), m(n(rr.da) * n(rr.dr)), m(rr.ba), m(rr.br), m(n(rr.ba) * n(rr.br))]
        )}
      </div>
    </div>
  `;
}

function saveEx() {
  if (!isAdmin) return;
  up(st().exchange, {
    id: edit?.type === "exchange" ? edit.id : id(),
    date: dateValue("ed"),
    ea: n(ea.value), er: n(er.value),
    da: n(da.value), dr: n(dr.value),
    ba: n(ba.value), br: n(br.value)
  });
}

/* =========================================================
   شيت التجار
   ========================================================= */
function traderKindLabel(kind) {
  if (kind === "invoice") return "فاتورة";
  if (kind === "return") return "مرتجع";
  return "دفعة";
}

function traderBalance(name) {
  const tx = (st().traderTx || []).filter(x => x.name === name);
  const signed = x => x.kind === "invoice" ? n(x.amount) : -n(x.amount);
  const opening = tx.filter(x => period.from && x.date < period.from).reduce((sum, x) => sum + signed(x), 0);
  const movement = tx.filter(x => inP(x.date)).reduce((sum, x) => sum + signed(x), 0);
  const closing = tx.filter(x => !period.to || x.date <= period.to).reduce((sum, x) => sum + signed(x), 0);
  return { opening, movement, closing };
}

function storeTraderBalance() {
  return (st().traderTx || []).filter(x => !period.to || x.date <= period.to).reduce((sum, x) => sum + (x.kind === "invoice" ? n(x.amount) : -n(x.amount)), 0);
}

function showTraderLiveBalance(name) {
  sessionStorage.traderSearch = name;
  const target = q("liveTraderBalance");
  if (!target) return;
  if (!name) { target.innerHTML = "اكتب اسم التاجر لعرض الرصيد"; return; }
  const b = traderBalance(name);
  target.innerHTML = `الرصيد المرحل: ${m(b.opening)}<br>حركة الفترة: ${m(b.movement)}<br>الرصيد الحالي: ${m(b.closing)}`;
}

function filterTraderTransactions(name) {
  sessionStorage.traderSearch = name;
  const target = q("traderTransactionRows");
  if (!target) return;
  const search = name.trim().toLowerCase();
  const list = fl(st().traderTx || []).filter(x => !search || String(x.name).toLowerCase().includes(search));
  target.innerHTML = list.map(x => `
    <tr>
      <td>${x.date}</td><td>${x.name}</td><td>${traderKindLabel(x.kind)}</td><td>${m(x.amount)}</td>
      <td>${isAdmin ? `<button class="light" onclick="edt('traderTx','${x.id}')">تعديل</button><button class="danger" onclick="del('traderTx','${x.id}')">حذف</button>` : "-"}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">${search ? "لا توجد معاملات لهذا التاجر خلال الفترة" : "لا توجد معاملات خلال الفترة"}</td></tr>`;
}

function traders() {
  const r = edit?.type === "traderTx" ? (st().traderTx || []).find(x => x.id === edit.id) || {} : {};
  const search = r.name || sessionStorage.traderSearch || "";
  const list = fl(st().traderTx || []);
  const filteredList = list.filter(x => !search || String(x.name).toLowerCase().includes(search.toLowerCase()));
  const balance = search ? traderBalance(search) : { opening: 0, movement: 0, closing: 0 };
  const storeBalance = storeTraderBalance();

  return `
    <h2>التجار</h2>
    <datalist id="tn">${(data.traders || []).map(x => `<option value="${x}">`).join("")}</datalist>

    ${isAdmin ? `
      <div class="grid">
        <label>اسم التاجر <input id="trn" list="tn" value="${search}" oninput="showTraderLiveBalance(this.value); filterTraderTransactions(this.value)" onchange="sessionStorage.traderSearch=this.value; draw()"></label>
        <label>التاريخ ${dateBox("trd", r.date || rememberedDate("trd"))}</label>
        <label>النوع
          <select id="trk">
            <option value="invoice">فاتورة</option>
            <option value="payment" ${r.kind === "payment" ? "selected" : ""}>دفعة</option>
            <option value="return" ${r.kind === "return" ? "selected" : ""}>مرتجع</option>
          </select>
        </label>
        <label>القيمة <input id="tra" type="number" step="0.01" value="${r.amount || ""}"></label>
      </div>
      <div class="row">
        <button onclick="saveTrader()">${r.id ? "تعديل" : "حفظ"}</button>
        <button onclick="exportTraderTransactionsPdf()">PDF</button>
      </div>
    ` : `
      <div class="row">
        <label>بحث باسم التاجر <input id="trn" list="tn" value="${search}" oninput="showTraderLiveBalance(this.value); filterTraderTransactions(this.value)"></label>
        <button onclick="exportTraderTransactionsPdf()">PDF</button>
      </div>
    `}

    <div class="cards">
      <div class="card" id="liveTraderBalance">
        الرصيد السابق <strong>${m(balance.opening)}</strong>
        المعاملات <strong>${m(balance.movement)}</strong>
        الرصيد الحالي <strong>${m(balance.closing)}</strong>
      </div>
      <div class="card">المديونية <strong>${m(storeBalance)}</strong></div>
    </div>

    <hr>
    <div class="row"><button class="gray" onclick="box('traderMonthList')">المعاملات</button></div>

    <div id="traderMonthList" style="display:none">
      <div class="table-scroll">
        <table>
          <tr><th>التاريخ</th><th>التاجر</th><th>المعاملة</th><th>القيمة</th>${isAdmin ? "<th>تحكم</th>" : ""}</tr>
          <tbody id="traderTransactionRows">
            ${filteredList.map(x => `
              <tr>
                <td>${x.date}</td><td>${x.name}</td><td>${traderKindLabel(x.kind)}</td><td>${m(x.amount)}</td>
                ${isAdmin ? `<td><button class="light" onclick="edt('traderTx','${x.id}')">تعديل</button><button class="danger" onclick="del('traderTx','${x.id}')">حذف</button></td>` : ""}
              </tr>
            `).join("") || `<tr><td colspan="${isAdmin ? 5 : 4}">لا توجد معاملات</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

let pendingTraderData = null;

function saveTrader() {
  if (!isAdmin) return;
  let name = trn.value.trim();
  if (!name) return alert("اكتب اسم التاجر");

  data.traders ||= [];

  if (!data.traders.includes(name)) {
    const similar = data.traders.find(t => {
      const tLower = t.toLowerCase();
      const nLower = name.toLowerCase();
      return tLower.includes(nLower) || nLower.includes(tLower);
    });

    if (similar) {
      pendingTraderData = {
        id: edit?.type === "traderTx" ? edit.id : id(),
        name: name, 
        date: dateValue("trd"), 
        kind: trk.value, 
        amount: n(tra.value),
        oldName: similar
      };
      showTraderPopup(similar);
      return;
    }
  }
  executeTraderSave(name);
}

function showTraderPopup(similarName) {
  let modal = document.getElementById("traderModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "traderModal";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px);";
    modal.innerHTML = `
      <div style="background:#111d2e; border:1px solid #283a52; border-radius:14px; padding:24px; width:min(400px, 90%); text-align:center; box-shadow:0 18px 45px rgba(0,0,0,0.5);">
        <h3 style="margin:0 0 16px; color:#fff; font-size:20px;">تنبيه</h3>
        <p style="color:#9caec4; margin-bottom:24px; font-size:15px; line-height:1.6;">
          هل تقصد <strong style="color:#22a6b3;">(${similarName})</strong>؟
        </p>
        <div style="display:flex; gap:10px; justify-content:center;">
          <button onclick="confirmTraderYes()" style="background:#2a8f5f; flex:1; padding:12px; border-radius:10px; border:none; color:white; font-weight:bold; font-size:16px; cursor:pointer;">Yes</button>
          <button onclick="confirmTraderNo()" style="background:#b93f51; flex:1; padding:12px; border-radius:10px; border:none; color:white; font-weight:bold; font-size:16px; cursor:pointer;">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

function confirmTraderYes() {
  document.getElementById("traderModal").remove();
  if (pendingTraderData) {
    trn.value = pendingTraderData.oldName;
    executeTraderSave(pendingTraderData.oldName);
    pendingTraderData = null;
  }
}

function confirmTraderNo() {
  document.getElementById("traderModal").remove();
  if (pendingTraderData) {
    executeTraderSave(pendingTraderData.name);
    pendingTraderData = null;
  }
}

function executeTraderSave(finalName) {
  if (!data.traders.includes(finalName)) {
    data.traders.push(finalName);
  }
  data.traders.sort();

  up(st().traderTx, {
    id: edit?.type === "traderTx" ? edit.id : id(),
    name: finalName, 
    date: dateValue("trd"), 
    kind: trk.value, 
    amount: n(tra.value)
  });
}

function exportTraderTransactionsPdf() {
  if (tab !== "traders") return;
  const search = (sessionStorage.traderSearch || "").trim().toLowerCase();
  const rows = fl(st().traderTx || []).filter(x => !search || String(x.name).toLowerCase().includes(search)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const invoices = rows.filter(x => x.kind === "invoice").reduce((s, x) => s + n(x.amount), 0);
  const payments = rows.filter(x => x.kind === "payment").reduce((s, x) => s + n(x.amount), 0);
  const returns = rows.filter(x => x.kind === "return").reduce((s, x) => s + n(x.amount), 0);
  const title = search ? `معاملات التاجر - ${sessionStorage.traderSearch}` : "معاملات التجار";
  const content = `
    <div class="summary-grid">
      <div class="metric">عدد المعاملات<b>${rows.length}</b></div>
      <div class="metric">إجمالي الفواتير<b>${m(invoices)}</b></div>
      <div class="metric">إجمالي الدفعات<b>${m(payments)}</b></div>
      <div class="metric">إجمالي المرتجعات<b>${m(returns)}</b></div>
    </div>
    <table><thead><tr><th>#</th><th>التاريخ</th><th>التاجر</th><th>النوع</th><th>القيمة</th></tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${x.date}</td><td>${x.name}</td><td>${traderKindLabel(x.kind)}</td><td>${m(x.amount)}</td></tr>`).join("") || `<tr><td colspan="5">لا توجد معاملات</td></tr>`}
    </tbody></table>`;
  printPdf(`${title} - ${meta()[1]}`, `الفترة: من ${period.from} إلى ${period.to}`, content);
}

/* =========================================================
   شيت البائعين
   ========================================================= */
    function sellers() {
      const shop = st();
      const sellers = shop.sellers || [];
      const fixedSellers = shop.fixedSellers || [];
      
      // وضع التعديل
      const fixedEdit = edit?.type === "fixedSellers" ? fixedSellers.find(x => x.id === edit.id) : {};

      return `
        <h2>البائعين</h2>
        <h3>بائعين العمولة</h3>
        ${isAdmin ? `
          <div class="grid grid3">
            <label>اسم البائع <input id="sn"></label>
            <button onclick="addSeller()">إضافة بائع</button>
          </div>
        ` : ""}

        <div class="table-scroll">
          <table>
            <tr><th>البائع</th>${isAdmin ? "<th>تحكم</th>" : ""}</tr>
            ${sellers.map(x => `<tr><td>${x.name}</td>${isAdmin ? `<td><button class="danger" onclick="deleteSeller('${x.id}')">حذف</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="${isAdmin ? 2 : 1}">لا يوجد بائعين</td></tr>`}
          </table>
        </div>

        <hr>
        <h3>راتب ثابت</h3>
        ${isAdmin ? `
          <div class="grid grid3">
            <label>الأسم <input id="fsn" value="${fixedEdit.name || ''}"></label>
            <label>الراتب الثابت <input id="fss" type="number" step="0.01" value="${fixedEdit.salary || ''}"></label>
            <button onclick="addFixedSeller()">${fixedEdit.id ? 'تعديل الراتب' : 'إضافة'}</button>
            ${fixedEdit.id ? `<button class="light" onclick="edit=null; draw()">إلغاء التعديل</button>` : ''}
          </div>
        ` : ""}

        <div class="table-scroll">
          <table>
            <tr><th>الأسم</th><th>الراتب</th>${isAdmin ? "<th>تحكم</th>" : ""}</tr>
            ${fixedSellers.map(x => `
              <tr>
                <td>${x.name}</td>
                <td>${m(x.salary)}</td>
                ${isAdmin ? `<td>
                  <button class="light" onclick="edt('fixedSellers','${x.id}')">تعديل</button>
                  <button class="danger" onclick="deleteFixedSeller('${x.id}')">حذف</button>
                </td>` : ""}
              </tr>
            `).join("") || `<tr><td colspan="${isAdmin ? 3 : 2}">لا يوجد بيانات</td></tr>`}
          </table>
        </div>
      `;
    }

function addSeller() {
  if (!isAdmin) return;
  if (!sn.value.trim()) return;
  st().sellers.push({ id: id(), name: sn.value.trim() });
  save(); draw();
}

function deleteSeller(sellerId) {
  if (!isAdmin) return;
  if (!confirm("حذف البائع؟")) return;
  st().sellers = st().sellers.filter(x => x.id !== sellerId);
  save(); draw();
}

    function addFixedSeller() {
      if (!isAdmin) return;
      const name = fsn.value.trim();
      const salary = n(fss.value);
      
      if (!name) return alert("اكتب اسم البائع");
      if (salary <= 0) return alert("اكتب راتب صحيح");

      // تعديل 
      if (edit?.type === "fixedSellers") {
        const seller = st().fixedSellers.find(x => x.id === edit.id);
        if (seller) {
          seller.name = name;
          seller.salary = salary;
        }
      } else {
        // اضافة 
        st().fixedSellers.push({ id: id(), name: name, salary: salary });
      }
      
      save(); 
      edit = null; 
      draw();
    }
function deleteFixedSeller(sellerId) {
  if (!isAdmin) return;
  if (!confirm("حذف ؟")) return;
  st().fixedSellers = st().fixedSellers.filter(x => x.id !== sellerId);
  save(); draw();
}

/* =========================================================
   شيت المصروفات
   ========================================================= */
function expenses() {
  const shop = st();
  const expenseRecord = edit?.type === "expenses" ? (shop.expenses || []).find(x => x.id === edit.id) || {} : {};
  const withdrawalRecord = edit?.type === "withdrawals" ? (shop.withdrawals || []).find(x => x.id === edit.id) || {} : {};
  const expenseList = fl(shop.expenses || []);
  const withdrawalList = fl(shop.withdrawals || []);
  const traderPaymentList = fl(shop.traderTx || []).filter(x => x.kind === "payment");
  const unifiedList = unifiedOutflows();
  
  const allSellers = [
    ...(shop.sellers || []).map(s => ({ name: s.name, type: "عمولة" })),
    ...(shop.fixedSellers || []).map(s => ({ name: s.name, type: "راتب ثابت" }))
  ];

  return `
    <h2>المصروفات والمسحوبات</h2>
${isAdmin ? (() => {
  const p = profitCalc();
  return `<div class="card">إجمالي المصروفات الكلي <strong>${m(p.expenses)}</strong></div>`;
})() : ""}       ${isAdmin ? ` <h3>مصروفات المحل</h3> ` : ""}
    ${isAdmin ? `
      <div class="grid">
        <label>التاريخ ${dateBox("xd", expenseRecord.date || rememberedDate("xd"))}</label>
        <label>البند <input id="xi" value="${expenseRecord.item || ""}"></label>
        <label>القيمة <input id="xa" type="number" step="0.01" value="${expenseRecord.amount || ""}"></label>
        <button onclick="saveExpense()">حفظ</button>
      </div>
    ` : ""}

    <div class="row">
${isAdmin ? `<button class="gray" onclick="box('explist')"> المصروفات</button>` : ""}${isAdmin ? `<div class="card">الإجمالي <strong>${m(expenseList.reduce((s, x) => s + n(x.amount), 0))}</strong></div>` : ""}        </div>

    <div id="explist" style="display:none">
      <div class="table-scroll">
        ${table(expenseList, "expenses", ["التاريخ", "البند", "النوع", "القيمة"], x => [x.date, x.item, x.type || " كاش", m(x.amount)])}
      </div>
    </div>

    <hr>

    <h3>كشف المصروفات التفصيلي</h3>
    <p>تفاصيل المصروفات </p>
    <div class="row">
      <button class="gray" onclick="box('unifiedlist')">عرض</button>
      <button onclick="exportExpensesPdf()">PDF</button>
      <div class="card">مصروفات كاش <strong>${m(expenseList.reduce((s, x) => s + n(x.amount), 0))}</strong></div>
      <div class="card">دفعة تاجر <strong>${m(traderPaymentList.reduce((s, x) => s + n(x.amount), 0))}</strong></div>
      <div class="card">مسحوبات <strong>${m(withdrawalList.reduce((s, x) => s + n(x.amount), 0))}</strong></div>
    </div>
    
    <div id="unifiedlist" style="display:none">
      <div class="table-scroll">
        <table>
          <tr><th>التاريخ</th><th>البند</th><th>النوع</th><th>القيمة</th><th>المصدر</th>${isAdmin ? "<th>تعديل</th>" : ""}</tr>
          ${unifiedList.map(x => `
            <tr>
              <td>${x.date}</td><td>${x.item}</td><td>${x.type}</td><td>${m(x.amount)}</td>
<td>${x.source === "expenses" ? (x.type || "مصروفات كاش") : x.source === "traderTx" ? "دفعة تاجر" : "مسحوبات"}</td>                  ${isAdmin ? `<td><button class="light" onclick="edt('${x.source}','${x.id}')">تعديل</button><button class="danger" onclick="del('${x.source}','${x.id}')">حذف</button></td>` : ""}
            </tr>
          `).join("") || `<tr><td colspan="${isAdmin ? 6 : 5}">لا توجد عمليات خلال الفترة</td></tr>`}
        </table>
      </div>
    </div>

    <hr>

    <h3>مسحوبات البائعين</h3>
    ${isAdmin ? `
      <div class="grid">
        <label>التاريخ ${dateBox("wd", withdrawalRecord.date || rememberedDate("wd"))}</label>
        <label>البائع
          <select id="ws">
            ${allSellers.map(s => `<option value="${s.name}" ${withdrawalRecord.seller === s.name ? "selected" : ""}>${s.name} - ${s.type}</option>`).join("")}
          </select>
        </label>
        <label>القيمة <input id="wa" type="number" step="0.01" value="${withdrawalRecord.amount || ""}"></label>
        <button onclick="saveWithdrawal()">حفظ</button>
      </div>
    ` : ""}

    <div class="row">
      <button class="gray" onclick="box('wdlist')">المسحوبات</button>
      <div class="card">الإجمالي <strong>${m(withdrawalList.reduce((s, x) => s + n(x.amount), 0))}</strong></div>
    </div>

    <div id="wdlist" style="display:none">
      <div class="table-scroll">
        ${table(withdrawalList, "withdrawals", ["التاريخ", "البائع", "القيمة"], x => [x.date, x.seller, m(x.amount)])}
      </div>
    </div>
  `;
}

function saveExpense() {
  if (!isAdmin) return;
  if (!xi.value.trim()) return alert("اكتب البند");
  
  let itemName = xi.value.trim();
  let typeName = "مصروفات كاش";
  const currentDate = dateValue("xd");

  if (edit?.type === "expenses") {
    const oldExpense = st().expenses.find(e => e.id === edit.id);
    
    if (oldExpense && (oldExpense.item.includes("ايجار") || oldExpense.item.includes("إيجار") || oldExpense.type === "ايجار")) {
       itemName = xi.value.trim(); 
       typeName = "ايجار";
    } 
    else if (itemName === "ايجار" || itemName === "إيجار") {
       const currentMonth = currentDate.substring(0, 7); 
       const rentThisMonth = (st().expenses || []).filter(e => 
         (e.item.includes("ايجار") || e.item.includes("إيجار") || e.type === "ايجار") && e.date.startsWith(currentMonth)
       );
       const nextRentNumber = rentThisMonth.length + 1;
       if (nextRentNumber > 4) return alert("لقد سجلت الـ 4 دفعات إيجار لهذا الشهر بالفعل.");
       const ordinals = ["الأولى", "الثانية", "الثالثة", "الرابعة"];
       itemName = `الدفعة ${ordinals[nextRentNumber - 1]} إيجار`; 
       typeName = "ايجار"; 
    }
  } 
  else {
    if (itemName === "ايجار" || itemName === "إيجار") {
      const currentMonth = currentDate.substring(0, 7); 
      const rentThisMonth = (st().expenses || []).filter(e => 
        (e.item.includes("ايجار") || e.item.includes("إيجار") || e.type === "ايجار") && e.date.startsWith(currentMonth)
      );
      const nextRentNumber = rentThisMonth.length + 1;
      if (nextRentNumber > 4) return alert("لقد سجلت الـ 4 دفعات إيجار لهذا الشهر بالفعل.");
      
      const ordinals = ["الأولى", "الثانية", "الثالثة", "الرابعة"];
      itemName = `الدفعة ${ordinals[nextRentNumber - 1]} إيجار`; 
      typeName = "ايجار"; 
    }
  }

  const record = {
    id: edit?.type === "expenses" ? edit.id : id(),
    date: currentDate,
    item: itemName,
    type: typeName, 
    amount: n(xa.value)
  };

  const list = st().expenses;
  const index = list.findIndex(x => x.id === record.id);
  if (index > -1) list[index] = record; else list.push(record);
  
  save(); 
  edit = null; 
  draw();
}

function saveWithdrawal() {
  if (!isAdmin) return;
  if (!st().sellers.length && !st().fixedSellers.length) return alert("أضف بائع الأول");
  up(st().withdrawals, {
    id: edit?.type === "withdrawals" ? edit.id : id(),
    date: dateValue("wd"),
    seller: ws.value,
    amount: n(wa.value)
  });
}

/* =========================================================
   شيت الأرباح
   ========================================================= */
function profitCalc() {
  const s = totals();
  const e = exStats();
  const visaDisc = s.visa * .03;
  const grossSalesEgp = s.egp + s.visa + (s.euro * e.eavg) + (s.dollar * e.davg) + (s.gbp * e.bavg);
  const salesEgp = grossSalesEgp - visaDisc;
  
  const shop = st();
  
  const salaryMode = shop.salaryMode || "percent";
  const commission = n(shop.commissionPercent);
  const fixedTotal = n(shop.salaryFixedTotal);

  const salaryBase = Math.max(0, salesEgp - (meta()[2] ? s.pieces : 0));
  
  let salariesTotal = 0;
  if (salaryMode === "fixed") {
    salariesTotal = fixedTotal;
  } else {
    salariesTotal = salaryBase * commission / 100;
  }

  const fixedSalariesTotal = (shop.fixedSellers || []).reduce((sum, x) => sum + n(x.salary), 0);

  const normalExpenses = fl(shop.expenses || []).reduce((a, x) => a + n(x.amount), 0);
  const traderPayments = fl(shop.traderTx || []).filter(x => x.kind === "payment").reduce((a, x) => a + n(x.amount), 0);
  
  const totalOperatingCosts = normalExpenses + traderPayments + salariesTotal + fixedSalariesTotal;
  const netProfit = salesEgp - totalOperatingCosts;

  return {
    grossSalesEgp, salesEgp, visaDisc,
    normalExpenses, traderPayments,
    expenses: totalOperatingCosts,
    salariesTotal, fixedSalariesTotal, netProfit,
    pieces: meta()[2] ? s.pieces : 0,
    salaryMode, commission, fixedTotal
  };
}

function sellerAdvanceSummary() {
  const withdrawals = {};
  const commissionNames = new Set((st().sellers || []).map(x => x.name));
  const fixedNames = new Set((st().fixedSellers || []).map(x => x.name));
  let commissionAdvances = 0, fixedAdvances = 0;
  fl(st().withdrawals || []).forEach(x => {
    const amount = n(x.amount);
    withdrawals[x.seller] = (withdrawals[x.seller] || 0) + amount;
    if (commissionNames.has(x.seller)) commissionAdvances += amount;
    if (fixedNames.has(x.seller)) fixedAdvances += amount;
  });
  return { withdrawals, commissionAdvances, fixedAdvances };
}

function profits() {
  const shop = st();
  const p = profitCalc();
  const advanceSummary = sellerAdvanceSummary();
  const withdrawals = advanceSummary.withdrawals;
  const partnersPercent = (shop.partners || []).reduce((s, x) => s + n(x.percent), 0);
  const eachSalary = (shop.sellers || []).length ? p.salariesTotal / shop.sellers.length : 0;

  return `
    <h2>توزيع الأرباح</h2>

    ${isAdmin ? `
      <div class="grid grid3">
        <label>اسم الشريك <input id="pn" value="${edit?.type === 'partners' ? (shop.partners || []).find(x => x.id === edit.id)?.name || '' : ''}"></label>
        <label>النسبة % <input id="pp" type="number" step="0.01" value="${edit?.type === 'partners' ? (shop.partners || []).find(x => x.id === edit.id)?.percent || '' : ''}"></label>
        <button onclick="addPartner()">${edit?.type === 'partners' ? 'تعديل الشريك' : 'إضافة '}</button>
        ${edit?.type === 'partners' ? `<button class="light" onclick="edit=null; draw()">إلغاء التعديل</button>` : ''}
      </div>
    ` : ""}

    <div class="row">
      <button class="gray" onclick="box('plist')">الشركاء</button>
      <b class="${partnersPercent === 100 ? "ok" : "bad"}">إجمالي النسب: ${m(partnersPercent)}%</b>
    </div>

    <div id="plist" style="display:none">
      <div class="table-scroll">
        ${table(shop.partners || [], "partners", ["الشريك", "النسبة"], x => [x.name, m(x.percent) + "%"])}
      </div>
    </div>

    <hr>
    <div class="grid grid3" style="align-items: start; margin-bottom: 15px;">
      <label>مرتبات البائعين
        <select id="sm" ${isAdmin ? "" : "disabled"} onchange="updateSalarySettings()">
          <option value="percent" ${p.salaryMode === "percent" ? "selected" : ""}>نسبة</option>
          <option value="fixed" ${p.salaryMode === "fixed" ? "selected" : ""}>مرتب </option>
        </select>
      </label>
      
      <label id="cmWrap" style="display:${p.salaryMode === 'percent' ? 'grid' : 'none'};">نسبة العمولة % 
        <input id="cm" type="number" step="0.01" value="${p.commission}" ${isAdmin ? "" : "disabled"}>
      </label>

      <label id="ftWrap" style="display:${p.salaryMode === 'fixed' ? 'grid' : 'none'};">إجمالي المرتب 
        <input id="ft" type="number" step="0.01" value="${p.fixedTotal}" ${isAdmin ? "" : "disabled"}>
      </label>

      ${isAdmin ? `<button onclick="updateSalarySettings()" style="margin-top: 24px;">تحديث</button>` : ""}
      <button class="gray" onclick="exportProfitPdf()" style="margin-top: 24px;">PDF</button>
    </div>

    <div class="cards">
      <div class="card">اجمالي المبيعات الكلي <strong>${m(p.grossSalesEgp)}</strong></div>
      <div class="card">خصم الفيزا 3% <strong>${m(p.visaDisc)}</strong></div>
      <div class="card">صافي المبيعات <strong>${m(p.salesEgp)}</strong></div>
      
      <div class="card" style="border: 2px solid var(--orange);">إجمالي المصروفات <strong>${m(p.expenses)}</strong></div>
      
      <div class="card">مصروفات كاش <strong>${m(p.normalExpenses)}</strong></div>
      <div class="card">دفعات التجار <strong>${m(p.traderPayments)}</strong></div>
      <div class="card">إجمالي مرتبات البائعين <strong>${m(p.salariesTotal)}</strong></div>
      <div class="card">إجمالي الرواتب الثابتة <strong>${m(p.fixedSalariesTotal)}</strong></div>
      ${meta()[2] ? `<div class="card">سعر القطع المستبعد <strong>${m(p.pieces)}</strong></div>` : ""}
      
      <div class="card" style="border: 2px solid var(--green);">صافي ربح الشركاء <strong>${m(p.netProfit)}</strong></div>
    </div>

    <h3>مرتبات البائعين</h3>
    <div class="table-scroll">
      <table>
        <tr><th>البائع</th><th>المستحق </th><th>المسحوبات </th><th>المتبقي</th></tr>
        ${(shop.sellers || []).map(s => `<tr><td>${s.name}</td><td>${m(eachSalary)}</td><td>${m(withdrawals[s.name] || 0)}</td><td>${m(eachSalary - (withdrawals[s.name] || 0))}</td></tr>`).join("") || `<tr><td colspan="4">لا يوجد بائعين</td></tr>`}
      </table>
    </div>

    <h3>رواتب ثابتة</h3>
    <div class="table-scroll">
      <table>
        <tr><th>الأسم</th><th>الراتب </th><th>المسحوبات </th><th>المتبقي </th></tr>
        ${(shop.fixedSellers || []).map(s => `<tr><td>${s.name}</td><td>${m(s.salary)}</td><td>${m(withdrawals[s.name] || 0)}</td><td>${m(n(s.salary) - (withdrawals[s.name] || 0))}</td></tr>`).join("") || `<tr><td colspan="4">لا يوجد بائعين براتب ثابت</td></tr>`}
      </table>
    </div>

    <h3>أرباح الشركاء</h3>
    <div class="table-scroll">
      <table>
        <tr><th>الشريك</th><th>النسبة</th><th>الربح</th></tr>
        ${(shop.partners || []).map(x => `<tr><td>${x.name}</td><td>${m(x.percent)}%</td><td>${m(p.netProfit * n(x.percent) / 100)}</td></tr>`).join("") || `<tr><td colspan="3">لا يوجد شركاء</td></tr>`}
      </table>
    </div>
  `;
}

function updateSalarySettings() {
  if (!isAdmin) return;
  
  const sm = q("sm").value;
  const cm = q("cm") ? n(q("cm").value) : 0;
  const ft = q("ft") ? n(q("ft").value) : 0;

  st().salaryMode = sm;
  st().commissionPercent = cm;
  st().salaryFixedTotal = ft;

  save();
  draw();
}

function addPartner() {
  if (!isAdmin) return;
  
  const name = q("pn").value.trim();
  const percent = n(q("pp").value);
  
  if (!name || percent <= 0) return alert("اكتب اسم الشريك ونسبته");
  
  if (edit?.type === "partners") {
    const partner = (st().partners || []).find(x => x.id === edit.id);
    if (!partner) return;
    const otherPercent = (st().partners || []).reduce((s, x) => x.id !== edit.id ? s + n(x.percent) : s, 0);
    if (otherPercent + percent > 100) return alert("إجمالي النسب لا يتخطى 100%");
    partner.name = name;
    partner.percent = percent;
  } else {
    const total = (st().partners || []).reduce((s, x) => s + n(x.percent), 0);
    if (total + percent > 100) return alert("إجمالي النسب لا يتخطى 100%");
    st().partners.push({ id: id(), name: name, percent: percent });
  }
  
  save(); 
  edit = null; 
  draw();
}

/* =========================================================
   الجداول
   ========================================================= */
function table(list, type, heads, map) {
  return `
    <table>
      <tr>
        ${heads.map(h => `<th>${h}</th>`).join("")}
        ${isAdmin ? "<th>تحكم</th>" : ""}
      </tr>
      ${list.map(x => `
        <tr>
          ${map(x).map(c => `<td>${c}</td>`).join("")}
          ${isAdmin ? `<td>
            <button class="light" onclick="edt('${type}','${x.id}')">تعديل</button>
            <button class="danger" onclick="del('${type}','${x.id}')">حذف</button>
          </td>` : ""}
        </tr>
      `).join("") || `<tr><td colspan="${heads.length + (isAdmin ? 1 : 0)}">لا توجد بيانات</td></tr>`}
    </table>
  `;
}

/* =========================================================
   تقرير أرصدة التجار
   ========================================================= */
function selectedTraderBalanceStoreIds() {
  const availableIds = stores.map(s => s[0]);
  try {
    const saved = JSON.parse(localStorage.managementTraderBalanceStores);
    if (Array.isArray(saved)) return new Set(saved.filter(id => availableIds.includes(id)));
  } catch (e) {}
  return new Set(availableIds);
}

function toggleTraderBalanceStore(storeId, checked) {
  const selected = selectedTraderBalanceStoreIds();
  if (checked) selected.add(storeId); else selected.delete(storeId);
  localStorage.managementTraderBalanceStores = JSON.stringify([...selected]);
  traderTotals();
}

function selectAllTraderBalanceStores() {
  localStorage.managementTraderBalanceStores = JSON.stringify(stores.map(s => s[0]));
  traderTotals();
}

let traderBalanceSearch = "";
let selectedTraderNames = new Set();

function toggleTraderSelection(name, checked) {
  if (checked) selectedTraderNames.add(name);
  else selectedTraderNames.delete(name);
}

function toggleAllTradersPdf() {
  const checkboxes = document.querySelectorAll('.trader-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    toggleTraderSelection(cb.value, !allChecked);
  });
  
  const selectAllBox = document.getElementById("selectAllTraderCheckbox");
  if (selectAllBox) selectAllBox.checked = !allChecked;
}

function toggleSelectAllTraders(checked) {
  const checkboxes = document.querySelectorAll('.trader-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    toggleTraderSelection(cb.value, checked);
  });
}

function traderTotals() {
  const rows = {};
  let grand = 0;
  const selectedIds = selectedTraderBalanceStoreIds();
  const selectedStores = stores.filter(s => selectedIds.has(s[0]));

  selectedStores.forEach(s => {
    const shop = ensureAllFields({ stores: { [s[0]]: data.stores[s[0]] } }).stores[s[0]];
    (shop.traderTx || []).forEach(t => {
      rows[t.name] ??= { total: 0, parts: {} };
      const value = t.kind === "invoice" ? n(t.amount) : -n(t.amount);
      rows[t.name].total += value;
      rows[t.name].parts[s[1]] = (rows[t.name].parts[s[1]] || 0) + value;
      grand += value;
    });
  });

  document.getElementById("app").innerHTML = `
    <h1 class="title">MANAGEMENT</h1>
    <section class="panel">
      <h2>مديونات المحلات</h2>
      
      <div class="row" style="margin-bottom: 15px;">
        <label style="flex: 1; min-width: 250px;">
          بحث عن تاجر
          <input id="traderBalanceSearchInput" list="traderNamesList" placeholder="..." value="${traderBalanceSearch}" autocomplete="off">
          <datalist id="traderNamesList">
            ${Object.keys(rows).sort((a,b) => a.localeCompare(b, "ar")).map(n => `<option value="${n}">`).join("")}
          </datalist>
        </label>
      </div>

      <div class="row">
        <button class="gray" onclick="selectAllTraderBalanceStores()">اختيار كل المحلات</button>
        ${stores.map(s => `<label class="shop-choice"><input type="checkbox" ${selectedIds.has(s[0]) ? "checked" : ""} onchange="toggleTraderBalanceStore('${s[0]}', this.checked)">${s[1]}</label>`).join("")}
      </div>
      <div class="card">إجمالي المديونية <strong>${m(grand)}</strong></div>
      
      <div class="row" style="margin-top: 15px;">
        <button class="gray" onclick="toggleAllVisibleTraders()">تحديد الكل</button>
        <button onclick="exportTraderTotalsPdf()">PDF</button>
      </div>

      <div id="traderTotalsTableContainer" class="table-scroll"></div>
    </section>
  `;

  const updateTable = () => {
    const tableContainer = document.getElementById("traderTotalsTableContainer");
    if (!tableContainer) return;
    
    const currentSearch = traderBalanceSearch.trim().toLowerCase();
    let filtered = Object.entries(rows).filter(([name, value]) => Math.abs(value.total) > 0.01);
    if (currentSearch) {
      filtered = filtered.filter(([name]) => name.toLowerCase().includes(currentSearch));
    }

    tableContainer.innerHTML = `
      <table>
        <tr>
          <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllTraderCheckbox" onchange="toggleSelectAllVisible(this.checked)" style="width: 18px; height: 18px; cursor: pointer;"></th>
          <th>التاجر</th>
          <th>مديونية المحل</th>
          <th>الإجمالي</th>
          ${isAdmin ? "<th>تحكم</th>" : ""}
        </tr>
        ${filtered.map(([name, value]) => `
          <tr>
            <td style="text-align: center;"><input type="checkbox" class="trader-checkbox" value="${name}" ${selectedTraderNames.has(name) ? "checked" : ""} onchange="toggleTraderSelection('${name.replace(/'/g, "\\'")}', this.checked)" style="width: 18px; height: 18px; cursor: pointer;"></td>
            <td>${name}</td>
            <td>${Object.entries(value.parts).map(([shop, total]) => `${shop}: ${m(total)}`).join(" | ")}</td>
            <td>${m(value.total)}</td>
            ${isAdmin ? `<td><button class="danger" onclick="deleteTraderPermanently('${name.replace(/'/g, "\\'")}')">حذف نهائي</button></td>` : ""}
          </tr>
        `).join("") || `<tr><td colspan="${isAdmin ? 5 : 4}">لا توجد أرصدة تطابق بحثك.</td></tr>`}
      </table>
    `;

    const checkboxes = document.querySelectorAll('.trader-checkbox');
    const selectAllBox = document.getElementById("selectAllTraderCheckbox");
    if (checkboxes.length > 0 && selectAllBox) {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAllBox.checked = allChecked;
    }
  };

  const searchInput = document.getElementById("traderBalanceSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      traderBalanceSearch = e.target.value;
      updateTable();
    });
  }

  updateTable();
}

function toggleAllVisibleTraders() {
    const checkboxes = document.querySelectorAll('.trader-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        toggleTraderSelection(cb.value, !allChecked);
    });
    
    const selectAllBox = document.getElementById("selectAllTraderCheckbox");
    if (selectAllBox) selectAllBox.checked = !allChecked;
}

function toggleSelectAllVisible(checked) {
    const checkboxes = document.querySelectorAll('.trader-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        toggleTraderSelection(cb.value, checked);
    });
}

function exportTraderTotalsPdf() {
  const rows = {};
  const selectedIds = selectedTraderBalanceStoreIds();
  const selectedStores = stores.filter(s => selectedIds.has(s[0]));
  
  selectedStores.forEach(s => {
    const shop = ensureAllFields({ stores: { [s[0]]: data.stores[s[0]] } }).stores[s[0]];
    (shop.traderTx || []).forEach(t => {
      rows[t.name] ??= { total: 0, parts: {} };
      const value = t.kind === "invoice" ? n(t.amount) : -n(t.amount);
      rows[t.name].total += value;
      rows[t.name].parts[s[1]] = (rows[t.name].parts[s[1]] || 0) + value;
    });
  });

  let entriesToPrint = [];
  let grandTotal = 0;

  if (selectedTraderNames.size > 0) {
    entriesToPrint = Object.entries(rows).filter(([name]) => selectedTraderNames.has(name));
  } else {
    entriesToPrint = Object.entries(rows).filter(([name, value]) => Math.abs(value.total) > 0.01);
    const searchLower = traderBalanceSearch.trim().toLowerCase();
    if (searchLower) entriesToPrint = entriesToPrint.filter(([name]) => name.toLowerCase().includes(searchLower));
  }

  entriesToPrint.forEach(([name, value]) => {
      grandTotal += value.total;
  });

  const title = entriesToPrint.length === 1 ? `رصيد التاجر - ${entriesToPrint[0][0]}` : "أرصدة التجار";
  
  const content = `
    <div class="summary-grid">
      <div class="metric">عدد التجار<b>${entriesToPrint.length}</b></div>
      <div class="metric">الإجمالي الكلي<b>${m(grandTotal)}</b></div>
    </div>
    <table><thead><tr><th>#</th><th>التاجر</th><th>المحل</th><th>الإجمالي</th></tr></thead><tbody>
      ${entriesToPrint.map(([name, value], i) => `<tr><td>${i + 1}</td><td>${name}</td><td>${Object.entries(value.parts).map(([shop, total]) => `${shop}: ${m(total)}`).join(" | ")}</td><td><b>${m(value.total)}</b></td></tr>`).join("") || `<tr><td colspan="4">لا توجد أرصدة.</td></tr>`}
    </tbody></table>
  `;
  
  printPdf(title, `تاريخ الإصدار: ${today()}`, content);
}

function deleteTraderPermanently(traderName) {
  if (!isAdmin) return;
  
  if (!confirm(`هل أنت متأكد من حذف التاجر "${traderName}" نهائياً؟\n\nهيتم حذفه من القائمة الأساسية، ومن كل المعاملات في جميع المحلات.`)) return;
  
  if (!confirm(`تأكيد أخير: سيتم حذف كل معاملات "${traderName}" نهائياً ولا يمكن التراجع!`)) return;

  if (data.traders) {
    data.traders = data.traders.filter(n => n !== traderName);
  }

  Object.keys(data.stores || {}).forEach(storeId => {
    const shop = data.stores[storeId];
    if (shop && shop.traderTx) {
      shop.traderTx = shop.traderTx.filter(tx => tx.name !== traderName);
    }
  });

  save();
  traderTotals();
  alert(`تم حذف التاجر "${traderName}" وكل معاملاته بنجاح ✅`);
}
/* =========================================================
   بدء التشغيل
   ========================================================= */
clientId = getClientId();
data = loadLocal();
period = loadSavedPeriod();
syncCustomStores();
applyViewMode();
setupAuthListener();
/* =========================================================
   دوال النسخ الاحتياطي وإدارة المستخدمين
   ========================================================= */
async function backup() {
  if (!isAdmin) return;
  saveLocal();
  const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const fileName = "MANAGEMENT backup.json";

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "JSON Backup", accept: { "application/json": [".json"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      alert("تم حفظ النسخة الاحتياطية");
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function restore(event) {
  if (!isAdmin) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      data = ensureAllFields(JSON.parse(reader.result));
      syncCustomStores();
      save();
      applyViewMode();
      alert("تم الاسترجاع");
      home();
    } catch (x) {
      alert("ملف غير صالح");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function clearAllData() {
  if (!isAdmin) return;
  if (!confirm("متأكد إنك عايز تحذف كل بيانات البرنامج؟")) return;
  if (!confirm("آخر تأكيد: الحذف نهائي إلا لو عندك نسخة احتياطية.")) return;
  data = ensureAllFields({
    traders: [], customStores: data.customStores || [], deletedStoreIds: data.deletedStoreIds || [],
    viewMode: data.viewMode || "desktop", stores: {}
  });
  stores.forEach(s => { data.stores[s[0]] = blank(); });
  save();
  alert("تم حذف كل البيانات");
  home();
}

async function renderUsersPage() {
  if (currentUser.uid !== ADMIN_UID) return alert("هذه الصفحة للأدمن الرئيسي فقط");
  
  document.getElementById("app").innerHTML = `<div class="head"><h1>المستخدمين</h1><button class="light" onclick="home()">رجوع</button></div><section class="panel"><p>جاري التحميل...</p></section>`;

  try {
    const snap = await fbDB.ref(USERS_PATH).once("value");
    const users = snap.val() || {};
    const entries = Object.entries(users);

    document.getElementById("app").innerHTML = `
      <div class="head"><h1> ENG ₰ PETER </h1><button class="light" onclick="home()">رجوع</button></div>
      <section class="panel">
        <h2>الأعضاء (${entries.length})</h2>
        <div class="table-scroll">
          <table>
            <tr><th>الحالة</th><th>الاسم</th><th>الإيميل</th><th>الصلاحية</th><th>تحكم</th></tr>
            ${entries.map(([uid, u]) => {
              const isSelf = uid === ADMIN_UID;
              const isOnline = (u.status === "online") || (u.status === "approved" && u.lastSeen > Date.now() - 60000);
              const lastSeen = u.lastSeen ? new Date(u.lastSeen).toLocaleString('ar-EG') : "غير متوفر";
              
              const role = u.role === "admin" ? "أدمين" : "مشاهد";
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <span style="width:10px; height:10px; border-radius:50%; background:${isOnline ? 'var(--green)' : '#555'};"></span>
                      ${isOnline ? '✓' : '✕'}
                    </div>
                    ${!isOnline ? `<div style="font-size:10px; color:var(--muted);">آخر ظهور: ${lastSeen}</div>` : ''}
                  </td>
                  <td>${u.name || "-"}</td>
                  <td>${u.email || "-"}</td>
                  <td>${role}</td>
                  <td>
                    ${isSelf ? `<span style="color:var(--muted);font-size:12px">(أنت)</span>` : `
                      ${u.status !== "approved" && u.status !== "online" && u.status !== "offline" ? `<button class="success" onclick="approveUser('${uid}')">موافقة</button>` : ""}
                      ${(u.status === "approved" || isOnline || u.status === "offline") ? `<button class="warn" onclick="blockUser('${uid}', ${!u.blocked})">${u.blocked ? "إلغاء الحظر" : "حظر"}</button>` : ""}
                      ${(u.status === "approved" || isOnline || u.status === "offline") ? `<button class="light" onclick="toggleAdminRole('${uid}', '${u.role}')">${u.role === "admin" ? "إلغاء الآدمن" : "ترقية لآدمن"}</button>` : ""}
                      <button class="danger" onclick="deleteUser('${uid}')">حذف</button>
                    `}
                  </td>
                </tr>
              `;
            }).join("") || `<tr><td colspan="5">لا يوجد مستخدمين</td></tr>`}
          </table>
        </div>
      </section>
    `;
  } catch (e) {
    console.error(e);
    document.getElementById("app").innerHTML = `<div class="head"><h1>المستخدمين</h1><button class="light" onclick="home()">رجوع</button></div><section class="panel"><p class="bad">فشل تحميل المستخدمين</p></section>`;
  }
}

async function approveUser(uid) {
  if (!isAdmin) return;
  try {
    await fbDB.ref(`${USERS_PATH}/${uid}`).update({ status: "approved", blocked: false });
    renderUsersPage();
  } catch (e) { alert("فشل: " + e.message); }
}

async function blockUser(uid, block) {
  if (!isAdmin) return;
  try {
    await fbDB.ref(`${USERS_PATH}/${uid}`).update({ blocked: block });
    renderUsersPage();
  } catch (e) { alert("فشل: " + e.message); }
}

async function deleteUser(uid) {
  if (!isAdmin) return;
  if (!confirm("حذف المستخدم ده؟")) return;
  try {
    await fbDB.ref(`${USERS_PATH}/${uid}`).remove();
    renderUsersPage();
  } catch (e) { alert("فشل: " + e.message); }
}

async function toggleAdminRole(uid, currentRole) {
  if (!isAdmin) return;
  const newRole = currentRole === "admin" ? "viewer" : "admin";
  const confirmMsg = newRole === "admin" 
    ? "هل أنت متأكد من ترقية هذا المستخدم إلى آدمن؟" 
    : "هل أنت متأكد من إلغاء صلاحية الآدمن عن هذا المستخدم؟";
    
  if (!confirm(confirmMsg)) return;
  
  try {
    await fbDB.ref(`${USERS_PATH}/${uid}`).update({ role: newRole });
    renderUsersPage();
  } catch (e) { alert("فشل تحديث الصلاحية: " + e.message); }
}

function manualSync() {
  if (!isAdmin) { alert("المزامنة اليدوية للأدمين بس"); return; }
  if (isSyncing) return;
  const choice = confirm("ماذا تريد أن تفعل؟\n\n OK = رفع البيانات المحلية إلى Firebase\n Cancel = تنزيل البيانات من Firebase");
  if (choice) {
    saveRemote().then(() => alert("تم رفع البيانات "));
  } else {
    fbDB.ref(FB_PATH).once("value").then(snap => {
      const remote = snap.val();
      if (remote) {
        delete remote._lastUpdate;
        data = ensureAllFields(remote);
        syncCustomStores();
        saveLocal();
        if (store) draw(); else home();
        alert("تم تنزيل البيانات ");
      } else {
        alert("لا توجد بيانات في Firebase");
      }
    });
  }
}