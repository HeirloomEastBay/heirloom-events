/* Heirloom Events — "Submit an event" form */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#eventForm");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const openedAt = Date.now();
  // Edit mode: opened from the "Edit or cancel your event" link in an email
  const qs = new URLSearchParams(location.search);
  const EDIT = qs.get("edit") && qs.get("sig") ? { id: qs.get("edit"), by: qs.get("by") || "", sig: qs.get("sig") } : null;
  let original = null;
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
  let types = (C.TYPES || []).slice();
  function renderTypes() {
    const picked = new FormData(form).getAll("types");
    $("#types").innerHTML = types.map((t, i) => `<label><input type="checkbox" name="types" id="t${i}" value="${esc(t)}"${picked.includes(t) ? " checked" : ""}>${esc(t)}</label>`).join("");
    $("#types").closest(".field").hidden = !types.length;
  }
  renderTypes();
  let fallbacks = C.FALLBACKS.slice();
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
      if (d.ok && d.types) { types = d.types; renderTypes(); }
      if (d.ok && d.locations && d.locations.length) { places = d.locations; renderPlaces(); }
      if (d.ok && d.presets && d.presets.length) { presets = d.presets; fallbacks = d.fallbacks || fallbacks; renderGallery(); update(); }
    }).catch(() => {});

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
      date: fd.get("date") || "",
      startTime: fd.get("startTime") || "",
      endTime: fd.get("endTime") || "",
      allDay: $("#allDay").checked,
      repeat: fd.get("repeat"),
      until: fd.get("until") || "",
      location: fd.get("place") === "__other" ? ($("#location").value || "").trim() : (fd.get("place") || ""),
      cost: costText(),
      costType: fd.get("costType") || "",
      savePhoto: $("#savePhoto").checked,
      host: fd.get("host") || "",
      hostName: fd.get("host") === "community" ? (fd.get("hostName") || "").trim() : "",
      types: fd.getAll("types"),
      rsvpMode: fd.get("rsvpMode") || "none",
      spots: fd.get("spots") || "",
      link: fd.get("rsvpMode") === "link" ? (fd.get("link") || "").trim() : "",
      linkLabel: fd.get("linkLabel"),
      imageMode: fd.get("imageMode"),
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
    if (v.rsvpMode === "form" && v.spots) chips.push(`<span class="chip spots">${esc(v.spots)} spots</span>`);
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
          ${v.rsvpMode === "form" ? `<span class="btn btn-primary btn-sm">RSVP</span>` : v.rsvpMode === "link" ? `<span class="btn btn-primary btn-sm">${esc(v.linkLabel)}</span>` : ""}
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
    if (!v.description) bad.push("description");
    if (!v.date || (v.date < todayStr && !(original && v.date === original.date))) bad.push("date");
    if (!v.allDay && !v.startTime) bad.push("startTime");
    if (!v.allDay && v.startTime && v.endTime && v.endTime <= v.startTime) bad.push("endTime");
    if (v.repeat !== "none" && (!v.until || v.until <= v.date)) bad.push("until");
    if (v.costType && v.costType !== "free" && !v.cost) bad.push("cost");
    if (v.rsvpMode === "link" && (!v.link || !/^https?:\/\/\S+\.\S+/i.test(v.link))) bad.push("link");
    if (!v.calendars.length) bad.push("calendars");
    if (!v.name) bad.push("name");
    if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push("email");
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
    const payload = Object.assign({}, v, detailsPayload(), {
      imageData: v.imageMode === "upload" ? upload.data : "",
      elapsed: Date.now() - openedAt
    }, EDIT ? { action: "update", id: EDIT.id, by: EDIT.by, sig: EDIT.sig } : {});

    const btn = $("#submitBtn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${EDIT ? "Saving…" : "Sending…"}`;
    try {
      let result;
      if (!C.API_URL) {
        await new Promise(r => setTimeout(r, 900));
        result = { ok: true, status: "pending", demo: true };
      } else {
        const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow" });
        result = await res.json();
      }
      if (!result.ok) throw new Error(result.error || "Something went wrong");
      showDone(result, v);
    } catch (err) {
      console.error(err);
      $("#formError").textContent = (err && err.message && err.message.length < 140 ? err.message + ". " : "") + (EDIT ? "Your changes weren't saved." : "Your event wasn't sent.") + " Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = EDIT ? "Save changes" : "Send it in";
    }
  });

  function doneCard(title, msg, extra) {
    $("#formWrap").innerHTML = `<div class="done">
      <div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2>${esc(title)}</h2><p>${esc(msg)}</p>${extra || ""}
      <div class="btns"><a class="btn btn-primary" href="submit.html">Submit another event</a><a class="btn btn-outline" href="index.html">See the calendar</a></div>
    </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showDone(r, v) {
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
    const title = live ? "It's on the calendar!" : "Thanks! We got it.";
    const msg = live
      ? (onlyPrivate ? `"${v.title}" is on the residents' calendar.` : `"${v.title}" is live on the Heirloom calendar. We sent a confirmation to ${v.email}.`)
      : `Someone from the Heirloom team will take a quick look and add "${v.title}" to the calendar. We'll email ${v.email} as soon as it's up.`;
    doneCard(title, msg,
      (r.editUrl ? `<p class="hint">Need to change something later? <a href="${esc(r.editUrl)}">Edit or cancel your event</a>. The link is in your email too.</p>` : "") +
      (r.demo ? `<p class="hint">(Preview mode: nothing was actually sent.)</p>` : ""));
  }

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
    form.querySelectorAll('input[name="types"]').forEach(c => c.checked = (e.types || []).includes(c.value));
    const mode = ["none", "form", "link"].includes(e.rsvpMode) ? e.rsvpMode : "none";
    $("#r-" + mode).checked = true;
    document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== mode);
    set("spots", e.spots); set("link", e.link); if (e.linkLabel) set("linkLabel", e.linkLabel);
    form.querySelectorAll('input[name="calendars"]').forEach(c => c.checked = (e.calendars || []).includes(c.value));
    set("name", e.name); set("email", e.email); set("phone", e.phone); set("notes", e.notes);
    rte.innerHTML = H.sanitize(e.details || "");
    $("#email").readOnly = true; $("#email").title = "Edits stay linked to the email that shared the event";
    if (e.image) {
      $("#keepImg").src = e.image; $("#keepPhoto").hidden = false; $("#m-keep").checked = true; setPanel("keep");
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
})();
