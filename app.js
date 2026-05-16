const defaultProducts = [
  { id: "karaage", name: "からあげ弁当", price: 550, category: "bento" },
  { id: "saba", name: "さば塩弁当", price: 600, category: "bento" },
  { id: "nori", name: "のり弁当", price: 500, category: "bento" },
  { id: "hamburg", name: "ハンバーグ弁当", price: 650, category: "bento" },
  { id: "makunouchi", name: "幕の内弁当", price: 700, category: "bento" },
  { id: "rice", name: "ごはん大盛り", price: 80, category: "bento" },
  { id: "croquette", name: "コロッケ", price: 120, category: "side" },
  { id: "salad", name: "サラダ", price: 180, category: "side" },
  { id: "miso", name: "みそ汁", price: 100, category: "side" },
  { id: "tea", name: "お茶", price: 120, category: "drink" },
  { id: "water", name: "水", price: 100, category: "drink" },
  { id: "coffee", name: "コーヒー", price: 150, category: "drink" },
  { id: "bag", name: "袋", price: 5, category: "other" },
  { id: "discount50", name: "値引き 50円", price: -50, category: "other" },
  { id: "discount100", name: "値引き 100円", price: -100, category: "other" }
];

const categoryLabels = { bento: "弁当", side: "惣菜", drink: "飲み物", other: "その他" };
const paymentLabels = { cash: "現金", paypay: "PayPay", unpaid: "未収" };
const issuerName = "合同会社give comfort";
const shopName = "美食美菜ROCO'S";
const issuerAddress = "兵庫県加古川市野口町長砂95-36";
const issuerTel = "TEL:079-498-1135";
const bankAccount = "西兵庫信用金庫 加古川支店\n普通 0274670\n合同会社give comfort 代表社員 勝山 絋子";
const cashFloat = 30000;
const storageKeys = {
  products: "bento-register-products",
  sales: "bento-register-sales",
  customers: "bento-register-customers",
  deliveryNames: "bento-register-delivery-names",
  deliveryRecords: "bento-register-delivery-records",
  staff: "bento-register-staff",
  cashier: "bento-register-cashier"
};

const state = {
  category: "bento",
  products: loadProducts(),
  customers: loadCustomers(),
  deliveryRecords: loadDeliveryRecords(),
  staff: loadStaff(),
  cashier: localStorage.getItem(storageKeys.cashier) || "",
  activeCustomerId: "",
  paymentMethod: "cash",
  sharedMode: location.protocol === "http:" || location.protocol === "https:",
  syncTimer: null,
  cloudClient: null,
  cloudMode: false
};
let undoSnapshot = null;
if (!state.customers.length) {
  state.customers = loadCustomers();
}
state.activeCustomerId = state.customers[0] ? state.customers[0].id : "customer-1";

const formatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const productGrid = document.querySelector("#productGrid");
const customerTabs = document.querySelector("#customerTabs");
const deliverySelect = document.querySelector("#deliverySelect");
const cashierSelect = document.querySelector("#cashierSelect");
const settlementStaffSelect = document.querySelector("#settlementStaffSelect");
const activeCustomerName = document.querySelector("#activeCustomerName");
const cartList = document.querySelector("#cartList");
const cartMemo = document.querySelector("#cartMemo");
const totalAmount = document.querySelector("#totalAmount");
const paidAmount = document.querySelector("#paidAmount");
const changeAmount = document.querySelector("#changeAmount");
const changeLabel = document.querySelector("#changeLabel");
const checkoutButton = document.querySelector("#checkoutButton");
const cashArea = document.querySelector("#cashArea");
const toast = document.querySelector("#toast");
const historyDialog = document.querySelector("#historyDialog");
const historyList = document.querySelector("#historyList");
const billingList = document.querySelector("#billingList");
const deliveryBillingList = document.querySelector("#deliveryBillingList");
const companyList = document.querySelector("#companyList");
const historyMonth = document.querySelector("#historyMonth");
const historyDate = document.querySelector("#historyDate");
const receiptTaxRate = document.querySelector("#receiptTaxRate");
const saleCount = document.querySelector("#saleCount");
const saleTotal = document.querySelector("#saleTotal");
const cashTotal = document.querySelector("#cashTotal");
const paypayTotal = document.querySelector("#paypayTotal");
const unpaidTotal = document.querySelector("#unpaidTotal");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsList = document.querySelector("#settingsList");
const deliveryDialog = document.querySelector("#deliveryDialog");
const deliveryList = document.querySelector("#deliveryList");
const paypayQrDialog = document.querySelector("#paypayQrDialog");
const paypayQrImage = document.querySelector("#paypayQrImage");
const paypayQrFallback = document.querySelector("#paypayQrFallback");
const settlementDialog = document.querySelector("#settlementDialog");
const settlementDate = document.querySelector("#settlementDate");
const settlementList = document.querySelector("#settlementList");
const settlementCount = document.querySelector("#settlementCount");
const settlementTotal = document.querySelector("#settlementTotal");
const settlementCash = document.querySelector("#settlementCash");
const settlementPaypay = document.querySelector("#settlementPaypay");
const settlementUnpaid = document.querySelector("#settlementUnpaid");
const settlementChange = document.querySelector("#settlementChange");
const settlementFloat = document.querySelector("#settlementFloat");
const settlementCashPaid = document.querySelector("#settlementCashPaid");
const settlementDrawerCash = document.querySelector("#settlementDrawerCash");
const settlementCashToRemove = document.querySelector("#settlementCashToRemove");
const clock = document.querySelector("#clock");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const appError = document.querySelector("#appError");
const logoutButton = document.querySelector("#logoutButton");

window.addEventListener("error", (event) => {
  if (!appError) return;
  appError.hidden = false;
  appError.textContent = `エラー: ${event.message}`;
});

window.addEventListener("unhandledrejection", (event) => {
  if (!appError) return;
  appError.hidden = false;
  appError.textContent = `通信エラー: ${event.reason && event.reason.message ? event.reason.message : event.reason}`;
});

function yen(amount) {
  return formatter.format(amount);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rememberUndo() {
  undoSnapshot = {
    customers: clone(state.customers),
    activeCustomerId: state.activeCustomerId,
    paymentMethod: state.paymentMethod
  };
}

function undoLastAction() {
  if (!undoSnapshot) {
    showToast("戻せる操作がありません");
    return;
  }
  state.customers = clone(undoSnapshot.customers);
  state.activeCustomerId = undoSnapshot.activeCustomerId;
  state.paymentMethod = undoSnapshot.paymentMethod || "cash";
  undoSnapshot = null;
  saveCustomers();
  renderAll();
  showToast("直前の操作を取り消しました");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.products)) || clone(defaultProducts);
  } catch {
    return clone(defaultProducts);
  }
}

function loadCustomers() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys.customers));
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((customer) => ({
        ...customer,
        cart: Array.isArray(customer.cart) ? customer.cart : [],
        paidInput: customer.paidInput || "",
        companyName: customer.companyName || customer.name,
        billingName: customer.billingName || customer.name,
        deliveryName: customer.deliveryName || customer.name,
        memo: customer.memo || ""
      }));
    }
  } catch {
    // Start fresh if old saved data is broken.
  }
  return [{
    id: "customer-1",
    name: "お客様1",
    companyName: "お客様1",
    billingName: "お客様1",
    deliveryName: "お客様1",
    memo: "",
    cart: [],
    paidInput: ""
  }];
}

function deliveryLabel(record) {
  if (record.company === "店頭販売") return "店頭販売";
  if (record.company === record.delivery && record.company === record.billing) return record.company;
  if (record.company === record.billing) return `${record.company} / ${record.delivery}`;
  if (record.company === record.delivery) return `${record.company} / ${record.billing}`;
  return `${record.company} / ${record.delivery} / ${record.billing}`;
}

function loadDeliveryRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys.deliveryRecords));
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((record) => {
        if (typeof record === "string") {
          return { id: makeId("delivery"), company: record, billing: record, delivery: record };
        }
        const company = record.company || record.name || "未設定";
        return {
          id: record.id || makeId("delivery"),
          company,
          billing: record.billing || company,
          delivery: record.delivery || company
        };
      });
    }
  } catch {
    // Start without saved delivery records if old saved data is broken.
  }

  try {
    const oldNames = JSON.parse(localStorage.getItem(storageKeys.deliveryNames));
    if (Array.isArray(oldNames) && oldNames.length > 0) {
      return oldNames.map((name) => ({
        id: makeId("delivery"),
        company: name,
        billing: name,
        delivery: name
      }));
    }
  } catch {
    // Ignore old saved delivery names if they are broken.
  }

  return [{ id: "store-sale", company: "店頭販売", billing: "店頭販売", delivery: "店頭販売" }];
}

function loadStaff() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys.staff));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {
    // Start with a simple default staff list.
  }
  return ["職員"];
}

function saveProducts() {
  localStorage.setItem(storageKeys.products, JSON.stringify(state.products));
  scheduleSharedSave();
}

function saveCustomers() {
  localStorage.setItem(storageKeys.customers, JSON.stringify(state.customers));
  scheduleSharedSave();
}

function saveDeliveryRecords() {
  localStorage.setItem(storageKeys.deliveryRecords, JSON.stringify(state.deliveryRecords));
  scheduleSharedSave();
}

function saveStaff() {
  localStorage.setItem(storageKeys.staff, JSON.stringify(state.staff));
  scheduleSharedSave();
}

function getSales() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.sales) || "[]");
  } catch {
    return [];
  }
}

function saveSales(sales) {
  localStorage.setItem(storageKeys.sales, JSON.stringify(sales));
  scheduleSharedSave();
}

async function appendSharedSale(sale) {
  if (state.cloudMode) {
    scheduleSharedSave();
    return false;
  }
  if (!state.sharedMode) return false;
  try {
    const response = await fetch("api/sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale)
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sharedSnapshot() {
  return {
    products: state.products,
    customers: state.customers,
    deliveryRecords: state.deliveryRecords,
    staff: state.staff,
    sales: getSales()
  };
}

function applySharedData(data) {
  if (Array.isArray(data.products)) {
    state.products = data.products;
    localStorage.setItem(storageKeys.products, JSON.stringify(state.products));
  }
  if (Array.isArray(data.customers) && data.customers.length > 0) {
    state.customers = data.customers.map((customer) => ({
      ...customer,
      cart: Array.isArray(customer.cart) ? customer.cart : [],
      paidInput: customer.paidInput || "",
      companyName: customer.companyName || customer.name,
      billingName: customer.billingName || customer.name,
      deliveryName: customer.deliveryName || customer.name,
      memo: customer.memo || ""
    }));
    if (!state.customers.some((customer) => customer.id === state.activeCustomerId)) {
      state.activeCustomerId = state.customers[0].id;
    }
    localStorage.setItem(storageKeys.customers, JSON.stringify(state.customers));
  }
  if (Array.isArray(data.deliveryRecords) && data.deliveryRecords.length > 0) {
    state.deliveryRecords = data.deliveryRecords;
    localStorage.setItem(storageKeys.deliveryRecords, JSON.stringify(state.deliveryRecords));
  }
  if (Array.isArray(data.staff) && data.staff.length > 0) {
    state.staff = data.staff;
    localStorage.setItem(storageKeys.staff, JSON.stringify(state.staff));
  }
  if (Array.isArray(data.sales)) {
    localStorage.setItem(storageKeys.sales, JSON.stringify(data.sales));
  }
}

async function syncFromShared() {
  if (state.cloudMode) {
    await syncFromCloud();
    return;
  }
  if (!state.sharedMode) return;
  try {
    const response = await fetch("api/state", { cache: "no-store" });
    if (!response.ok) return;
    applySharedData(await response.json());
  } catch {
    // File mode or offline mode keeps using this device's saved data.
  }
}

async function saveSharedNow() {
  if (state.cloudMode) {
    await saveCloudNow();
    return;
  }
  if (!state.sharedMode) return;
  try {
    await fetch("api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sharedSnapshot())
    });
  } catch {
    // Keep local data if the shared server is unavailable.
  }
}

function scheduleSharedSave() {
  if (state.cloudMode) {
    window.clearTimeout(state.syncTimer);
    state.syncTimer = window.setTimeout(saveCloudNow, 250);
    return;
  }
  if (!state.sharedMode) return;
  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(saveSharedNow, 250);
}

function cloudConfigReady() {
  return Boolean(
    window.ROCO_CLOUD_CONFIG &&
    window.ROCO_CLOUD_CONFIG.supabaseUrl &&
    window.ROCO_CLOUD_CONFIG.supabaseAnonKey &&
    window.supabase
  );
}

function setupCloudClient() {
  if (!cloudConfigReady()) return false;
  try {
    state.cloudClient = window.supabase.createClient(
      window.ROCO_CLOUD_CONFIG.supabaseUrl,
      window.ROCO_CLOUD_CONFIG.supabaseAnonKey
    );
    state.cloudMode = true;
    return true;
  } catch {
    state.cloudClient = null;
    state.cloudMode = false;
    return false;
  }
}

async function ensureCloudLogin() {
  if (!setupCloudClient()) return true;
  try {
    const { data } = await state.cloudClient.auth.getSession();
    if (data.session) {
      if (logoutButton) logoutButton.hidden = false;
      return true;
    }
    if (loginScreen) loginScreen.hidden = false;
    return false;
  } catch {
    state.cloudMode = false;
    return true;
  }
}

async function syncFromCloud() {
  if (!state.cloudMode || !state.cloudClient) return;
  try {
    const { data, error } = await state.cloudClient
      .from("register_state")
      .select("data")
      .eq("id", "main")
      .single();
    if (error || !data || !data.data) return;
    applySharedData(data.data);
  } catch {
    // Keep the current screen usable even if cloud sync fails.
  }
}

async function saveCloudNow() {
  if (!state.cloudMode || !state.cloudClient) return;
  try {
    await state.cloudClient
      .from("register_state")
      .upsert({
        id: "main",
        data: sharedSnapshot(),
        updated_at: new Date().toISOString()
      });
  } catch {
    // Keep local data if cloud save fails.
  }
}

function activeCustomer() {
  return state.customers.find((customer) => customer.id === state.activeCustomerId) || state.customers[0];
}

function defaultCustomer() {
  return {
    id: makeId("customer"),
    name: "販売先を選んでください",
    companyName: "",
    billingName: "",
    deliveryName: "",
    saleKind: "",
    memo: "",
    cart: [],
    paidInput: ""
  };
}

function findOpenCustomerByName(name) {
  return state.customers.find((customer) => customer.name === name);
}

function saleTargetSelected(customer = activeCustomer()) {
  return customer && (customer.saleKind === "store" || customer.saleKind === "delivery");
}

function requireSaleTarget() {
  if (saleTargetSelected()) return true;
  showToast("先に「店頭販売」か「配達先」を選んでください");
  return false;
}

function openCustomerCart(name, record = {}, saleKind = "delivery") {
  const existing = findOpenCustomerByName(name);
  if (existing) {
    state.activeCustomerId = existing.id;
    existing.companyName = record.company || existing.companyName || name;
    existing.billingName = record.billing || existing.billingName || name;
    existing.deliveryName = record.delivery || existing.deliveryName || name;
    existing.saleKind = saleKind;
    existing.memo = existing.memo || "";
  } else {
    const customer = {
      id: makeId("customer"),
      name,
      companyName: record.company || name,
      billingName: record.billing || name,
      deliveryName: record.delivery || name,
      saleKind,
      memo: "",
      cart: [],
      paidInput: ""
    };
    state.customers.push(customer);
    state.activeCustomerId = customer.id;
  }
  saveCustomers();
  renderAll();
}

function currentTotal() {
  return activeCustomer().cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function paidValue() {
  return Number(activeCustomer().paidInput || 0);
}

function renderCustomers() {
  customerTabs.innerHTML = "";
  const visibleCustomers = state.customers.filter((customer) =>
    saleTargetSelected(customer) || customer.cart.length > 0 || customer.paidInput || customer.memo
  );

  if (visibleCustomers.length === 0) {
    customerTabs.innerHTML = '<p class="empty">店頭販売か配達先を選ぶと、ここにカートが出ます</p>';
  }

  visibleCustomers.forEach((customer) => {
    const total = customer.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `customer-tab ${customer.id === state.activeCustomerId ? "active" : ""}`;
    button.innerHTML = `<span>${escapeHtml(customer.name)}</span><strong>${yen(Math.max(total, 0))}</strong>`;
    button.addEventListener("click", () => {
      state.activeCustomerId = customer.id;
      renderAll();
      saveCustomers();
    });
    customerTabs.append(button);
  });

  document.querySelector("#editCustomerName").value = activeCustomer().name;
  document.querySelector("#deleteCustomerButton").disabled = visibleCustomers.length <= 1;
}

function renderDeliveryNames() {
  deliverySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "配達先を選ぶ";
  deliverySelect.append(placeholder);

  state.deliveryRecords.filter((record) => record.company !== "店頭販売").forEach((record) => {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = deliveryLabel(record);
    deliverySelect.append(option);
  });
  const customer = activeCustomer();
  const selectedRecord = state.deliveryRecords.find((record) =>
    customer && customer.saleKind === "delivery" &&
    record.company === customer.companyName &&
    record.billing === customer.billingName &&
    record.delivery === customer.deliveryName
  );
  deliverySelect.value = selectedRecord ? selectedRecord.id : "";
  const deleteButton = document.querySelector("#deleteDeliveryButton");
  if (deleteButton) deleteButton.disabled = state.deliveryRecords.length === 0;
}

function renderStaffSelectors() {
  const selected = state.cashier || state.staff[0] || "職員";
  [cashierSelect, settlementStaffSelect].forEach((select) => {
    if (!select) return;
    select.innerHTML = "";
    state.staff.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    });
    select.value = state.staff.includes(selected) ? selected : state.staff[0];
  });
}

function renderDeliverySettings() {
  if (!deliveryList) return;
  deliveryList.innerHTML = "";
  state.deliveryRecords.forEach((record) => {
    const row = document.createElement("div");
      row.className = "billing-item";
      const title = record.company === record.delivery && record.company === record.billing
        ? record.company
        : `${record.company} / ${record.delivery} / ${record.billing}`;
      row.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>会社 / 配達先 / 請求先</span>
      <button class="secondary receipt-button" type="button">編集</button>
    `;
    row.querySelector("button").addEventListener("click", () => editDeliveryRecord(record.id));
    deliveryList.append(row);
  });
}

function editDeliveryRecord(id) {
  const record = state.deliveryRecords.find((item) => item.id === id);
  if (!record) return;

  const company = prompt("会社名", record.company);
  if (company === null) return;
  const delivery = prompt("配達先名", record.delivery);
  if (delivery === null) return;
  const billing = prompt("請求先名", record.billing);
  if (billing === null) return;

  record.company = company.trim() || record.company;
  record.delivery = delivery.trim() || record.delivery;
  record.billing = billing.trim() || record.billing;
  saveDeliveryRecords();
  renderDeliveryNames();
  renderDeliverySettings();
  showToast("配達先を編集しました");
}

function renderProducts() {
  productGrid.innerHTML = "";
  state.products
    .filter((product) => product.category === state.category)
    .forEach((product) => {
      const button = document.createElement("button");
      button.className = "product";
      button.type = "button";
      button.innerHTML = `<span class="product-name">${escapeHtml(product.name)}</span><span class="product-price">${yen(product.price)}</span>`;
      button.addEventListener("click", () => addToCart(product.id));
      productGrid.append(button);
    });
}

function renderCart() {
  const customer = activeCustomer();
  const targetReady = saleTargetSelected(customer);
  activeCustomerName.textContent = targetReady ? customer.name : "未選択";
  if (cartMemo) cartMemo.value = customer.memo || "";
  cartList.innerHTML = "";

  if (customer.cart.length === 0) {
    cartList.innerHTML = targetReady
      ? '<p class="empty">商品を選んでください</p>'
      : '<p class="empty">先に店頭販売か配達先を選んでください</p>';
    return;
  }

  customer.cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${yen(item.price)} × ${item.qty} = ${yen(item.price * item.qty)}</small>
      </div>
      <div class="qty-controls">
        <button type="button" aria-label="${escapeHtml(item.name)}を減らす">−</button>
        <input type="number" min="1" inputmode="numeric" value="${item.qty}" aria-label="${escapeHtml(item.name)}の数量">
        <button type="button" aria-label="${escapeHtml(item.name)}を増やす">＋</button>
      </div>
    `;
    const [minusButton, plusButton] = row.querySelectorAll("button");
    const qtyInput = row.querySelector("input");
    minusButton.addEventListener("click", () => changeQty(item.id, -1));
    plusButton.addEventListener("click", () => changeQty(item.id, 1));
    qtyInput.addEventListener("change", () => setQty(item.id, qtyInput.value));
    qtyInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") setQty(item.id, qtyInput.value);
    });
    cartList.append(row);
  });
}

