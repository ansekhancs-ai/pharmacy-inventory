const STORAGE_KEYS = {
  medicines: "meditrack.medicines",
  sales: "meditrack.sales"
};

const LOW_STOCK_LIMIT = 10;

const SAMPLE_MEDICINES = [
  { id: "m1", name: "Amoxicillin 500mg", category: "Antibiotics", quantity: 48, price: 12.5, expiry: "2027-03-14" },
  { id: "m2", name: "Paracetamol 500mg", category: "Analgesics", quantity: 120, price: 4.25, expiry: "2027-11-02" },
  { id: "m3", name: "Ibuprofen 200mg", category: "Analgesics", quantity: 8, price: 6.9, expiry: "2026-12-18" },
  { id: "m4", name: "Loratadine 10mg", category: "Antihistamines", quantity: 36, price: 8.75, expiry: "2027-06-30" },
  { id: "m5", name: "Amlodipine 5mg", category: "Cardiovascular", quantity: 22, price: 15.4, expiry: "2026-09-12" },
  { id: "m6", name: "Metformin 500mg", category: "Diabetes", quantity: 0, price: 9.8, expiry: "2027-01-20" },
  { id: "m7", name: "Omeprazole 20mg", category: "Gastrointestinal", quantity: 54, price: 11.2, expiry: "2028-02-01" },
  { id: "m8", name: "Vitamin D3 1000 IU", category: "Vitamins", quantity: 75, price: 7.5, expiry: "2028-08-09" },
  { id: "m9", name: "Salbutamol Inhaler", category: "Respiratory", quantity: 6, price: 18.9, expiry: "2025-10-01" },
  { id: "m10", name: "Hydrocortisone Cream 1%", category: "Dermatology", quantity: 19, price: 5.6, expiry: "2027-04-22" }
];

const SAMPLE_SALES = [
  {
    id: "s1",
    medicineId: "m2",
    medicineName: "Paracetamol 500mg",
    quantity: 2,
    unitPrice: 4.25,
    total: 8.5,
    date: new Date().toISOString()
  }
];

const state = {
  medicines: [],
  sales: []
};

const els = {
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("overlay"),
  menuBtn: document.getElementById("menuBtn"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  clock: document.getElementById("clock"),
  toast: document.getElementById("toast"),
  inventoryBody: document.getElementById("inventoryBody"),
  searchInput: document.getElementById("searchInput"),
  addMedicineBtn: document.getElementById("addMedicineBtn"),
  medicineModal: document.getElementById("medicineModal"),
  medicineForm: document.getElementById("medicineForm"),
  medicineId: document.getElementById("medicineId"),
  modalTitle: document.getElementById("modalTitle"),
  closeModal: document.getElementById("closeModal"),
  cancelModal: document.getElementById("cancelModal"),
  saleForm: document.getElementById("saleForm"),
  saleMedicine: document.getElementById("saleMedicine"),
  saleQty: document.getElementById("saleQty"),
  saleUnit: document.getElementById("saleUnit"),
  saleTotal: document.getElementById("saleTotal"),
  saleStockHint: document.getElementById("saleStockHint"),
  historyBody: document.getElementById("historyBody"),
  alertList: document.getElementById("alertList"),
  recentSales: document.getElementById("recentSales"),
  todayBreakdown: document.getElementById("todayBreakdown")
};

const titles = {
  dashboard: ["Dashboard", "Overview of stock and daily sales"],
  inventory: ["Inventory", "Search, add, edit, and remove medicines"],
  sales: ["Sales", "Record a sale and update stock automatically"],
  history: ["Sales history", "All completed transactions stored in this browser"]
};

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isExpired(expiry) {
  return expiry < todayKey();
}

function stockStatus(med) {
  if (isExpired(med.expiry)) return { key: "expired", label: "Expired" };
  if (med.quantity <= 0) return { key: "out", label: "Out of stock" };
  if (med.quantity <= LOW_STOCK_LIMIT) return { key: "low", label: "Low stock" };
  return { key: "in-stock", label: "In stock" };
}

function loadData() {
  const savedMeds = localStorage.getItem(STORAGE_KEYS.medicines);
  const savedSales = localStorage.getItem(STORAGE_KEYS.sales);
  state.medicines = savedMeds ? JSON.parse(savedMeds) : SAMPLE_MEDICINES;
  state.sales = savedSales ? JSON.parse(savedSales) : SAMPLE_SALES;
  persist();
}

function persist() {
  localStorage.setItem(STORAGE_KEYS.medicines, JSON.stringify(state.medicines));
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(state.sales));
}

function showToast(message, type) {
  els.toast.hidden = false;
  els.toast.className = `toast ${type}`;
  els.toast.textContent = message;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3200);
}

