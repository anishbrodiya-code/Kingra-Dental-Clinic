(() => {
  const STORAGE_KEY = "kdc-pms-v1";
  const TREATMENTS = [
    "Root Canal Treatment",
    "Dental Crowns & Caps",
    "Cosmetic Dentistry",
    "Orthodontic Treatment",
    "Dental Implants",
    "General Consultation",
  ];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const $ = (id) => document.getElementById(id);

  const state = {
    patients: [],
    appointments: [],
    nextSeq: 1,
    year: new Date().getFullYear(),
    filter: "all",
    query: "",
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    selectedDate: isoDate(new Date()),
    selectedSlot: null,
    editingId: null,
    pendingFiles: [],
    statusTargetId: null,
    lastFocus: null,
    trapHandler: null,
    activeOverlay: null,
  };

  function isoDate(d) {
    const x = new Date(d);
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${x.getFullYear()}-${m}-${day}`;
  }

  function formatDisplayDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function padId(n) {
    return String(n).padStart(4, "0");
  }

  function makePatientId(seq, year = state.year) {
    return `KDC-${year}-${padId(seq)}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.patients = [];
        state.appointments = [];
        state.nextSeq = 1;
        state.year = new Date().getFullYear();
        return false;
      }
      const data = JSON.parse(raw);
      state.patients = (Array.isArray(data.patients) ? data.patients : []).map((p) => ({
        ...p,
        files: Array.isArray(p.files) ? p.files : [],
      }));
      state.appointments = Array.isArray(data.appointments) ? data.appointments : [];
      state.nextSeq = Number(data.nextSeq) > 0 ? Number(data.nextSeq) : 1;
      state.year = data.year || new Date().getFullYear();
      return true;
    } catch {
      state.patients = [];
      state.appointments = [];
      state.nextSeq = 1;
      state.year = new Date().getFullYear();
      return false;
    }
  }

  function syncYearSequence() {
    const y = new Date().getFullYear();
    if (y === state.year) return;
    state.year = y;
    state.nextSeq = 1;
    if (state.patients.length || state.appointments.length) save();
  }

  function persistPayload(payload) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function save() {
    const payload = {
      patients: state.patients,
      appointments: state.appointments,
      nextSeq: state.nextSeq,
      year: state.year,
    };
    try {
      persistPayload(payload);
      return true;
    } catch {
      try {
        payload.patients = payload.patients.map((p) => ({
          ...p,
          files: (p.files || []).slice(-2),
        }));
        persistPayload(payload);
        state.patients = payload.patients;
        toast("Storage was nearly full. Kept the 2 newest images per patient.");
        return true;
      } catch {
        toast("Storage is full. Remove unused scans or photos, then save again.");
        return false;
      }
    }
  }

  function timeSlots() {
    const slots = [];
    for (let h = 9, m = 30; h < 20 || (h === 20 && m === 0); ) {
      if (h === 20) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      m += 30;
      if (m >= 60) {
        h += 1;
        m = 0;
      }
    }
    return slots;
  }

  function formatTime(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = ((h + 11) % 12) + 1;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2600);
  }

  function nextPreviewId() {
    return makePatientId(state.nextSeq, new Date().getFullYear());
  }

  function resetForm() {
    state.editingId = null;
    state.pendingFiles = [];
    $("patientForm").reset();
    $("patientId").value = nextPreviewId();
    $("formModeLabel").textContent = "Add / Edit Form";
    $("savePatientBtn").textContent = "Save Patient";
    renderThumbs();
    ["nameError", "phoneError", "treatmentError"].forEach((id) => ($(id).hidden = true));
  }

  function fillForm(p) {
    state.editingId = p.id;
    state.pendingFiles = p.files.map((f) => ({ ...f }));
    $("patientId").value = p.id;
    $("fullName").value = p.name;
    $("contact").value = p.phone;
    $("treatment").value = p.treatment;
    $("notes").value = p.notes || "";
    $("formModeLabel").textContent = "Editing patient";
    $("savePatientBtn").textContent = "Update Patient";
    renderThumbs();
  }

  function renderThumbs() {
    const box = $("formThumbs");
    box.innerHTML = state.pendingFiles
      .map(
        (f) => `
      <div class="thumb" data-preview="${f.id}" role="button" tabindex="0" aria-label="Preview ${escapeHtml(f.kind)}">
        <img src="${f.dataUrl}" alt="${escapeHtml(f.name)}">
        <span class="kind">${escapeHtml(f.kind)}</span>
        <button type="button" data-del-file="${f.id}" aria-label="Remove ${escapeHtml(f.kind)}">×</button>
      </div>`
      )
      .join("");
  }

  function validateForm() {
    const name = $("fullName").value.trim();
    const phone = $("contact").value.replace(/\D/g, "");
    const treatment = $("treatment").value;
    $("nameError").hidden = Boolean(name);
    $("phoneError").hidden = phone.length === 10;
    $("treatmentError").hidden = Boolean(treatment);
    return name && phone.length === 10 && treatment;
  }

  function onSavePatient(e) {
    e.preventDefault();
    if (!validateForm()) return;
    const phone = $("contact").value.replace(/\D/g, "");
    const payload = {
      name: $("fullName").value.trim(),
      phone,
      treatment: $("treatment").value,
      notes: $("notes").value.trim(),
      files: state.pendingFiles,
    };

    if (state.editingId) {
      const p = state.patients.find((x) => x.id === state.editingId);
      Object.assign(p, payload);
      if (!save()) return;
      toast("Patient updated");
    } else {
      const year = new Date().getFullYear();
      if (year !== state.year) {
        state.year = year;
        state.nextSeq = 1;
      }
      const patient = {
        id: makePatientId(state.nextSeq, year),
        ...payload,
        status: "upcoming",
        date: state.selectedDate,
      };
      state.patients.unshift(patient);
      state.nextSeq += 1;
      if (!save()) {
        state.patients.shift();
        state.nextSeq -= 1;
        return;
      }
      toast("Patient saved");
    }
    resetForm();
    renderAll();
  }

  function filteredPatients() {
    const q = state.query.toLowerCase().trim();
    return state.patients.filter((p) => {
      const okStatus = state.filter === "all" || p.status === state.filter;
      const okQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q);
      return okStatus && okQuery;
    });
  }

  function renderPatients() {
    const list = $("patientList");
    const rows = filteredPatients();
    $("patientCount").textContent = String(rows.length);
    if (!state.patients.length) {
      list.innerHTML = `<div class="empty empty-card">No patients registered yet. Click 'New Patient' or fill out the form to add your first patient.</div>`;
      return;
    }
    if (!rows.length) {
      list.innerHTML = `<div class="empty">No patients match this search or filter.</div>`;
      return;
    }
    list.innerHTML = rows
      .map(
        (p) => `
      <article class="table-row row-${p.status}">
        <div class="row-info">
          <strong>${escapeHtml(p.name)}</strong>
          <div class="row-meta">${p.id} · ${escapeHtml(p.treatment)} · ${formatDisplayDate(p.date)}</div>
          <div class="row-meta">${p.phone}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <span class="badge ${p.status}">${p.status}</span>
          <div class="row-actions">
            <button class="mini" data-edit="${p.id}">Edit</button>
            <button class="mini" data-status="${p.id}">Status</button>
            <button class="mini" data-files="${p.id}">Files</button>
            <button class="mini danger" data-delete="${p.id}">Delete</button>
          </div>
        </div>
      </article>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function statusesByDate() {
    const map = {};
    for (const a of state.appointments) {
      const p = state.patients.find((pt) => pt.id === a.patientId);
      const status = p?.status || "upcoming";
      if (!map[a.date]) map[a.date] = { count: 0, statuses: new Set() };
      map[a.date].count += 1;
      map[a.date].statuses.add(status);
    }
    return map;
  }

  function renderCalendar() {
    const title = new Date(state.calYear, state.calMonth, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    $("calTitle").textContent = title;
    const first = new Date(state.calYear, state.calMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    const byDate = statusesByDate();
    const today = isoDate(new Date());
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(`<div class="calendar-day muted"></div>`);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${state.calYear}-${String(state.calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const info = byDate[iso];
      const n = info?.count || 0;
      const pips = info
        ? ["missed", "resolved", "upcoming"]
            .filter((s) => info.statuses.has(s))
            .map((s) => `<span class="day-pip ${s}" title="${s}"></span>`)
            .join("")
        : "";
      const cls = [
        "calendar-day",
        iso === today ? "today" : "",
        iso === state.selectedDate ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ");
      cells.push(
        `<button type="button" class="${cls}" data-day="${iso}" aria-label="${formatDisplayDate(iso)}${n ? `, ${n} appointments` : ""}">
          <span>${d}</span>
          <span class="day-status-row">${pips}</span>
          ${n ? `<span class="day-badge">${n}</span>` : ""}
        </button>`
      );
    }
    $("calendarGrid").innerHTML = cells.join("");
  }

  function bookedTimes(date) {
    return new Set(state.appointments.filter((a) => a.date === date).map((a) => a.time));
  }

  function dayAppointments(date = state.selectedDate) {
    return state.appointments
      .filter((x) => x.date === date)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function renderSchedule() {
    $("scheduleDateLabel").textContent = formatDisplayDate(state.selectedDate);
    const booked = dayAppointments();
    $("scheduleEmpty").hidden = booked.length > 0;
    const byTime = {};
    for (const a of booked) {
      const p = state.patients.find((pt) => pt.id === a.patientId);
      byTime[a.time] = `${p ? p.name : "Patient"} · ${a.treatment}`;
    }
    $("scheduleList").innerHTML = timeSlots()
      .map((t) => {
        const filled = byTime[t];
        const selected = state.selectedSlot === t && !filled;
        return `<button type="button" class="time-slot ${filled ? "is-booked" : ""} ${selected ? "is-selected" : ""}" data-slot="${t}" ${filled ? 'aria-disabled="true"' : ""}>
          <div class="time-val">${formatTime(t)}</div>
          <div class="${filled ? "slot-filled" : "slot-empty"}">${filled || "Available — tap to book"}</div>
        </button>`;
      })
      .join("");
  }

  function fillTimeSelect(preferred) {
    const sel = $("bookTime");
    const date = $("bookDate").value;
    const taken = bookedTimes(date);
    const keep = preferred && !taken.has(preferred) ? preferred : sel.value;
    sel.innerHTML = timeSlots()
      .map((t) => {
        const busy = taken.has(t);
        return `<option value="${t}" ${busy ? "disabled" : ""}>${formatTime(t)}${busy ? " — booked" : ""}</option>`;
      })
      .join("");
    if (keep && !taken.has(keep)) sel.value = keep;
    else {
      const firstFree = timeSlots().find((t) => !taken.has(t));
      if (firstFree) sel.value = firstFree;
    }
  }

  function renderSuggest(q) {
    const box = $("patientSuggest");
    if (!q) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const hits = state.patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.phone.includes(q) ||
          p.id.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 8);
    if (!hits.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.innerHTML = hits
      .map(
        (p) =>
          `<button type="button" data-pick="${p.id}">${escapeHtml(p.name)} · ${p.id}</button>`
      )
      .join("");
  }

  function renderAll() {
    renderPatients();
    renderCalendar();
    renderSchedule();
    fillTimeSelect(state.selectedSlot);
  }

  function getFocusables(dialog) {
    return [...dialog.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.hasAttribute("hidden") && el.offsetParent !== null
    );
  }

  function openModal(id) {
    closeModals();
    state.lastFocus = document.activeElement;
    const overlay = $(id);
    overlay.hidden = false;
    state.activeOverlay = overlay;
    const dialog = overlay.querySelector(".modal");
    const nodes = getFocusables(dialog);
    (nodes[0] || dialog).focus();
    state.trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const list = getFocusables(dialog);
      if (!list.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    overlay.addEventListener("keydown", state.trapHandler);
  }

  function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach((el) => {
      if (state.trapHandler) el.removeEventListener("keydown", state.trapHandler);
      el.hidden = true;
    });
    state.trapHandler = null;
    state.activeOverlay = null;
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function closeDrawer() {
    $("headerDrawer").classList.remove("is-open");
    $("drawerBackdrop").hidden = true;
    $("menuToggle").setAttribute("aria-expanded", "false");
  }

  function openPreview(src, title) {
    $("previewTitle").textContent = title || "Image preview";
    $("previewImage").src = src;
    $("previewImage").alt = title || "Attachment preview";
    openModal("previewModal");
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image."));
      img.src = src;
    });
  }

  function canvasToJpeg(img, max, quality) {
    const canvas = document.createElement("canvas");
    let { width, height } = img;
    if (width > max || height > max) {
      const scale = Math.min(max / width, max / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function readFileAsDataUrl(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return canvasToJpeg(img, 900, 0.72);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function addFiles(fileList, kind) {
    for (const file of fileList) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        state.pendingFiles.push({
          id: crypto.randomUUID(),
          kind,
          name: file.name,
          dataUrl,
        });
      } catch (err) {
        toast(err.message);
      }
    }
    renderThumbs();
  }

  function bindUploads() {
    const scan = $("scanInput");
    const photo = $("photoInput");
    scan.addEventListener("change", () => {
      addFiles(scan.files, "scan");
      scan.value = "";
    });
    photo.addEventListener("change", () => {
      addFiles(photo.files, "photo");
      photo.value = "";
    });
    document.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        $(btn.dataset.pick).click();
      });
    });
    document.querySelectorAll(".upload-drop").forEach((drop) => {
      drop.addEventListener("click", (e) => {
        if (e.target.closest("[data-pick]")) return;
        const input = drop.querySelector("input[type=file]");
        input.click();
      });
      ["dragenter", "dragover"].forEach((ev) =>
        drop.addEventListener(ev, (e) => {
          e.preventDefault();
          drop.classList.add("is-drag");
        })
      );
      ["dragleave", "drop"].forEach((ev) =>
        drop.addEventListener(ev, (e) => {
          e.preventDefault();
          drop.classList.remove("is-drag");
        })
      );
      drop.addEventListener("drop", (e) => {
        const kind = drop.dataset.kind;
        addFiles(e.dataTransfer.files, kind);
      });
    });
  }

  function fillPrintSheet() {
    $("printDateLabel").textContent = `Date: ${formatDisplayDate(state.selectedDate)}`;
    const rows = dayAppointments();
    const body = $("printTableBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td class="print-empty" colspan="6">No appointments scheduled for this date.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map((a) => {
        const p = state.patients.find((pt) => pt.id === a.patientId);
        const notes = [p?.notes, p?.status].filter(Boolean).join(" · ");
        return `<tr>
          <td>${escapeHtml(formatTime(a.time))}</td>
          <td>${escapeHtml(p?.id || a.patientId)}</td>
          <td>${escapeHtml(p?.name || "Unknown patient")}</td>
          <td>${escapeHtml(p?.phone || "—")}</td>
          <td>${escapeHtml(a.treatment || p?.treatment || "—")}</td>
          <td>${escapeHtml(notes || "—")}</td>
        </tr>`;
      })
      .join("");
  }

  function printSchedule() {
    fillPrintSheet();
    window.print();
  }

  function clearAllData() {
    const ok = confirm(
      "Clear all clinic data? This permanently deletes every patient, appointment, and attached file stored in this browser."
    );
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state.patients = [];
    state.appointments = [];
    state.nextSeq = 1;
    state.year = new Date().getFullYear();
    state.selectedSlot = null;
    state.editingId = null;
    state.pendingFiles = [];
    state.statusTargetId = null;
    closeModals();
    closeDrawer();
    resetForm();
    renderAll();
    toast("All clinic data cleared");
  }

  function highlightBookCard() {
    const card = $("bookCard");
    card.classList.add("is-open", "book-pulse");
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => card.classList.remove("book-pulse"), 900);
    $("bookPatientSearch").focus();
  }

  function pickSlot(time) {
    const taken = bookedTimes(state.selectedDate);
    if (taken.has(time)) {
      toast("That time slot is already booked");
      return;
    }
    state.selectedSlot = time;
    $("bookDate").value = state.selectedDate;
    fillTimeSelect(time);
    $("bookTime").value = time;
    renderSchedule();
    highlightBookCard();
    toast(`Selected ${formatTime(time)} — choose a patient to book`);
  }

  function bindCollapse() {
    document.querySelectorAll("[data-collapse-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 640px)").matches === false) return;
        const card = btn.closest("[data-collapse]");
        const open = card.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(open));
      });
    });
  }

  function init() {
    load();
    syncYearSequence();
    $("patientId").value = nextPreviewId();
    $("bookDate").value = state.selectedDate;
    bindUploads();
    bindCollapse();

    $("patientForm").addEventListener("submit", onSavePatient);
    $("resetFormBtn").addEventListener("click", resetForm);
    $("newPatientFocusBtn").addEventListener("click", () => {
      closeDrawer();
      resetForm();
      $("patientFormCard").classList.add("is-open");
      $("fullName").focus();
      $("patientFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("clinicInfoBtn").addEventListener("click", () => {
      closeDrawer();
      openModal("clinicModal");
    });
    const printHandler = () => {
      closeDrawer();
      printSchedule();
    };
    $("printBtn").addEventListener("click", printHandler);
    $("printScheduleBtn").addEventListener("click", printHandler);
    $("clearDataBtn").addEventListener("click", () => {
      closeDrawer();
      clearAllData();
    });
    $("clearDataModalBtn").addEventListener("click", clearAllData);
    $("menuToggle").addEventListener("click", () => {
      const open = !$("headerDrawer").classList.contains("is-open");
      $("headerDrawer").classList.toggle("is-open", open);
      $("drawerBackdrop").hidden = !open;
      $("menuToggle").setAttribute("aria-expanded", String(open));
    });
    $("drawerBackdrop").addEventListener("click", closeDrawer);

    $("searchInput").addEventListener("input", (e) => {
      state.query = e.target.value;
      renderPatients();
    });
    document.querySelectorAll(".filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.filter = btn.dataset.filter;
        document.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        renderPatients();
      });
    });

    $("patientList").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      const status = e.target.closest("[data-status]");
      const files = e.target.closest("[data-files]");
      const del = e.target.closest("[data-delete]");
      if (edit) {
        const p = state.patients.find((x) => x.id === edit.dataset.edit);
        fillForm(p);
        $("patientFormCard").classList.add("is-open");
        $("patientFormCard").scrollIntoView({ behavior: "smooth" });
      }
      if (status) {
        const p = state.patients.find((x) => x.id === status.dataset.status);
        state.statusTargetId = p.id;
        $("statusPatientName").textContent = `${p.name} · ${p.id}`;
        openModal("statusModal");
      }
      if (files) {
        const p = state.patients.find((x) => x.id === files.dataset.files);
        $("filesModalTitle").textContent = `Files — ${p.name}`;
        $("filesGrid").innerHTML = p.files.length
          ? p.files
              .map(
                (f) => `<div class="thumb" data-open-preview="${f.id}" role="button" tabindex="0">
                  <img src="${f.dataUrl}" alt="${escapeHtml(f.name)}">
                  <span class="kind">${escapeHtml(f.kind)}</span>
                </div>`
              )
              .join("")
          : `<div class="empty">No scans or photos attached yet.</div>`;
        $("filesGrid").dataset.owner = p.id;
        openModal("filesModal");
      }
      if (del) {
        const id = del.dataset.delete;
        const p = state.patients.find((x) => x.id === id);
        if (!confirm(`Delete ${p.name} (${p.id})? This also removes their appointments.`)) return;
        state.patients = state.patients.filter((x) => x.id !== id);
        state.appointments = state.appointments.filter((a) => a.patientId !== id);
        if (state.editingId === id) resetForm();
        save();
        renderAll();
        toast("Patient deleted");
      }
    });

    $("formThumbs").addEventListener("click", (e) => {
      const del = e.target.closest("[data-del-file]");
      if (del) {
        e.stopPropagation();
        state.pendingFiles = state.pendingFiles.filter((f) => f.id !== del.dataset.delFile);
        renderThumbs();
        return;
      }
      const thumb = e.target.closest("[data-preview]");
      if (!thumb) return;
      const file = state.pendingFiles.find((f) => f.id === thumb.dataset.preview);
      if (file) openPreview(file.dataUrl, `${file.kind} · ${file.name}`);
    });
    $("formThumbs").addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const thumb = e.target.closest("[data-preview]");
      if (!thumb) return;
      e.preventDefault();
      const file = state.pendingFiles.find((f) => f.id === thumb.dataset.preview);
      if (file) openPreview(file.dataUrl, `${file.kind} · ${file.name}`);
    });

    $("filesGrid").addEventListener("click", (e) => {
      const thumb = e.target.closest("[data-open-preview]");
      if (!thumb) return;
      const owner = state.patients.find((p) => p.id === $("filesGrid").dataset.owner);
      const file = owner?.files.find((f) => f.id === thumb.dataset.openPreview);
      if (file) openPreview(file.dataUrl, `${file.kind} · ${file.name}`);
    });

    $("prevMonth").addEventListener("click", () => {
      state.calMonth -= 1;
      if (state.calMonth < 0) {
        state.calMonth = 11;
        state.calYear -= 1;
      }
      renderCalendar();
    });
    $("nextMonth").addEventListener("click", () => {
      state.calMonth += 1;
      if (state.calMonth > 11) {
        state.calMonth = 0;
        state.calYear += 1;
      }
      renderCalendar();
    });
    $("calendarGrid").addEventListener("click", (e) => {
      const day = e.target.closest("[data-day]");
      if (!day) return;
      state.selectedDate = day.dataset.day;
      state.selectedSlot = null;
      $("bookDate").value = state.selectedDate;
      renderCalendar();
      renderSchedule();
      fillTimeSelect();
    });

    $("scheduleList").addEventListener("click", (e) => {
      const slot = e.target.closest("[data-slot]");
      if (!slot) return;
      pickSlot(slot.dataset.slot);
    });

    $("bookDate").addEventListener("change", () => {
      state.selectedDate = $("bookDate").value;
      state.selectedSlot = null;
      const [y, m] = state.selectedDate.split("-").map(Number);
      state.calYear = y;
      state.calMonth = m - 1;
      renderAll();
    });

    $("bookTime").addEventListener("change", () => {
      const time = $("bookTime").value;
      if (bookedTimes($("bookDate").value).has(time)) {
        toast("That time slot is already booked");
        fillTimeSelect();
        return;
      }
      state.selectedSlot = time;
      renderSchedule();
    });

    $("bookPatientSearch").addEventListener("input", (e) => {
      $("bookPatientId").value = "";
      renderSuggest(e.target.value);
    });
    $("patientSuggest").addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (!pick) return;
      const p = state.patients.find((x) => x.id === pick.dataset.pick);
      $("bookPatientId").value = p.id;
      $("bookPatientSearch").value = `${p.name} (${p.id})`;
      $("bookTreatment").value = p.treatment;
      $("patientSuggest").hidden = true;
    });

    $("bookForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const patientId = $("bookPatientId").value;
      if (!patientId) {
        toast("Select an existing patient from the list");
        return;
      }
      const date = $("bookDate").value;
      const time = $("bookTime").value;
      const treatment = $("bookTreatment").value;
      if (!date || !time || !treatment) return;
      const clash = state.appointments.some((a) => a.date === date && a.time === time);
      if (clash) {
        toast("That time slot is already booked");
        fillTimeSelect();
        return;
      }
      state.appointments.push({
        id: crypto.randomUUID(),
        patientId,
        date,
        time,
        treatment,
      });
      const p = state.patients.find((x) => x.id === patientId);
      p.date = date;
      p.treatment = treatment;
      if (p.status === "missed") p.status = "upcoming";
      state.selectedSlot = null;
      save();
      renderAll();
      toast("Appointment booked");
    });

    document.querySelectorAll("[data-close]").forEach((btn) =>
      btn.addEventListener("click", closeModals)
    );
    document.querySelectorAll(".modal-overlay").forEach((overlay) =>
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModals();
      })
    );
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (state.activeOverlay && !state.activeOverlay.hidden) {
        closeModals();
        return;
      }
      closeDrawer();
    });
    document.querySelectorAll(".status-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = state.patients.find((x) => x.id === state.statusTargetId);
        if (p) {
          p.status = btn.dataset.status;
          save();
          renderAll();
          toast(`Marked ${p.status}`);
        }
        closeModals();
      });
    });

    $("contact").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
