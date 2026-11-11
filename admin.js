/* Heirloom Activities — Admin page
   Admins sign in on My events (emailed code). Four tabs:
   Public calendar · Residents' calendar · Photo library · People */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const qs = new URLSearchParams(location.search);
  let session = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO) { $("#demoBanner").hidden = false; session = session || { token: "demo", email: "you@example.com" }; }
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  let markedAdmin = false;
  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    const r = await res.json();
    if (r.ok && window.HLNav && !markedAdmin) { markedAdmin = true; HLNav.setRoles({ email: session.email, admin: true }); }
    if (!r.ok) {
      const err = new Error(r.error || "Something went wrong");
      err.signedOut = r.signedOut; err.notAdmin = r.notAdmin;
      throw err;
    }
    return r;
  }

  /* ---------- Sign-in gate ---------- */
  function gate(kind) {
    $("#tabs").hidden = true;
    app.innerHTML = kind === "notAdmin"
      ? `<div class="empty"><h2>This page is for Heirloom admins</h2><p>You're signed in as <b>${esc(session && session.email)}</b>, which isn't on the Admins list. Ask an admin to add you, or sign in with a different email.</p>
         <p><a class="btn btn-primary" href="mine.html">Go to My events</a></p></div>`
      : `<div class="empty"><h2>Please sign in</h2><p>Admins sign in on My events with a code we email you. You'll come right back here.</p>
         <p><a class="btn btn-primary" href="mine.html?next=admin">Sign in</a></p></div>`;
  }
  function handle(err, box) {
    if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } return gate("signin"); }
    if (err.notAdmin) return gate("notAdmin");
    (box || app).innerHTML = `<div class="empty"><h2>Something went wrong</h2><p>${esc(err.message)}</p><p><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
    $("#retry").onclick = () => show(state.tab, true);
  }
  if (!session || !session.token) return gate("signin");

  /* ---------- Tabs ---------- */
  const state = { tab: ["public", "residents", "photos", "volunteers", "chores", "people"].includes(qs.get("tab")) ? qs.get("tab") : "public", view: "upcoming", q: "", cache: {} };
  $("#tabs").hidden = false;
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => show(t.dataset.tab));
  $("#tabs").addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const tabs = [...document.querySelectorAll(".tab")], i = tabs.findIndex(t => t.dataset.tab === state.tab);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); show(next.dataset.tab);
  });
  function show(tab, fresh) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach(t => { const on = t.dataset.tab === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    history.replaceState(null, "", tab === "public" ? "admin.html" : "admin.html?tab=" + tab);
    if (tab === "photos") return photos(fresh);
    if (tab === "people") return people();
    if (tab === "volunteers") return volunteers(fresh);
    if (tab === "chores") return chores(fresh);
    calendar(tab, fresh);
  }

  /* ============================================================
     Calendar tabs
     ============================================================ */
  const ICON_CAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;

  async function calendar(which, fresh) {
    const key = which + "|" + state.view;
    app.innerHTML = header(which) + `<div id="list"><p class="loading">Loading the ${which === "residents" ? "residents'" : "public"} calendar…</p></div>`;
    wireToolbar(which);
    try {
      if (fresh || !state.cache[key]) state.cache[key] = await call({ action: "adminList", cal: which, past: state.view === "past" });
      if (state.tab === which) renderList(which, state.cache[key].items);
    } catch (err) { handle(err, $("#list")); }
  }

  function header(which) {
    const res = which === "residents";
    return `<div class="panel-h"><div>
        <span class="cal-flag${res ? " res" : ""}">${res ? "Residents' calendar · private" : "Public calendar · on the website"}</span>
        <h2>${res ? "Residents' calendar" : "Public calendar"}</h2>
        <p>${res ? "Only residents see these. Events from the form, and ones added straight in Google Calendar." : "Everything on the website: events from the form, ones added straight in Google Calendar, and partner imports."}</p>
      </div><a class="btn btn-primary btn-sm" href="submit.html">Add an event</a></div>
      <div class="toolbar">
        <input type="search" id="q" placeholder="Search by name, place or person" value="${esc(state.q)}" aria-label="Search events">
        <div class="seg" role="group" aria-label="Show">
          <button type="button" data-view="upcoming" aria-pressed="${state.view === "upcoming"}">Upcoming</button>
          <button type="button" data-view="review" aria-pressed="${state.view === "review"}">Waiting for review<span class="n" id="nReview" hidden></span></button>
          <button type="button" data-view="past" aria-pressed="${state.view === "past"}">Past</button>
        </div>
      </div>`;
  }
  function wireToolbar(which) {
    $("#q").addEventListener("input", e => { state.q = e.target.value; const c = state.cache[which + "|" + (state.view === "past" ? "past" : state.view)]; if (c) renderList(which, c.items); });
    app.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
      const was = state.view; state.view = b.dataset.view;
      // "Waiting for review" filters the upcoming list, so no new request
      if ((was === "past") === (state.view === "past") && state.cache[which + "|" + (state.view === "past" ? "past" : "upcoming")]) {
        app.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-pressed", x === b));
        const c = state.cache[which + "|" + (state.view === "past" ? "past" : "upcoming")];
        return renderList(which, c.items);
      }
      calendar(which);
    });
  }

  function renderList(which, items) {
    const list = $("#list"); if (!list) return;
    const isReview = i => i.kind === "form" && (/^(Pending|Approved)$/.test(i.status) || i.changesPending);
    const n = items.filter(isReview).length;
    const nb = $("#nReview"); if (nb) { nb.hidden = !n || state.view === "past"; nb.textContent = n; }
    let shown = state.view === "review" ? items.filter(isReview) : items;
    const q = state.q.trim().toLowerCase();
    if (q) shown = shown.filter(i => [i.title, i.location, i.poster, i.email, i.partner, i.hostName, i.when].join(" ").toLowerCase().includes(q));
    if (!shown.length) {
      list.innerHTML = `<div class="empty"><h2>${q ? "Nothing matches that search" : state.view === "review" ? "Nothing waiting for review" : state.view === "past" ? "No past events in the last 4 months" : "Nothing coming up"}</h2>
        <p>${q ? "Try a different word." : state.view === "review" ? "You're all caught up." : ""}</p></div>`;
      return;
    }
    list.innerHTML = `<div class="alist">${shown.map(i => row(which, i)).join("")}</div>`;
    list.querySelectorAll("[data-act]").forEach(b => b.onclick = () => act(which, b.dataset.act, shown[+b.closest(".arow").dataset.i]));
    list.querySelectorAll(".arow").forEach((el, n) => el.dataset.i = n);
  }

  function editHref(which, i) {
    if (i.kind === "form") return "submit.html?admin=1&edit=" + encodeURIComponent(i.id);
    return "submit.html?admin=1&cal=" + which + "&eid=" + encodeURIComponent(i.eventId) + "&start=" + encodeURIComponent(i.start);
  }

  function row(which, i) {
    const chips = [];
    const past = state.view === "past";
    if (i.kind === "form") {
      chips.push(`<span class="status src">From the form · ${esc(i.poster || i.email || "someone")}</span>`);
      if (/^(Pending|Approved)$/.test(i.status)) chips.push(`<span class="status pending">Waiting for review</span>`);
      else if (i.changesPending) chips.push(`<span class="status pending">Changes waiting for review</span>`);
      if (/public/i.test(i.calendars) && /resident/i.test(i.calendars)) chips.push(`<span class="status">Also on the ${which === "public" ? "residents'" : "public"} calendar</span>`);
      if (i.rsvp) chips.push(`<span class="status">${i.going} going${i.spots ? " of " + i.spots : ""}</span>`);
    } else if (i.kind === "partner") {
      chips.push(`<span class="status partner">Imported from ${esc(i.partner)}</span>`);
      if (i.hidden) chips.push(`<span class="status off">Hidden from the website</span>`);
      if (i.customImage) chips.push(`<span class="status">Our image</span>`);
    } else {
      chips.push(`<span class="status src">Added in Google Calendar</span>`);
      if (i.hostName) chips.push(`<span class="status">Hosted by ${esc(i.hostName === "Community member" ? "a community member" : i.hostName)}</span>`);
    }
    if (i.recurring || i.more) chips.push(`<span class="status">${esc(i.repeatText || "Repeats")}${i.more ? ` · ${i.more} more date${i.more > 1 ? "s" : ""}` : ""}</span>`);

    const acts = [];
    if (i.kind === "form") {
      if (!past) acts.push(`<a class="btn btn-forest btn-sm" href="${editHref(which, i)}">Edit</a>`);
      if (/^(Pending|Approved)$/.test(i.status)) acts.push(`<button class="btn btn-primary btn-sm" data-act="approve">Approve</button><button class="btn btn-outline btn-sm" data-act="decline">Decline</button>`);
      if (!past) acts.push(`<button class="btn-quiet" data-act="cancel">Cancel event</button>`);
    } else if (i.kind === "partner") {
      if (which === "public") acts.push(`<button class="btn btn-forest btn-sm" data-act="image">Change image</button>`,
        `<button class="btn btn-outline btn-sm" data-act="${i.hidden ? "unhide" : "hide"}">${i.hidden ? "Show on website" : "Hide from website"}</button>`);
      else acts.push(`<span class="hint" style="margin:0;font-size:13.5px">Copied here from ${esc(i.partner)} automatically.</span>`);
    } else {
      if (!past) acts.push(`<a class="btn btn-forest btn-sm" href="${editHref(which, i)}">Edit</a>`);
      acts.push(`<button class="btn-quiet" data-act="delete">Delete</button>`);
    }
    if (which === "public" && !past && !i.hidden && !/^(Declined|Cancelled|Unpublished)$/.test(i.status || "") && window.HLFlyer)
      acts.push(`<button class="btn btn-outline btn-sm" data-act="flyer">Flyer &amp; images</button>`);
    const img = i.image ? `<img class="thumb" src="${esc(i.image)}" alt="" loading="lazy">` : `<div class="thumb">${ICON_CAL}</div>`;
    return `<article class="arow${i.hidden || past ? " dim" : ""}">${img}
      <div><h3>${esc(i.title)}</h3>
        <p class="when">${esc(i.when)}${i.location ? " · " + esc(i.location) : ""}</p>
        <div class="chips2">${chips.join("")}</div>
        <div class="acts">${acts.join("")}</div></div></article>`;
  }

  /* ---------- Row actions ---------- */
  const dlg = $("#dlg"), dlgIn = $("#dlgIn");
  function openDlg(html) { dlgIn.innerHTML = html; dlg.showModal(); const f = dlgIn.querySelector("textarea, [autofocus]"); if (f) f.focus(); }
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  async function run(btn, body, okMsg) {
    const label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Working…`;
    try {
      await call(body);
      dlg.open && dlg.close();
      state.cache = {}; // an event can be on both calendars, so reload both
      await calendar(state.tab, true);
      flash(okMsg);
    } catch (err) {
      if (err.signedOut || err.notAdmin) { dlg.open && dlg.close(); return handle(err); }
      btn.disabled = false; btn.innerHTML = label;
      if (!dlg.open) return flash(err.message + ". Nothing was changed.", true);
      if (!dlgIn.querySelector(".msg.err")) dlgIn.insertAdjacentHTML("beforeend", `<p class="msg err"></p>`);
      dlgIn.querySelector(".msg.err").textContent = err.message + ". Nothing was changed.";
    }
  }
  function flash(text, bad) {
    const el = document.createElement("p");
    el.className = "msg " + (bad ? "err" : "ok"); el.textContent = text; el.setAttribute("role", "status");
    app.prepend(el); setTimeout(() => el.remove(), 6000);
  }

  function act(which, kind, i) {
    if (kind === "approve") {
      openDlg(`<h2>Approve “${esc(i.title)}”?</h2><p>It goes on the calendar now, and we email ${esc(i.poster || "them")} that it's live.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Not yet</button><button class="btn btn-forest btn-sm" id="go">Approve and publish</button></div>`);
      $("#go").onclick = e => run(e.currentTarget, { action: "adminDecide", id: i.id, decision: "approve" }, `“${i.title}” is on the calendar.`);
    }
    if (kind === "decline") {
      openDlg(`<h2>Decline “${esc(i.title)}”?</h2><p>It won't go on the calendar. We send ${esc(i.poster || "them")} a kind note saying we can't add it.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button><button class="btn btn-primary btn-sm" id="go">Decline</button></div>`);
      $("#go").onclick = e => run(e.currentTarget, { action: "adminDecide", id: i.id, decision: "decline" }, `Declined “${i.title}”.`);
    }
    if (kind === "cancel") {
      openDlg(`<h2>Cancel “${esc(i.title)}”?</h2>
        <p>It comes off ${/public/i.test(i.calendars) && /resident/i.test(i.calendars) ? "both calendars" : "the calendar"}. We email ${esc(i.poster || "the person who submitted it")}${i.rsvp ? " and everyone who RSVP'd" : ""}.</p>
        <label class="lbl" for="note">Note to ${esc((i.poster || "them").split(" ")[0])} <span class="opt">(optional)</span></label>
        <textarea id="note" maxlength="2000" placeholder="Sorry, we need the farmhouse that night."></textarea>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button><button class="btn btn-primary btn-sm" id="go">Cancel the event</button></div>`);
      $("#go").onclick = e => run(e.currentTarget, { action: "adminCancelSheet", id: i.id, note: $("#note").value.trim() }, `“${i.title}” is cancelled.`);
    }
    if (kind === "delete") {
      const day = H.fmt(new Date(i.start), { weekday: "short", month: "short", day: "numeric" });
      openDlg(`<h2>Delete “${esc(i.title)}”?</h2>
        <p>This removes it from the ${which === "residents" ? "residents'" : "public"} Google Calendar. A backup copy is saved on the Admin log tab in the Sheet, in case it needs to come back.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button>
          ${i.recurring ? `<button class="btn btn-primary btn-sm" data-scope="one">Just ${esc(day)}</button><button class="btn btn-primary btn-sm" data-scope="series">Every date</button>`
            : `<button class="btn btn-primary btn-sm" data-scope="one">Delete it</button>`}</div>`);
      dlgIn.querySelectorAll("[data-scope]").forEach(b => b.onclick = e => run(e.currentTarget,
        { action: "adminDeleteCal", cal: which, eventId: i.eventId, start: i.start, scope: b.dataset.scope }, `Deleted “${i.title}”${b.dataset.scope === "one" && i.recurring ? " on " + day : ""}.`));
    }
    if (kind === "hide" || kind === "unhide") {
      run({ disabled: false, innerHTML: "" }, { action: "adminPartner", key: i.key, title: i.title, hidden: kind === "hide" },
        kind === "hide" ? `“${i.title}” is hidden from the website.` : `“${i.title}” is back on the website.`);
    }
    if (kind === "image") pickImage(i);
    if (kind === "flyer") {
      openDlg(`<h2>Flyer &amp; images</h2><p>For “${esc(i.title)}”, ${esc(i.when)}. Made fresh from the event's current photo and details each time, so if you change something, just make a new one.</p><div id="flyBox"></div>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Done</button></div>`);
      $("#flyBox").appendChild(HLFlyer.buttons(async () => flyerEvent(i)));
    }
  }

  // What the flyer maker needs, from an Admin list row
  function flyerEvent(i) {
    const form = i.kind === "form";
    return {
      title: i.title, start: new Date(i.start), end: i.end ? new Date(i.end) : null, allDay: !!i.allDay,
      location: i.location && i.location !== "Heirloom" ? i.location : "", cost: i.cost || "", description: i.description || "",
      image: i.image || "", recurring: i.repeatText || "", rsvp: form && !!i.rsvp, eventId: form ? i.id : "",
      ref: form ? i.id : "", id: form ? i.id : i.eventId,
      source: i.kind === "partner" ? "partner" : /community member/i.test(i.hostName || "") || (i.kind === "calendar" && i.hostName) ? "community" : "heirloom",
      partnerName: i.partner || "", hostName: (i.hostName || "").replace(/^a community member$/i, "")
    };
  }

  /* Partner image: pick from the library, upload, or go back to theirs */
  async function pickImage(i) {
    openDlg(`<h2>Image for “${esc(i.title)}”</h2><p class="loading" style="padding:20px 0">Loading photos…</p>`);
    let lib;
    try { lib = state.lib || (state.lib = (await call({ action: "adminLibrary" })).photos); }
    catch (err) { dlgIn.innerHTML = `<h2>Couldn't load photos</h2><p>${esc(err.message)}</p>`; return; }
    let choice = null, upload = null;
    dlgIn.innerHTML = `<h2>Image for “${esc(i.title)}”</h2>
      <p>Pick one of ours, upload one, or go back to the image ${esc(i.partner)} uses.</p>
      <div class="pickgrid">${lib.map((p, n) => `<button type="button" data-n="${n}" aria-pressed="false"><img src="${esc(p.image)}" alt="" loading="lazy"><span>${esc(p.label)}</span></button>`).join("")}</div>
      <div class="checks"><label class="btn btn-outline btn-sm" style="cursor:pointer">Upload a photo<input type="file" accept="image/*" id="up" class="visually-hidden"></label>
        <span id="upName" class="hint" style="margin:0"></span></div>
      <div class="btns">${i.customImage ? `<button class="btn-quiet" id="orig">Use ${esc(i.partner)}'s image</button>` : ""}
        <button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go" disabled>Use this image</button></div>`;
    dlgIn.querySelectorAll(".pickgrid button").forEach(b => b.onclick = () => {
      dlgIn.querySelectorAll(".pickgrid button").forEach(x => x.setAttribute("aria-pressed", x === b));
      choice = lib[+b.dataset.n]; upload = null; $("#upName").textContent = ""; $("#go").disabled = false;
    });
    $("#up").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      $("#upName").textContent = "Getting it ready…";
      try { upload = await shrink(f); choice = null; dlgIn.querySelectorAll(".pickgrid button").forEach(x => x.setAttribute("aria-pressed", false)); $("#upName").textContent = f.name; $("#go").disabled = false; }
      catch (err) { $("#upName").textContent = "Couldn't read that photo. Try another."; }
    };
    $("#go").onclick = e => run(e.currentTarget, Object.assign({ action: "adminPartner", key: i.key, title: i.title },
      upload ? { imageMode: "upload", imageData: upload } : { imageMode: "preset", presetImage: choice.raw || choice.image }), `New image for “${i.title}”.`);
    if ($("#orig")) $("#orig").onclick = e => run(e.currentTarget, { action: "adminPartner", key: i.key, title: i.title, imageMode: "original" }, `“${i.title}” is back to ${i.partner}'s image.`);
  }

  // Phone photos are huge: shrink to 1600px JPEG before sending
  function shrink(file) {
    return new Promise((ok, fail) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.onerror = fail; img.src = url;
    });
  }

  /* ============================================================
     Photo library
     ============================================================ */
  async function photos(fresh) {
    app.innerHTML = `<div class="panel-h"><div><h2>Photo library</h2>
      <p>These are the photos people can pick in the form, and the ones used automatically when an event has no image of its own. The first photo whose keywords appear in an event's name wins, so use the arrows to set the order.</p></div></div>
      <div id="lib"><p class="loading">Loading photos…</p></div>`;
    try {
      if (fresh || !state.lib) state.lib = (await call({ action: "adminLibrary" })).photos;
      if (state.tab === "photos") renderPhotos();
    } catch (err) { handle(err, $("#lib")); }
  }

  function renderPhotos() {
    const lib = state.lib;
    $("#lib").innerHTML = `<form class="add-photo" id="addForm" novalidate>
        <label class="pick" id="pick" tabindex="0">Choose a photo<input type="file" accept="image/*" id="newFile" class="visually-hidden"></label>
        <div class="f2"><h3>Add a photo</h3>
          <div><label class="lbl2" for="newLabel">Name</label><input type="text" id="newLabel" maxlength="40" placeholder="Bible study"></div>
          <div><label class="lbl2" for="newKw">Keywords <span class="opt">(comma separated)</span></label><input type="text" id="newKw" maxlength="600" placeholder="bible study, prayer, scripture"></div>
          <div class="checks"><label><input type="checkbox" id="newGallery" checked> Show in the form's gallery</label><label><input type="checkbox" id="newFallback"> Use when nothing matches</label></div>
          <p class="msg err" id="addErr" hidden></p>
          <div><button class="btn btn-forest btn-sm" id="addBtn">Add to the library</button></div>
        </div></form>
      <div class="photos">${lib.map((p, n) => `<div class="photo" data-n="${n}">
        <div class="img"><img src="${esc(p.image)}" alt="" loading="lazy"><span class="rank">#${n + 1}</span>${p.used ? `<span class="used">${p.used} event${p.used > 1 ? "s" : ""}</span>` : ""}</div>
        <div class="body f2">
          <div><label class="lbl2" for="l${n}">Name</label><input type="text" id="l${n}" data-k="label" maxlength="40" value="${esc(p.label)}"></div>
          <div><label class="lbl2" for="k${n}">Keywords</label><textarea id="k${n}" data-k="keywords" maxlength="600">${esc(p.keywords)}</textarea></div>
          <div class="checks"><label><input type="checkbox" data-k="gallery"${p.gallery ? " checked" : ""}> In the form's gallery</label><label><input type="checkbox" data-k="fallback"${p.fallback ? " checked" : ""}> Use when nothing matches</label></div>
          <div class="row2">
            <button type="button" class="icon-btn" data-do="up" aria-label="Move earlier"${n === 0 ? " disabled" : ""}>↑</button>
            <button type="button" class="icon-btn" data-do="down" aria-label="Move later"${n === lib.length - 1 ? " disabled" : ""}>↓</button>
            <span style="flex:1"></span>
            <button type="button" class="btn-quiet" data-do="remove">Remove</button>
            <button type="button" class="btn btn-forest btn-sm" data-do="save" disabled>Save</button>
          </div>
        </div></div>`).join("")}</div>`;

    // Add
    let newData = null;
    $("#pick").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#newFile").click(); } });
    $("#newFile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        newData = await shrink(f);
        $("#pick").style.backgroundImage = `url(data:image/jpeg;base64,${newData})`; $("#pick").classList.add("has");
        if (!$("#newLabel").value) $("#newLabel").value = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 40);
      } catch (err) { showAddErr("We couldn't read that photo. Try a different one."); }
    };
    function showAddErr(m) { $("#addErr").textContent = m; $("#addErr").hidden = !m; }
    $("#addForm").onsubmit = async e => {
      e.preventDefault();
      if (!newData) return showAddErr("Choose a photo first.");
      if (!$("#newLabel").value.trim()) return showAddErr("Give it a name.");
      const b = $("#addBtn"); b.disabled = true; b.innerHTML = `<span class="spinner"></span> Adding…`;
      try {
        state.lib = (await call({ action: "adminLibraryAdd", label: $("#newLabel").value.trim(), keywords: $("#newKw").value.trim(), imageData: newData, gallery: $("#newGallery").checked, fallback: $("#newFallback").checked })).photos;
        renderPhotos(); flash("Added to the top of the library.");
      } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); showAddErr(err.message); b.disabled = false; b.textContent = "Add to the library"; }
    };

    // Edit, reorder, remove
    $("#lib").querySelectorAll(".photo").forEach(card => {
      const p = lib[+card.dataset.n], save = card.querySelector('[data-do="save"]');
      card.querySelectorAll("[data-k]").forEach(inp => inp.addEventListener(inp.type === "checkbox" ? "change" : "input", () => save.disabled = false));
      const send = async (btn, body, msg) => {
        const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
        try { state.lib = (await call(Object.assign({ row: p.row, raw: p.raw }, body))).photos; renderPhotos(); if (msg) flash(msg); }
        catch (err) { if (err.signedOut || err.notAdmin) return handle(err); btn.disabled = false; btn.innerHTML = label; flash(err.message, true); }
      };
      save.onclick = () => send(save, { action: "adminLibrarySave", label: card.querySelector('[data-k="label"]').value, keywords: card.querySelector('[data-k="keywords"]').value,
        gallery: card.querySelector('[data-k="gallery"]').checked, fallback: card.querySelector('[data-k="fallback"]').checked }, `Saved “${card.querySelector('[data-k="label"]').value}”.`);
      card.querySelector('[data-do="up"]').onclick = e => send(e.currentTarget, { action: "adminLibraryMove", dir: "up" });
      card.querySelector('[data-do="down"]').onclick = e => send(e.currentTarget, { action: "adminLibraryMove", dir: "down" });
      card.querySelector('[data-do="remove"]').onclick = () => {
        openDlg(`<h2>Remove “${esc(p.label)}”?</h2><p>It won't be offered in the form or picked automatically anymore.${p.used ? ` The ${p.used} event${p.used > 1 ? "s" : ""} already using it keep it.` : ""} The photo file stays in Drive.</p>
          <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
        $("#go").onclick = async () => { dlg.close(); send(card.querySelector('[data-do="remove"]'), { action: "adminLibraryRemove" }, `Removed “${p.label}”.`); };
      };
    });
  }

  /* ============================================================
     Volunteers (from the volunteer form)
     ============================================================ */
  const vstate = { q: "", status: "", interest: "", news: false, role: "" };
  const BG = [["", "Not yet"], ["Sent", "Sent"], ["Cleared", "Cleared"]];
  // The role bits of a person's card (and of the "Add a person" form)
  function roleFields(v, statuses, id) {
    const res = v.role === "Resident";
    return `<label class="lbl" for="rl${id}">Role</label>
      <select id="rl${id}" data-k="role"><option${res ? "" : " selected"}>Volunteer</option><option${res ? " selected" : ""}>Resident</option></select>
      <p class="hint res-note" ${res ? "" : "hidden"} style="margin:0;font-size:13px">Residents count as approved, background-checked and trained for everything, and get every volunteer announcement. When someone moves out, switch them to Volunteer and set their check and trainings.</p>
      <div class="vfields" ${res ? "hidden" : ""} style="display:grid;gap:8px">
        <label class="lbl" for="st${id}">Status</label>
        <select id="st${id}" data-k="status">${statuses.concat(statuses.includes(v.status) ? [] : [v.status]).map(s => `<option${s === v.status ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>
        <label class="lbl" for="bg${id}">Background check</label>
        <select id="bg${id}" data-k="bg">${BG.map(([val, l]) => `<option value="${val}"${val === (v.bg || "") ? " selected" : ""}>${l}</option>`).join("")}</select>
        <span class="lbl">Trainings</span>
        <div class="trn">${(state.vols.trainings || []).map(t => `<label><input type="checkbox" data-k="trn" value="${esc(t)}"${(v.trainings || []).includes(t) ? " checked" : ""}>${esc(t)}</label>`).join("")}</div>
      </div>
      <span class="lbl">Can also</span>
      <div class="trn"><label><input type="checkbox" data-k="trusted"${v.trusted ? " checked" : ""}>Post events without review</label>
        <label><input type="checkbox" data-k="approver"${v.approver ? " checked" : ""}>Approve events</label></div>`;
  }
  function wireRole(box) {
    const sel = box.querySelector('[data-k="role"]');
    sel.addEventListener("change", () => { const r = sel.value === "Resident"; box.querySelector(".vfields").hidden = r; box.querySelector(".res-note").hidden = !r; });
  }
  const readRole = box => ({
    role: box.querySelector('[data-k="role"]').value, status: box.querySelector('[data-k="status"]').value, bg: box.querySelector('[data-k="bg"]').value,
    trainings: [...box.querySelectorAll('[data-k="trn"]:checked')].map(c => c.value),
    trusted: box.querySelector('[data-k="trusted"]').checked, approver: box.querySelector('[data-k="approver"]').checked
  });
  async function volunteers(fresh) {
    app.innerHTML = `<div class="panel-h"><div><h2>Volunteers</h2>
      <p>Everyone who's filled out the volunteer form, newest first. Set a status and keep notes as you follow up. It all lives on the Volunteers tab in the Sheet too.</p></div></div>
      <div id="vols"><p class="loading">Loading volunteers…</p></div>`;
    try {
      if (fresh || !state.vols) state.vols = await call({ action: "adminVolunteers" });
      if (state.tab === "volunteers") renderVolunteers();
    } catch (err) { handle(err, $("#vols")); }
  }

  const short = s => String(s).replace(/\s*\(.*?\)\s*/g, "").trim();
  function renderVolunteers() {
    const all = state.vols.volunteers, statuses = state.vols.statuses;
    const interests = [...new Set(all.flatMap(v => v.interests.split(/,\s*(?![^()]*\))/).map(x => x.trim()).filter(Boolean)))];
    $("#vols").innerHTML = `<div class="toolbar">
        <input type="search" id="vq" placeholder="Search names, emails, comments" value="${esc(vstate.q)}" aria-label="Search volunteers">
        <select id="vs" aria-label="Status"><option value="">Any status</option>${statuses.map(s => `<option${s === vstate.status ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>
        <select id="vi" aria-label="Interested in"><option value="">Any interest</option>${interests.map(s => `<option value="${esc(s)}"${s === vstate.interest ? " selected" : ""}>${esc(short(s))}</option>`).join("")}</select>
        <select id="vr" aria-label="Role"><option value="">Residents &amp; volunteers</option><option${vstate.role === "Resident" ? " selected" : ""}>Resident</option><option${vstate.role === "Volunteer" ? " selected" : ""}>Volunteer</option></select>
        <label class="tog"><input type="checkbox" id="vn"${vstate.news ? " checked" : ""}> Wants news &amp; updates</label>
      </div>
      <div class="toolbar" style="justify-content:space-between"><p class="hint" id="vcount" style="margin:0"></p>
        <div class="acts"><button class="btn btn-forest btn-sm" id="vadd">Add a person</button><button class="btn btn-outline btn-sm" id="vtrn">Edit trainings list</button><button class="btn btn-outline btn-sm" id="vcopy">Copy emails</button><button class="btn btn-outline btn-sm" id="vcsv">Download spreadsheet</button></div></div>
      <div class="vlist" id="vlist"></div>`;
    const filtered = () => all.filter(v =>
      (!vstate.role || v.role === vstate.role) && (!vstate.status || v.status === vstate.status) && (!vstate.interest || v.interests.includes(vstate.interest)) && (!vstate.news || v.news) &&
      (!vstate.q || [v.first, v.last, v.email, v.comments, v.notes, v.heard, v.interests].join(" ").toLowerCase().includes(vstate.q.toLowerCase())));
    const draw = () => {
      const list = filtered();
      $("#vcount").textContent = `${list.length} of ${all.length} volunteer${all.length === 1 ? "" : "s"}`;
      $("#vlist").innerHTML = list.length ? list.map(v => `<article class="vol" data-row="${v.row}">
          <div>
            <h3>${esc(v.first)} ${esc(v.last)}</h3>
            <p class="sub"><a href="mailto:${esc(v.email)}">${esc(v.email)}</a>${v.phone ? " · " + esc(v.phone) : ""} · ${esc(v.submitted)}</p>
            <div class="chips2">${v.role === "Resident" ? `<span class="status news">Resident</span>` : v.status === "New" ? `<span class="status new">New</span>` : ""}
              ${v.admin ? `<span class="status">Admin</span>` : ""}${v.approver ? `<span class="status">Events approver</span>` : ""}${v.trusted ? `<span class="status">Trusted poster</span>` : ""}
              ${v.interests.split(/,\s*(?![^()]*\))/).filter(Boolean).map(i => `<span class="status">${esc(i.trim())}</span>`).join("")}
              ${v.news ? `<span class="status news">✓ News &amp; updates</span>` : ""}
              ${v.heard ? `<span class="status src">Heard via ${esc(v.heard)}</span>` : ""}</div>
            ${v.comments ? `<p class="cm">${esc(v.comments)}</p>` : ""}
            ${(v.slots || []).length || v.upcoming ? `<p class="sub" style="margin-top:8px">${(v.slots || []).length ? "Chore chart: " + esc(v.slots.join(", ")) : ""}${(v.slots || []).length && v.upcoming ? " · " : ""}${v.upcoming ? v.upcoming + " upcoming sign-up" + (v.upcoming > 1 ? "s" : "") : ""}</p>` : ""}
          </div>
          <div class="side">
            ${roleFields(v, statuses, v.row)}
            <label class="lbl" for="nt${v.row}">Notes</label>
            <textarea id="nt${v.row}" data-k="notes" maxlength="3000" placeholder="Called Tuesday, coming Saturday…">${esc(v.notes)}</textarea>
            <div class="row3"><span class="saved" aria-live="polite"></span><button class="btn btn-forest btn-sm" data-save disabled>Save</button></div>
          </div></article>`).join("")
        : `<div class="empty"><h2>${all.length ? "No one matches" : "No volunteers yet"}</h2><p>${all.length ? "Try clearing a filter." : "Sign-ups from the volunteer form show up here."}</p></div>`;
      $("#vlist").querySelectorAll(".vol").forEach(card => {
        const v = all.find(x => x.row === +card.dataset.row), btn = card.querySelector("[data-save]"), msg = card.querySelector(".saved");
        wireRole(card);
        card.querySelectorAll("[data-k]").forEach(el => el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", () => { btn.disabled = false; msg.textContent = ""; }));
        btn.onclick = async () => {
          btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
          const notes = card.querySelector('[data-k="notes"]').value.trim(), r = readRole(card);
          try {
            await call(Object.assign({ action: "adminVolunteerSave", row: v.row, email: v.email, name: v.first + " " + v.last, notes }, r));
            Object.assign(v, r, { notes }); if (r.role === "Resident") v.status = "Active volunteer";
            btn.textContent = "Save"; msg.textContent = "Saved";
            const n = all.filter(x => x.status === "New").length; $("#volCount").hidden = !n; $("#volCount").textContent = n;
          } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); btn.disabled = false; btn.textContent = "Save"; msg.textContent = err.message; }
        };
      });
    };
    $("#vr").onchange = e => { vstate.role = e.target.value; draw(); };
    $("#vadd").onclick = () => {
      openDlg(`<h2>Add a person</h2><p>For residents and pre-approved volunteers who haven't filled out the form. They can log in right away with this email.</p>
        <form id="addP" class="f2" novalidate style="display:grid;gap:8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="lbl">First name<input type="text" name="first" maxlength="60" style="width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit"></label>
          <label class="lbl">Last name<input type="text" name="last" maxlength="60" style="width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit"></label></div>
          <label class="lbl">Email<input type="email" name="email" maxlength="120" style="width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit"></label>
          <div class="side" style="display:grid;gap:8px">${roleFields({ role: "Resident", status: "Active volunteer", trainings: [] }, state.vols.statuses, "new")}</div>
          <label class="lbl">Notes <span class="opt">(optional)</span><textarea name="notes" maxlength="3000" style="width:100%;min-height:60px"></textarea></label>
        </form>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Add</button></div>`);
      const f = $("#addP"); wireRole(f);
      f.querySelectorAll("select").forEach(s => s.style.cssText = "width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;font:inherit;background:#fff");
      $("#go").onclick = async e => {
        const b = e.currentTarget, fd = new FormData(f);
        const body = Object.assign({ action: "adminVolunteerAdd", first: fd.get("first"), last: fd.get("last"), email: fd.get("email"), notes: fd.get("notes") }, readRole(f));
        b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { state.vols = await call(body); dlg.close(); renderVolunteers(); flash(`Added ${body.first}. They can log in with ${body.email}.`); }
        catch (err) {
          if (err.signedOut || err.notAdmin) { dlg.close(); return handle(err); }
          b.disabled = false; b.textContent = "Add";
          if (!dlgIn.querySelector(".msg.err")) dlgIn.insertAdjacentHTML("beforeend", `<p class="msg err"></p>`);
          dlgIn.querySelector(".msg.err").textContent = err.message + ".";
        }
      };
    };
    $("#vtrn").onclick = () => {
      openDlg(`<h2>Trainings</h2><p>The trainings you can check off for each volunteer, and require for opportunities and chore slots. One per line.</p>
        <textarea id="trnList" style="min-height:160px">${esc((state.vols.trainings || []).join("\n"))}</textarea>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Save</button></div>`);
      $("#go").onclick = async e => {
        const b = e.currentTarget, list = $("#trnList").value.split("\n").map(x => x.trim()).filter(Boolean);
        b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { const r = await call({ action: "adminTrainingsSave", list }); state.vols.trainings = r.trainings; state.chores = null; dlg.close(); renderVolunteers(); flash("Trainings updated."); }
        catch (err) { b.disabled = false; b.textContent = "Save"; flash(err.message, true); }
      };
    };
    $("#vq").addEventListener("input", e => { vstate.q = e.target.value; draw(); });
    $("#vs").onchange = e => { vstate.status = e.target.value; draw(); };
    $("#vi").onchange = e => { vstate.interest = e.target.value; draw(); };
    $("#vn").onchange = e => { vstate.news = e.target.checked; draw(); };
    $("#vcopy").onclick = async () => {
      const emails = [...new Set(filtered().map(v => v.email).filter(Boolean))].join(", ");
      try { await navigator.clipboard.writeText(emails); flash(`Copied ${filtered().length} email${filtered().length === 1 ? "" : "s"}. Paste them into the To or Bcc line.`); }
      catch (e) { openDlg(`<h2>Emails</h2><p>Copy these:</p><textarea readonly style="min-height:140px">${esc(emails)}</textarea><div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Done</button></div>`); }
    };
    $("#vcsv").onclick = () => {
      const cols = [["Submitted", "submitted"], ["First name", "first"], ["Last name", "last"], ["Email", "email"], ["News & updates", "news"], ["Interested in", "interests"], ["Heard about us", "heard"], ["Comments", "comments"], ["Status", "status"], ["Notes", "notes"]];
      const cell = x => `"${String(x === true ? "Yes" : x === false ? "No" : x == null ? "" : x).replace(/"/g, '""')}"`;
      const csv = [cols.map(c => cell(c[0])).join(",")].concat(filtered().map(v => cols.map(c => cell(v[c[1]])).join(","))).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
      a.download = "heirloom-volunteers-" + H.dayKey(new Date()) + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
    };
    const n = all.filter(x => x.status === "New").length; $("#volCount").hidden = !n; $("#volCount").textContent = n;
    draw();
  }

  /* ============================================================
     Chore chart (regular weekly slots) + coverage requests
     ============================================================ */
  async function chores(fresh) {
    app.innerHTML = `<div class="panel-h"><div><h2>Chore chart</h2>
      <p>Regular weekly slots, one person each. When a slot is set to Open, qualified volunteers get an email and can take it in their portal.
      Volunteers can also ask for coverage on certain dates. It all lives on the Chore chart and Coverage tabs in the Sheet too.</p></div></div>
      <div id="ch"><p class="loading">Loading the chore chart…</p></div>`;
    try {
      if (fresh || !state.chores) state.chores = await call({ action: "adminChores" });
      if (state.tab === "chores") renderChores();
    } catch (err) { handle(err, $("#ch")); }
  }
  function slotForm(s, d, n) {
    const opt = (list, val, blank) => (blank != null ? `<option value="">${esc(blank)}</option>` : "") + list.map(x => `<option${x === val ? " selected" : ""}>${esc(x)}</option>`).join("");
    const vols = d.volunteers.slice();
    if (s.volunteer && !vols.some(v => v.email === s.volunteer)) vols.push({ email: s.volunteer, name: s.volunteer + " (not active)" });
    return `<form class="slotf${s.id && !s.volunteer ? " open" : ""}${s.id ? "" : " add-slot"}" data-n="${n}" novalidate>
      <label>Chore<input name="chore" maxlength="80" value="${esc(s.chore || "")}" placeholder="Evening animal chores" required></label>
      <label>Day<select name="day">${opt(d.days, s.day || "Monday")}</select></label>
      <label>Start<input type="time" name="start" value="${esc(s.start || "15:00")}"></label>
      <label>End<input type="time" name="end" value="${esc(s.end || "")}"></label>
      <label>Training needed<select name="training">${opt(d.trainings, s.training, "None")}</select></label>
      <label>Volunteer<select name="volunteer"><option value="">Open (needs someone)</option>${vols.map(v => `<option value="${esc(v.email)}"${v.email === s.volunteer ? " selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      <div class="sbtns">${s.id ? `<button type="button" class="btn-quiet" data-rm>Remove</button><button class="btn btn-forest btn-sm" disabled>Save</button>` : `<button class="btn btn-primary btn-sm">Add slot</button>`}</div>
      <label class="notes">Notes <span class="opt">(shown to volunteers)</span><input name="notes" maxlength="500" value="${esc(s.notes || "")}" placeholder="Feed, water, collect eggs. Gate code is on the barn door."></label>
    </form>`;
  }
  function renderChores() {
    const d = state.chores;
    const days = d.days.filter(day => d.slots.some(s => s.day === day));
    const open = d.slots.filter(s => !s.volunteer).length;
    $("#ch").innerHTML = `<h3 class="day-h" style="font-family:var(--f-label);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--forest);margin:0 0 8px">Add a slot</h3>
      ${slotForm({}, d, -1)}
      <p class="hint" style="margin:-2px 0 22px">${d.slots.length} slot${d.slots.length === 1 ? "" : "s"}${open ? ` · <b>${open} open</b>` : ""}. Only active volunteers (and only those with the training, if one is needed) can be picked or take a slot.</p>
      ${days.map(day => `<section class="cday"><h3>${day}</h3>${d.slots.map((s, n) => s.day === day ? slotForm(s, d, n) : "").join("")}</section>`).join("")}
      <div class="panel-h" style="margin-top:26px"><div><h2 style="font-size:22px">Coverage requests</h2><p>Dates volunteers asked to have covered, coming up.</p></div></div>
      ${d.coverage.length ? `<div class="alist">${d.coverage.map(c => `<article class="arow" style="grid-template-columns:1fr"><div>
        <h3>${esc(c.chore)}</h3><p class="when">${esc(H.fmt(H.zoned(...c.date.split("-").map(Number), 12), { weekday: "long", month: "long", day: "numeric" }))} · ${esc(c.time)}</p>
        <div class="chips2"><span class="status src">Asked by ${esc(c.by)}</span>${c.status === "Covered" ? `<span class="status">Covered by ${esc(c.coveredBy)}</span>` : `<span class="status pending">Still open</span>`}</div>
        ${c.note ? `<p class="hint" style="margin:0">“${esc(c.note)}”</p>` : ""}</div></article>`).join("")}</div>`
        : `<div class="empty"><h2>No coverage requests</h2><p>When a volunteer asks for a date to be covered, it shows up here.</p></div>`}`;
    $("#ch").querySelectorAll(".slotf").forEach(f => {
      const n = +f.dataset.n, s = n >= 0 ? d.slots[n] : null, save = f.querySelector(".sbtns .btn");
      if (s) f.querySelectorAll("input, select").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => save.disabled = false));
      f.onsubmit = async e => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(f).entries());
        if (!body.chore.trim()) { f.querySelector('[name="chore"]').focus(); return flash("Name the chore first.", true); }
        const wasVol = s && s.volunteer;
        const label = save.innerHTML; save.disabled = true; save.innerHTML = `<span class="spinner"></span>`;
        try {
          state.chores = await call(Object.assign({ action: "adminChoreSave", id: s ? s.id : "" }, body));
          renderChores();
          flash(!body.volunteer && (!s || wasVol) ? "Saved. We emailed qualified volunteers that it's open." : "Saved.");
        } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); save.disabled = false; save.innerHTML = label; flash(err.message, true); }
      };
      const rm = f.querySelector("[data-rm]");
      if (rm) rm.onclick = () => {
        openDlg(`<h2>Remove this slot?</h2><p>${esc(s.chore)}, ${esc(s.day)}s. It comes off the chore chart${s.volunteer ? ` and ${esc(s.volunteer)} won't see it anymore` : ""}.</p>
          <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
        $("#go").onclick = async e => {
          const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
          try { state.chores = await call({ action: "adminChoreRemove", id: s.id }); dlg.close(); renderChores(); flash("Removed."); }
          catch (err) { b.disabled = false; b.textContent = "Remove"; flash(err.message, true); }
        };
      };
    });
  }
  function demoChores(b) {
    const base = state.chores || { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], trainings: ["Animal chores", "Goat milking", "Garden tools", "Power tools"],
      volunteers: [{ email: "ana@example.com", name: "Ana Diaz" }, { email: "bo@example.com", name: "Bo Li" }],
      slots: [
        { id: "S-1", chore: "Evening animal chores", day: "Tuesday", start: "15:00", end: "16:00", training: "Animal chores", volunteer: "ana@example.com", notes: "Feed, water, collect eggs." },
        { id: "S-2", chore: "Evening animal chores", day: "Thursday", start: "15:00", end: "16:00", training: "Animal chores", volunteer: "", notes: "" },
        { id: "S-3", chore: "Morning milking", day: "Saturday", start: "07:00", end: "08:00", training: "Goat milking", volunteer: "bo@example.com", notes: "" }],
      coverage: [{ id: "C-1", chore: "Evening animal chores", date: H.dayKey(new Date(Date.now() + 6 * 86400000)), time: "3pm–4pm", by: "ana@example.com", status: "Open", coveredBy: "", note: "Out of town" }] };
    if (b.action === "adminChoreSave") {
      const s = { id: b.id || "S-" + Date.now(), chore: b.chore, day: b.day, start: b.start, end: b.end, training: b.training, volunteer: b.volunteer, notes: b.notes };
      const i = base.slots.findIndex(x => x.id === b.id);
      if (i === -1) base.slots.push(s); else base.slots[i] = s;
      const days = base.days; base.slots.sort((a, c) => days.indexOf(a.day) - days.indexOf(c.day) || a.start.localeCompare(c.start));
    }
    if (b.action === "adminChoreRemove") base.slots = base.slots.filter(x => x.id !== b.id);
    return Object.assign({ ok: true }, JSON.parse(JSON.stringify(base)));
  }

  /* ============================================================
     People
     ============================================================ */
  async function people() {
    app.innerHTML = `<div class="panel-h"><div><h2>People</h2>
      <p>Who can post without review, who approves, and who can use this page. Only admins can change these, here or in the Sheet.</p></div></div><div id="ppl"><p class="loading">Loading…</p></div>`;
    try {
      const r = await call({ action: "adminPeople" });
      if (state.tab === "people") renderPeople(r);
    } catch (err) { handle(err, $("#ppl")); }
  }

  function renderPeople(r) {
    const lists = { admins: r.admins.slice(), approvers: r.approvers.slice(), trusted: r.trusted.slice() };
    const me = String(r.me || "").toLowerCase();
    const info = {
      admins: ["Admins", "Can use this page: edit, cancel or delete any event, manage photos, and change these lists."],
      approvers: ["Approvers", "Get an email to approve or decline posts from people who aren't trusted. Their own posts go up right away."],
      trusted: ["Trusted posters", "Their posts go up right away, without review. (Admins and approvers are trusted automatically.)"]
    };
    let dirty = false;
    const draw = () => {
      $("#ppl").innerHTML = `<div class="people">${Object.keys(lists).map(k => `<section class="plist" data-k="${k}">
          <h3>${info[k][0]} <span class="hint" style="font-family:var(--f-body);font-size:14px">(${lists[k].length})</span></h3><p>${info[k][1]}</p>
          <ul>${lists[k].map((e, n) => `<li class="${e === me ? "me" : ""}"><span>${esc(e)}${e === me ? " <b>(you)</b>" : ""}</span><button type="button" class="x" data-n="${n}" aria-label="Remove ${esc(e)}">×</button></li>`).join("") || `<li style="justify-content:center;color:var(--muted)">Nobody yet</li>`}</ul>
          <form novalidate><input type="email" placeholder="name@example.com" aria-label="Add an email to ${info[k][0]}" autocomplete="off"><button class="btn btn-outline btn-sm">Add</button></form>
        </section>`).join("")}</div>
        <div class="savebar"><button class="btn btn-primary" id="savePeople"${dirty ? "" : " disabled"}>Save changes</button><p id="pplMsg">${dirty ? "You have unsaved changes." : "Changes take effect as soon as you save."}</p></div>`;
      $("#ppl").querySelectorAll(".plist").forEach(sec => {
        const k = sec.dataset.k;
        sec.querySelectorAll(".x").forEach(x => x.onclick = () => { lists[k].splice(+x.dataset.n, 1); dirty = true; draw(); });
        sec.querySelector("form").onsubmit = e => {
          e.preventDefault();
          const inp = sec.querySelector("input");
          const added = inp.value.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
          const bad = added.filter(a => !/^\S+@\S+\.\S+$/.test(a));
          if (bad.length) { inp.setCustomValidity("Check this email"); inp.reportValidity(); return; }
          added.forEach(a => { if (!lists[k].includes(a)) lists[k].push(a); });
          dirty = true; draw();
          $(`.plist[data-k="${k}"] input`).focus();
        };
        sec.querySelector("input").addEventListener("input", e => e.target.setCustomValidity(""));
      });
      $("#savePeople").onclick = async () => {
        if (!lists.admins.length) { $("#pplMsg").textContent = "Keep at least one admin."; return; }
        if (!lists.admins.includes(me) && !confirmSelf()) return;
        const b = $("#savePeople"); b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
        try {
          const res = await call({ action: "adminPeopleSave", admins: lists.admins, approvers: lists.approvers, trusted: lists.trusted });
          if (res.stillAdmin === false) return gate("notAdmin");
          renderPeople(res); flash("Saved. The lists in the Sheet are updated too.");
        } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); b.disabled = false; b.textContent = "Save changes"; $("#pplMsg").textContent = err.message + "."; }
      };
    };
    // Taking yourself off the Admins list locks you out of this page
    let selfOk = false;
    function confirmSelf() {
      if (selfOk) return true;
      openDlg(`<h2>Remove yourself as an admin?</h2><p>You won't be able to use this page anymore. Another admin would need to add you back.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep me</button><button class="btn btn-primary btn-sm" id="go">Remove me</button></div>`);
      $("#go").onclick = () => { selfOk = true; dlg.close(); $("#savePeople").click(); };
      return false;
    }
    window.addEventListener("beforeunload", e => { if (dirty && state.tab === "people") { e.preventDefault(); e.returnValue = ""; } });
    draw();
  }

  /* ============================================================
     Preview mode (no backend): sample data so the page can be tried
     ============================================================ */
  const demoLib = (C.PRESETS || []).map((p, n) => ({ row: n + 2, label: p.label, keywords: p.keywords, raw: p.image, image: p.image, gallery: true, fallback: (C.FALLBACKS || []).includes(p.image), used: n % 3 }));
  async function demo(b) {
    await new Promise(r => setTimeout(r, 350));
    const iso = (n, h) => { const d = new Date(Date.now() + n * 86400000); d.setHours(h, 0, 0, 0); return d.toISOString(); };
    const when = (n, h, e) => H.fmt(new Date(iso(n, h)), { weekday: "short", month: "short", day: "numeric", year: "numeric" }) + ", " + H.fmtTimeRange(new Date(iso(n, h)), new Date(iso(n, e)));
    if (b.action === "adminList" && b.cal === "residents") return { ok: true, items: [
      { kind: "calendar", eventId: "r1", title: "House meeting", when: when(2, 19, 20), start: iso(2, 19), location: "Farmhouse", recurring: true, more: 3, image: "" },
      { kind: "form", id: "EV-3", title: "Play Night", when: when(4, 19, 21), start: iso(4, 19), status: "Published", poster: "Pat Doe", calendars: "Public, Residents", location: "Autoshop", image: "images/farmhouse-lawn.jpg", rsvp: true, going: 6, spots: 12 },
      { kind: "calendar", eventId: "r2", title: "Chore swap", when: when(6, 9, 10), start: iso(6, 9), location: "", image: "" }
    ] };
    if (b.action === "adminList" && b.past) return { ok: true, items: [
      { kind: "form", id: "EV-0", title: "Fall Harvest Potluck", when: when(-12, 17, 20), start: iso(-12, 17), status: "Published", poster: "Sue", calendars: "Public", location: "The big lawn", image: "images/tomatoes.jpg" }
    ] };
    if (b.action === "adminList") return { ok: true, items: [
      { kind: "calendar", eventId: "g1", key: "cal:public:g1", title: "Happy Hour with the Goats", when: when(1, 16, 18), start: iso(1, 16), location: "Goat pen", recurring: true, more: 7, image: "images/goats.jpg" },
      { kind: "form", id: "EV-2", title: "Knit & Sip on the Porch", when: when(3, 18, 20), start: iso(3, 18), status: "Pending", poster: "Sue Miller", email: "sue@example.com", calendars: "Public", location: "Farmhouse", image: "images/farmhouse.jpg" },
      { kind: "form", id: "EV-3", title: "Play Night", when: when(4, 19, 21), start: iso(4, 19), status: "Published", poster: "Pat Doe", calendars: "Public, Residents", location: "Autoshop", image: "images/farmhouse-lawn.jpg", rsvp: true, going: 6, spots: 12 },
      { kind: "partner", key: "partner:soundbird:1", title: "Sound Bath at Sunset", partner: "The Soundbird Sanctuary", when: when(5, 17, 18), start: iso(5, 17), location: "Yurt", image: "images/painting.jpg", customImage: true },
      { kind: "calendar", eventId: "b1", key: "cal:public:b1", title: "Supper Church", when: when(6, 18, 20), start: iso(6, 18), location: "Farmhouse", image: "images/farmhouse-lawn.jpg", hostName: "" },
      { kind: "partner", key: "partner:plantify:2", title: "Bed prep and cover crops", partner: "Plantify", when: when(8, 11, 14), start: iso(8, 11), location: "Paradise Community Garden", image: "images/squash-tunnel.jpg", hidden: true }
    ] };
    if (b.action === "adminLibrary") return { ok: true, photos: demoLib };
    if (/^adminLibrary/.test(b.action)) return { ok: true, photos: demoLib };
    if (b.action === "adminVolunteers") return { ok: true, trainings: ["Animal chores", "Goat milking", "Garden tools", "Power tools"], statuses: ["New", "Contacted", "Active volunteer", "Background check sent", "Not right now"], volunteers: [
      { row: 4, submitted: "2026-11-10 18:42", first: "Ana", last: "Diaz", email: "ana@example.com", news: true, interests: "Weekly animal chores (approx. 1 hour/week), One-off Projects", heard: "A Friend", comments: "We're a family of four, kids are 8 and 11. Weekday afternoons work best!", status: "Active volunteer", notes: "", bg: "Cleared", trainings: ["Animal chores"], slots: ["Tuesday Evening animal chores"], upcoming: 2 },
      { row: 3, submitted: "2026-11-10 18:15", first: "Marcus", last: "Lee", email: "marcus@example.com", news: false, interests: "Monthly Workdays (2 hours/month)", heard: "Website/Google", comments: "", status: "Contacted", notes: "Coming to the Dec workday" },
      { row: 2, submitted: "2026-11-09 12:03", first: "Priya", last: "Shah", email: "priya@example.com", news: true, interests: "I'm not sure", heard: "Social Media", comments: "", status: "New", notes: "" }
    ] };
    if (b.action === "adminVolunteerSave") return { ok: true, status: b.status };
    if (b.action === "adminTrainingsSave") return { ok: true, trainings: b.list };
    if (b.action === "adminVolunteerAdd") { const v = state.vols; v.volunteers.unshift({ row: 99, submitted: "just now", first: b.first, last: b.last, email: b.email, news: false, interests: "Added by an admin", heard: "", comments: "", status: "Active volunteer", notes: b.notes, bg: b.bg, trainings: b.trainings, role: b.role, trusted: b.trusted, approver: b.approver, slots: [], upcoming: 0 }); return JSON.parse(JSON.stringify(v)); }
    if (b.action === "adminChores" || b.action === "adminChoreSave" || b.action === "adminChoreRemove") return demoChores(b);
    if (b.action === "adminPeople") return { ok: true, me: session.email, admins: [session.email, "staff@heirloomeastbay.com", "community@heirloomeastbay.com", "admin@heirloomeastbay.com"],
      approvers: ["community@heirloomeastbay.com", "staff@heirloomeastbay.com", "admin@heirloomeastbay.com", "kkostelnick@iliff.edu", "lindsey.j.huffman@gmail.com"],
      trusted: ["community@heirloomeastbay.com", "mkhamiter@gmail.com", "nik@heirloomeastbay.com", "toku@plantify.org", "keegan@plantify.org"] };
    if (b.action === "adminPeopleSave") return { ok: true, me: session.email, admins: b.admins, approvers: b.approvers, trusted: b.trusted, stillAdmin: b.admins.includes(session.email) };
    return { ok: true };
  }

  show(state.tab);
})();