function renderStats() {
  const lowStock = state.medicines.filter((m) => !isExpired(m.expiry) && m.quantity > 0 && m.quantity <= LOW_STOCK_LIMIT).length;
  const todaySales = state.sales
    .filter((s) => s.date.slice(0, 10) === todayKey())
    .reduce((sum, s) => sum + s.total, 0);
  const inventoryValue = state.medicines.reduce((sum, m) => sum + m.quantity * m.price, 0);

  document.getElementById("statTotalMedicines").textContent = String(state.medicines.length);
  document.getElementById("statLowStock").textContent = String(lowStock);
  document.getElementById("statTodaySales").textContent = money(todaySales);
  document.getElementById("statInventoryValue").textContent = money(inventoryValue);
}

function renderAlerts() {
  const alerts = state.medicines
    .map((m) => ({ m, status: stockStatus(m) }))
    .filter((item) => item.status.key !== "in-stock")
    .slice(0, 6);

  if (!alerts.length) {
    els.alertList.innerHTML = `<li class="empty">No stock alerts right now.</li>`;
    return;
  }

  els.alertList.innerHTML = alerts
    .map(({ m, status }) => `<li><span>${m.name}</span><span class="status ${status.key}">${status.label}</span></li>`)
    .join("");
}

function renderRecentSales() {
  const recent = [...state.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  if (!recent.length) {
    els.recentSales.innerHTML = `<li class="empty">No sales recorded yet.</li>`;
    return;
  }
  els.recentSales.innerHTML = recent
    .map((s) => `<li><span>${s.medicineName} × ${s.quantity}</span><strong>${money(s.total)}</strong></li>`)
    .join("");
}

function renderInventory() {
  const query = els.searchInput.value.trim().toLowerCase();
  const rows = state.medicines.filter((m) => {
    return !query || m.name.toLowerCase().includes(query) || m.category.toLowerCase().includes(query);
  });

  if (!rows.length) {
    els.inventoryBody.innerHTML = `<tr><td colspan="7" class="empty">No medicines match that search.</td></tr>`;
    return;
  }

  els.inventoryBody.innerHTML = rows
    .map((m) => {
      const status = stockStatus(m);
      return `<tr>
        <td>${m.name}</td>
        <td>${m.category}</td>
        <td>${m.quantity}</td>
        <td>${money(m.price)}</td>
        <td>${m.expiry}</td>
        <td><span class="status ${status.key}">${status.label}</span></td>
        <td class="row-actions">
          <button class="btn small ghost" data-edit="${m.id}" type="button">Edit</button>
          <button class="btn small danger" data-delete="${m.id}" type="button">Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

function renderSaleSelect() {
  const current = els.saleMedicine.value;
  els.saleMedicine.innerHTML = `<option value="">Select a medicine</option>` +
    state.medicines
      .map((m) => `<option value="${m.id}">${m.name}</option>`)
      .join("");
  els.saleMedicine.value = current;
  updateSalePreview();
}

function selectedMedicine() {
  return state.medicines.find((m) => m.id === els.saleMedicine.value) || null;
}

function updateSalePreview() {
  const med = selectedMedicine();
  const qty = Number(els.saleQty.value);
  if (!med) {
    els.saleStockHint.textContent = "Choose a medicine to see available stock.";
    els.saleUnit.textContent = money(0);
    els.saleTotal.textContent = money(0);
    return;
  }

  const status = stockStatus(med);
  els.saleStockHint.textContent = `${med.quantity} units available · ${status.label} · expires ${med.expiry}`;
  els.saleUnit.textContent = money(med.price);
  els.saleTotal.textContent = qty > 0 ? money(qty * med.price) : money(0);
}

function renderHistory() {
  const rows = [...state.sales].sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) {
    els.historyBody.innerHTML = `<tr><td colspan="5" class="empty">No sales yet.</td></tr>`;
    return;
  }
  els.historyBody.innerHTML = rows
    .map((s) => `<tr>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>${s.medicineName}</td>
      <td>${s.quantity}</td>
      <td>${money(s.unitPrice)}</td>
      <td>${money(s.total)}</td>
    </tr>`)
    .join("");
}

function renderTodayBreakdown() {
  const today = state.sales.filter((s) => s.date.slice(0, 10) === todayKey());
  if (!today.length) {
    els.todayBreakdown.innerHTML = `<li class="empty">No sales completed today.</li>`;
    return;
  }
  const grouped = {};
  today.forEach((s) => {
    grouped[s.medicineName] = (grouped[s.medicineName] || 0) + s.total;
  });
  els.todayBreakdown.innerHTML = Object.entries(grouped)
    .map(([name, total]) => `<li><span>${name}</span><strong>${money(total)}</strong></li>`)
    .join("");
}

function renderAll() {
  renderStats();
  renderAlerts();
  renderRecentSales();
  renderInventory();
  renderSaleSelect();
  renderHistory();
  renderTodayBreakdown();
}

function openModal(medicine) {
  els.medicineForm.reset();
  els.medicineId.value = medicine ? String(medicine.id) : "";
  els.modalTitle.textContent = medicine ? "Edit medicine" : "Add medicine";
  if (medicine) {
    document.getElementById("medName").value = medicine.name;
    document.getElementById("medCategory").value = medicine.category;
    document.getElementById("medQty").value = medicine.quantity;
    document.getElementById("medPrice").value = medicine.price;
    document.getElementById("medExpiry").value = medicine.expiry;
  }
  els.medicineModal.hidden = false;
}

function closeModal() {
  els.medicineModal.hidden = true;
}

function validateMedicine(data) {
  if (!data.name) return "Medicine name is required.";
  if (!data.category) return "Please choose a category.";
  if (!Number.isInteger(data.quantity) || data.quantity < 0) return "Quantity must be a whole number of 0 or more.";
  if (!(data.price > 0)) return "Price must be greater than 0.";
  if (!data.expiry) return "Expiry date is required.";
  return "";
}

function saveMedicine(event) {
  event.preventDefault();
  const data = {
    id: els.medicineId.value || `m${Date.now()}`,
    name: document.getElementById("medName").value.trim(),
    category: document.getElementById("medCategory").value,
    quantity: Number(document.getElementById("medQty").value),
    price: Number(document.getElementById("medPrice").value),
    expiry: document.getElementById("medExpiry").value
  };
  const error = validateMedicine(data);
  if (error) {
    showToast(error, "error");
    return;
  }

  const index = state.medicines.findIndex((m) => String(m.id) === String(data.id));
  if (index >= 0) {
    state.medicines[index] = data;
    showToast("Medicine updated.", "success");
  } else {
    state.medicines.push(data);
    showToast("Medicine added to inventory.", "success");
  }
  persist();
  closeModal();
  renderAll();
}

function deleteMedicine(id) {
  const med = state.medicines.find((m) => m.id === id);
  if (!med) return;
  const confirmed = window.confirm(`Delete ${med.name} from inventory?`);
  if (!confirmed) return;
  state.medicines = state.medicines.filter((m) => m.id !== id);
  persist();
  renderAll();
  showToast("Medicine deleted.", "success");
}

function completeSale(event) {
  event.preventDefault();
  const med = selectedMedicine();
  const qty = Number(els.saleQty.value);

  if (!med) {
    showToast("Select a medicine before completing a sale.", "error");
    return;
  }
  if (!Number.isInteger(qty) || qty < 1) {
    showToast("Quantity must be a whole number of at least 1.", "error");
    return;
  }
  if (isExpired(med.expiry)) {
    showToast("This medicine is expired and cannot be sold.", "error");
    return;
  }
  if (qty > med.quantity) {
    showToast(`Only ${med.quantity} unit(s) available. You cannot sell more than stock.`, "error");
    return;
  }

  med.quantity -= qty;
  state.sales.push({
    id: `s${Date.now()}`,
    medicineId: med.id,
    medicineName: med.name,
    quantity: qty,
    unitPrice: med.price,
    total: qty * med.price,
    date: new Date().toISOString()
  });
  persist();
  els.saleForm.reset();
  renderAll();
  showToast(`Sale completed for ${med.name}. Stock updated.`, "success");
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  const [title, subtitle] = titles[view];
  els.pageTitle.textContent = title;
  els.pageSubtitle.textContent = subtitle;
  closeSidebar();
}

function closeSidebar() {
  els.sidebar.classList.remove("open");
  els.overlay.hidden = true;
}

function tickClock() {
  els.clock.textContent = new Date().toLocaleString();
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  els.menuBtn.addEventListener("click", () => {
    els.sidebar.classList.add("open");
    els.overlay.hidden = false;
  });
  els.overlay.addEventListener("click", closeSidebar);

  els.searchInput.addEventListener("input", renderInventory);
  els.addMedicineBtn.addEventListener("click", () => openModal(null));
  els.closeModal.addEventListener("click", closeModal);
  els.cancelModal.addEventListener("click", closeModal);
  els.medicineForm.addEventListener("submit", saveMedicine);
  els.saleForm.addEventListener("submit", completeSale);
  els.saleMedicine.addEventListener("change", updateSalePreview);
  els.saleQty.addEventListener("input", updateSalePreview);

  els.inventoryBody.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit]");
    const deleteBtn = event.target.closest("[data-delete]");
    if (editBtn) {
      const editId = editBtn.getAttribute("data-edit");
      const med = state.medicines.find((m) => String(m.id) === String(editId));
      if (!med) {
        showToast("Could not find that medicine to edit.", "error");
        return;
      }
      openModal(med);
    }
    if (deleteBtn) deleteMedicine(deleteBtn.getAttribute("data-delete"));
  });

  els.medicineModal.addEventListener("click", (event) => {
    if (event.target === els.medicineModal) closeModal();
  });
}

loadData();
bindEvents();
renderAll();
tickClock();
setInterval(tickClock, 1000);