function renderTotals() {
  const total = Math.max(currentTotal(), 0);
  const paid = paidValue();
  const change = Math.max(paid - total, 0);
  const targetReady = saleTargetSelected();

  totalAmount.textContent = targetReady || total > 0 ? yen(total) : "未選択";
  paidAmount.textContent = yen(paid);
  cashArea.hidden = state.paymentMethod !== "cash";

  if (state.paymentMethod === "cash") {
    changeLabel.textContent = "おつり";
    changeAmount.textContent = yen(change);
    checkoutButton.disabled = !targetReady || total <= 0 || paid < total;
  } else if (state.paymentMethod === "paypay") {
    changeLabel.textContent = "PayPay";
    changeAmount.textContent = yen(total);
    checkoutButton.disabled = !targetReady || total <= 0;
  } else {
    changeLabel.textContent = "未収";
    changeAmount.textContent = yen(total);
    checkoutButton.disabled = !targetReady || total <= 0;
  }
}

function renderPaymentMethods() {
  document.querySelectorAll(".method").forEach((button) => {
    button.classList.toggle("active", button.dataset.payment === state.paymentMethod);
  });
}

function renderAll() {
  renderDeliveryNames();
  renderStaffSelectors();
  renderCustomers();
  renderCart();
  renderPaymentMethods();
  renderTotals();
}

function addToCart(id) {
  if (!requireSaleTarget()) return;
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  rememberUndo();
  const customer = activeCustomer();
  const existing = customer.cart.find((item) => item.id === id);
  if (existing) existing.qty += 1;
  else customer.cart.push({ ...product, qty: 1 });
  saveCustomers();
  renderAll();
}

function addCustomItem() {
  if (!requireSaleTarget()) return;
  const nameInput = document.querySelector("#customItemName");
  const priceInput = document.querySelector("#customItemPrice");
  const name = nameInput.value.trim() || "特別商品";
  const price = Number(priceInput.value || 0);

  if (price <= 0) {
    showToast("金額を入れてください");
    return;
  }

  rememberUndo();
  const customer = activeCustomer();
  customer.cart.push({
    id: makeId("custom-item"),
    name,
    price,
    category: "other",
    qty: 1
  });
  nameInput.value = "";
  priceInput.value = "";
  saveCustomers();
  renderAll();
}

function changeQty(id, amount) {
  const customer = activeCustomer();
  const item = customer.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;
  rememberUndo();
  item.qty += amount;
  if (item.qty <= 0) customer.cart = customer.cart.filter((cartItem) => cartItem.id !== id);
  saveCustomers();
  renderAll();
}

