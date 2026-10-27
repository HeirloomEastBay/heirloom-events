/* Heirloom Events — "Share an event" form */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#eventForm");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const openedAt = Date.now();
  let presets = C.PRESETS.slice();
  let partners = (C.PARTNERS || []).slice();
  function renderHosts() {
    const cur = $("#host").value;
    $("#host").innerHTML = `<option value="">Heirloom or a resident</option>` + partners.map(p => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("");
    $("#host").value = partners.some(p => p.slug === cur) ? cur : "";
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
  $("#locations").innerHTML = C.LOCATIONS.map(l => `<option value="${esc(l)}">`).join("");

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
  if (C.API_URL) {
    fetch(C.API_URL + "?action=presets").then(r => r.json()).then(d => {
      if (d.ok && d.partners) { partners = d.partners; renderHosts(); }
      if (d.ok && d.types) { types = d.types; renderTypes(); }
      if (d.ok && d.presets && d.presets.length) { presets = d.presets; fallbacks = d.fallbacks || fallbacks; renderGallery(); update(); }
    }).catch(() => {});
  }

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
    upload = null; $("#photo").value = ""; $("#uploadPanel").classList.remove("has-upload"); $("#photoStatus").textContent = ""; update();
  });

  /* ---------- RSVP options ---------- */
  form.querySelectorAll('input[name="rsvpMode"]').forEach(r => r.addEventListener("change", () => {
    document.querySelectorAll("[data-rsvp]").forEach(p => p.hidden = p.dataset.rsvp !== r.value);
  }));

  // Partners usually sell tickets on their own site (Eventbrite etc.)
  $("#host").addEventListener("change", () => {
    if ($("#host").value && $("#r-none").checked) {
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
      location: (fd.get("location") || "").trim(),
      cost: (fd.get("cost") || "").trim(),
      host: fd.get("host") || "",
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
    if (!v.date || v.date < todayStr) bad.push("date");
    if (!v.allDay && !v.startTime) bad.push("startTime");
    if (!v.allDay && v.startTime && v.endTime && v.endTime <= v.startTime) bad.push("endTime");
    if (v.repeat !== "none" && (!v.until || v.until <= v.date)) bad.push("until");
    if (v.rsvpMode === "link" && (!v.link || !/^https?:\/\/\S+\.\S+/i.test(v.link))) bad.push("link");
    if (!v.calendars.length) bad.push("calendars");
    if (!v.name) bad.push("name");
    if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push("email");
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
    const payload = Object.assign({}, v, {
      imageData: v.imageMode === "upload" ? upload.data : "",
      elapsed: Date.now() - openedAt
    });

    const btn = $("#submitBtn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Sending…`;
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
      $("#formError").textContent = (err && err.message && err.message.length < 140 ? err.message + ". " : "") + "Your event wasn't sent. Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = "Send it in";
    }
  });

  function showDone(r, v) {
    const live = r.status === "published";
    const onlyPrivate = v.calendars.length === 1 && v.calendars[0] === "private";
    const title = live ? "It's on the calendar!" : "Thanks! We got it.";
    const msg = live
      ? (onlyPrivate ? `"${v.title}" is on the residents' calendar.` : `"${v.title}" is live on the Heirloom calendar. We sent a confirmation to ${v.email}.`)
      : `Someone from the Heirloom team will take a quick look and add "${v.title}" to the calendar. We'll email ${v.email} as soon as it's up.`;
    $("#formWrap").innerHTML = `<div class="done">
      <div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2>${esc(title)}</h2><p>${esc(msg)}</p>
      ${r.demo ? `<p class="hint">(Preview mode: nothing was actually sent.)</p>` : ""}
      <div class="btns"><a class="btn btn-primary" href="submit.html">Share another event</a><a class="btn btn-outline" href="index.html">See the calendar</a></div>
    </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();
