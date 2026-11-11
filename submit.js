/* Heirloom Events — "Submit an event" form */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#eventForm");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const openedAt = Date.now();
  // Edit mode: opened from the "Edit or cancel your event" link in an email
  const qs = new URLSearchParams(location.search);
  const EDIT = qs.get("admin") !== "1" && qs.get("edit") && qs.get("sig") ? { id: qs.get("edit"), by: qs.get("by") || "", sig: qs.get("sig") } : null;
  // Admin mode: opened from the Admin page (needs an admin's sign-in from My events)
  //   ?admin=1&edit=EV-…                       → an event from the form
  //   ?admin=1&cal=public&eid=…&start=…       → an event added straight in Google Calendar
  const SESSION = (() => { try { return JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { return null; } })();
  const ADMIN = qs.get("admin") !== "1" ? null
    : qs.get("eid") ? { kind: "calendar", cal: qs.get("cal") === "residents" ? "residents" : "public", eventId: qs.get("eid"), start: qs.get("start") || "" }
    : qs.get("edit") ? { kind: "form", id: qs.get("edit") } : null;
  const CALMODE = !!(ADMIN && ADMIN.kind === "calendar");
  const backToAdmin = "admin.html" + (ADMIN && ADMIN.cal === "residents" ? "?tab=residents" : "");
  let original = null;
  let payloadNotified = false;
  let presets = C.PRESETS.slice();
  let partners = (C.PARTNERS || []).slice();
  function renderHosts() {
    const cur = $("#host").value;
    // Partners whose events are imported automatically (Plantify, Soundbird) don't need to be here;
    // only partners set to Import type "None" on the Partners tab post through the form
    const formPartners = partners.filter(p => p.formOnly);
    $("#host").innerHTML = `<option value="">Heirloom (residents &amp; staff)</option><option value="community">Community member</option>` +
      (formPartners.length ? `<optgroup label="Community partners">${formPartners.map(p => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("")}</optgroup>` : "");
    $("#host").value = cur === "community" || formPartners.some(p => p.slug === cur) ? cur : "";
    $("#hostNameField").hidden = $("#host").value !== "community";
  }
  renderHosts();
  /* ---------- Discord: opt-in, at the end of the form ---------- */
  // Channels come from the Sheet's "Discord channels" tab once live: [{ type, name }]
  let channels = (C.DISCORD_CHANNELS || (C.TYPES || []).map(t => ({ type: t, name: t }))).slice();
  function renderChannels() {
    const picked = new FormData(form).getAll("types");
    $("#channels").innerHTML = channels.map((c, i) =>
      `<label><input type="checkbox" name="types" id="t${i}" value="${esc(c.type)}"${picked.includes(c.type) ? " checked" : ""}>${esc(c.name)}</label>`).join("");
    $("#discordStep").hidden = !channels.length || !$("#cal-public").checked;
  }
  function syncDiscord() {
    const yes = $("#d-yes").checked;
    $("#discordPick").hidden = !yes;
    if (!yes) form.querySelectorAll('input[name="types"]').forEach(c => c.checked = false);
    $("[data-f=discord]").classList.remove("invalid");
  }
  renderChannels();
  $("#channels").addEventListener("change", () => $("[data-f=discord]").classList.remove("invalid"));
  form.querySelectorAll('input[name="discordShare"]').forEach(r => r.addEventListener("change", syncDiscord));
  // Discord only posts public events
  $("#cal-public").addEventListener("change", renderChannels);
  let fallbacks = C.FALLBACKS.slice();

  /* ---------- Volunteer opportunity ---------- */
  let volAreas = ["Animal chores", "Workday", "One-off project", "Garden", "Other"];
  let trainings = ["Animal chores", "Goat milking", "Garden tools", "Power tools"];
  function renderVolChoices() {
    const a = $("#volArea").value, t = $("#volTraining").value;
    $("#volArea").innerHTML = volAreas.map(x => `<option${x === a ? " selected" : ""}>${esc(x)}</option>`).join("");
    $("#volTraining").innerHTML = `<option value="">No training needed</option>` + trainings.map(x => `<option${x === t ? " selected" : ""}>${esc(x)}</option>`).join("");
  }
  renderVolChoices();
  function syncVolunteer() {
    const on = $("#volunteer").checked, only = on && $("#vw-volunteers").checked;
    $("#volFields").hidden = !on;
    // Volunteers sign up through the built-in sign-up list
    $("#r-none").closest(".rsvp-modes").hidden = on;
    if (on) { $("#r-form").checked = true; document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== "form"); }
    $('label[for="spots"]').textContent = on ? "How many volunteers do you need?" : "How many spots?";
    // Approved-volunteers-only: never on the public calendar
    const pub = $("#cal-public");
    if (only) { pub.checked = false; pub.disabled = true; } else if (pub.disabled) { pub.disabled = false; pub.checked = true; }
    $("#volCalNote").hidden = !only;
    $("[data-f=calendars]").classList.remove("invalid");
    renderChannels(); update();
  }
  $("#volunteer").addEventListener("change", syncVolunteer);
  form.querySelectorAll('input[name="volWho"]').forEach(r => r.addEventListener("change", syncVolunteer));
  let upload = null; // { data: base64, url: objectURL }

  if (!C.API_URL) $("#demoBanner").hidden = false;
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;
  /* ---------- Where on the farm: tappable places + "Somewhere else" ---------- */
  let places = (C.LOCATIONS || []).slice();
  function renderPlaces() {
    const cur = form.querySelector('input[name="place"]:checked');
    const keep = cur ? cur.value : "";
    $("#places").innerHTML = places.concat(["Somewhere else"]).map((p, i) => {
      const v = p === "Somewhere else" ? "__other" : p;
      return `<label><input type="radio" name="place" id="pl${i}" value="${esc(v)}"${v === keep ? " checked" : ""}>${esc(p)}</label>`;
    }).join("");
    $("#places").querySelectorAll("input").forEach(r => {
      // Tapping the chosen place again clears it
      r.addEventListener("click", () => {
        if (r.dataset.was === "1") { r.checked = false; r.dataset.was = ""; }
        else $("#places").querySelectorAll("input").forEach(x => x.dataset.was = x === r ? "1" : "");
        $("#otherPlace").hidden = !(r.checked && r.value === "__other");
        if (!$("#otherPlace").hidden) $("#location").focus();
        update();
      });
    });
  }
  renderPlaces();

  // Today in farm time = earliest date allowed
  const t = H.parts(new Date());
  const todayStr = `${t.y}-${H.pad(t.m)}-${H.pad(t.d)}`;
  $("#date").min = todayStr; $("#until").min = todayStr;

  /* ---------- Photo gallery (from the Sheet's Keywords tab once live) ---------- */
  function renderGallery() {
    $("#gallery").innerHTML = presets.filter(p => p.gallery !== false).map((p, i) => `
      <div class="g-item"><input type="radio" name="preset" id="p${i}" value="${esc(p.image)}">
      <label for="p${i}"><img src="${esc(p.image)}" alt="" loading="lazy"><span>${esc(p.label)}</span></label></div>`).join("");
    $("#gallery").querySelectorAll("input").forEach(r => r.addEventListener("change", update));
  }
  renderGallery();
  const presetsReady = !C.API_URL ? Promise.resolve() :
    fetch(C.API_URL + "?action=presets").then(r => r.json()).then(d => {
      if (d.ok && d.partners) { partners = d.partners; renderHosts(); }
      if (d.ok && d.channels && d.channels.length) { channels = d.channels; renderChannels(); }
      if (d.ok && d.volAreas && d.volAreas.length) { volAreas = d.volAreas; trainings = d.trainings || []; renderVolChoices(); }
      if (d.ok && d.locations && d.locations.length) { places = d.locations; renderPlaces(); }
      if (d.ok && d.presets && d.presets.length) { presets = d.presets; fallbacks = d.fallbacks || fallbacks; renderGallery(); renderMulti(); update(); }
    }).catch(() => {});

  /* ---------- Several photos that take turns (repeating events) ---------- */
  let multi = [];          // [{ kind: "preset" | "upload" | "url", url, data? }]
  const MULTI_MAX = 6;
  const isRepeating = () => $("#repeat").value !== "none" || !!(CALMODE && original && original.recurring);
  function syncMultiRow() {
    const show = isRepeating() && !$("#imageStep").hidden;
    $("#multiRow").hidden = !show;
    if (!show && $("#multi").checked) { $("#multi").checked = false; setMulti(false); }
  }
  function setMulti(on) {
    $("#multiPanel").hidden = !on;
    $("#imageStep .photo-modes").hidden = on;
    if (on) { $("#keepPhoto").hidden = true; document.querySelectorAll("[data-panel]").forEach(p => p.classList.remove("on")); }
    else {
      if (original && original.image && $("#m-keep")) { $("#keepPhoto").hidden = false; }
      const m = form.querySelector('input[name="imageMode"]:checked'); setPanel(m ? m.value : "auto");
    }
    renderMulti(); update();
  }
  function renderMulti() {
    $("#multiList").innerHTML = multi.map((it, i) => `<div class="m-thumb"><img src="${esc(it.url)}" alt=""><span class="n">${i + 1}</span>
      <button type="button" class="x" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join("");
    $("#multiList").querySelectorAll(".x").forEach(b => b.onclick = () => { multi.splice(+b.dataset.i, 1); renderMulti(); update(); });
    $("#multiGallery").innerHTML = presets.filter(p => p.gallery !== false).map(p => {
      const i = multi.findIndex(it => it.url === p.image);
      return `<button type="button" data-url="${esc(p.image)}" aria-pressed="${i !== -1}"><img src="${esc(p.image)}" alt="" loading="lazy">${i !== -1 ? `<span class="n">${i + 1}</span>` : ""}<span>${esc(p.label)}</span></button>`;
    }).join("");
    $("#multiGallery").querySelectorAll("button").forEach(b => b.onclick = () => {
      const i = multi.findIndex(it => it.url === b.dataset.url);
      if (i !== -1) multi.splice(i, 1);
      else if (multi.length < MULTI_MAX) multi.push({ kind: "preset", url: b.dataset.url });
      renderMulti(); update();
    });
    $("#multiHint").textContent = multi.length >= MULTI_MAX ? "That's 6, the most it can hold. Remove one to add another."
      : "or tap photos below to add them. Up to 6, used in this order.";
  }
  $("#multi").addEventListener("change", () => setMulti($("#multi").checked));
  $("#repeat").addEventListener("change", syncMultiRow);
  $("#multiFiles").addEventListener("change", async e => {
    const files = [...e.target.files].slice(0, MULTI_MAX - multi.length);
    for (const f of files) {
      try {
        const img = await loadImage(f);
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const url = c.toDataURL("image/jpeg", 0.82);
        multi.push({ kind: "upload", url, data: url.split(",")[1] });
      } catch (err) { console.error(err); }
    }
    e.target.value = ""; renderMulti(); update();
  });

  /* ---------- Photo mode switching ---------- */
  form.querySelectorAll('input[name="imageMode"]').forEach(r => r.addEventListener("change", () => {
    document.querySelectorAll("[data-panel]").forEach(p => p.classList.toggle("on", p.dataset.panel === r.value));
    if (r.value === "upload" && !upload) $("#photo").click();
    update();
  }));

  /* ---------- Upload: shrink on the phone before sending ---------- */
  $("#photo").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    $("#photoStatus").textContent = "Getting your photo ready…";
    try {
      const img = await loadImage(file);
      const max = 1600, scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      upload = { data: dataUrl.split(",")[1], url: dataUrl };
      $("#uploadImg").src = dataUrl;
      $("#uploadPanel").classList.add("has-upload");
      $("#savePhotoRow").hidden = false;
      $("#m-upload").checked = true;
      document.querySelectorAll("[data-panel]").forEach(p => p.classList.toggle("on", p.dataset.panel === "upload"));
      $("#photoStatus").textContent = canvas.width < canvas.height ? "Tip: tall photos get cropped to fit. Wide ones look best." : "";
    } catch (err) {
      console.error(err);
      $("#photoStatus").textContent = "We couldn't read that photo. Try a different one, or pick one of ours.";
    }
    update();
  });
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }
  $("#removePhoto").addEventListener("click", () => {
    upload = null; $("#photo").value = ""; $("#uploadPanel").classList.remove("has-upload"); $("#photoStatus").textContent = "";
    $("#savePhotoRow").hidden = true; $("#savePhoto").checked = false; update();
  });

  /* ---------- Cost: Free / Suggested donation / Materials fee / Other ---------- */
  const COST_PER = { donation: "suggested donation per person", materials: "materials fee per person" };
  function showCostRows() {
    const r = form.querySelector('input[name="costType"]:checked');
    const t = r ? r.value : "";
    $("#costAmountRow").hidden = !COST_PER[t];
    if (COST_PER[t]) $("#costPer").textContent = COST_PER[t];
    $("#costOtherRow").hidden = t !== "other";
  }
  form.querySelectorAll('input[name="costType"]').forEach(r => r.addEventListener("click", () => {
    // Tapping the chosen option again clears it
    if (r.dataset.was === "1") { r.checked = false; r.dataset.was = ""; }
    else form.querySelectorAll('input[name="costType"]').forEach(x => x.dataset.was = x === r ? "1" : "");
    showCostRows();
    if (!$("#costAmountRow").hidden) $("#costAmount").focus();
    else if (!$("#costOtherRow").hidden) $("#costOther").focus();
    $("[data-f=cost]").classList.remove("invalid");
    update();
  }));
  function costText() {
    const r = form.querySelector('input[name="costType"]:checked');
    if (!r) return "";
    const amt = String($("#costAmount").value || "").trim().replace(/^\$/, "");
    const money = amt ? "$" + (Number(amt) % 1 ? Number(amt).toFixed(2) : Number(amt)) : "";
    if (r.value === "free") return "Free";
    if (r.value === "donation") return money ? money + " suggested donation per person" : "";
    if (r.value === "materials") return money ? money + " materials fee per person" : "";
    return ($("#costOther").value || "").trim();
  }
  function setCost(text) {
    text = String(text || "").trim();
    let type = "", amt = "", other = "";
    let m;
    if (!text) type = "";
    else if (/^free$/i.test(text)) type = "free";
    else if ((m = text.match(/^\$?([\d.]+) suggested donation/i))) { type = "donation"; amt = m[1]; }
    else if ((m = text.match(/^\$?([\d.]+) materials fee/i))) { type = "materials"; amt = m[1]; }
    else { type = "other"; other = text; }
    form.querySelectorAll('input[name="costType"]').forEach(x => { x.checked = x.value === type; x.dataset.was = x.checked ? "1" : ""; });
    $("#costAmount").value = amt; $("#costOther").value = other;
    showCostRows();
  }

  /* ---------- RSVP options ---------- */
  form.querySelectorAll('input[name="rsvpMode"]').forEach(r => r.addEventListener("change", () => {
    document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== r.value);
  }));

  // Partners usually sell tickets on their own site (Eventbrite etc.)
  $("#host").addEventListener("change", () => {
    $("#hostNameField").hidden = $("#host").value !== "community";
    if ($("#host").value && $("#host").value !== "community" && $("#r-none").checked) {
      $("#r-link").checked = true; $("#linkLabel").value = "Get tickets";
      document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== "link");
    }
    update();
  });

  /* ---------- Dates, times, repeats ---------- */
  $("#allDay").addEventListener("change", () => {
    document.querySelectorAll(".time-f").forEach(f => f.style.display = $("#allDay").checked ? "none" : "");
    update();
  });
  const ordinal = n => ["first", "second", "third", "fourth"][n - 1];
  function refreshRepeatLabels() {
    const v = $("#date").value;
    const sel = $("#repeat");
    const nth = sel.querySelector('[value="monthlyNth"]'), md = sel.querySelector('[value="monthlyDate"]');
    if (!v) { nth.textContent = "Monthly (same weekday)"; md.textContent = "Monthly (same date)"; nth.hidden = false; return; }
    const [y, m, d] = v.split("-").map(Number);
    const wd = H.fmt(H.zoned(y, m, d, 12), { weekday: "long" });
    const n = Math.ceil(d / 7);
    nth.hidden = n > 4;
    if (n > 4 && sel.value === "monthlyNth") sel.value = "monthlyDate";
    nth.textContent = `Monthly on the ${ordinal(Math.min(n, 4))} ${wd}`;
    md.textContent = `Monthly on the ${d}${["th", "st", "nd", "rd"][(d % 100 > 10 && d % 100 < 14) || d % 10 > 3 ? 0 : d % 10]}`;
    sel.querySelector('[value="weekly"]').textContent = `Every ${wd}`;
    sel.querySelector('[value="biweekly"]').textContent = `Every other ${wd}`;
  }
  $("#date").addEventListener("change", () => { refreshRepeatLabels(); if ($("#date").value) $("#until").min = $("#date").value; });
  $("#repeat").addEventListener("change", () => { $("#untilField").hidden = $("#repeat").value === "none"; update(); });
  refreshRepeatLabels();

  /* ---------- "More details": a small rich-text editor ---------- */
  const rte = $("#details");
  let savedRange = null;
  const saveRange = () => { const s = getSelection(); if (s.rangeCount && rte.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { rte.focus(); if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } };
  ["keyup", "mouseup", "input", "focus"].forEach(ev => rte.addEventListener(ev, saveRange));
  document.execCommand("defaultParagraphSeparator", false, "p");
  $(".rte-bar").addEventListener("mousedown", e => e.preventDefault()); // keep the text selected
  $(".rte-bar").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const cmd = b.dataset.cmd;
    restoreRange();
    if (cmd === "heading") {
      const cur = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      document.execCommand("formatBlock", false, cur === "h3" ? "p" : "h3");
    } else if (cmd === "link") {
      $("#rteLink").hidden = false; $("#rteLinkUrl").value = ""; $("#rteLinkUrl").focus();
    } else if (cmd === "image") {
      if (rte.querySelectorAll("img").length >= 6) { $("#detailsStatus").textContent = "That's the limit of 6 images."; return; }
      $("#detailsPhoto").click();
    } else document.execCommand(cmd);
    saveRange();
  }));
  $("#rteLinkAdd").onclick = () => {
    let url = $("#rteLinkUrl").value.trim();
    if (!url) return;
    if (!/^(https?:|mailto:)/i.test(url)) url = (/@/.test(url) && !/\//.test(url) ? "mailto:" : "https://") + url;
    restoreRange();
    const sel = getSelection();
    if (sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${esc(url)}">${esc(url.replace(/^mailto:/, ""))}</a>&nbsp;`);
    else document.execCommand("createLink", false, url);
    $("#rteLink").hidden = true; saveRange();
  };
  $("#rteLinkCancel").onclick = () => { $("#rteLink").hidden = true; restoreRange(); };
  $("#rteLinkUrl").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#rteLinkAdd").click(); } });
  $("#detailsPhoto").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    $("#detailsStatus").textContent = "Adding your image…";
    try {
      const img = await loadImage(file);
      const max = 1400, scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      restoreRange();
      document.execCommand("insertHTML", false, `<img src="${c.toDataURL("image/jpeg", 0.8)}" alt=""><p><br></p>`);
      $("#detailsStatus").textContent = "";
      saveRange();
    } catch (err) { $("#detailsStatus").textContent = "We couldn't read that image. Try a different one."; }
    e.target.value = "";
  });
  // Pasting from Word or Google Docs: keep the simple formatting, drop the rest
  rte.addEventListener("paste", e => {
    const html = e.clipboardData.getData("text/html"), text = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (html) document.execCommand("insertHTML", false, H.sanitize(html).replace(/<img[^>]*>/g, ""));
    else document.execCommand("insertText", false, text);
  });
  // What gets sent: cleaned HTML, with new photos split out as uploads
  function detailsPayload() {
    const html = H.sanitize(rte.innerHTML).trim();
    const box = document.createElement("div"); box.innerHTML = html;
    if (!box.textContent.trim() && !box.querySelector("img")) return { details: "", detailImages: [] };
    const detailImages = [];
    box.querySelectorAll("img").forEach(im => {
      const src = im.getAttribute("src") || "";
      if (src.startsWith("data:image/")) { const id = detailImages.length; detailImages.push({ id, data: src.split(",")[1] }); im.setAttribute("src", "cid:img" + id); }
    });
    return { details: box.innerHTML, detailImages };
  }

  /* ---------- Gather + preview ---------- */
  function values() {
    const fd = new FormData(form);
    return {
      title: (fd.get("title") || "").trim(),
      description: (fd.get("description") || "").trim(),
      date: $("#date").value || "",            // read directly: these are locked (disabled) for repeating calendar events
      startTime: $("#startTime").value || "",
      endTime: $("#endTime").value || "",
      allDay: $("#allDay").checked,
      repeat: fd.get("repeat"),
      until: fd.get("until") || "",
      location: fd.get("place") === "__other" ? ($("#location").value || "").trim() : (fd.get("place") || ""),
      cost: costText(),
      costType: fd.get("costType") || "",
      savePhoto: $("#savePhoto").checked,
      host: fd.get("host") || "",
      hostName: fd.get("host") === "community" ? (fd.get("hostName") || "").trim() : "",
      types: fd.get("discordShare") === "yes" && fd.getAll("calendars").includes("public") ? fd.getAll("types") : [],
      noDiscord: !(fd.get("discordShare") === "yes" && fd.getAll("calendars").includes("public")),
      rsvpMode: $("#volunteer").checked ? "form" : (fd.get("rsvpMode") || "none"),
      volunteer: $("#volunteer").checked, volArea: $("#volArea").value, volWho: fd.get("volWho") || "anyone",
      volBg: $("#volBg").checked, volTraining: $("#volTraining").value,
      spots: fd.get("spots") || "",
      link: fd.get("rsvpMode") === "link" ? (fd.get("link") || "").trim() : "",
      linkLabel: fd.get("linkLabel"),
      imageMode: $("#multi").checked && multi.length ? "multi" : fd.get("imageMode"),
      presetImage: fd.get("preset") || "",
      calendars: fd.getAll("calendars"),
      name: (fd.get("name") || "").trim(),
      email: (fd.get("email") || "").trim(),
      phone: (fd.get("phone") || "").trim(),
      notes: (fd.get("notes") || "").trim(),
      website: fd.get("website") || ""
    };
  }

  function chosenImage(v) {
    if (v.imageMode === "multi") return multi[0].url;
    if (v.imageMode === "keep" && original) return original.image;
    if (v.imageMode === "upload" && upload) return upload.url;
    if (v.imageMode === "preset" && v.presetImage) return v.presetImage;
    return H.matchImage(v.title + " " + v.description, presets, fallbacks, v.title || "heirloom");
  }

  function repeatText(v) {
    const sel = $("#repeat");
    if (v.repeat === "none") return "";
    const opt = sel.options[sel.selectedIndex].textContent;
    return opt.replace(/^Monthly on/, "Monthly on");
  }

  function update() {
    const v = values();
    let start = null, end = null;
    if (v.date) {
      const [y, m, d] = v.date.split("-").map(Number);
      const [sh, sm] = (v.startTime || "12:00").split(":").map(Number);
      start = H.zoned(y, m, d, v.allDay ? 0 : sh, v.allDay ? 0 : sm);
      if (!v.allDay && v.endTime) { const [eh, em] = v.endTime.split(":").map(Number); end = H.zoned(y, m, d, eh, em); }
    }
    const p = start ? H.parts(start) : null;
    const when = start ? (v.allDay || v.startTime ? H.fmtTimeRange(start, end, v.allDay) : "Time to come") : "Date and time";
    const chips = [];
    const hp = partners.find(p => p.slug === v.host);
    if (hp) chips.push(`<span class="chip partner" style="--c:${esc(hp.color)}">With ${esc(hp.label)}</span>`);
    if (v.host === "community") chips.push(`<span class="chip partner" style="--c:#4f7a64">Hosted by ${esc(v.hostName || "a community member")}</span>`);
    const rt = repeatText(v); if (rt) chips.push(`<span class="chip">${esc(rt)}</span>`);
    if (v.cost) chips.push(`<span class="chip cost">${esc(v.cost)}</span>`);
    if (v.volunteer) chips.unshift(`<span class="chip vol">Volunteer · ${esc(v.volArea)}</span>`);
    if (v.rsvpMode === "form" && v.spots) chips.push(`<span class="chip spots">${esc(v.spots)} ${v.volunteer ? "needed" : "spots"}</span>`);
    $("#preview").innerHTML = `<article class="card">
      <div class="card-media"><img src="${esc(chosenImage(v))}" alt="">
        <div class="date-tile" aria-hidden="true"><div class="dow">${p ? esc(p.wd) : "Day"}</div><div class="num">${p ? p.d : "–"}</div><div class="mon">${start ? esc(H.fmt(start, { month: "short" })) : "Mon"}</div></div>
      </div>
      <div class="card-body">
        <h4 class="${v.title ? "" : "placeholder"}">${esc(v.title || "Your event name")}</h4>
        <div class="meta"><span>${esc(when)}</span>${v.location ? `<span>· ${esc(v.location)}</span>` : ""}</div>
        ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
        <p class="desc ${v.description ? "" : "placeholder"}">${esc(v.description || "Your description will show here.")}</p>
        <div class="card-actions">
          ${v.rsvpMode === "form" ? `<span class="btn btn-primary btn-sm">${v.volunteer ? "Sign up to help" : "RSVP"}</span>` : v.rsvpMode === "link" ? `<span class="btn btn-primary btn-sm">${esc(v.linkLabel)}</span>` : ""}
          <span class="btn btn-outline btn-sm">Add to calendar</span>
        </div>
      </div></article>
      ${v.calendars.length ? `<p class="hint" style="margin:10px 2px 16px">Going on: ${v.calendars.map(c => c === "public" ? "public calendar" : "residents' calendar").join(" + ")}</p>` : `<p class="hint" style="margin:10px 2px 16px">&nbsp;</p>`}`;
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();

  /* ---------- Validation ---------- */
  function validate(v) {
    const bad = [];
    if (!v.title) bad.push("title");
    if (!v.description && !CALMODE) bad.push("description");
    const timesLocked = CALMODE && original && original.recurring;
    if (!timesLocked) {
      if (!v.date || (v.date < todayStr && !(original && v.date === original.date))) bad.push("date");
      if (!v.allDay && !v.startTime) bad.push("startTime");
      if (!v.allDay && v.startTime && v.endTime && v.endTime <= v.startTime) bad.push("endTime");
    }
    if (v.repeat !== "none" && (!v.until || v.until <= v.date)) bad.push("until");
    if (v.costType && v.costType !== "free" && !v.cost) bad.push("cost");
    if (!CALMODE && $("#d-yes").checked && v.calendars.includes("public") && !v.types.length) bad.push("discord");
    if (v.rsvpMode === "link" && (!v.link || !/^https?:\/\/\S+\.\S+/i.test(v.link))) bad.push("link");
    if (!CALMODE) {
      if (!v.calendars.length && !(v.volunteer && v.volWho === "volunteers")) bad.push("calendars");
      if (!v.name) bad.push("name");
      if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push("email");
    }
    $("#costErr").textContent = v.costType === "other" ? "Describe the cost, or unselect Other." : "Add a dollar amount.";
    form.querySelectorAll("[data-f]").forEach(f => f.classList.toggle("invalid", bad.includes(f.dataset.f)));
    return bad;
  }
  form.addEventListener("input", e => { const f = e.target.closest("[data-f]"); if (f) f.classList.remove("invalid"); });

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const v = values();
    // Accept "www.example.com" by adding https://
    if (v.link && !/^https?:\/\//i.test(v.link)) { v.link = "https://" + v.link; $("#link").value = v.link; }
    const bad = validate(v);
    $("#formError").classList.remove("on");
    if (bad.length) {
      const first = form.querySelector(`[data-f="${bad[0]}"]`);
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = first.querySelector("input, textarea, select"); if (input) setTimeout(() => input.focus({ preventScroll: true }), 300);
      return;
    }
    if (v.imageMode === "upload" && !upload) v.imageMode = "auto";
    payloadNotified = !!($("#adminNotify") && $("#adminNotify").checked);
    const payload = Object.assign({}, v, detailsPayload(), {
      imageData: v.imageMode === "upload" ? upload.data : "",
      images: v.imageMode === "multi" ? multi.map(it => it.kind === "upload" ? { kind: "upload", data: it.data } : { kind: it.kind, url: it.url }) : [],
      elapsed: Date.now() - openedAt
    }, EDIT ? { action: "update", id: EDIT.id, by: EDIT.by, sig: EDIT.sig } : {});
    if (ADMIN) Object.assign(payload, { token: SESSION && SESSION.token },
      ADMIN.kind === "form"
        ? { action: "adminSaveSheet", id: ADMIN.id, notify: !!($("#adminNotify") && $("#adminNotify").checked), note: $("#adminNote") ? $("#adminNote").value.trim() : "" }
        : { action: "adminSaveCal", cal: ADMIN.cal, eventId: ADMIN.eventId, start: ADMIN.start });

    const btn = $("#submitBtn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${EDIT || ADMIN ? "Saving…" : "Sending…"}`;
    try {
      let result;
      if (!C.API_URL) {
        await new Promise(r => setTimeout(r, 900));
        result = { ok: true, status: "pending", demo: true };
      } else {
        const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow" });
        result = await res.json();
      }
      if (!result.ok) throw new Error(result.signedOut ? "Your sign-in expired. Sign in again on My events, then come back" : result.error || "Something went wrong");
      showDone(result, v);
    } catch (err) {
      console.error(err);
      $("#formError").textContent = (err && err.message && err.message.length < 140 ? err.message + ". " : "") + (EDIT || ADMIN ? "Your changes weren't saved." : "Your event wasn't sent.") + " Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = EDIT || ADMIN ? "Save changes" : "Send it in";
    }
  });

  function doneCard(title, msg, extra) {
    const btns = ADMIN
      ? `<a class="btn btn-primary" href="${backToAdmin}">Back to Admin</a><a class="btn btn-outline" href="index.html">See the calendar</a>`
      : `<a class="btn btn-primary" href="submit.html">Submit another event</a><a class="btn btn-outline" href="mine.html">My events</a><a class="btn btn-outline" href="index.html">See the calendar</a>`;
    $("#formWrap").innerHTML = `<div class="done">
      <div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2>${esc(title)}</h2><p>${esc(msg)}</p>${extra || ""}
      <div class="btns">${btns}</div>
    </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showDone(r, v) {
    if (ADMIN) {
      const where = CALMODE ? (ADMIN.cal === "residents" ? "residents' calendar" : "calendar and website") : "calendar";
      const msg = r.status === "pending" ? `"${v.title}" is saved. It's still waiting for review, so it isn't on the calendar yet.`
        : CALMODE && r.changes && !r.changes.length ? `Nothing needed changing on "${v.title}".`
        : `Your changes to "${v.title}" are on the ${where}.` + (ADMIN.kind === "form" && payloadNotified ? " We emailed the person who submitted it." : "");
      return doneCard("Saved!", msg, `<p class="hint"><a href="${esc(location.href)}">Make more changes</a></p>`);
    }
    if (EDIT) {
      const msgs = {
        updated: ["Saved!", `Your changes to "${v.title}" are on the calendar.`],
        pending: ["Saved!", `"${v.title}" is updated and still waiting for a quick review before it goes on the calendar.`],
        changesPending: ["Thanks! We got your changes.", `Someone from the Heirloom team will take a quick look. Until then, the calendar shows the current version of "${v.title}". We'll email you once they're up.`]
      };
      const [t, m] = msgs[r.status] || msgs.updated;
      return doneCard(t, m, `<p class="hint"><a href="${esc(location.href)}">Make more changes</a></p>`);
    }
    const live = r.status === "published";
    const onlyPrivate = v.calendars.length === 1 && v.calendars[0] === "private";
    const volOnly = v.volunteer && v.volWho === "volunteers";
    const title = live ? (volOnly ? "It's posted for volunteers!" : "It's on the calendar!") : "Thanks! We got it.";
    const msg = live
      ? (volOnly ? `"${v.title}" is in the volunteer portal, where approved volunteers can sign up. We sent a confirmation to ${v.email}.`
        : onlyPrivate ? `"${v.title}" is on the residents' calendar.` : `"${v.title}" is live on the Heirloom calendar. We sent a confirmation to ${v.email}.`)
      : `Someone from the Heirloom team will take a quick look and add "${v.title}" to the calendar. We'll email ${v.email} as soon as it's up.`;
    doneCard(title, msg,
      (r.editUrl ? `<p class="hint">Need to change something later? <a href="${esc(r.editUrl)}">Edit or cancel your event</a>. The link is in your email too.</p>` : "") +
      (r.demo ? `<p class="hint">(Preview mode: nothing was actually sent.)</p>` : "") +
      `<div id="doneShare"></div>`);
    // Flyer + social images, made from what they just typed in
    if (window.HLFlyer && v.calendars.includes("public")) {
      const box = window.HLFlyer.buttons(async () => flyerEvent(r, v));
      if (!live) box.insertAdjacentHTML("beforeend", `<p class="share-note">Make them now and share once it's approved. The QR code starts working as soon as your event is on the calendar.</p>`);
      $("#doneShare").appendChild(box);
    }
  }

  function flyerEvent(r, v) {
    const [y, m, d] = v.date.split("-").map(Number);
    const hm = t => (t || "0:0").split(":").map(Number);
    const start = v.allDay ? H.zoned(y, m, d, 0) : H.zoned(y, m, d, ...hm(v.startTime));
    let end = v.allDay ? new Date(+start + 86400000) : v.endTime ? H.zoned(y, m, d, ...hm(v.endTime)) : null;
    if (end && end <= start) end = null;
    const hostSel = $("#host"), partner = v.host && !/^(heirloom|community)$/.test(v.host) && hostSel ? hostSel.options[hostSel.selectedIndex].textContent : "";
    return {
      title: v.title, description: v.description, start, end, allDay: v.allDay,
      location: v.location, address: v.location && !presetPlace(v.location) ? v.location : "",
      cost: v.cost, recurring: repeatText(v),
      image: v.imageMode === "upload" && upload ? upload.url : chosenImage(v),
      source: v.host === "community" ? "community" : partner ? "partner" : "heirloom",
      hostName: v.hostName, partnerName: partner,
      ref: r.id || "", rsvp: v.rsvpMode === "form", eventId: r.id || ""
    };
  }
  // Places on the farm (the chips) don't need a street address on the flyer
  function presetPlace(p) { return !!form.querySelector(`input[name="place"][value="${CSS.escape(p)}"]`); }

  /* ---------- Edit mode ---------- */
  function setPanel(name) { document.querySelectorAll("[data-panel]").forEach(p => p.classList.toggle("on", p.dataset.panel === name)); }
  form.querySelectorAll('input[name="imageMode"]').forEach(r => r.addEventListener("change", () => { if (r.value === "keep") setPanel("keep"); }));

  function prefill(e) {
    const set = (id, val) => { const el = $("#" + id); if (el) el.value = val == null ? "" : val; };
    set("title", e.title); set("description", e.description); set("date", e.date);
    set("startTime", e.startTime); set("endTime", e.endTime);
    $("#allDay").checked = !!e.allDay; $("#allDay").dispatchEvent(new Event("change"));
    if (e.date < todayStr) $("#date").min = e.date;
    refreshRepeatLabels();
    set("repeat", e.repeat || "none"); $("#untilField").hidden = $("#repeat").value === "none"; set("until", e.until);
    // Place
    const placeVal = places.includes(e.location) ? e.location : (e.location ? "__other" : "");
    form.querySelectorAll('input[name="place"]').forEach(r => { r.checked = r.value === placeVal; r.dataset.was = r.checked ? "1" : ""; });
    $("#otherPlace").hidden = placeVal !== "__other";
    if (placeVal === "__other") $("#location").value = e.location;
    setCost(e.cost); set("host", e.host || ""); set("hostName", e.hostName || "");
    $("#hostNameField").hidden = $("#host").value !== "community";
    const share = !e.noDiscord && (e.types || []).length > 0;
    $(share ? "#d-yes" : "#d-no").checked = true; syncDiscord();
    form.querySelectorAll('input[name="types"]').forEach(c => c.checked = (e.types || []).includes(c.value));
    const mode = ["none", "form", "link"].includes(e.rsvpMode) ? e.rsvpMode : "none";
    $("#r-" + mode).checked = true;
    document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== mode);
    set("spots", e.spots); set("link", e.link); if (e.linkLabel) set("linkLabel", e.linkLabel);
    form.querySelectorAll('input[name="calendars"]').forEach(c => c.checked = (e.calendars || []).includes(c.value));
    $("#volunteer").checked = !!e.volunteer;
    if (e.volunteer) {
      if (e.volArea && !volAreas.includes(e.volArea)) volAreas.push(e.volArea);
      if (e.volTraining && !trainings.includes(e.volTraining)) trainings.push(e.volTraining);
      renderVolChoices(); $("#volArea").value = e.volArea; $("#volTraining").value = e.volTraining || "";
      $("#volBg").checked = !!e.volBg; $(e.volWho === "volunteers" ? "#vw-volunteers" : "#vw-anyone").checked = true;
    }
    syncVolunteer();
    if (e.volunteer && e.volWho !== "volunteers") $("#cal-public").checked = (e.calendars || []).includes("public");
    renderChannels();
    set("name", e.name); set("email", e.email); set("phone", e.phone); set("notes", e.notes);
    rte.innerHTML = H.sanitize(e.details || "");
    $("#email").readOnly = true; $("#email").title = "Edits stay linked to the email that shared the event";
    if (e.image) {
      $("#keepImg").src = e.image; $("#keepPhoto").hidden = false; $("#m-keep").checked = true; setPanel("keep");
    }
    syncMultiRow();
    if ((e.images || []).length > 1 && !$("#multiRow").hidden) {
      multi = e.images.map(url => ({ kind: "url", url })); $("#multi").checked = true; setMulti(true);
    }
    update();
  }

  async function startEdit() {
    $("#pageTitle").textContent = "Edit your event";
    $("#pageIntro").textContent = "Change anything below and save, or cancel the event at the bottom.";
    document.title = "Edit your event · Heirloom";
    const formEl = $("#eventForm");
    formEl.hidden = true;
    const loading = document.createElement("div");
    loading.className = "loading-card"; loading.textContent = "Loading your event…";
    formEl.before(loading);
    await presetsReady;
    try {
      const res = await fetch(C.API_URL + "?action=getEvent&id=" + encodeURIComponent(EDIT.id) + "&by=" + encodeURIComponent(EDIT.by) + "&sig=" + encodeURIComponent(EDIT.sig));
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      original = d.event;
      loading.remove(); formEl.hidden = false;
      prefill(original);
      $("#submitBtn").textContent = "Save changes";
      $("#submitHint").textContent = "We'll email you a confirmation.";
      $("#cancelArea").hidden = false; $("#cancelName").textContent = original.title;
      if (original.changesPending) {
        const note = document.createElement("p");
        note.className = "edit-note";
        note.textContent = "Your last changes are still waiting for a quick review. Saving again replaces them.";
        $(".form-col").prepend(note);
      }
    } catch (err) {
      loading.innerHTML = `<h2 style="font-family:var(--f-title);color:var(--forest);margin:0 0 8px">We couldn't open this event</h2>
        <p style="margin:0 0 18px">${esc(err.message || "Please try the link in your email again.")}</p>
        <a class="btn btn-primary" href="submit.html">Submit a new event</a>`;
    }
  }

  $("#cancelBtn").onclick = () => { $("#cancelBtn").hidden = true; $("#cancelConfirm").hidden = false; };
  $("#cancelNo").onclick = () => { $("#cancelBtn").hidden = false; $("#cancelConfirm").hidden = true; };
  $("#cancelYes").onclick = async () => {
    const btn = $("#cancelYes");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Cancelling…`;
    try {
      const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "cancelEvent", id: EDIT.id, by: EDIT.by, sig: EDIT.sig }) });
      const r = await res.json();
      if (!r.ok) throw new Error(r.error || "Something went wrong");
      doneCard("Your event is cancelled", `"${original.title}" is off the calendar.${original.rsvpMode === "form" ? " Anyone who RSVP'd has been let know." : ""} We sent you a confirmation email.`);
    } catch (err) {
      $("#formError").textContent = (err.message || "Something went wrong") + ". It wasn't cancelled. Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = "Yes, cancel it";
    }
  };

  if (EDIT && C.API_URL) startEdit();
  if (ADMIN) startAdmin();

  /* ---------- Admin mode ---------- */
  async function adminCall(body) {
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: SESSION && SESSION.token }, body)) });
    const r = await res.json();
    if (!r.ok) throw new Error(r.signedOut ? "Your sign-in expired. Sign in again on My events, then come back" : r.error || "Something went wrong");
    return r;
  }
  function hideField(el) { if (el) el.hidden = true; }
  function renumberSteps() {
    let n = 0;
    form.querySelectorAll("fieldset").forEach(f => { const st = f.querySelector(".step"); if (st && !f.hidden) st.textContent = ++n; });
  }
  async function startAdmin() {
    const back = `<a class="admin-back" href="${backToAdmin}">← Back to Admin</a>`;
    $("#pageTitle").textContent = CALMODE ? "Edit calendar event" : "Edit event";
    $("#pageIntro").innerHTML = back + esc(CALMODE
      ? (ADMIN.cal === "residents"
        ? "This event was added straight in the residents' Google Calendar. Your changes update it there."
        : "This event was added straight in Google Calendar. Name, time, place and description changes update Google Calendar. The image, cost, link, host and More details show on the website.")
      : "You're editing as an admin. Changes go live right away, and you choose whether to email the person who submitted it.");
    document.title = "Edit event · Admin · Heirloom";
    const formEl = $("#eventForm");
    formEl.hidden = true;
    const loading = document.createElement("div");
    loading.className = "loading-card"; loading.textContent = "Loading the event…";
    formEl.before(loading);
    const fail = msg => {
      loading.innerHTML = `<h2 style="font-family:var(--f-title);color:var(--forest);margin:0 0 8px">We couldn't open this event</h2>
        <p style="margin:0 0 18px">${esc(msg)}</p><a class="btn btn-primary" href="${backToAdmin}">Back to Admin</a>`;
    };
    if (!C.API_URL) return fail("Admin editing works once the calendar is connected (it's in preview mode).");
    if (!SESSION || !SESSION.token) {
      loading.innerHTML = `<h2 style="font-family:var(--f-title);color:var(--forest);margin:0 0 8px">Please sign in first</h2>
        <p style="margin:0 0 18px">Admins sign in on My events with an emailed code.</p><a class="btn btn-primary" href="mine.html?next=admin">Sign in</a>`;
      return;
    }
    await presetsReady;
    try {
      const r = await adminCall(Object.assign({ action: "adminGet" }, ADMIN));
      original = r.event;
      loading.remove(); formEl.hidden = false;
      if (CALMODE) setupCalendarMode(original);
      prefill(original);
      if (CALMODE) {
        $("#email").readOnly = false;
        if (!original.imageCustom) { $("#keepPhoto").hidden = true; $("#m-auto").checked = true; setPanel("auto"); update(); }
      }
      $("#submitBtn").textContent = "Save changes";
      $("#submitHint").textContent = CALMODE ? "Saves straight to Google Calendar." : "Saves right away.";
      if (!CALMODE) addNotifyBox(original);
      setupAdminCancel(original);
    } catch (err) { fail(err.message || "Please try again from the Admin page."); }
  }

  function setupCalendarMode(e) {
    const sets = form.querySelectorAll("fieldset");
    [5, 6].forEach(i => hideField(sets[i]));            // Which calendar? · About you
    hideField($("#discordStep")); hideField($("#volBox"));
    hideField($("#repeat").closest(".field")); hideField($("#untilField"));
    $("#r-form").closest(".mode").hidden = true;        // built-in RSVPs need an event from the form
    $("#description").removeAttribute("required"); $("#description").maxLength = 8000;
    const dl = form.querySelector('label[for="description"]'); if (dl) dl.querySelectorAll(".req").forEach(x => x.remove());
    if (e.recurring) {
      ["date", "startTime", "endTime", "allDay"].forEach(id => $("#" + id).disabled = true);
      const note = document.createElement("p");
      note.className = "edit-note";
      note.textContent = "This one repeats in Google Calendar. To change its time or which dates it's on, edit it there. Changes to the name, place, description and image apply to every date.";
      sets[1].appendChild(note);
    }
    if (ADMIN.cal === "residents") {
      hideField(sets[3]);                                // the residents' calendar has no website image
      hideField($("[data-f=cost]")); hideField($("#r-none").closest(".field"));
      document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = true);
      hideField($("#details").closest(".field")); hideField($("#host").closest(".field")); hideField($("#hostNameField"));
      $(".preview-col .label").textContent = "Preview (the residents' calendar shows the name, time, place and description)";
      document.body.classList.add("res-mode");
    }
    renumberSteps();
  }

  function addNotifyBox(e) {
    const box = document.createElement("div");
    box.className = "admin-notify";
    box.innerHTML = `<label class="toggle"><input type="checkbox" id="adminNotify"><span>Email ${esc(e.name || "the person who submitted it")} about these changes</span></label>
      <div id="adminNoteWrap" hidden><label for="adminNote" class="lbl">Personal note <span class="opt">(optional)</span></label>
      <textarea id="adminNote" maxlength="2000" rows="3" placeholder="Hi! I tidied up the time and added a photo."></textarea>
      <p class="hint">They'll get the updated details with your note. Replies come to you.</p></div>`;
    $("#submitBtn").before(box);
    $("#adminNotify").addEventListener("change", () => { $("#adminNoteWrap").hidden = !$("#adminNotify").checked; });
  }

  function setupAdminCancel(e) {
    const area = $("#cancelArea");
    area.hidden = false;
    if (!CALMODE) {
      area.innerHTML = `<button type="button" class="link-btn" id="aCancelBtn">Cancel this event</button>
        <div class="cancel-confirm" id="aCancelConfirm" hidden>
          <p>Cancel <b>${esc(e.title)}</b>? It comes off the calendar. ${esc(e.name || "The person who submitted it")} gets an email${e.rsvpMode === "form" ? ", and so does anyone who RSVP'd" : ""}.</p>
          <label for="aCancelNote" class="lbl">Note to ${esc(e.name || "them")} <span class="opt">(optional)</span></label>
          <textarea id="aCancelNote" maxlength="2000" rows="3" placeholder="Sorry, we need the farmhouse that night."></textarea>
          <div class="cancel-btns">
            <button type="button" class="btn btn-primary btn-sm" id="aCancelYes">Yes, cancel it</button>
            <button type="button" class="btn btn-outline btn-sm" id="aCancelNo">Keep it</button>
          </div>
        </div>`;
      $("#aCancelBtn").onclick = () => { $("#aCancelBtn").hidden = true; $("#aCancelConfirm").hidden = false; };
      $("#aCancelNo").onclick = () => { $("#aCancelBtn").hidden = false; $("#aCancelConfirm").hidden = true; };
      $("#aCancelYes").onclick = () => adminRemove($("#aCancelYes"), "Yes, cancel it", { action: "adminCancelSheet", id: ADMIN.id, note: $("#aCancelNote").value.trim() },
        "Cancelled", `"${e.title}" is off the calendar, and we emailed ${e.name || "the person who submitted it"}.`);
      return;
    }
    const day = H.fmt(new Date(e.start), { weekday: "short", month: "short", day: "numeric" });
    area.innerHTML = `<button type="button" class="link-btn" id="aCancelBtn">Delete this event</button>
      <div class="cancel-confirm" id="aCancelConfirm" hidden>
        <p>Delete <b>${esc(e.title)}</b> from the ${ADMIN.cal === "residents" ? "residents'" : "public"} Google Calendar? A backup copy is saved to the Admin log tab in the Sheet.</p>
        <div class="cancel-btns">
          ${e.recurring ? `<button type="button" class="btn btn-primary btn-sm" data-scope="one">Delete just ${esc(day)}</button>
            <button type="button" class="btn btn-primary btn-sm" data-scope="series">Delete every date</button>`
          : `<button type="button" class="btn btn-primary btn-sm" data-scope="one">Yes, delete it</button>`}
          <button type="button" class="btn btn-outline btn-sm" id="aCancelNo">Keep it</button>
        </div>
      </div>`;
    $("#aCancelBtn").onclick = () => { $("#aCancelBtn").hidden = true; $("#aCancelConfirm").hidden = false; };
    $("#aCancelNo").onclick = () => { $("#aCancelBtn").hidden = false; $("#aCancelConfirm").hidden = true; };
    area.querySelectorAll("[data-scope]").forEach(b => b.onclick = () => adminRemove(b, b.textContent,
      { action: "adminDeleteCal", cal: ADMIN.cal, eventId: ADMIN.eventId, start: ADMIN.start, scope: b.dataset.scope },
      "Deleted", b.dataset.scope === "series" ? `Every date of "${e.title}" is off the calendar.` : `"${e.title}"${e.recurring ? " on " + day : ""} is off the calendar.`));
  }

  async function adminRemove(btn, label, body, title, msg) {
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Working…`;
    try { await adminCall(body); doneCard(title, msg); }
    catch (err) {
      $("#formError").textContent = (err.message || "Something went wrong") + ". Nothing was changed. Please try again.";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = label;
    }
  }

  // Signed in on "My events"? Fill in their details on a new submission
  if (!EDIT && !ADMIN) {
    let me = null; try { me = JSON.parse(localStorage.getItem("heirloom-me") || "null"); } catch (e) { /* storage off */ }
    if (me) {
      if (me.name && !$("#name").value) $("#name").value = me.name;
      if (me.email && !$("#email").value) $("#email").value = me.email;
      if (me.phone && !$("#phone").value) $("#phone").value = me.phone;
    }
  }
})();