function setQty(id, value) {
  const customer = activeCustomer();
  const item = customer.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;

  const qty = Math.floor(Number(value || 0));
  if (item.qty === qty) return;
  rememberUndo();
  if (qty <= 0) {
    customer.cart = customer.cart.filter((cartItem) => cartItem.id !== id);
  } else {
    item.qty = qty;
  }
  saveCustomers();
  renderAll();
}

function clearActiveCart() {
  const customer = activeCustomer();
  if (customer.cart.length === 0 && !customer.paidInput && !customer.memo) return;
  rememberUndo();
  customer.cart = [];
  customer.paidInput = "";
  customer.memo = "";
  saveCustomers();
  renderAll();
}

function cancelActiveCart() {
  const customer = activeCustomer();
  if (!saleTargetSelected(customer) && customer.cart.length === 0 && !customer.paidInput && !customer.memo) {
    showToast("取り消す販売先がありません");
    return;
  }
  rememberUndo();
  state.customers = state.customers.filter((item) => item.id !== customer.id);
  if (state.customers.length === 0) {
    state.customers.push(defaultCustomer());
  }
  state.activeCustomerId = state.customers[0].id;
  saveCustomers();
  renderAll();
  showToast("販売先を取り消しました");
}

function closeCompletedCart(customerId) {
  state.customers = state.customers.filter((customer) => customer.id !== customerId);
  if (state.customers.length === 0) {
    state.customers.push(defaultCustomer());
  }
  state.activeCustomerId = state.customers[0].id;
  saveCustomers();
  renderAll();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

async function checkout() {
  if (!requireSaleTarget()) return;
  const customer = activeCustomer();
  const total = Math.max(currentTotal(), 0);
  const paid = state.paymentMethod === "cash" || state.paymentMethod === "paypay" ? paidValueForSale(total) : 0;
  if (total <= 0 || (state.paymentMethod === "cash" && paid < total)) return;

  const sale = {
    id: self.crypto && crypto.randomUUID ? crypto.randomUUID() : makeId("sale"),
    at: new Date().toISOString(),
    customerName: customer.name,
    companyName: customer.companyName || customer.name,
    billingName: customer.billingName || customer.name,
    deliveryName: customer.deliveryName || customer.name,
    memo: customer.memo || "",
    cashierName: state.cashier || cashierSelect.value || "職員",
    paymentMethod: state.paymentMethod,
    total,
    paid,
    change: state.paymentMethod === "cash" ? paid - total : 0,
    items: customer.cart.map(({ id, name, price, qty }) => ({ id, name, price, qty }))
  };

  const sales = getSales();
  sales.unshift(sale);
  localStorage.setItem(storageKeys.sales, JSON.stringify(sales));
  if (!(await appendSharedSale(sale))) {
    scheduleSharedSave();
  }
  closeCompletedCart(customer.id);
  showToast(`${paymentLabels[sale.paymentMethod]}で会計しました`);
}

function paidValueForSale(total) {
  if (state.paymentMethod === "cash") return paidValue();
  if (state.paymentMethod === "paypay") return total;
  return 0;
}

function salePaidAmount(sale) {
  if (sale.paymentMethod === "unpaid") return 0;
  return sale.paid ?? sale.total;
}

function taxFromIncluded(total, rate) {
  return Math.floor(total * rate / (100 + rate));
}

function monthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function saleMonthValue(sale) {
  const date = new Date(sale.at);
  return monthValue(date);
}

function nextMonthEndText(selectedMonth) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const dueDate = new Date(year, month + 1, 0);
  return dueDate.toLocaleDateString("ja-JP");
}

function selectedHistorySales() {
  if (historyDate && historyDate.value) {
    return getSales().filter((sale) => dateValue(new Date(sale.at)) === historyDate.value);
  }
  const selectedMonth = historyMonth.value || monthValue();
  return getSales().filter((sale) => saleMonthValue(sale) === selectedMonth);
}

function selectedSettlementSales() {
  const selectedDate = settlementDate.value || dateValue();
  return getSales().filter((sale) => dateValue(new Date(sale.at)) === selectedDate);
}

function billingKeyForSale(sale) {
  const company = sale.companyName || sale.customerName || "お客様";
  const billing = sale.billingName || sale.customerName || "お客様";
  return `${company}|||${billing}`;
}

