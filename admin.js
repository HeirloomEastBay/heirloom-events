/* Heirloom Activities — Admin page
   Admins sign in on My events (emailed code). Five tabs:
   Public calendar · Residents' calendar · Photo library · Chore chart · People */
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
    if (DEMO) {
      const r = await demo(body); if (r.ok === false) throw new Error(r.error);
      if (!r.viewer) r.viewer = qs.get("as") === "resident" ? "resident" : "admin"; // preview: ?as=resident shows the resident panel
      if (r.viewer === "resident" && r.slots) r.slots.forEach(x => { if (x.canEdit == null) x.canEdit = /^S-\d+$/.test(x.id) ? false : true; });
      if (r.viewer !== state.viewer) setViewer(r.viewer);
      return r;
    }
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    const r = await res.json();
    if (r.ok && r.viewer && r.viewer !== state.viewer) setViewer(r.viewer);
    if (r.ok && window.HLNav && !markedAdmin) { markedAdmin = true; HLNav.setRoles({ email: session.email, admin: r.viewer !== "resident", resident: r.viewer === "resident" ? true : undefined }); }
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
      ? `<div class="empty"><h2>This page is for Heirloom residents and admins</h2><p>You're signed in as <b>${esc(session && session.email)}</b>, which isn't set up as a resident or admin. Ask an admin to add you, or sign in with a different email.</p>
         <p><a class="btn btn-primary" href="mine.html">Go to My events</a></p></div>`
      : `<div class="empty"><h2>Please sign in</h2><p>Admins sign in on My events with a code we email you. You'll come right back here.</p>
         <p><a class="btn btn-primary" href="mine.html?next=admin">Sign in</a></p></div>`;
  }
  function handle(err, box) {
    if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } return gate("signin"); }
    if (err.notAdmin && state && state.viewer === "resident") { (box || app).innerHTML = `<div class="empty"><h2>Just for admins</h2><p>${esc(err.message)}.</p></div>`; return; }
    if (err.notAdmin) return gate("notAdmin");
    (box || app).innerHTML = `<div class="empty"><h2>Something went wrong</h2><p>${esc(err.message)}</p><p><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
    $("#retry").onclick = () => show(state.tab, true);
  }
  if (!session || !session.token) return gate("signin");

  /* ---------- Tabs ---------- */
  if (qs.get("tab") === "volunteers") qs.set("tab", "people"); // the Volunteers tab is part of People now
  const state = { tab: ["public", "residents", "photos", "chores", "people", "stays", "venues", "log"].includes(qs.get("tab")) ? qs.get("tab") : "public", view: "upcoming", q: "", cache: {}, viewer: "" };
  const RES = () => state.viewer === "resident";
  // Residents get a lighter panel: no People tab, calendars to look at, add photos and chores
  function setViewer(v) {
    state.viewer = v;
    const res = v === "resident";
    $("#tab-people").hidden = res; $("#tab-log").hidden = res;
    $("#panelTitle").textContent = res ? "Resident panel" : "Admin";
    $("#panelIntro").textContent = res ? "Both calendars, the photo library, the chore chart and the guest rooms, in one place. You can add photos and chores, and book guest rooms. Approving and editing events stays with the admins."
      : "Edit, cancel or delete anything on either calendar, no matter who added it. Manage people, roles and the chore chart, and the photo library.";
    document.title = (res ? "Resident panel" : "Admin") + " · Heirloom Activities";
    if (res) { const rv = document.querySelector('[data-view="review"]'); if (rv) rv.remove(); if (state.view === "review") state.view = "upcoming"; }
    if (res && (state.tab === "people" || state.tab === "log")) show("public");
  }
  $("#tabs").hidden = false;
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => { qs.delete("p"); show(t.dataset.tab); });
  $("#tabs").addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const tabs = [...document.querySelectorAll(".tab")], i = tabs.findIndex(t => t.dataset.tab === state.tab);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); show(next.dataset.tab);
  });
  function show(tab, fresh) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach(t => { const on = t.dataset.tab === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    if (tab !== "people" || !qs.get("p")) { qs.delete("p"); history.replaceState(null, "", tab === "public" ? "admin.html" : "admin.html?tab=" + tab); }
    if (tab === "photos") return photos(fresh);
    if ((tab === "people" || tab === "log") && RES()) return show("public");
    if (tab === "log") return activity(fresh);
    if (tab === "people") return people(fresh);
    if (tab === "venues") { app.innerHTML = `<div class="panel-h"><div><h2>Venues</h2><p>Reserve places around the farm by the hour. Events from the event form hold their place automatically, and anything on the calendars that mentions a venue shows as a heads-up. Reservations go on the residents' calendar.</p></div></div><div id="venues"></div>`; return HLVenues.mount($("#venues")); }
    if (tab === "stays") { app.innerHTML = `<div class="panel-h"><div><h2>Guest rooms</h2><p>Who's in the 4 guest rooms, and when. Stays come from the residents' calendar ("Room 1: Sarah (Sabbath 365)") and from the Guest rooms page residents use. Admins can change any stay and block rooms.</p></div></div><div id="stays"></div>`; return HLStays.mount($("#stays"), { refresh: fresh }); }
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
          ${RES() ? "" : `<button type="button" data-view="review" aria-pressed="${state.view === "review"}">Waiting for review<span class="n" id="nReview" hidden></span></button>`}
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
      if (!past && i.recurring && i.status === "Published" && window.HLDates) acts.push(`<button class="btn btn-outline btn-sm" data-act="dates">Change one date</button>`);
      if (!past) acts.push(`<button class="btn-quiet" data-act="cancel">Cancel event</button>`);
    } else if (i.kind === "partner") {
      if (which === "public") acts.push(`<button class="btn btn-forest btn-sm" data-act="image">Change image</button>`,
        `<button class="btn btn-outline btn-sm" data-act="${i.hidden ? "unhide" : "hide"}">${i.hidden ? "Show on website" : "Hide from website"}</button>`);
      else acts.push(`<span class="hint" style="margin:0;font-size:13.5px">Copied here from ${esc(i.partner)} automatically.</span>`);
    } else {
      if (!past) acts.push(`<a class="btn btn-forest btn-sm" href="${editHref(which, i)}">Edit</a>`);
      if (!past && i.recurring && window.HLDates) acts.push(`<button class="btn btn-outline btn-sm" data-act="dates">Change one date</button>`);
      acts.push(`<button class="btn-quiet" data-act="delete">Delete</button>`);
    }
    if (RES()) acts.length = 0;
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
    if (kind === "dates") return HLDates.open(i.kind === "form" ? i.id : { cal: which, eventId: i.eventId }, { onChange: () => calendar(which, true) });
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
        <div class="body f2"${RES() ? ' inert' : ""}>
          <div><label class="lbl2" for="l${n}">Name</label><input type="text" id="l${n}" data-k="label" maxlength="40" value="${esc(p.label)}"></div>
          <div><label class="lbl2" for="k${n}">Keywords</label><textarea id="k${n}" data-k="keywords" maxlength="600">${esc(p.keywords)}</textarea></div>
          <div class="checks"><label><input type="checkbox" data-k="gallery"${p.gallery ? " checked" : ""}> In the form's gallery</label><label><input type="checkbox" data-k="fallback"${p.fallback ? " checked" : ""}> Use when nothing matches</label></div>
          <div class="row2"${RES() ? " hidden" : ""}>
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
     Chore chart (regular weekly slots) + coverage requests
     ============================================================ */
  async function chores(fresh) {
    app.innerHTML = `<div class="panel-h"><div><h2>Chore chart</h2>
      <p>Regular weekly chores, one slot per day. Give each one a person, the general "Volunteers" pool, or leave it Open (qualified volunteers get an email and can take it).
      Anyone can ask for coverage on certain dates. It all lives on the Chore chart and Coverage tabs in the Sheet too.</p></div></div>
      <div id="ch"><p class="loading">Loading the chore chart…</p></div>`;
    try {
      if (fresh || !state.chores) state.chores = await call({ action: "adminChores" });
      if (state.tab === "chores") renderChores();
    } catch (err) { handle(err, $("#ch")); }
  }
  function slotForm(s, d, n) {
    const opt = (list, val, blank) => (blank != null ? `<option value="">${esc(blank)}</option>` : "") + list.map(x => `<option${x === val ? " selected" : ""}>${esc(x)}</option>`).join("");
    const vols = d.volunteers.slice();
    const real = s.volunteer && s.volunteer !== "Volunteers";
    if (real && !vols.some(v => v.email === s.volunteer)) vols.push({ email: s.volunteer, name: s.volunteer + " (not active)" });
    const add = !s.id;
    return `<form class="slotf${s.id && !s.volunteer ? " open" : ""}${add ? " add-slot" : ""}" data-n="${n}" novalidate>
      <label>Chore<input name="chore" maxlength="80" value="${esc(s.chore || "")}" placeholder="AM animal chores" required></label>
      ${add ? "" : `<label>Day<select name="day">${opt(d.days, s.day || "Monday")}</select></label>`}
      <label>When<input name="when" maxlength="40" value="${esc(s.when || "")}" placeholder="by 10am, ~5pm, Anytime" list="whenList"></label>
      <label><span>Hours each</span><input type="number" name="hours" min="0.25" max="12" step="0.25" value="${esc(s.hours || 1)}"></label>
      <label>Training needed<select name="training">${opt(d.trainings, s.training, "None")}</select></label>
      <label>Who<select name="volunteer"><option value="">Open (needs someone)</option><option value="Volunteers"${s.volunteer === "Volunteers" ? " selected" : ""}>Volunteers (the general pool)</option>
        ${vols.map(v => `<option value="${esc(v.email)}"${v.email === s.volunteer ? " selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      ${add ? `<fieldset class="days"><legend>Days</legend>${d.days.map(x => `<label><input type="checkbox" name="days" value="${x}">${x.slice(0, 3)}</label>`).join("")}<button type="button" class="btn-quiet" data-every>Every day</button></fieldset>` : ""}
      <label class="notes"><span>Notes <span class="opt">(shown to volunteers)</span></span><input name="notes" maxlength="500" value="${esc(s.notes || "")}" placeholder="Feed, water, collect eggs. Gate code is on the barn door."></label>
      <div class="sbtns">${s.id ? `<button type="button" class="btn-quiet" data-need>Needs coverage…</button><button type="button" class="btn-quiet" data-rm>Remove</button><button class="btn btn-forest btn-sm" disabled>Save</button>` : `<button class="btn btn-primary btn-sm">Add</button>`}</div>
      ${s.id && d.slots.filter(x => x.chore === s.chore).length > 1 ? `<label class="alld"><input type="checkbox" name="allDays"> Also change the name, when, hours, training and notes on the other ${d.slots.filter(x => x.chore === s.chore).length - 1} days of "${esc(s.chore)}"</label>` : ""}
    </form>`;
  }
  function renderChores() {
    const d = state.chores;
    const days = d.days.filter(day => d.slots.some(s => s.day === day));
    const open = d.slots.filter(s => !s.volunteer).length, pool = d.slots.filter(s => s.volunteer === "Volunteers").length;
    const whens = [...new Set(["by 10am", "~5pm", "after 2pm", "Morning", "Evening", "Anytime"].concat(d.slots.map(s => s.when).filter(Boolean)))];
    $("#ch").innerHTML = `<datalist id="whenList">${whens.map(w => `<option value="${esc(w)}">`).join("")}</datalist>
      <h3 class="day-h" style="font-family:var(--f-label);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--forest);margin:0 0 8px">Add a chore</h3>
      ${slotForm({}, d, -1)}
      <p class="hint" style="margin:-2px 0 22px">${d.slots.length} slot${d.slots.length === 1 ? "" : "s"}${open ? ` · <b>${open} open</b>` : ""}${pool ? ` · ${pool} covered by Volunteers` : ""}. Each slot is one day of the week. "Volunteers" means the general pool has it; use <b>Needs coverage…</b> on any slot to ask for someone on certain dates. Hours per shift add up on each person's profile. Need a new kind of training for a chore? <button type="button" id="chTrn" style="background:none;border:0;padding:0;color:var(--forest);font:inherit;font-weight:600;text-decoration:underline;cursor:pointer">Edit the trainings list</button></p>
      ${days.map(day => `<section class="cday"><h3>${day}</h3>${d.slots.map((s, n) => s.day === day ? `<details class="slotd${!s.volunteer ? " open-slot" : ""}"${state.openSlot === s.id ? " open" : ""} data-id="${esc(s.id)}">
        <summary${s.canEdit === false ? ' class="ro"' : ""}><b>${esc(s.chore)}</b><span class="w">${esc(s.when || "")}</span><span class="h">${esc(String(s.hours))} hr</span>
          <span class="who${!s.volunteer ? " open" : s.volunteer === "Volunteers" ? " pool" : ""}">${!s.volunteer ? "Open" : s.volunteer === "Volunteers" ? "Volunteers" : esc((d.volunteers.find(v => v.email === s.volunteer) || { name: s.volunteer }).name)}</span>
          ${d.coverage.some(c => c.slotId === s.id && c.status === "Open") ? `<span class="status pending">Needs coverage</span>` : ""}<span class="ed">${s.canEdit === false ? "" : "Edit"}</span></summary>
        ${s.canEdit === false ? `<p class="hint" style="margin:0;padding:10px 14px">${esc(s.notes || "")}${s.notes ? " · " : ""}Ask an admin to change this one.</p>` : slotForm(s, d, n)}</details>` : "").join("")}</section>`).join("")}
      <div class="panel-h" style="margin-top:26px"><div><h2 style="font-size:22px">Coverage requests</h2><p>Dates that need someone, coming up.</p></div></div>
      ${d.coverage.length ? `<div class="alist">${d.coverage.map((c, i) => `<article class="arow" style="grid-template-columns:1fr"><div>
        <h3>${esc(c.chore)}</h3><p class="when">${esc(H.fmt(H.zoned(...c.date.split("-").map(Number), 12), { weekday: "long", month: "long", day: "numeric" }))} · ${esc(c.time)}</p>
        <div class="chips2"><span class="status src">${c.pool ? "Needs someone" : "Asked by " + esc(c.by)}</span>${c.status === "Covered" ? `<span class="status">Covered by ${esc(c.coveredBy)}</span>` : `<span class="status pending">Still open</span>`}</div>
        ${c.note ? `<p class="hint" style="margin:0 0 8px">“${esc(c.note)}”</p>` : ""}${RES() ? "" : `<div class="acts"><button class="btn-quiet" data-cc="${i}" style="padding:2px 0">Cancel this request</button></div>`}</div></article>`).join("")}</div>`
        : `<div class="empty"><h2>No coverage requests</h2><p>When a date needs someone, it shows up here.</p></div>`}`;
    $("#ch").querySelectorAll(".slotd").forEach(x => x.addEventListener("toggle", () => { if (x.open) state.openSlot = x.dataset.id; }));
    $("#ch").querySelectorAll(".slotf").forEach(f => {
      const n = +f.dataset.n, s = n >= 0 ? d.slots[n] : null, save = f.querySelector(".sbtns .btn");
      if (s) f.querySelectorAll("input, select").forEach(el => el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", () => save.disabled = false));
      const every = f.querySelector("[data-every]");
      if (every) every.onclick = () => { const all = [...f.querySelectorAll('[name="days"]')], on = !all.every(c => c.checked); all.forEach(c => c.checked = on); };
      f.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(f), body = Object.fromEntries(fd.entries());
        body.days = fd.getAll("days"); body.allDays = !!fd.get("allDays");
        if (!body.chore.trim()) { f.querySelector('[name="chore"]').focus(); return flash("Name the chore first.", true); }
        if (!s && !body.days.length) return flash("Pick at least one day.", true);
        const wasVol = s && s.volunteer;
        const label = save.innerHTML; save.disabled = true; save.innerHTML = `<span class="spinner"></span>`;
        try {
          state.chores = await call(Object.assign({ action: "adminChoreSave", id: s ? s.id : "" }, body));
          state.ppl = null; state.person = null;
          renderChores();
          flash(!body.volunteer && (!s || wasVol) ? "Saved. We emailed qualified volunteers that it's open." : "Saved.");
        } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); save.disabled = false; save.innerHTML = label; flash(err.message, true); }
      };
      const rm = f.querySelector("[data-rm]");
      if (rm) rm.onclick = () => {
        openDlg(`<h2>Remove this slot?</h2><p>${esc(s.chore)}, ${esc(s.day)}s. It comes off the chore chart${s.volunteer && s.volunteer !== "Volunteers" ? ` and ${esc(s.volunteer)} won't see it anymore` : ""}.</p>
          <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
        $("#go").onclick = async e => {
          const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
          try { state.chores = await call({ action: "adminChoreRemove", id: s.id }); dlg.close(); renderChores(); flash("Removed."); }
          catch (err) { b.disabled = false; b.textContent = "Remove"; flash(err.message, true); }
        };
      };
      const need = f.querySelector("[data-need]");
      if (need) need.onclick = () => {
        const taken = {}; d.coverage.forEach(c => { if (c.slotId === s.id) taken[c.date] = c.status; });
        const fmtD = ymd => H.fmt(H.zoned(...ymd.split("-").map(Number), 12), { weekday: "short", month: "short", day: "numeric" });
        openDlg(`<h2>Who can do ${esc(s.chore)}?</h2><p>${esc(s.day)}s, ${esc(s.when)}. Pick the dates that need someone. We'll email the volunteers who can do it, and they can grab it in their portal.</p>
          <div class="checks" id="needDates">${s.next.map(x => `<label${taken[x] ? ' style="opacity:.55"' : ""}><input type="checkbox" value="${x}"${taken[x] ? " disabled" : ""}>${esc(fmtD(x))}${taken[x] ? " (" + taken[x].toLowerCase() + ")" : ""}</label>`).join("")}</div>
          <label class="lbl" for="needNote">Note <span class="opt">(optional)</span></label><textarea id="needNote" maxlength="500" placeholder="Brit's away that weekend"></textarea>
          <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Ask for coverage</button></div>`);
        $("#go").onclick = async e => {
          const dates = [...dlgIn.querySelectorAll("#needDates input:checked")].map(i => i.value);
          if (!dates.length) return flash("Pick at least one date.", true);
          const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
          try { state.chores = await call({ action: "adminCoverNeed", slotId: s.id, dates, note: $("#needNote").value.trim() }); dlg.close(); renderChores(); flash("Done. We emailed the volunteers who can do it."); }
          catch (err) { if (err.signedOut || err.notAdmin) { dlg.close(); return handle(err); } b.disabled = false; b.textContent = "Ask for coverage"; flash(err.message, true); }
        };
      };
    });
    $("#ch").querySelectorAll("[data-cc]").forEach(b => b.onclick = async () => {
      const c = d.coverage[+b.dataset.cc];
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { state.chores = await call({ action: "adminCoverCancel", id: c.id }); renderChores(); flash(c.status === "Covered" ? `Cancelled. Let ${c.coveredBy} know they're off the hook.` : "Cancelled."); }
      catch (err) { b.disabled = false; b.textContent = "Cancel this request"; flash(err.message, true); }
    });
  }
  let demoCh = null;
  function demoChores(b) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const nextOf = day => { const want = days.indexOf(day), d = new Date(); let k = 0; while (((d.getDay() + 6 + k) % 7) !== want) k++; return [0, 7, 14, 21, 28, 35, 42, 49].map(n => H.dayKey(new Date(Date.now() + (k + n) * 86400000))); };
    const sortOf = w => /10am/.test(w) ? "09:00" : /2pm/.test(w) ? "14:00" : /5pm/.test(w) ? "17:00" : /morning/i.test(w) ? "08:00" : "12:00";
    if (!demoCh) {
      const std = [["AM animal chores", days, "by 10am", 1, "Animal chores"], ["PM animal chores", days, "~5pm", 1, "Animal chores"], ["Eggs & welfare check", days, "after 2pm", 0.5, "Animal chores"],
        ["AM milking", days, "Morning", 0.5, "Goat milking"], ["Chicken feed/water refill", ["Tuesday", "Thursday", "Saturday"], "Anytime", 0.5, "Animal chores"]];
      let id = 0;
      demoCh = { days, trainings: ["Animal feeding", "Collecting eggs", "Gardening", "Power tools & woodshop", "Goat milking", "Goat milk soap making", "Event help"],
        volunteers: [{ email: "ana@example.com", name: "Ana Diaz" }, { email: "bo@example.com", name: "Bo Li" }],
        slots: std.flatMap(([chore, ds, when, hours, training]) => ds.map(day => ({ id: "S-" + (++id), chore, day, when, hours, training, volunteer: chore === "PM animal chores" && day === "Tuesday" ? "ana@example.com" : "Volunteers", notes: "", next: nextOf(day), sort: sortOf(when) }))),
        coverage: [] };
      demoCh.coverage.push({ id: "C-1", slotId: "S-3", chore: "AM animal chores", date: nextOf("Wednesday")[0], time: "by 10am", by: "", pool: true, status: "Open", coveredBy: "", note: "Brit's away" });
    }
    const D = demoCh, sortAll = () => D.slots.sort((a, c) => days.indexOf(a.day) - days.indexOf(c.day) || a.sort.localeCompare(c.sort));
    if (b.action === "adminChoreSave") {
      const f = { chore: b.chore, when: b.when || "Anytime", hours: Number(b.hours) || 1, training: b.training, volunteer: b.volunteer, notes: b.notes, sort: sortOf(b.when || "") };
      if (b.id) { const s = D.slots.find(x => x.id === b.id), old = s.chore; Object.assign(s, f, { day: b.day, next: nextOf(b.day) });
        if (b.allDays) D.slots.forEach(x => { if (x !== s && x.chore === old) Object.assign(x, f, { volunteer: x.volunteer }); }); }
      else b.days.forEach(day => D.slots.push(Object.assign({ id: "S-" + Date.now() + day, day, next: nextOf(day) }, f)));
      sortAll();
    }
    if (b.action === "adminChoreRemove") D.slots = D.slots.filter(x => x.id !== b.id);
    if (b.action === "adminCoverNeed") { const s = D.slots.find(x => x.id === b.slotId); b.dates.forEach(dt => D.coverage.push({ id: "C-" + dt, slotId: s.id, chore: s.chore, date: dt, time: s.when, by: "", pool: true, status: "Open", coveredBy: "", note: b.note })); D.coverage.sort((x, y) => x.date.localeCompare(y.date)); }
    if (b.action === "adminCoverCancel") D.coverage = D.coverage.filter(c => c.id !== b.id);
    return Object.assign({ ok: true }, JSON.parse(JSON.stringify(D)));
  }

  /* ============================================================
     People: everyone in one list. Click a name for their profile:
     contact info, resident switch, permissions, volunteer stage,
     background check, trainings, chores, and what they've done.
     ============================================================ */
  const pstate = { q: "", filter: "", news: false };
  const BG = [["", "Not yet"], ["Sent", "Sent"], ["Cleared", "Cleared"], ["Failed", "Failed"]];
  const NOT_VOL = "N/A (not currently a volunteer)";
  const FILTERS = [["", "Everyone"], ["Resident", "Residents"], ["member", "Community members"], ["Volunteer", "Volunteers"], ["New", "New volunteers to follow up"], ["church", "Church family"], ["residency", "Applying to live here"], ["sabbathNew", "Sabbath 365 applicants to follow up"], ["sabbath", "Sabbath 365 approved"], ["partner", "Community partners"],
    ["admin", "Admins"], ["approver", "Event approvers"], ["trusted", "Post without review"], ["removed", "Removed people"]];
  const POWER = t => /power tool|woodshop|machin/i.test(t || "");
  const nameOf = p => ((p.preferred || p.first || "") + " " + (p.last || "")).trim() || p.email;
  const initials = p => ((p.preferred || p.first || p.email)[0] + (p.last ? p.last[0] : "")).toUpperCase();
  const hrs = h => (h === 1 ? "1 hour" : (Math.round(h * 4) / 4) + " hours");
  const dateLong = ymd => /^\d{4}-\d{2}-\d{2}/.test(ymd || "") ? H.fmt(H.zoned(...ymd.slice(0, 10).split("-").map(Number), 12), { month: "short", day: "numeric", year: "numeric" }) : "";

  function setNewCount(list) { const n = list.filter(p => p.role === "Volunteer" && p.status === "New").length; $("#volCount").hidden = !n; $("#volCount").textContent = n; }

  /* ============================================================
     Activity log: who did what, and when (admins only)
     ============================================================ */
  const LOGF = { q: "", who: "", kind: "" };
  const KINDS = [["", "Everything"], ["post", "Events posted or changed by people"], ["admin", "Approvals, edits, cancels, deletes"], ["people", "People and roles"], ["chores", "Chores and coverage"], ["rooms", "Guest rooms and venues"], ["church", "Church notes"]];
  const kindOf = e => { const a = (e.action + " " + e.calendar + " " + e.event).toLowerCase();
    if (/church note/.test(a)) return "church"; if (/posted an event|changed their event|changed a live event/.test(a)) return "post";
    if (/stay|room|venue|reserv/.test(a)) return "rooms"; if (/chore|cover|slot|shift/.test(a)) return "chores";
    if (/person|profile|role|volunteer|training|partner|admin list|approver|trusted|agreement|removed/.test(a)) return "people"; return "admin"; };
  async function activity(fresh) {
    app.innerHTML = `<div class="panel-h"><div><h2>Activity log</h2><p>Who did what, and when: events posted and changed, approvals, edits, cancels, deletes, people and roles, chores and church notes. Newest first. The full log, with backups for restoring deleted events, is the Admin log tab in the Sheet.</p></div>
      <button class="btn btn-outline btn-sm" id="logRefresh">Refresh</button></div><div id="logBox"><p class="loading">Loading the log…</p></div>`;
    $("#logRefresh").onclick = () => activity(true);
    try {
      if (fresh || !state.log) state.log = await call({ action: "adminLog", limit: 1500 });
      if (state.tab === "log") renderLog();
    } catch (err) { handle(err, $("#logBox")); }
  }
  function renderLog() {
    const L = state.log, box = $("#logBox"); if (!box) return;
    const people = [...new Set(L.entries.map(e => e.who).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const q = LOGF.q.trim().toLowerCase();
    const list = L.entries.filter(e => (!LOGF.who || e.who === LOGF.who) && (!LOGF.kind || kindOf(e) === LOGF.kind)
      && (!q || [e.who, e.email, e.event, e.action, e.details, e.calendar].join(" ").toLowerCase().includes(q)));
    const day = w => String(w).slice(0, 10);
    let last = "", rows = "";
    list.slice(0, 400).forEach(e => {
      if (day(e.when) !== last) { last = day(e.when); rows += `<li class="lday">${esc(/^\d{4}-\d{2}-\d{2}$/.test(last) ? dateLong(last) : last)}</li>`; }
      rows += `<li class="lrow"><span class="lt">${esc(String(e.when).slice(11, 16))}</span><div><b>${esc(e.who || "Someone")}</b> ${esc(e.action.charAt(0).toLowerCase() + e.action.slice(1))}${e.event ? ` <span class="lev">${esc(e.event)}</span>` : ""}
        ${e.calendar ? `<span class="status off">${esc(e.calendar)}</span>` : ""}${e.details ? `<span class="ld">${esc(e.details)}</span>` : ""}</div></li>`;
    });
    box.innerHTML = `<div class="lfind" role="search">
        <input type="search" id="logQ" placeholder="Search names, events, actions…" aria-label="Search the log" value="${esc(LOGF.q)}">
        <select id="logWho" aria-label="Person"><option value="">Everyone</option>${people.map(p => `<option${p === LOGF.who ? " selected" : ""}>${esc(p)}</option>`).join("")}</select>
        <select id="logKind" aria-label="Kind">${KINDS.map(([v, l]) => `<option value="${v}"${v === LOGF.kind ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
      </div>
      <p class="hint" style="margin:0 0 10px">${list.length ? `Showing ${Math.min(list.length, 400)} of ${list.length} matching` : "Nothing matches"}${L.total > L.entries.length ? ` · the newest ${L.entries.length} of ${L.total} entries are loaded` : ""}.</p>
      ${list.length ? `<ul class="llist">${rows}</ul>` : `<div class="empty"><p>Nothing in the log matches that.</p></div>`}`;
    $("#logQ").oninput = e => { LOGF.q = e.target.value; const pos = e.target.selectionStart; renderLog(); const i = $("#logQ"); i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { /* fine */ } };
    $("#logWho").onchange = e => { LOGF.who = e.target.value; renderLog(); };
    $("#logKind").onchange = e => { LOGF.kind = e.target.value; renderLog(); };
  }

  async function people(fresh) {
    const who = qs.get("p");
    if (who) return person(who);
    app.innerHTML = `<div class="panel-h"><div><h2>People</h2>
      <p>Everyone is a resident or a community member. Click a name to see their profile, switch on what they do (volunteer, church family, partner, posting without review, admin), or put them on the chore chart. It all lives on the People tab in the Sheet too.</p></div></div>
      <div id="ppl"><p class="loading">Loading people…</p></div>`;
    try {
      if (fresh || !state.ppl) state.ppl = await call({ action: "adminPersons" });
      if (state.tab === "people" && !qs.get("p")) renderPeople();
    } catch (err) { handle(err, $("#ppl")); }
  }
  function goPerson(email) {
    if (email) qs.set("p", email); else qs.delete("p");
    history.pushState(null, "", "admin.html?tab=people" + (email ? "&p=" + encodeURIComponent(email) : ""));
    window.scrollTo(0, 0);
    people();
  }
  window.addEventListener("popstate", () => {
    const u = new URLSearchParams(location.search);
    if (u.get("tab") !== "people") return;
    if (u.get("p")) qs.set("p", u.get("p")); else qs.delete("p");
    people();
  });

  function renderPeople() {
    const all = state.ppl.people;
    setNewCount(all.filter(p => !p.removed));
    $("#ppl").innerHTML = `<div class="toolbar">
        <input type="search" id="pq" placeholder="Search names, emails, phone numbers" value="${esc(pstate.q)}" aria-label="Search people">
        <select id="pf" aria-label="Show">${FILTERS.map(([v, l]) => `<option value="${v}"${v === pstate.filter ? " selected" : ""}>${l}</option>`).join("")}</select>
        <label class="tog"><input type="checkbox" id="pn"${pstate.news ? " checked" : ""}> Wants news &amp; updates</label>
      </div>
      <div class="toolbar" style="justify-content:space-between"><p class="hint" id="pcount" style="margin:0"></p>
        <div class="acts"><button class="btn btn-forest btn-sm" id="padd">Add a person</button><button class="btn btn-outline btn-sm" id="ptrn">Edit trainings list</button><button class="btn btn-outline btn-sm" id="pcopy">Copy emails</button><button class="btn btn-outline btn-sm" id="pcsv">Download spreadsheet</button></div></div>
      <div class="plist2" id="plist"></div>`;
    const match = p => {
      const f = pstate.filter;
      if (f === "removed") { if (!p.removed) return false; }
      else if (p.removed) return false;
      if (f === "Resident" || f === "Volunteer") { if (p.role !== f) return false; }
      else if (f === "New") { if (!(p.role === "Volunteer" && p.status === "New")) return false; }
      else if (f === "member") { if (p.role === "Resident") return false; }
      else if (f === "sabbath") { if (p.sabbath !== "Approved") return false; }
      else if (f === "residency") { if (!p.residency || p.role === "Resident" || /^Not /.test(p.residency)) return false; }
      else if (f === "sabbathNew") { if (!p.sabbath || /^(Approved|Not )/.test(p.sabbath)) return false; }
      else if (f && f !== "removed" && !p[f]) return false;
      if (pstate.news && !p.news) return false;
      return !pstate.q || [p.first, p.last, p.email, p.phone].concat(p.others || []).join(" ").toLowerCase().includes(pstate.q.toLowerCase());
    };
    const filtered = () => all.filter(match);
    const draw = () => {
      const list = filtered();
      const total = all.filter(p => pstate.filter === "removed" ? p.removed : !p.removed).length;
      $("#pcount").textContent = pstate.filter === "removed" ? `${list.length} removed ${list.length === 1 ? "person" : "people"} (their info is still on the People tab in the Sheet)` : `${list.length} of ${total} ${total === 1 ? "person" : "people"}`;
      $("#plist").innerHTML = list.length ? list.map(p => `<button type="button" class="prow" data-e="${esc(p.email)}">
          <span class="av${p.role === "Resident" ? " res" : ""}" aria-hidden="true">${esc(initials(p))}</span>
          <span class="pmain"><b>${esc(nameOf(p))}</b><span class="sub">${esc(p.email)}${(p.others || []).length ? " + " + p.others.length + " more" : ""}${p.phone ? " · " + esc(p.phone) : ""}</span>
            <span class="chips2">${roleChip(p)}${p.admin ? `<span class="status">Admin</span>` : ""}${p.approver ? `<span class="status">Approves events</span>` : ""}${p.trusted && !p.admin && !p.approver && p.role !== "Resident" ? `<span class="status">Posts without review</span>` : ""}${p.slots ? `<span class="status src">${p.slots} chore slot${p.slots > 1 ? "s" : ""}</span>` : ""}${p.events ? `<span class="status src">${p.events} event${p.events > 1 ? "s" : ""} posted</span>` : ""}</span></span>
          <span class="pstat">${p.hours ? `<b>${esc(hrs(p.hours))}</b>` : ""}${p.lastText ? `<span>Last helped ${esc(p.lastText)}</span>` : ""}</span>
        </button>`).join("")
        : `<div class="empty"><h2>${all.length ? "No one matches" : "No one yet"}</h2><p>${all.length ? "Try clearing a filter." : "Sign-ups from the volunteer form show up here, and so does anyone who posts an event."}</p></div>`;
      $("#plist").querySelectorAll(".prow").forEach(b => b.onclick = () => goPerson(b.dataset.e));
    };
    $("#pq").addEventListener("input", e => { pstate.q = e.target.value; draw(); });
    $("#pf").onchange = e => { pstate.filter = e.target.value; draw(); };
    $("#pn").onchange = e => { pstate.news = e.target.checked; draw(); };
    $("#padd").onclick = addPerson;
    $("#ptrn").onclick = editTrainings;
    $("#pcopy").onclick = async () => {
      const emails = [...new Set(filtered().map(p => p.email))].join(", ");
      try { await navigator.clipboard.writeText(emails); flash(`Copied ${filtered().length} email${filtered().length === 1 ? "" : "s"}. Paste them into the To or Bcc line.`); }
      catch (e) { openDlg(`<h2>Emails</h2><p>Copy these:</p><textarea readonly style="min-height:140px">${esc(emails)}</textarea><div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Done</button></div>`); }
    };
    $("#pcsv").onclick = () => {
      const cols = [["First name", "first"], ["Last name", "last"], ["Preferred name", "preferred"], ["Email", "email"], ["Phone", "phone"], ["Resident or community member", p => p.role === "Resident" ? "Resident" : "Community member"],
        ["Volunteer stage", p => p.role === "Resident" ? "Resident" : p.status], ["Background check", "bg"],
        ["Trainings", p => p.trainings.join(", ")], ["Church family", p => !!p.church], ["Sabbath 365", "sabbath"], ["Residency", "residency"], ["Partner of", "partner"], ["News & updates", "news"], ["Admin", "admin"], ["Approves events", "approver"], ["Posts without review", "trusted"],
        ["Chore slots", "slots"], ["Hours helped", "hours"], ["Last helped", "lastHelped"], ["Events posted", "events"]];
      const cell = x => `"${String(x === true ? "Yes" : x === false ? "No" : x == null ? "" : x).replace(/"/g, '""')}"`;
      const csv = [cols.map(c => cell(c[0])).join(",")].concat(filtered().map(p => cols.map(c => cell(typeof c[1] === "function" ? c[1](p) : p[c[1]])).join(","))).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
      a.download = "heirloom-people-" + H.dayKey(new Date()) + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
    };
    draw();
  }
  function roleChip(p) {
    const out = [p.role === "Resident" ? `<span class="status news">Resident</span>` : `<span class="status off">Community member</span>`];
    if (p.role === "Volunteer") out.push(`<span class="status${p.status === "New" ? " new" : ""}">${p.status === "Active volunteer" ? "Volunteer" : "Volunteer · " + esc(p.status)}</span>`);
    if (p.partner) out.push(`<span class="status src">Partner · ${esc(p.partner)}</span>`);
    if (p.church && p.role !== "Resident") out.push(`<span class="status">Church family</span>`);
    if (p.residency && p.role !== "Resident" && !/^Not /.test(p.residency)) out.push(`<span class="status new">Residency · ${esc(p.residency)}</span>`);
    if (p.sabbath === "Approved") out.push(`<span class="status sab">🌿 Sabbath 365</span>`);
    else if (p.sabbath && !/^Not /.test(p.sabbath)) out.push(`<span class="status new">Sabbath 365 · ${esc(p.sabbath)}</span>`);
    return out.join("");
  }

  document.addEventListener("click", e => { if (e.target && e.target.id === "chTrn") editTrainings(); });
  function editTrainings() {
    const cur = (state.tab === "chores" && state.chores && state.chores.trainings) || (state.ppl && state.ppl.trainings) || (state.person && state.person.trainings) || (state.chores && state.chores.trainings) || [];
    openDlg(`<h2>Trainings</h2><p>The trainings you can check off for each volunteer, and require for opportunities and chore slots. One per line. Anything with "power tools", "woodshop" or "machine" in its name also asks the person to accept the safety agreement.</p>
      <textarea id="trnList" style="min-height:160px">${esc(cur.join("\n"))}</textarea>
      <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Save</button></div>`);
    $("#go").onclick = async e => {
      const b = e.currentTarget, list = $("#trnList").value.split("\n").map(x => x.trim()).filter(Boolean);
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { const r = await call({ action: "adminTrainingsSave", list }); if (state.ppl) state.ppl.trainings = r.trainings; state.chores = null; dlg.close(); flash("Trainings updated."); if (state.tab === "chores") chores(true); else if (qs.get("p")) { state.person = null; person(qs.get("p")); } }
      catch (err) { b.disabled = false; b.textContent = "Save"; flash(err.message, true); }
    };
  }

  function addPerson() {
    openDlg(`<h2>Add a person</h2><p>Add anyone by email and set what they can do. They can log in right away with this email (we send a 6-digit code), and they'll be asked to fill in their profile the first time.</p>
      <form id="addP" class="f2" novalidate>
        <div class="two"><label class="lbl">First name<input type="text" name="first" maxlength="60" autocomplete="off"></label>
        <label class="lbl">Last name<input type="text" name="last" maxlength="60" autocomplete="off"></label></div>
        <label class="lbl">Email<input type="email" name="email" maxlength="120" autocomplete="off"></label>
        <label class="lbl">Phone <span class="opt">(optional)</span><input type="tel" name="phone" maxlength="40" autocomplete="off"></label>
        <span class="lbl">They are…</span>
        <div class="checks" role="radiogroup"><label><input type="radio" name="role" value="Resident"> A resident</label><label><input type="radio" name="role" value="" checked> A community member</label></div>
        <label class="chk" id="addVolRow"><input type="checkbox" name="vol"> Already an approved volunteer</label>
        <p class="hint" style="margin:0">Residents are volunteers and church family automatically. You can set everything else (background check, trainings, church family, partner, permissions, chores) on their profile next.</p>
      </form>
      <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Add and open profile</button></div>`);
    const f = $("#addP");
    f.querySelectorAll('input[name="role"]').forEach(r => r.onchange = () => { $("#addVolRow").hidden = fd0().get("role") === "Resident"; });
    function fd0() { return new FormData(f); }
    $("#go").onclick = async e => {
      const b = e.currentTarget, fd = new FormData(f);
      const body = { action: "adminPersonSave", create: true, first: fd.get("first"), last: fd.get("last"), email: String(fd.get("email") || "").trim().toLowerCase(), phone: fd.get("phone"),
        role: fd.get("role") === "Resident" ? "Resident" : fd.get("vol") ? "Volunteer" : "", status: "Active volunteer" };
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { state.person = await call(body); state.ppl = null; dlg.close(); flash(`Added ${body.first}. They can log in with ${body.email}.`); goPerson(body.email); }
      catch (err) {
        if (err.signedOut || err.notAdmin) { dlg.close(); return handle(err); }
        b.disabled = false; b.textContent = "Add and open profile";
        if (!dlgIn.querySelector(".msg.err")) dlgIn.insertAdjacentHTML("beforeend", `<p class="msg err"></p>`);
        dlgIn.querySelector(".msg.err").textContent = err.message + ".";
      }
    };
  }

  /* ---------- One person's profile ---------- */
  async function person(email) {
    app.innerHTML = `<p><button type="button" class="btn-back" id="back">← All people</button></p><div id="prof"><p class="loading">Loading…</p></div>`;
    $("#back").onclick = () => goPerson("");
    try {
      if (!state.person || state.person.person.email !== email.toLowerCase()) state.person = await call({ action: "adminPerson", email });
      if (state.tab === "people" && qs.get("p")) renderPerson();
    } catch (err) { handle(err, $("#prof")); }
  }
  function renderPerson() {
    const R = state.person, p = R.person, me = String(R.me || session.email || "").toLowerCase();
    const res = p.role === "Resident", stage = p.role === "Volunteer" ? p.status : NOT_VOL;
    const stages = [NOT_VOL].concat(R.statuses);
    const field = (k, label, val, type, opt, ph) => `<label class="lbl">${label}${opt ? ` <span class="opt">(optional)</span>` : ""}<input type="${type || "text"}" data-k="${k}" value="${esc(val || "")}" maxlength="${k === "address" ? 300 : 200}"${ph ? ` placeholder="${esc(ph)}"` : ""} autocomplete="off"></label>`;
    const mine = R.slots.filter(s => s.volunteer === p.email);
    const free = R.slots.filter(s => s.volunteer !== p.email);
    const since = p.firstText ? `Helping since ${esc(p.firstText)}` : "";
    $("#prof").innerHTML = `
      ${p.removed ? `<div class="removed-bar"><p><b>Removed from People on ${esc(dateLong(p.removed))}.</b> Their info and hours are kept. They don't count as a volunteer and aren't on any chores or permission lists.</p><button type="button" class="btn btn-forest btn-sm" id="restore">Restore</button></div>` : ""}
      <section class="phead">
        <span class="av big${res ? " res" : ""}" aria-hidden="true">${esc(initials(p))}</span>
        <div><h2>${esc(nameOf(p))}</h2>
          <p class="sub"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a>${p.phone ? ` · <a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}">${esc(p.phone)}</a>` : ""}${p.submitted ? ` · since ${esc(dateLong(p.submitted))}` : ""}</p>
          <div class="chips2" style="margin:6px 0 0">${roleChip(p)}${p.admin ? `<span class="status">Admin</span>` : ""}${p.approver ? `<span class="status">Approves events</span>` : ""}${p.trusted && p.role !== "Resident" ? `<span class="status">Posts without review</span>` : ""}</div></div>
        <div class="impact">${p.hours || p.shifts ? `<b>${esc(hrs(p.hours))}</b><span>${p.shifts} shift${p.shifts === 1 ? "" : "s"}${p.lastText ? " · last helped " + esc(p.lastText) : ""}</span>${since ? `<span>${since}</span>` : ""}` : `<span>No volunteer hours yet</span>`}</div>
      </section>

      <form class="pgrid" id="pform" novalidate>
        <section class="pcard">
          <h3>Contact</h3>
          <div class="two">${field("first", "First name", p.first)}${field("last", "Last name", p.last)}</div>
          <div class="two">${field("preferred", "Preferred name", p.preferred, "text", true)}${field("pronouns", "Pronouns", p.pronouns, "text", true)}</div>
          <label class="lbl">Email<input type="email" value="${esc(p.email)}" disabled></label>
          <label class="lbl">Other emails they log in with <span class="opt">(optional)</span><input type="text" data-k="others" value="${esc((p.others || []).join(", "))}" placeholder="their personal email, for example" autocomplete="off"></label>
          ${field("phone", "Phone", p.phone, "tel", true)}
          ${field("address", "Street address", p.address, "text", true)}
          <div class="two">${field("city", "City", p.city)}<div class="two">${field("state", "State", p.state)}${field("zip", "Zip", p.zip)}</div></div>
          <div class="two">${field("emergency", "Emergency contact", p.emergency, "text", true, "Name and relationship")}${field("emergencyPhone", "Their phone", p.emergencyPhone, "tel")}</div>
          <label class="chk"><input type="checkbox" data-k="news"${p.news ? " checked" : ""}> Wants news &amp; updates</label>
          <p class="hint privacy">🔒 Phone, address and emergency contact are only shown to admins and to ${esc(p.preferred || p.first || "them")} on their own profile.</p>
        </section>

        <section class="pcard">
          <h3>Resident or community member</h3>
          <label class="switch"><input type="checkbox" data-k="resident"${res ? " checked" : ""}><span class="track" aria-hidden="true"></span><span><b>Resident</b><br><span class="hint">Off = community member. Switch it any time, for example when someone moves out; their hours and history stay.</span></span></label>
          <p class="hint res-note" ${res ? "" : "hidden"}>Residents see the residents' calendar and guest rooms, post events without review, are part of the church family, and count as approved volunteers trained for everything except power tools &amp; the woodshop.</p>
          <div class="rbox" ${res ? "" : "hidden"}>
            <span class="lbl">Power tools &amp; woodshop</span>
            <div class="trn">${R.trainings.filter(POWER).map(t => `<label><input type="checkbox" data-k="trnR" value="${esc(t)}"${p.trainings.includes(t) ? " checked" : ""}>${esc(t)}</label>`).join("") || `<span class="hint">No power tools training on the list.</span>`}</div>
          </div>
          <h3 style="margin-top:6px">Add-ons</h3>
          <label class="chk"><input type="checkbox" data-k="trusted"${p.trusted || res ? " checked" : ""}${res ? " disabled" : ""}> Post events without review</label>
          <label class="chk"><input type="checkbox" data-k="isvol"${res || stage !== NOT_VOL ? " checked" : ""}${res ? " disabled" : ""}> Volunteer</label>
          <div class="vbox subbox" ${res || stage === NOT_VOL ? "hidden" : ""}>
            ${(R.asked || []).length ? `<p class="hint" style="margin:0">🙋 Asked to learn: <b>${esc(R.asked.join(", "))}</b>. Tick it below once they're trained.</p>` : ""}
            <label class="lbl">Stage<select data-k="stage">${stages.concat(stages.includes(stage) ? [] : [stage]).map(s => `<option${s === stage ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
            <p class="hint na-note" style="margin:-4px 0 0" ${stage === "Not approved" ? "" : "hidden"}>Not approved: they can't take chores or volunteers-only shifts. They can still come to drop-in events that are open to everyone. The app doesn't tell them why.</p>
            <div class="vfields" ${stage === NOT_VOL ? "hidden" : ""}>
              <label class="lbl">Background check <span class="opt">(one time)</span><select data-k="bg">${BG.map(([v, l]) => `<option value="${v}"${v === (p.bg || "") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
              <label class="lbl bgnote" ${p.bg === "Failed" || p.bgNote ? "" : "hidden"}>Note about the background check <span class="opt">(only admins see this)</span><textarea data-k="bgNote" maxlength="500" style="min-height:64px">${esc(p.bgNote || "")}</textarea></label>
              <span class="lbl">Trainings</span>
              <div class="trn">${R.trainings.map(t => `<label><input type="checkbox" data-k="trn" value="${esc(t)}"${p.trainings.includes(t) ? " checked" : ""}>${esc(t)}</label>`).join("") || `<span class="hint">No trainings set up yet.</span>`}</div>
              <p class="hint" style="margin:0">${p.powerAccepted ? "✓ Accepted the power tools safety agreement: " + esc(p.powerAccepted) : "Power tools &amp; woodshop: the next time they sign in, they're asked to read and accept the safety agreement. It counts once they do."}</p>
            </div>
          </div>
          <label class="chk"><input type="checkbox" data-k="church"${p.church || res ? " checked" : ""}${res ? " disabled" : ""}> Church family <span class="hint">(sees Supper Church sign-ups and Pastor Brit's notes; people can also turn this on themselves)</span></label>
          <label class="chk"><input type="checkbox" data-k="issab"${p.sabbath ? " checked" : ""}> 🌿 Sabbath 365 <span class="hint">(free retreat nights in the guest rooms; applying turns this on)</span></label>
          <div class="sbox subbox" ${p.sabbath ? "" : "hidden"}>
            <label class="lbl">Step<select data-k="sabStage">${(R.sabStages || []).map(x => `<option${x === (p.sabbath || "Applied") ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
            <div class="two"><label class="lbl">Interview date <span class="opt">(optional)</span><input type="date" data-k="sabDate" value="${esc((/\d{4}-\d{2}-\d{2}/.exec(p.sabInterview || "") || [""])[0])}"></label>
              <label class="chk" style="align-self:end;min-height:44px"><input type="checkbox" data-k="sabDone"${/^done/i.test(p.sabInterview || "") ? " checked" : ""}> Interview done</label></div>
            <div class="sbg">${res ? `<p class="hint" style="margin:0">Background check: not needed for residents.</p>` : `<label class="lbl">Background check <span class="opt">(one time, shared with volunteering)</span><select data-k="sbg">${BG.map(([v, l]) => `<option value="${v}"${v === (p.bg || "") ? " selected" : ""}>${l}</option>`).join("")}</select></label>`}</div>
            <label class="lbl">Notes <span class="opt">(only admins see these)</span><textarea data-k="sabNote" maxlength="2000" style="min-height:64px">${esc(p.sabNote || "")}</textarea></label>
            <p class="hint" style="margin:0">Approving needs the interview done and a cleared background check. When you approve, they get an email with a link to request dates.</p>
            ${(p.sabStays || []).length ? `<p class="hint" style="margin:0">Stays: ${p.sabStays.map(x => esc(x.checkin + " → " + x.checkout) + " (" + esc(x.status === "Requested" ? "waiting" : x.status.toLowerCase()) + ")").join(" · ")}</p>` : ""}
          </div>
          <label class="chk"><input type="checkbox" data-k="isres"${p.residency || p.space ? " checked" : ""}> 🏡 Residency <span class="hint">(applying to live here, or where a resident lives; the interest form turns this on)</span></label>
          <div class="rsbox subbox" ${p.residency || p.space ? "" : "hidden"}>
            <label class="lbl">Step<select data-k="resStage"><option value="">—</option>${(R.resStages || []).map(x => `<option${x === p.residency ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
            <p class="hint rs-share" style="margin:-4px 0 0">${/Interview with residents|feedback week|Approved/.test(p.residency || "") ? "👀 Shared with residents (without employment, rent and medical answers)." : "Only Brit and the admins can see the application at this step."}</p>
            <label class="lbl rs-fb" ${p.residency === "Resident feedback week" ? "" : "hidden"}>Feedback until<input type="date" data-k="feedbackUntil" value="${esc(p.feedbackUntil || "")}"></label>
            <span class="lbl">Checklist</span>
            <div class="trn">${(R.resChecklist || []).map(t => `<label><input type="checkbox" data-k="rck" value="${esc(t)}"${(p.resChecklist || []).includes(t) || (t === "Background check" && p.bg === "Cleared") ? " checked" : ""}>${esc(t)}</label>`).join("")}</div>
            <div class="two"><label class="lbl">Move-in date<input type="date" data-k="moveIn" value="${esc(p.moveIn || "")}"></label>
              <label class="lbl">Living space<input data-k="space" list="spaces" maxlength="80" value="${esc(p.space || "")}" placeholder="Main house room 2"><datalist id="spaces">${(R.spaces || []).map(x => `<option value="${esc(x)}">`).join("")}</datalist></label></div>
            <label class="chk rs-block" ${/guest room/i.test(p.space || "") ? "" : "hidden"}><input type="checkbox" data-k="occupies"${p.occupies ? " checked" : ""}> <span><b>Occupied</b>: they live in this guest room, so it's off the guest booking list until this is unticked</span></label>
            <label class="lbl">Notes <span class="opt">(only admins see these)</span><textarea data-k="resNote" maxlength="3000" style="min-height:64px">${esc(p.resNote || "")}</textarea></label>
            <p class="hint" style="margin:0">When Brit says yes: set the move-in date and living space, then switch on <b>Resident</b> above.</p>
          </div>
          <label class="chk"><input type="checkbox" data-k="ispartner"${p.partner ? " checked" : ""}> Community partner <span class="hint">(posts events without review, can reserve any venue)</span></label>
          <div class="pbox subbox" ${p.partner ? "" : "hidden"}>
            <label class="lbl">Which partner?<select data-k="partner"><option value="">Choose…</option>${(R.partners || []).concat(p.partner && !(R.partners || []).includes(p.partner) ? [p.partner] : []).map(n => `<option${n === p.partner ? " selected" : ""}>${esc(n)}</option>`).join("")}<option value="__new">＋ Add a new partner…</option></select></label>
          </div>
          <label class="chk"><input type="checkbox" data-k="approver"${p.approver ? " checked" : ""}> Approve other people's events <span class="hint">(gets the approval emails)</span></label>
          <label class="chk"><input type="checkbox" data-k="admin"${p.admin ? " checked" : ""}> Admin <span class="hint">(can see and do everything, including People)${p.email === me ? " (that's you)" : ""}</span></label>
        </section>

        <section class="pcard wide">
          <h3>Admin notes</h3>
          <textarea data-k="notes" maxlength="3000" placeholder="Called Tuesday, coming Saturday…">${esc(p.notes)}</textarea>
          <p class="hint" style="margin:0">Only admins see these.</p>
        </section>
        <div class="savebar wide"><button class="btn btn-primary" id="psave" disabled>Save changes</button><p id="pmsg">Changes take effect as soon as you save.</p></div>
      </form>

      <section class="pcard">
        <h3>Chore chart</h3>
        <p class="hint" style="margin:0">Their regular weekly chores. These show up for ${esc(p.first || "them")} when they log in, with an "I need coverage" button for each date.</p>
        ${mine.length ? `<ul class="clist">${mine.map(s => `<li><span><b>${esc(s.day)}s · ${esc(s.chore)}</b><span class="hint">${esc(s.time)}${s.since ? " · since " + esc(dateLong(s.since)) : ""}${s.reminders ? " · reminders on" : ""}</span></span>
            <button type="button" class="btn-quiet" data-off="${esc(s.id)}">Take off</button></li>`).join("")}</ul>` : `<p class="hint" style="margin:0"><i>Not on any chores yet.</i></p>`}
        ${res || stage !== NOT_VOL ? `<div class="addslot"><select id="slotPick" aria-label="Chore slot"><option value="">Add to a chore slot…</option>${free.map(s => `<option value="${esc(s.id)}">${esc(s.day)} · ${esc(s.chore)} · ${esc(s.time)}${s.who ? " (now " + esc(s.who) + ")" : " (open)"}</option>`).join("")}</select><button type="button" class="btn btn-forest btn-sm" id="slotAdd" disabled>Add</button></div>`
          : `<p class="hint" style="margin:0">Set them as a resident or a volunteer to add chores.</p>`}
      </section>

      <section class="pcard">
        <h3>Activity</h3>
        ${actList("Volunteer sign-ups", R.signups.map(s => `${esc(s.title)} · ${esc(s.when)}${s.status === "Waitlist" ? " (waitlist)" : ""}`), R.signups.map(s => s.past))}
        ${actList("Coverage", R.coverage.map(c => `${esc(c.chore)} · ${esc(c.when)} · ${c.asked ? (c.status === "Covered" ? "covered by " + esc(c.other) : "asked for coverage") : "covered for " + esc(c.other)}`), R.coverage.map(c => c.past))}
        ${actList("Events posted", R.posted.map(e => `${esc(e.title)} · ${esc(e.when)} · ${esc(e.status)}`), R.posted.map(() => false))}
        ${!R.signups.length && !R.coverage.length && !R.posted.length ? `<p class="hint" style="margin:0"><i>Nothing yet.</i></p>` : ""}
      </section>

      ${p.sabApp ? `<section class="pcard wide"><h3>🌿 Sabbath 365 application <span class="hint" style="font-weight:400">· ${esc(String(p.sabApp.submitted).slice(0, 10))}${p.sabApp.count > 1 ? " (applied " + p.sabApp.count + " times)" : ""}</span></h3>
          ${[["Why they'd like to stay", p.sabApp.why], ["How they heard", p.sabApp.heard], ["Nights", p.sabApp.nights], ["Staying with them", p.sabApp.who], ["Preferred dates", p.sabApp.dates], ["Pastor or minister", p.sabApp.pastor],
            ["Nonprofit or community leader", p.sabApp.leader], ["Marginalized groups", p.sabApp.marginalized], ["Anything else", p.sabApp.more], ["Phone", p.sabApp.phone]].filter(x => x[1]).map(([k, v]) => `<p><span class="lbl">${esc(k)}</span><span class="cm">${esc(v)}</span></p>`).join("")}
          <p class="hint privacy" style="margin:0">🔒 Only admins see these answers.</p></section>` : ""}
${(p.feedback || []).length ? `<section class="pcard wide"><h3>Resident feedback <span class="hint" style="font-weight:400">· ${p.feedback.length} · only admins see this</span></h3>
          ${p.feedback.map(x => `<p><span class="lbl">${esc(x.from)} · ${esc(String(x.when).slice(0, 10))}${x.leaning ? ` · <b>${esc(x.leaning)}</b>` : ""}</span><span class="cm">${esc(x.comment || "")}</span></p>`).join("")}</section>` : ""}
        ${p.resApp ? `<section class="pcard wide"><h3>🏡 Resident interest form <span class="hint" style="font-weight:400">· ${esc(String(p.resApp["Submitted"] || "").slice(0, 10))}${p.resApp.count > 1 ? " (sent " + p.resApp.count + " times)" : ""}</span></h3>
          ${Object.keys(p.resApp).filter(k => !/^(ID|Submitted|Email|count|Certified|Background check consent|Signed on)$/.test(k) && p.resApp[k]).map(k => `<p><span class="lbl">${esc(k)}</span><span class="cm">${esc(p.resApp[k])}</span></p>`).join("")}
          <p class="hint privacy" style="margin:0">Signed ${esc(p.resApp["Signed on"] || "")} · certified true · agreed to the background check and child safety courses.</p></section>` : ""}
        ${p.birthday || p.dietary || p.allergies || p.picked || p.about ? `<section class="pcard">
        <h3>From their profile</h3>
        ${p.birthday ? `<p><span class="lbl">Birthday</span>${esc(dateLong(p.birthday))}</p>` : ""}
        ${p.dietary ? `<p><span class="lbl">Dietary restrictions</span>${esc(p.dietary)}</p>` : ""}
        ${p.allergies ? `<p><span class="lbl">Allergies</span>${esc(p.allergies)}</p>` : ""}
        ${p.picked ? `<p><span class="lbl">Interested in</span>${esc(p.picked)}</p>` : ""}
        ${p.about ? `<p><span class="lbl">Anything else</span><span class="cm">${esc(p.about)}</span></p>` : ""}
        <p class="hint privacy" style="margin:0">🔒 Only admins and ${esc(p.preferred || p.first || "they")} can see these. ${p.profileDone ? "" : "They haven't finished the welcome questions yet."}</p>
      </section>` : ""}
      ${p.interests || p.heard || p.comments ? `<section class="pcard">
        <h3>Volunteer form</h3>
        ${p.interests ? `<p><span class="lbl">Interested in</span>${esc(p.interests)}</p>` : ""}
        ${p.heard ? `<p><span class="lbl">Heard about us</span>${esc(p.heard)}</p>` : ""}
        ${p.comments ? `<p><span class="lbl">Comments</span><span class="cm">${esc(p.comments)}</span></p>` : ""}
      </section>` : ""}
      ${!p.removed && p.email !== me ? `<section class="pcard danger"><h3>Remove from People</h3>
        <p class="hint" style="margin:0">Moved away or not involved anymore? This takes ${esc(p.first || "them")} off the list, the chore chart and any permissions. Their info and volunteer hours stay saved on the People tab in the Sheet, and you can restore them any time from "Removed people".</p>
        <p><button type="button" class="btn btn-outline btn-sm" id="remove">Remove ${esc(p.first || "this person")}…</button></p></section>` : ""}`;

    const f = $("#pform"), save = $("#psave"), msg = $("#pmsg");
    const q = k => f.querySelector(`[data-k="${k}"]`);
    const dirty = () => { save.disabled = false; msg.textContent = "You have unsaved changes."; };
    f.querySelectorAll("[data-k]").forEach(el => el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", dirty));
    q("resident").addEventListener("change", () => {
      const on = q("resident").checked;
      f.querySelector(".res-note").hidden = !on; f.querySelector(".vbox").hidden = on; f.querySelector(".rbox").hidden = !on;
      q("church").disabled = on; q("trusted").disabled = on; q("isvol").disabled = on; q("isvol").checked = true;
      if (on) { q("church").checked = true; q("trusted").checked = true; flash("Residents post without review and are church family and volunteers automatically. Approving events stays separate."); }
      else {
        // Moving out: they stay a volunteer and church family unless you turn those off
        q("church").checked = true; q("trusted").checked = !!p.trusted && !res ? true : false;
        if (q("stage").value === NOT_VOL) q("stage").value = "Active volunteer";
        if (!q("bg").value) q("bg").value = "Cleared";
        f.querySelector(".vfields").hidden = false;
        flash("Now a community member. They stay a volunteer and part of the church family unless you turn those off. Tick the trainings that carry over, then save.");
      }
    });
    q("stage").addEventListener("change", () => {
      const na = q("stage").value === NOT_VOL;
      f.querySelector(".vfields").hidden = na; f.querySelector(".na-note").hidden = q("stage").value !== "Not approved";
      if (na) { q("isvol").checked = false; f.querySelector(".vbox").hidden = true; }
    });
    q("isvol").addEventListener("change", () => {
      const on = q("isvol").checked;
      if (on && q("stage").value === NOT_VOL) q("stage").value = "New";
      if (!on) q("stage").value = NOT_VOL;
      f.querySelector(".vbox").hidden = !on; f.querySelector(".vfields").hidden = !on; f.querySelector(".na-note").hidden = true;
    });
    q("bg").addEventListener("change", () => { f.querySelector(".bgnote").hidden = q("bg").value !== "Failed" && !q("bgNote").value; });
    q("issab").addEventListener("change", () => { f.querySelector(".sbox").hidden = !q("issab").checked; });
    q("isres").addEventListener("change", () => { f.querySelector(".rsbox").hidden = !q("isres").checked; });
    q("resStage").addEventListener("change", () => { const v = q("resStage").value; f.querySelector(".rs-fb").hidden = v !== "Resident feedback week";
      f.querySelector(".rs-share").textContent = /Interview with residents|feedback week|Approved/.test(v) ? "👀 Shared with residents (without employment, rent and medical answers)." : "Only Brit and the admins can see the application at this step.";
      if (v === "Resident feedback week" && !q("feedbackUntil").value) { const d = new Date(Date.now() + 7 * 86400000); q("feedbackUntil").value = d.toISOString().slice(0, 10); flash("Saving opens a one-week feedback window and emails the residents."); } });
    q("space").addEventListener("input", () => { f.querySelector(".rs-block").hidden = !/guest room/i.test(q("space").value); });
    if (q("sbg") && q("bg")) { q("sbg").addEventListener("change", () => { q("bg").value = q("sbg").value; q("bg").dispatchEvent(new Event("change")); }); q("bg").addEventListener("change", () => { q("sbg").value = q("bg").value; }); }
    q("ispartner").addEventListener("change", () => { f.querySelector(".pbox").hidden = !q("ispartner").checked; if (!q("ispartner").checked) q("partner").value = ""; });
    q("partner").addEventListener("change", () => {
      if (q("partner").value !== "__new") return;
      q("partner").value = p.partner || "";
      openDlg(`<h2>Add a new partner</h2><p>This sends the details to the app's Owner (the community@ account), who sets up the new partner group. Once it's added, you can pick it here.</p>
        <form id="newP" class="f2" novalidate>
          <label class="lbl">Organization name<input type="text" name="org" maxlength="100" autocomplete="off"></label>
          <div class="two"><label class="lbl">Contact's first name<input type="text" name="first" maxlength="60" value="${esc(p.first || "")}"></label><label class="lbl">Last name<input type="text" name="last" maxlength="60" value="${esc(p.last || "")}"></label></div>
          <div class="two"><label class="lbl">Phone<input type="text" inputmode="tel" name="phone" maxlength="40" value="${esc(p.phone || "")}"></label><label class="lbl">Email<input type="text" inputmode="email" name="email" maxlength="120" value="${esc(p.email || "")}"></label></div>
          <label class="lbl">Notes<textarea name="notes" maxlength="2000" placeholder="What they do, how they're connected to Heirloom, their website…"></textarea></label>
        </form>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Send to the Owner</button></div>`);
      $("#go").onclick = async e => {
        const b = e.currentTarget, fd = new FormData($("#newP"));
        if (!String(fd.get("org") || "").trim()) return flash("Add the organization's name first.", true);
        b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { await call({ action: "adminPartnerRequest", org: fd.get("org"), first: fd.get("first"), last: fd.get("last"), phone: fd.get("phone"), email: fd.get("email"), notes: fd.get("notes") }); dlg.close(); flash("Sent. The Owner will set up the new partner, then you can pick it here."); }
        catch (err) { b.disabled = false; b.textContent = "Send to the Owner"; flash(err.message, true); }
      };
    });
    f.onsubmit = e => e.preventDefault();
    save.onclick = async () => {
      if (!q("first").value.trim()) { q("first").focus(); return flash("Add a first name first.", true); }
      if (q("ispartner").checked && !q("partner").value) { q("partner").focus(); return flash("Choose which partner they're with, or untick Community partner.", true); }
      const admin = q("admin").checked;
      if (p.email === me && !admin && !save.dataset.ok) {
        openDlg(`<h2>Remove yourself as an admin?</h2><p>You won't be able to use this page anymore. Another admin would need to add you back.</p>
          <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Keep me</button><button class="btn btn-primary btn-sm" id="go">Remove me</button></div>`);
        $("#go").onclick = () => { save.dataset.ok = "1"; dlg.close(); save.click(); };
        return;
      }
      const resident = q("resident").checked, st = q("stage").value;
      const body = { action: "adminPersonSave", email: p.email, first: q("first").value, last: q("last").value, preferred: q("preferred").value, pronouns: q("pronouns").value, phone: q("phone").value, address: q("address").value, city: q("city").value, state: q("state").value, zip: q("zip").value,
        emergency: q("emergency").value, emergencyPhone: q("emergencyPhone").value, news: q("news").checked, notes: q("notes").value, others: q("others").value,
        role: resident ? "Resident" : st === NOT_VOL || !q("isvol").checked ? "" : "Volunteer", status: st === NOT_VOL ? "" : st, bg: q("isvol").checked || !q("sbg") ? q("bg").value : q("sbg").value, bgNote: q("bgNote").value,
        trainings: [...f.querySelectorAll(resident ? '[data-k="trnR"]:checked' : '[data-k="trn"]:checked')].map(c => c.value),
        church: resident || q("church").checked, partner: q("ispartner").checked ? q("partner").value : "",
        residency: q("isres").checked ? q("resStage").value : "", resChecklist: [...f.querySelectorAll('[data-k="rck"]:checked')].map(c => c.value), resNote: q("resNote").value,
        feedbackUntil: q("feedbackUntil").value, moveIn: q("moveIn").value, space: q("space").value, occupies: /guest room/i.test(q("space").value) ? q("occupies").checked : undefined,
        sabbath: q("issab").checked ? q("sabStage").value : "", sabInterview: q("sabDone").checked ? "Done " + (q("sabDate").value || new Date().toISOString().slice(0, 10)) : q("sabDate").value, sabNote: q("sabNote").value,
        trusted: resident ? undefined : q("trusted").checked, approver: q("approver").checked, admin };
      save.disabled = true; save.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        const r = await call(body);
        if (r.stillAdmin === false) return gate("notAdmin");
        state.person = r; state.ppl = null; state.chores = null;
        renderPerson(); flash("Saved.");
      } catch (err) { if (err.signedOut || err.notAdmin) return handle(err); save.disabled = false; save.textContent = "Save changes"; msg.textContent = err.message + "."; }
    };
    // Remove / restore
    const rmBtn = $("#remove"), rsBtn = $("#restore");
    if (rmBtn) rmBtn.onclick = () => {
      const n = mine.length;
      openDlg(`<h2>Remove ${esc(nameOf(p))}?</h2>
        <p>They'll come off the People list${n ? `, off ${n} chore slot${n > 1 ? "s" : ""} (we'll email qualified volunteers that ${n > 1 ? "they're" : "it's"} open)` : ""}${p.admin || p.approver || p.trusted ? ", and off the permission lists" : ""}. Their info and hours stay saved, and you can restore them later.</p>
        <label class="lbl" for="rmWhy">Reason <span class="opt">(optional, for the Admin log)</span></label><textarea id="rmWhy" maxlength="300" placeholder="Moved away in November"></textarea>
        <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
      $("#go").onclick = async e => {
        const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { state.person = await call({ action: "adminPersonRemove", email: p.email, reason: $("#rmWhy").value.trim() }); state.ppl = null; state.chores = null; dlg.close(); renderPerson(); flash(`Removed. Their info is still on the People tab in the Sheet.`); }
        catch (err) { if (err.signedOut || err.notAdmin) { dlg.close(); return handle(err); } b.disabled = false; b.textContent = "Remove"; flash(err.message, true); }
      };
    };
    if (rsBtn) rsBtn.onclick = async () => {
      rsBtn.disabled = true; rsBtn.innerHTML = `<span class="spinner"></span>`;
      try { state.person = await call({ action: "adminPersonRemove", email: p.email, restore: true }); state.ppl = null; renderPerson(); flash("Restored. Set their role, permissions and chores again if they need them."); }
      catch (err) { rsBtn.disabled = false; rsBtn.textContent = "Restore"; flash(err.message, true); }
    };
    // Chores
    const pick = $("#slotPick"), add = $("#slotAdd");
    const chore = async (body, btn, done) => {
      const label = btn.textContent; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
      try { state.person = await call(Object.assign({ action: "adminPersonChore", email: p.email }, body)); state.ppl = null; state.chores = null; renderPerson(); flash(done); }
      catch (err) { if (err.signedOut || err.notAdmin) return handle(err); btn.disabled = false; btn.textContent = label; flash(err.message, true); }
    };
    if (pick) {
      pick.onchange = () => add.disabled = !pick.value;
      add.onclick = () => {
        const s = R.slots.find(x => x.id === pick.value); if (!s) return;
        if (s.who && s.who !== "Volunteers") {
          openDlg(`<h2>Move ${esc(p.first || "them")} onto this slot?</h2><p>${esc(s.day)}s · ${esc(s.chore)} is ${esc(s.who)}'s right now. ${esc(s.who)} comes off it (their hours so far are kept).</p>
            <div class="btns"><button class="btn btn-outline btn-sm" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-forest btn-sm" id="go">Move</button></div>`);
          $("#go").onclick = e => { dlg.close(); chore({ slotId: s.id, on: true, replace: true }, add, `Added. We emailed ${p.first || "them"} the details.`); };
        } else chore({ slotId: s.id, on: true }, add, `Added. We emailed ${p.first || "them"} the details.`);
      };
    }
    $("#prof").querySelectorAll("[data-off]").forEach(b => b.onclick = () => chore({ slotId: b.dataset.off, on: false }, b, "Taken off. We let qualified volunteers know the slot is open."));
  }
  function actList(title, items, past) {
    if (!items.length) return "";
    return `<div class="act"><span class="lbl">${title}</span><ul>${items.slice(0, 12).map((t, i) => `<li${past[i] ? ' class="past"' : ""}>${t}</li>`).join("")}</ul>${items.length > 12 ? `<p class="hint" style="margin:0">and ${items.length - 12} more</p>` : ""}</div>`;
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
      { kind: "form", id: "EV-3", title: "Play Night", when: when(4, 19, 21), start: iso(4, 19), status: "Published", poster: "Pat Doe", calendars: "Public, Residents", location: "Autoshop", image: "images/farmhouse-lawn.jpg", rsvp: true, going: 6, spots: 12, recurring: true, repeatText: "Monthly, first Friday" },
      { kind: "partner", key: "partner:soundbird:1", title: "Sound Bath at Sunset", partner: "The Soundbird Sanctuary", when: when(5, 17, 18), start: iso(5, 17), location: "Yurt", image: "images/painting.jpg", customImage: true },
      { kind: "calendar", eventId: "b1", key: "cal:public:b1", title: "Supper Church", when: when(6, 18, 20), start: iso(6, 18), location: "Farmhouse", image: "images/farmhouse-lawn.jpg", hostName: "" },
      { kind: "partner", key: "partner:plantify:2", title: "Bed prep and cover crops", partner: "Plantify", when: when(8, 11, 14), start: iso(8, 11), location: "Paradise Community Garden", image: "images/squash-tunnel.jpg", hidden: true }
    ] };
    if (b.action === "adminLog") return { ok: true, total: 6, entries: [
      { when: "2026-11-17 18:40", who: "Lindsey Huffman", email: "lindsey.j.huffman@gmail.com", calendar: "Public", event: "Room 2: Sarah staying", action: "Deleted", details: "" },
      { when: "2026-11-17 09:12", who: "Mark Hamiter", email: "mkhamiter@gmail.com", calendar: "Public, Residents", event: "Room 2: Sarah staying", action: "Posted an event (held for review)", details: "Title mentions \"Room\"" },
      { when: "2026-11-16 20:05", who: "Brit Pastor", email: "staff@heirloomeastbay.com", calendar: "", event: "This Sunday: the great banquet", action: "Posted a church note", details: "Also sent to Discord" },
      { when: "2026-11-16 14:30", who: "Lindsey Huffman", email: "lindsey.j.huffman@gmail.com", calendar: "", event: "Pat Lee", action: "Updated a person", details: "Volunteer · Active volunteer · trainings: Animal feeding" },
      { when: "2026-11-16 11:02", who: "Riss Kostelnick", email: "kkostelnick@iliff.edu", calendar: "Public", event: "Goat happy hour", action: "Posted an event (went live)", details: "Posts without review" },
      { when: "2026-11-15 17:45", who: "Lindsey Huffman", email: "lindsey.j.huffman@gmail.com", calendar: "Public", event: "Plant swap", action: "Approved", details: "" }] };
    if (b.action === "adminLibrary") return { ok: true, photos: demoLib };
    if (/^adminLibrary/.test(b.action)) return { ok: true, photos: demoLib };
    if (/^adminPerson|^adminTrainings/.test(b.action)) return demoPeople(b);
    if (/^adminChore|^adminCover/.test(b.action)) return demoChores(b);
    return { ok: true };
  }

  // Sample people for preview mode
  let demoP = null;
  function demoPeople(b) {
    const d = n => H.dayKey(new Date(Date.now() + n * 86400000));
    if (!demoP) {
      const T = ["Animal feeding", "Collecting eggs", "Gardening", "Power tools & woodshop", "Goat milking", "Goat milk soap making", "Event help"];
      const base = (o) => Object.assign({ last: "", phone: "", role: "", status: "", bg: "", trainings: [], admin: false, approver: false, trusted: false, news: false, submitted: d(-60), hours: 0, shifts: 0, lastHelped: "", lastText: "", slots: 0, events: 0,
        address: "", emergency: "", interests: "", heard: "", comments: "", notes: "", firstHelped: "", firstText: "" }, o);
      demoP = { trainings: T, statuses: ["New", "Contacted", "Background check sent", "Active volunteer", "Not approved", "Not right now"], people: [
        base({ email: session.email, first: "You", role: "Resident", status: "Resident", admin: true, approver: true, trusted: true, hours: 31.5, shifts: 30, lastHelped: d(-2), lastText: "Nov 8", slots: 1, events: 6, firstHelped: d(-200), firstText: "Apr 24" }),
        base({ email: "ana@example.com", first: "Ana", last: "Diaz", phone: "510-555-0142", role: "Volunteer", status: "Active volunteer", bg: "Cleared", trainings: ["Animal feeding"], news: true, hours: 12, shifts: 11, lastHelped: d(-6), lastText: "Nov 4", slots: 1,
          interests: "Weekly animal chores (approx. 1 hour/week), One-off Projects", heard: "A Friend", comments: "We're a family of four, kids are 8 and 11. Weekday afternoons work best!", emergency: "Luis Diaz (husband) 510-555-0199", firstHelped: d(-80), firstText: "Aug 22" }),
        base({ email: "jo@example.com", first: "Jo", last: "Rivera", role: "", status: "", sabbath: "Interview scheduled", bg: "Sent", sabInterview: "2026-12-02", sabNote: "Lovely first call.",
          sabApp: { submitted: "2026-11-15 10:02", why: "Ten years of youth ministry and I'm running on empty. I'd love a week of quiet with the animals and the hills.", heard: "A Friend", nights: "7", who: "Just me", dates: "January, any week", pastor: "Yes", leader: "I lead a youth nonprofit in Oakland", marginalized: "Yes", more: "", phone: "510-555-0101", count: 1 }, sabStays: [] }),
        base({ email: "marcus@example.com", first: "Marcus", last: "Lee", role: "Volunteer", status: "Contacted", interests: "Monthly Workdays (2 hours/month)", heard: "Website/Google", notes: "Coming to the Dec workday" }),
        base({ email: "priya@example.com", first: "Priya", last: "Shah", role: "Volunteer", status: "New", news: true, interests: "I'm not sure", heard: "Social Media", submitted: d(-1) }),
        base({ email: "nik@heirloomeastbay.com", first: "Nik", last: "R", role: "Resident", status: "Resident", trusted: true, events: 3, hours: 4, shifts: 4, lastHelped: d(-9), lastText: "Nov 1" }),
        base({ email: "sue@example.com", first: "Sue", last: "Miller", phone: "510-555-0101", events: 2 }) ] };
      demoP.slots = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].flatMap((day, i) => [
        { id: "S-" + i + "a", chore: "AM animal chores", day, start: "07:00", time: "7am–8am", training: "Animal feeding", volunteer: i === 1 ? "ana@example.com" : i === 4 ? session.email : "", reminders: i === 1, since: i === 1 ? d(-80) : d(-200) },
        { id: "S-" + i + "b", chore: "PM animal chores", day, start: "17:00", time: "5pm–6pm", training: "Animal feeding", volunteer: i === 3 ? "nik@heirloomeastbay.com" : "", reminders: false, since: d(-30) }]);
    }
    const P = demoP, find = e => P.people.find(x => x.email === e);
    const detail = e => {
      const p = find(e);
      P.slots.forEach(s => { const v = find(s.volunteer); s.who = s.volunteer ? (v ? v.first : s.volunteer) : ""; });
      P.people.forEach(x => x.slots = P.slots.filter(s => s.volunteer === x.email).length);
      return JSON.parse(JSON.stringify({ ok: true, me: session.email, person: p, slots: P.slots, statuses: P.statuses, trainings: P.trainings, sabStages: ["Applied", "Contacted", "Interview scheduled", "Background check sent", "Approved", "Not approved", "Not right now"],
        resStages: ["Applied", "Brit reviewing", "One-on-one with Brit", "Interview with residents", "Resident feedback week", "Approved (moving in)", "Waitlist", "Not right now", "Not approved"], resChecklist: ["Visited as a guest", "Background check", "Ministry Safe class", "Liability release & policies signed", "Photo ID copy", "Income confirmed", "Lease signed"], spaces: ["Main house room 1", "Main house room 2", "Main house room 3", "Guest room 4", "Loft", "Alcove"],
        signups: e === "ana@example.com" ? [{ title: "Fence workday", when: "Nov 22", status: "Going", past: false }, { title: "Fall cleanup", when: "Oct 18", status: "Going", past: true }] : [],
        coverage: e === "ana@example.com" ? [{ chore: "AM animal chores", when: "Nov 3", status: "Covered", asked: true, other: "Nik", past: true }] : [],
        posted: p.events ? [{ title: "Knit & Sip on the Porch", when: "Nov 20", status: "Pending" }] : [] }));
    };
    if (b.action === "adminPersons") return JSON.parse(JSON.stringify({ ok: true, me: session.email, people: P.people, statuses: P.statuses, trainings: P.trainings }));
    if (b.action === "adminPerson") return detail(b.email);
    if (b.action === "adminTrainingsSave") { P.trainings = b.list; return { ok: true, trainings: b.list }; }
    if (b.action === "adminPersonSave") {
      let p = find(b.email);
      if (b.create && p) return { ok: false, error: b.email + " is already in People" };
      if (!p) { p = { email: b.email, trainings: [], hours: 0, shifts: 0, lastText: "", slots: 0, events: 0, submitted: d(0), interests: "", heard: "", comments: "", notes: "", address: "", emergency: "", bg: "" }; P.people.push(p); }
      const wasRes = p.role === "Resident";
      Object.assign(p, { first: b.first, last: b.last || "", phone: b.phone || "", role: b.role, status: b.role === "Resident" ? "Resident" : b.role ? (b.status || "New") : "" });
      ["address", "emergency", "news", "notes", "bg", "trainings", "approver", "admin"].forEach(k => { if (b[k] !== undefined) p[k] = b[k]; });
      p.trusted = b.trusted !== undefined ? b.trusted : p.trusted;
      if (b.role === "Resident" && !wasRes) p.trusted = true;
      return Object.assign(detail(b.email), { stillAdmin: b.email === session.email && b.admin === false ? false : true });
    }
    if (b.action === "adminPersonRemove") {
      const p = find(b.email);
      if (b.restore) p.removed = ""; else { p.removed = d(0); p.admin = p.approver = p.trusted = false; P.slots.forEach(s => { if (s.volunteer === b.email) s.volunteer = ""; }); }
      return detail(b.email);
    }
    if (b.action === "adminPersonChore") {
      const s = P.slots.find(x => x.id === b.slotId);
      if (b.on) { if (s.volunteer && !b.replace) return { ok: false, error: "That slot already has someone" }; s.volunteer = b.email; s.since = d(0); s.reminders = false; }
      else if (s.volunteer === b.email) s.volunteer = "";
      return detail(b.email);
    }
    return { ok: true };
  }

  show(state.tab);
})();