function groupSalesByBilling(sales) {
  const groups = new Map();
  sales.forEach((sale) => {
    const company = sale.companyName || sale.customerName || "お客様";
    const billing = sale.billingName || sale.customerName || "お客様";
    const key = billingKeyForSale(sale);
    const current = groups.get(key) || {
      company,
      billing,
      total: 0,
      unpaid: 0,
      paypay: 0,
      cash: 0,
      count: 0,
      sales: []
    };
    current.total += sale.total;
    current.count += 1;
    current.sales.push(sale);
    if ((sale.paymentMethod || "cash") === "cash") current.cash += sale.total;
    if (sale.paymentMethod === "unpaid") current.unpaid += sale.total;
    if (sale.paymentMethod === "paypay") current.paypay += sale.total;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => `${a.company}${a.billing}`.localeCompare(`${b.company}${b.billing}`, "ja"));
}

function groupSalesByDelivery(sales) {
  const groups = new Map();
  sales.forEach((sale) => {
    const company = sale.companyName || sale.customerName || "お客様";
    const billing = sale.billingName || sale.customerName || "お客様";
    const delivery = sale.deliveryName || sale.customerName || "お客様";
    const key = `${company}|||${billing}|||${delivery}`;
    const current = groups.get(key) || {
      company,
      billing,
      delivery,
      total: 0,
      unpaid: 0,
      paypay: 0,
      cash: 0,
      count: 0,
      sales: []
    };
    current.total += sale.total;
    current.count += 1;
    current.sales.push(sale);
    if ((sale.paymentMethod || "cash") === "cash") current.cash += sale.total;
    if (sale.paymentMethod === "unpaid") current.unpaid += sale.total;
    if (sale.paymentMethod === "paypay") current.paypay += sale.total;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => `${a.company}${a.delivery}${a.billing}`.localeCompare(`${b.company}${b.delivery}${b.billing}`, "ja"));
}

function groupSalesByCompany(sales) {
  const groups = new Map();
  sales.forEach((sale) => {
    const company = sale.companyName || sale.customerName || "お客様";
    const current = groups.get(company) || {
      company,
      billing: company,
      total: 0,
      unpaid: 0,
      paypay: 0,
      cash: 0,
      count: 0,
      sales: []
    };
    current.total += sale.total;
    current.count += 1;
    current.sales.push(sale);
    if ((sale.paymentMethod || "cash") === "cash") current.cash += sale.total;
    if (sale.paymentMethod === "unpaid") current.unpaid += sale.total;
    if (sale.paymentMethod === "paypay") current.paypay += sale.total;
    groups.set(company, current);
  });
  return [...groups.values()].sort((a, b) => a.company.localeCompare(b.company, "ja"));
}

function renderHistory() {
  if (!historyMonth.value) historyMonth.value = monthValue();
  const sales = selectedHistorySales();
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cash = sales.filter((sale) => (sale.paymentMethod || "cash") === "cash").reduce((sum, sale) => sum + sale.total, 0);
  const paypay = sales.filter((sale) => sale.paymentMethod === "paypay").reduce((sum, sale) => sum + sale.total, 0);
  const unpaid = sales.filter((sale) => sale.paymentMethod === "unpaid").reduce((sum, sale) => sum + sale.total, 0);

  saleCount.textContent = `${sales.length}件`;
  saleTotal.textContent = yen(total);
  cashTotal.textContent = yen(cash);
  paypayTotal.textContent = yen(paypay);
  unpaidTotal.textContent = yen(unpaid);
  historyList.innerHTML = "";

  if (sales.length === 0) {
    companyList.innerHTML = '<p class="empty">会社別のまとめはまだありません</p>';
    historyList.innerHTML = '<p class="empty">この月の売上はまだありません</p>';
    billingList.innerHTML = '<p class="empty">請求先別のまとめはまだありません</p>';
    deliveryBillingList.innerHTML = '<p class="empty">配達先・請求先別のまとめはまだありません</p>';
    return;
  }

  companyList.innerHTML = "";
  groupSalesByCompany(sales).forEach((group) => {
      const row = document.createElement("div");
      row.className = "billing-item";
      row.innerHTML = `
        <strong>${escapeHtml(group.company)}</strong>
        <span>${group.count}件　合計 ${yen(group.total)}　現金 ${yen(group.cash)}　未収 ${yen(group.unpaid)}　PayPay ${yen(group.paypay)}</span>
        <button class="secondary receipt-button" type="button">この会社の請求書を作る</button>
      `;
      row.querySelector("button").addEventListener("click", () => createInvoiceForGroup(group));
      companyList.append(row);
    });

  sales.forEach((sale) => {
    const itemNames = sale.items.map((item) => `${item.name}×${item.qty}`).join("、");
    const row = document.createElement("div");
    row.className = `history-item ${sale.paymentMethod === "unpaid" ? "unpaid-item" : ""}`;
    const company = sale.companyName || sale.customerName || "お客様";
    const billing = sale.billingName || sale.customerName || "お客様";
    const delivery = sale.deliveryName || sale.customerName || "お客様";
    row.innerHTML = `
      <strong>${new Date(sale.at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}　${escapeHtml(company)}　${yen(sale.total)}</strong>
      <span>配達先: ${escapeHtml(delivery)} / 請求先: ${escapeHtml(billing)}</span>
      <span>${paymentLabels[sale.paymentMethod || "cash"]} / 担当: ${escapeHtml(sale.cashierName || "未設定")} / ${escapeHtml(itemNames)}</span>
      ${sale.memo ? `<span>備考: ${escapeHtml(sale.memo)}</span>` : ""}
      <span>預かり ${yen(salePaidAmount(sale))} / おつり ${yen(sale.change || 0)}</span>
      <button class="secondary receipt-button" type="button">領収書</button>
    `;
    row.querySelector(".receipt-button").addEventListener("click", () => createReceipt(sale));
    historyList.append(row);
  });

  billingList.innerHTML = "";
  groupSalesByBilling(sales).forEach((group) => {
      const row = document.createElement("div");
      row.className = "billing-item";
      const groupTitle = group.company === group.billing ? group.company : `${group.company} / ${group.billing}`;
      row.innerHTML = `
        <strong>${escapeHtml(groupTitle)}</strong>
        <span>${group.count}件　合計 ${yen(group.total)}　現金 ${yen(group.cash)}　未収 ${yen(group.unpaid)}　PayPay ${yen(group.paypay)}</span>
        <button class="secondary receipt-button" type="button">この請求書を作る</button>
      `;
      row.querySelector("button").addEventListener("click", () => createInvoiceForGroup(group));
      billingList.append(row);
    });

  deliveryBillingList.innerHTML = "";
  groupSalesByDelivery(sales).forEach((group) => {
    const row = document.createElement("div");
    row.className = "billing-item";
    const groupTitle = `${group.company} / ${group.delivery} / ${group.billing}`;
    row.innerHTML = `
      <strong>${escapeHtml(groupTitle)}</strong>
      <span>${group.count}件　合計 ${yen(group.total)}　現金 ${yen(group.cash)}　未収 ${yen(group.unpaid)}　PayPay ${yen(group.paypay)}</span>
      <button class="secondary receipt-button" type="button">この配達先・請求先の請求書を作る</button>
    `;
    row.querySelector("button").addEventListener("click", () => createInvoiceForGroup(group));
    deliveryBillingList.append(row);
  });
}

function renderSettlement() {
  if (!settlementDate.value) settlementDate.value = dateValue();
  const sales = selectedSettlementSales();
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cashSales = sales.filter((sale) => (sale.paymentMethod || "cash") === "cash");
  const cash = cashSales.reduce((sum, sale) => sum + sale.total, 0);
  const paypay = sales.filter((sale) => sale.paymentMethod === "paypay").reduce((sum, sale) => sum + sale.total, 0);
  const unpaid = sales.filter((sale) => sale.paymentMethod === "unpaid").reduce((sum, sale) => sum + sale.total, 0);
  const change = cashSales.reduce((sum, sale) => sum + (sale.change || 0), 0);
  const cashPaid = cashSales.reduce((sum, sale) => sum + salePaidAmount(sale), 0);
  const cashSalesNet = cashPaid - change;
  const drawerCash = cashFloat + cashSalesNet;
  const cashToRemove = Math.max(drawerCash - cashFloat, 0);

  settlementCount.textContent = `${sales.length}件`;
  settlementTotal.textContent = yen(total);
  settlementCash.textContent = yen(cash);
  settlementPaypay.textContent = yen(paypay);
  settlementUnpaid.textContent = yen(unpaid);
  settlementChange.textContent = yen(change);
  settlementFloat.textContent = yen(cashFloat);
  settlementCashPaid.textContent = yen(cashPaid);
  settlementDrawerCash.textContent = yen(drawerCash);
  settlementCashToRemove.textContent = yen(cashToRemove);

  settlementList.innerHTML = "";
  if (sales.length === 0) {
    settlementList.innerHTML = '<p class="empty">この日の売上はまだありません</p>';
    return;
  }

  sales.forEach((sale) => {
    const itemNames = sale.items.map((item) => `${item.name}×${item.qty}`).join("、");
    const row = document.createElement("div");
    row.className = `history-item ${sale.paymentMethod === "unpaid" ? "unpaid-item" : ""}`;
    row.innerHTML = `
      <strong>${new Date(sale.at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}　${escapeHtml(sale.companyName || sale.customerName || "お客様")}　${yen(sale.total)}</strong>
      <span>${paymentLabels[sale.paymentMethod || "cash"]} / 担当: ${escapeHtml(sale.cashierName || "未設定")} / ${escapeHtml(itemNames)}</span>
      <span>預かり ${yen(salePaidAmount(sale))} / おつり ${yen(sale.change || 0)}</span>
    `;
    settlementList.append(row);
  });
}

function exportSettlementCsv() {
  const rows = [["日時", "会社", "配達先", "請求先", "支払い", "担当", "精算担当", "合計", "預かり", "おつり", "備考"]];
  const settlementStaff = settlementStaffSelect.value || state.cashier || "";
  selectedSettlementSales().forEach((sale) => {
    rows.push([
      new Date(sale.at).toLocaleString("ja-JP"),
      sale.companyName || sale.customerName || "お客様",
      sale.deliveryName || sale.customerName || "お客様",
      sale.billingName || sale.customerName || "お客様",
      paymentLabels[sale.paymentMethod || "cash"],
      sale.cashierName || "",
      settlementStaff,
      sale.total,
      salePaidAmount(sale),
      sale.change || 0,
      sale.memo || ""
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bento-settlement-${settlementDate.value || dateValue()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function createReceipt(sale) {
  const rate = Number(receiptTaxRate.value || 8);
  const tax = taxFromIncluded(sale.total, rate);
  const beforeTax = sale.total - tax;
  const paid = salePaidAmount(sale);
  const customer = sale.companyName || sale.customerName || "お客様";
  const isStoreSale = customer === "店頭販売" || sale.customerName === "店頭販売";
  const recipientHtml = isStoreSale ? "" : `<div class="to">${escapeHtml(customer)} 御中</div>`;
  const itemNames = sale.items.map((item) => `${item.name}×${item.qty}`).join("、");
  const win = window.open("", "_blank");
  if (!win) {
    showToast("ポップアップを許可してください");
    return;
  }

  win.document.write(`
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <title>領収書 ${escapeHtml(customer)}</title>
        <style>
          body { color: #17211b; font-family: "Yu Gothic UI", "Meiryo", sans-serif; margin: 0; }
          .toolbar { background: #f4f6f1; border-bottom: 1px solid #d8ded6; padding: 12px 18px; }
          button { background: #f1b84b; border: 0; border-radius: 8px; font: inherit; font-weight: 700; min-height: 44px; padding: 8px 18px; }
          .receipt { margin: 24px auto; max-width: 720px; padding: 28px; }
          .label { color: #177a6b; font-weight: 800; margin: 0 0 12px; }
          h1 { border-bottom: 2px solid #17211b; font-size: 32px; margin: 0 0 24px; padding-bottom: 10px; text-align: center; }
          .to { font-size: 22px; font-weight: 800; margin-bottom: 22px; }
          .amount { border: 2px solid #177a6b; border-radius: 8px; margin: 18px 0; padding: 16px; text-align: right; }
          .amount span { color: #5f6b62; display: block; font-weight: 700; }
          .amount strong { display: block; font-size: 34px; margin-top: 4px; }
          .issuer { font-size: 18px; font-weight: 800; margin: 8px 0 18px; text-align: right; }
          table { border-collapse: collapse; margin-top: 18px; width: 100%; }
          th, td { border-bottom: 1px solid #d8ded6; padding: 10px 8px; text-align: left; }
          th { background: #f4f6f1; }
          .num { text-align: right; white-space: nowrap; }
          .note { margin-top: 22px; }
          @media print {
            .toolbar { display: none; }
            .receipt { margin: 0; max-width: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar"><button onclick="window.print()">印刷・PDF保存</button></div>
        <section class="receipt">
          <p class="label">領収書</p>
          <h1>領収書</h1>
          ${recipientHtml}
          <p class="issuer">${escapeHtml(shopName)}<br>${escapeHtml(issuerName)}<br>${escapeHtml(issuerAddress)}<br>${escapeHtml(issuerTel)}</p>
          <p>${new Date(sale.at).toLocaleDateString("ja-JP")}　${paymentLabels[sale.paymentMethod || "cash"]}</p>
          <div class="amount">
            <span>領収金額</span>
            <strong>${yen(sale.total)}</strong>
          </div>
          <p>但し　お弁当代として</p>
          <table>
            <tbody>
              <tr><th>内税対象額</th><td class="num">${yen(sale.total)}</td></tr>
              <tr><th>税抜金額</th><td class="num">${yen(beforeTax)}</td></tr>
              <tr><th>消費税額（${rate}%・内税）</th><td class="num">${yen(tax)}</td></tr>
              <tr><th>預かり</th><td class="num">${yen(paid)}</td></tr>
              <tr><th>おつり</th><td class="num">${yen(sale.change || 0)}</td></tr>
            </tbody>
          </table>
          <p class="note">明細: ${escapeHtml(itemNames)}</p>
        </section>
      </body>
    </html>
  `);
  win.document.close();
}

function invoiceHtmlForGroup(group, selectedMonth) {
  const recipientName = group.company === group.billing ? group.company : `${group.company} ${group.billing}`;
  const deliveries = [...new Set(group.sales.map((sale) => sale.deliveryName || sale.customerName || "").filter(Boolean))];
  const deliveryText = deliveries.length === 1 ? deliveries[0] : deliveries.join("、");
  const showDelivery = deliveryText && deliveryText !== group.company && deliveryText !== group.billing;
  const deliveryHtml = showDelivery ? `<p class="invoice-delivery">配達先: ${escapeHtml(deliveryText)}</p>` : "";
  const taxRate = Number(receiptTaxRate.value || 8);
  const tax = taxFromIncluded(group.total, taxRate);
  const beforeTax = group.total - tax;
  const rows = [];
  group.sales
    .slice()
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .forEach((sale) => {
      const date = new Date(sale.at).toLocaleDateString("ja-JP");
      const delivery = sale.deliveryName || sale.customerName || "";
      sale.items.forEach((item) => {
        rows.push(`
          <tr>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(delivery)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td class="num">${item.qty}</td>
            <td class="num">${yen(item.price)}</td>
            <td class="num">${yen(item.price * item.qty)}</td>
          </tr>
        `);
      });
    });

  const dueDateText = nextMonthEndText(selectedMonth);
  return `
    <section class="invoice">
      <div class="invoice-head">
        <div>
          <p class="invoice-label">請求書</p>
          <h1>${escapeHtml(recipientName)} 御中</h1>
          ${deliveryHtml}
          <p>${escapeHtml(group.company)} / ${escapeHtml(selectedMonth)} ご利用分</p>
        </div>
        <div class="invoice-total">
          <span>ご請求額</span>
          <strong>${yen(group.total)}</strong>
        </div>
      </div>
      <p class="issuer">${escapeHtml(shopName)}<br>${escapeHtml(issuerName)}<br>${escapeHtml(issuerAddress)}<br>${escapeHtml(issuerTel)}</p>
      <div class="invoice-info-grid">
        <div class="invoice-info due-info">
          <span>お支払期限</span>
          <strong>${escapeHtml(dueDateText)}</strong>
          <small>末締め・翌月末まで</small>
        </div>
        <div class="invoice-info">
          <span>振込先口座</span>
          <strong>${escapeHtml(bankAccount).replaceAll("\n", "<br>")}</strong>
        </div>
      </div>
      <div class="invoice-summary">
        <span>現金 ${yen(group.cash)}</span>
        <span>PayPay ${yen(group.paypay)}</span>
        <span>未収 ${yen(group.unpaid)}</span>
      </div>
      <div class="invoice-tax">
        <span>税抜金額 ${yen(beforeTax)}</span>
        <span>消費税額（${taxRate}%・内税） ${yen(tax)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>日付</th>
            <th>配達先</th>
            <th>内容</th>
            <th>数量</th>
            <th>単価</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </section>
  `;
}

function createInvoices() {
  const selectedMonth = historyMonth.value || monthValue();
  const groups = groupSalesByBilling(selectedHistorySales());
  if (groups.length === 0) {
    showToast("請求書にする売上がありません");
    return;
  }

  openInvoiceWindow(groups, selectedMonth);
}

function createInvoiceForGroup(group) {
  openInvoiceWindow([group], historyMonth.value || monthValue());
}

function openInvoiceWindow(groups, selectedMonth) {
  const win = window.open("", "_blank");
  if (!win) {
    showToast("ポップアップを許可してください");
    return;
  }

  win.document.write(`
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <title>請求書 ${escapeHtml(selectedMonth)}</title>
        <style>
          body { color: #17211b; font-family: "Yu Gothic UI", "Meiryo", sans-serif; margin: 0; }
          .toolbar { background: #f4f6f1; border-bottom: 1px solid #d8ded6; padding: 12px 18px; position: sticky; top: 0; }
          button { background: #f1b84b; border: 0; border-radius: 8px; font: inherit; font-weight: 700; min-height: 44px; padding: 8px 18px; }
          .invoice { page-break-after: always; padding: 28px; }
          .invoice:last-child { page-break-after: auto; }
          .invoice-head { align-items: start; display: flex; justify-content: space-between; gap: 24px; }
          .invoice-label { color: #177a6b; font-weight: 800; margin: 0 0 8px; }
          .invoice-delivery { color: #5f6b62; font-weight: 800; margin-bottom: 6px; }
          h1 { font-size: 28px; margin: 0 0 8px; }
          p { margin: 0; }
          .invoice-total { border: 2px solid #177a6b; border-radius: 8px; min-width: 220px; padding: 14px; text-align: right; }
          .invoice-total span { color: #5f6b62; display: block; font-weight: 700; }
          .invoice-total strong { display: block; font-size: 30px; margin-top: 4px; }
          .issuer { font-size: 18px; font-weight: 800; margin-top: 16px; text-align: right; }
          .invoice-info-grid { display: grid; gap: 12px; grid-template-columns: 220px minmax(0, 1fr); margin: 18px 0; }
          .invoice-info { background: #f4f6f1; border: 1px solid #d8ded6; border-radius: 8px; padding: 12px; }
          .invoice-info span { color: #5f6b62; display: block; font-weight: 800; margin-bottom: 4px; }
          .invoice-info strong { display: block; font-size: 16px; line-height: 1.55; }
          .invoice-info small { color: #5f6b62; display: block; font-weight: 700; margin-top: 4px; }
          .due-info { border-color: #177a6b; }
          .due-info strong { color: #0d5b50; font-size: 22px; }
          .invoice-summary { display: flex; gap: 10px; margin: 20px 0; }
          .invoice-summary span { background: #f4f6f1; border-radius: 8px; font-weight: 700; padding: 10px 12px; }
          .invoice-tax { display: flex; gap: 10px; justify-content: flex-end; margin: 0 0 16px; }
          .invoice-tax span { border: 1px solid #d8ded6; border-radius: 8px; font-weight: 700; padding: 8px 12px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border-bottom: 1px solid #d8ded6; padding: 9px 7px; text-align: left; }
          th { background: #f4f6f1; }
          .num { text-align: right; white-space: nowrap; }
          @media print {
            .toolbar { display: none; }
            .invoice { padding: 0; }
          }
          @media (max-width: 720px) {
            .invoice-info-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar"><button onclick="window.print()">印刷・PDF保存</button></div>
        ${groups.map((group) => invoiceHtmlForGroup(group, selectedMonth)).join("")}
      </body>
    </html>
  `);
  win.document.close();
}

function renderSettings() {
  settingsList.innerHTML = "";
  state.products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "settings-row";
    row.dataset.id = product.id;
    row.innerHTML = `
      <select aria-label="カテゴリ">
        <option value="bento">弁当</option>
        <option value="side">惣菜</option>
        <option value="drink">飲み物</option>
        <option value="other">その他</option>
      </select>
      <input type="text" value="${escapeHtml(product.name)}" aria-label="商品名">
      <input type="number" inputmode="numeric" value="${product.price}" aria-label="値段">
      <button class="danger compact-danger" type="button">削除</button>
    `;
    row.querySelector("select").value = product.category;
    row.querySelector("button").addEventListener("click", () => {
      state.products = state.products.filter((item) => item.id !== product.id);
      state.customers.forEach((customer) => {
        customer.cart = customer.cart.filter((item) => item.id !== product.id);
      });
      renderSettings();
      renderProducts();
      renderAll();
    });
    settingsList.append(row);
  });
}

function applySettingsFromRows() {
  state.products = [...settingsList.querySelectorAll(".settings-row")].map((row) => {
    const [categoryInput, nameInput, priceInput] = row.querySelectorAll("select, input");
    return {
      id: row.dataset.id,
      category: categoryInput.value,
      name: nameInput.value.trim() || "商品",
      price: Number(priceInput.value || 0)
    };
  });
  saveProducts();
  saveCustomers();
  renderProducts();
  renderAll();
  settingsDialog.close();
  showToast("商品設定を保存しました");
}

function exportCsv() {
  const rows = [["日時", "会社", "配達先", "請求先", "表示名", "支払い", "担当", "商品", "数量", "単価", "小計", "合計", "預かり", "おつり", "備考"]];
  selectedHistorySales().forEach((sale) => {
    sale.items.forEach((item) => {
      rows.push([
        new Date(sale.at).toLocaleString("ja-JP"),
        sale.companyName || sale.customerName || "お客様",
        sale.deliveryName || sale.customerName || "お客様",
        sale.billingName || sale.customerName || "お客様",
        sale.customerName || "お客様",
        paymentLabels[sale.paymentMethod || "cash"],
        sale.cashierName || "",
        item.name,
        item.qty,
        item.price,
        item.price * item.qty,
        sale.total,
        salePaidAmount(sale),
        sale.change || 0,
        sale.memo || ""
      ]);
    });
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bento-sales-${historyMonth.value || monthValue()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function updateClock() {
  clock.textContent = new Date().toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    state.category = tab.dataset.category;
    productGrid.setAttribute("aria-label", `${categoryLabels[state.category]}の商品`);
    renderProducts();
  });
});

document.querySelectorAll(".method").forEach((button) => {
  button.addEventListener("click", () => {
    if (state.paymentMethod !== button.dataset.payment) rememberUndo();
    state.paymentMethod = button.dataset.payment;
    renderAll();
  });
});

cashierSelect.addEventListener("change", () => {
  state.cashier = cashierSelect.value;
  localStorage.setItem(storageKeys.cashier, state.cashier);
  if (settlementStaffSelect) settlementStaffSelect.value = state.cashier;
});

settlementStaffSelect.addEventListener("change", () => {
  state.cashier = settlementStaffSelect.value;
  localStorage.setItem(storageKeys.cashier, state.cashier);
  if (cashierSelect) cashierSelect.value = state.cashier;
});

document.querySelector("#staffSettingsButton").addEventListener("click", () => {
  const name = (prompt("追加する担当者名を入力してください") || "").trim();
  if (!name) {
    showToast("担当者名を入れてください");
    return;
  }
  if (!state.staff.includes(name)) {
    state.staff.push(name);
    saveStaff();
  }
  state.cashier = name;
  localStorage.setItem(storageKeys.cashier, state.cashier);
  renderStaffSelectors();
  showToast("担当者を追加しました");
});

document.querySelector("#deleteStaffButton").addEventListener("click", () => {
  const name = cashierSelect.value || state.cashier;
  if (state.staff.length <= 1) {
    showToast("担当者は最低1人必要です");
    return;
  }
  if (!name || !confirm(`${name} を担当者から削除しますか？`)) return;
  state.staff = state.staff.filter((staffName) => staffName !== name);
  state.cashier = state.staff[0] || "職員";
  localStorage.setItem(storageKeys.cashier, state.cashier);
  saveStaff();
  renderStaffSelectors();
  showToast("担当者を削除しました");
});

document.querySelectorAll("[data-cash]").forEach((button) => {
  button.addEventListener("click", () => {
    rememberUndo();
    activeCustomer().paidInput = String(paidValue() + Number(button.dataset.cash));
    saveCustomers();
    renderTotals();
  });
});

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => {
    rememberUndo();
    const customer = activeCustomer();
    customer.paidInput = `${customer.paidInput}${button.dataset.key}`.replace(/^0+/, "");
    saveCustomers();
    renderTotals();
  });
});

document.querySelector("#backspaceButton").addEventListener("click", () => {
  const customer = activeCustomer();
  if (!customer.paidInput) return;
  rememberUndo();
  customer.paidInput = customer.paidInput.slice(0, -1);
  saveCustomers();
  renderTotals();
});

document.querySelector("#exactButton").addEventListener("click", () => {
  rememberUndo();
  activeCustomer().paidInput = String(Math.max(currentTotal(), 0));
  saveCustomers();
  renderTotals();
});

document.querySelector("#clearPaidButton").addEventListener("click", () => {
  if (!activeCustomer().paidInput) return;
  rememberUndo();
  activeCustomer().paidInput = "";
  saveCustomers();
  renderTotals();
});

deliverySelect.addEventListener("change", () => {
  if (!deliverySelect.value) return;
  const current = activeCustomer();
  const record = state.deliveryRecords.find((item) => item.id === deliverySelect.value);
  if (!record) return;
  const nextName = deliveryLabel(record);
  if (current.cart.length > 0 && current.name !== nextName) {
    const ok = confirm("いまのカートに商品が入っています。配達先を変えますか？");
    if (!ok) {
      renderAll();
      showToast("配達先の変更をやめました");
      return;
    }
  }
  rememberUndo();
  openCustomerCart(nextName, record, "delivery");
});

if (cartMemo) {
  cartMemo.addEventListener("input", () => {
    activeCustomer().memo = cartMemo.value;
    saveCustomers();
  });
}

document.querySelector("#storeSaleButton").addEventListener("click", () => {
  const current = activeCustomer();
  if (current.cart.length > 0 && current.name !== "店頭販売") {
    const ok = confirm("いまのカートに商品が入っています。店頭販売に変えますか？");
    if (!ok) {
      showToast("店頭販売への変更をやめました");
      return;
    }
  }
  rememberUndo();
  openCustomerCart("店頭販売", { company: "店頭販売", billing: "店頭販売", delivery: "店頭販売" }, "store");
});

document.querySelector("#addDeliveryButton").addEventListener("click", () => {
  const companyInput = document.querySelector("#newCompanyName");
  const billingInput = document.querySelector("#newBillingName");
  const deliveryInput = document.querySelector("#newDeliveryName");
  const company = companyInput.value.trim();
  const delivery = deliveryInput.value.trim() || company;
  const billing = billingInput.value.trim() || company;
  if (!company) {
    showToast("会社名を入れてください");
    return;
  }

  const exists = state.deliveryRecords.some((record) =>
    record.company === company && record.billing === billing && record.delivery === delivery
  );
  if (!exists) {
    state.deliveryRecords.push({ id: makeId("delivery"), company, billing, delivery });
    state.deliveryRecords.sort((a, b) => deliveryLabel(a).localeCompare(deliveryLabel(b), "ja"));
    saveDeliveryRecords();
  }
  companyInput.value = "";
  billingInput.value = "";
  deliveryInput.value = "";
  renderDeliveryNames();
  const saved = state.deliveryRecords.find((record) =>
    record.company === company && record.billing === billing && record.delivery === delivery
  );
  if (saved) deliverySelect.value = saved.id;
  renderDeliverySettings();
  showToast("会社・請求先・配達先を登録しました");
});

document.querySelector("#deleteDeliveryButton").addEventListener("click", () => {
  const record = state.deliveryRecords.find((item) => item.id === deliverySelect.value);
  if (!record || !confirm(`${deliveryLabel(record)} をリストから削除しますか？`)) return;
  state.deliveryRecords = state.deliveryRecords.filter((item) => item.id !== record.id);
  saveDeliveryRecords();
  renderDeliveryNames();
  renderDeliverySettings();
});

document.querySelector("#renameCustomerButton").addEventListener("click", () => {
  const input = document.querySelector("#editCustomerName");
  const name = input.value.trim();
  if (!name) {
    showToast("お客様名を入れてください");
    return;
  }
  activeCustomer().name = name;
  saveCustomers();
  renderAll();
  showToast("お客様名を変更しました");
});

document.querySelector("#deleteCustomerButton").addEventListener("click", () => {
  if (state.customers.length <= 1) return;
  const customer = activeCustomer();
  if (customer.cart.length > 0 && !confirm("このお客様のカートも消えます。削除しますか？")) return;
  state.customers = state.customers.filter((item) => item.id !== customer.id);
  state.activeCustomerId = state.customers[0].id;
  saveCustomers();
  renderAll();
});

document.querySelector("#addCustomItemButton").addEventListener("click", addCustomItem);
document.querySelector("#customItemPrice").addEventListener("keydown", (event) => {
  if (event.key === "Enter") addCustomItem();
});

document.querySelector("#clearButton").addEventListener("click", clearActiveCart);
document.querySelector("#undoButton").addEventListener("click", undoLastAction);
document.querySelector("#cancelCartButton").addEventListener("click", cancelActiveCart);
checkoutButton.addEventListener("click", checkout);

document.querySelector("#historyButton").addEventListener("click", async () => {
  await syncFromShared();
  historyMonth.value = historyMonth.value || monthValue();
  renderHistory();
  historyDialog.showModal();
});

document.querySelector("#paypayQrButton").addEventListener("click", () => {
  paypayQrImage.hidden = false;
  paypayQrFallback.hidden = true;
  paypayQrImage.src = `paypay-qr.png?ts=${Date.now()}`;
  paypayQrDialog.showModal();
});

document.querySelector("#settlementButton").addEventListener("click", async () => {
  await syncFromShared();
  settlementDate.value = settlementDate.value || dateValue();
  renderSettlement();
  settlementDialog.showModal();
});

document.querySelector("#settingsButton").addEventListener("click", () => {
  renderSettings();
  settingsDialog.showModal();
});

document.querySelector("#deliverySettingsButton").addEventListener("click", () => {
  renderDeliverySettings();
  deliveryDialog.showModal();
});

document.querySelector("#closeHistoryButton").addEventListener("click", () => historyDialog.close());
document.querySelector("#closeSettingsButton").addEventListener("click", () => settingsDialog.close());
document.querySelector("#closeDeliveryButton").addEventListener("click", () => deliveryDialog.close());
document.querySelector("#closePaypayQrButton").addEventListener("click", () => paypayQrDialog.close());
document.querySelector("#closeSettlementButton").addEventListener("click", () => settlementDialog.close());
document.querySelector("#exportButton").addEventListener("click", exportCsv);
document.querySelector("#invoiceButton").addEventListener("click", createInvoices);
document.querySelector("#settlementCsvButton").addEventListener("click", exportSettlementCsv);
settlementDate.addEventListener("change", async () => {
  await syncFromShared();
  renderSettlement();
});
document.querySelector("#showTodaySettlementButton").addEventListener("click", async () => {
  await syncFromShared();
  settlementDate.value = dateValue();
  renderSettlement();
});
historyMonth.addEventListener("change", async () => {
  await syncFromShared();
  if (historyDate) historyDate.value = "";
  renderHistory();
});
historyDate.addEventListener("change", async () => {
  await syncFromShared();
  renderHistory();
});
document.querySelector("#showThisMonthButton").addEventListener("click", async () => {
  await syncFromShared();
  historyMonth.value = monthValue();
  if (historyDate) historyDate.value = "";
  renderHistory();
});
document.querySelector("#showTodayHistoryButton").addEventListener("click", async () => {
  await syncFromShared();
  historyDate.value = dateValue();
  historyMonth.value = monthValue();
  renderHistory();
});
document.querySelector("#saveSettingsButton").addEventListener("click", applySettingsFromRows);

document.querySelector("#addProductButton").addEventListener("click", () => {
  const category = document.querySelector("#newProductCategory").value;
  const nameInput = document.querySelector("#newProductName");
  const priceInput = document.querySelector("#newProductPrice");
  const name = nameInput.value.trim();
  const price = Number(priceInput.value || 0);
  if (!name) {
    showToast("商品名を入れてください");
    return;
  }
  state.products.push({ id: makeId("product"), category, name, price });
  nameInput.value = "";
  priceInput.value = "";
  renderSettings();
});

document.querySelector("#resetProductsButton").addEventListener("click", () => {
  if (!confirm("商品を初期メニューに戻しますか？")) return;
  state.products = clone(defaultProducts);
  saveProducts();
  renderSettings();
  renderProducts();
});

document.querySelector("#clearHistoryButton").addEventListener("click", () => {
  if (!confirm("売上履歴を消しますか？")) return;
  saveSales([]);
  renderHistory();
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.cloudClient) return;
    if (loginMessage) loginMessage.textContent = "ログイン中です";
    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value;
    const { error } = await state.cloudClient.auth.signInWithPassword({ email, password });
    if (error) {
      if (loginMessage) loginMessage.textContent = "ログインできませんでした";
      return;
    }
    if (loginScreen) loginScreen.hidden = true;
    if (logoutButton) logoutButton.hidden = false;
    await syncFromCloud();
    renderProducts();
    renderAll();
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    if (state.cloudClient) {
      await state.cloudClient.auth.signOut();
    }
    logoutButton.hidden = true;
    if (loginScreen) loginScreen.hidden = false;
    if (loginMessage) loginMessage.textContent = "ログアウトしました";
  });
}

if (paypayQrImage) {
  paypayQrImage.addEventListener("error", () => {
    paypayQrImage.hidden = true;
    paypayQrFallback.hidden = false;
  });
  paypayQrImage.addEventListener("load", () => {
    paypayQrImage.hidden = false;
    paypayQrFallback.hidden = true;
  });
}

updateClock();
window.setInterval(updateClock, 1000 * 30);
renderProducts();
renderAll();
ensureCloudLogin().then(async (ready) => {
  if (!ready) return;
  await syncFromShared();
  renderProducts();
  renderAll();
});
