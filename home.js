/* Heirloom Activities — Home: the first page after logging in, different for each role.
   Admins: alerts first (with a choice of which ones come by email).
   Residents: Submit an event + Book a guest room, a smaller "Reserve a space".
   Everyone: this week's events (residents and admins see the public and residents' calendars
   together, without the copies), then their shifts, shifts to pick up, Supper Church this Sunday
   and Brit's latest note (if it's from the last 3 weeks), where those apply. */
(function () {
  const C = window.HEIRLOOM;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const QS = new URLSearchParams(location.search);
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  let session = read("heirloom-session"), D = null, demoD = null;
  if (DEMO && QS.get("demo")) session = { token: "demo", email: "you@example.com" };
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;
  const p2 = n => String(n).padStart(2, "0");
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fmt = (s, o) => parse(s).toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  const localYmd = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  const t12 = d => { const h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + (m ? ":" + p2(m) : "") + (h < 12 ? "am" : "pm"); };
  $("#hDate").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (!session || !session.token) { location.replace("mine.html?next=home"); return; }

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: session.token }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); e.signedOut = r.signedOut; throw e; }
    return r;
  }
  // Show the last Home right away, then refresh it
  const CACHE = "heirloom-home-v1";
  const cached = () => { const c = read(CACHE); return c && c.token === session.token ? c.D : null; };
  const keep = d => { try { localStorage.setItem(CACHE, JSON.stringify({ token: session.token, D: d })); } catch (e) { /* fine */ } };
  function flash(text, bad) {
    const el = document.createElement("p"); el.className = "msg " + (bad ? "err" : "ok"); el.textContent = text; el.setAttribute("role", "status");
    app.prepend(el); setTimeout(() => el.remove(), 6000);
  }

  // Home comes in four parts, asked for all at once, each drawn as soon as it arrives:
  // core (name, roles, alerts, your events), this week, shifts, church. The last full Home shows first.
  const PARTS = ["core", "week", "shifts", "church"], state = {};
  const c0 = DEMO ? null : cached();
  const knownRoles = read("heirloom-roles") || {};
  D = c0 || { roles: knownRoles.email === session.email ? knownRoles : {}, first: ((read("heirloom-me") || {}).first || "") };
  PARTS.forEach(p => state[p] = c0 ? "old" : "loading");
  try { draw(); } catch (e) { console.error(e); }
  PARTS.forEach(load);
  async function load(part) {
    state[part] = state[part] === "old" ? "old" : "loading";
    const slow = setTimeout(() => { if (state[part] === "loading") { state[part] = "slow"; safeDraw(); } }, 20000);
    try {
      const r = await call({ action: "homeGet", part });
      clearTimeout(slow);
      ["first", "roles", "email", "today"].forEach(k => { if (r[k] !== undefined) D[k] = r[k]; });
      ({ core: ["alerts", "mine", "alertKinds", "alertEmails"], week: ["week"], shifts: ["shifts"], church: ["church"] })[part].forEach(k => { D[k] = r[k] === undefined ? null : r[k]; });
      state[part] = (r.failed || []).length ? "failed" : "done";
      if (PARTS.every(p => state[p] === "done")) keep(D);
    } catch (err) {
      clearTimeout(slow);
      if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } location.replace("mine.html?next=home"); return; }
      state[part] = state[part] === "old" ? "old" : "failed";
    }
    safeDraw();
  }
  function safeDraw() { try { draw(); } catch (e) { console.error(e); } }
  // A card for a part that's still coming (or didn't come)
  function waiting(part, title) {
    const st = state[part];
    if (st === "failed") return `<section class="hcard"><header><h2>${esc(title)}</h2></header><p class="empty-s">This part didn't load. <button type="button" class="dd-link" data-retry="${part}">Try again</button></p></section>`;
    return `<section class="hcard"><header><h2>${esc(title)}</h2></header><p class="empty-s"><span class="spinner"></span> ${st === "slow" ? "Still loading. This one's slow today…" : "Loading…"}</p></section>`;
  }
  function ready(p) { return state[p] === "done" || state[p] === "old"; }
  // One broken card can't take the page down with it
  function sec(fn, title) { try { return fn(); } catch (e) { console.error(title, e); return `<section class="hcard"><header><h2>${esc(title)}</h2></header><p class="empty-s">This part didn't load. <button type="button" class="dd-link" onclick="location.reload()">Reload</button></p></section>`; } }

  function draw() {
    const R = D.roles || {};
    if (window.HLNav) HLNav.setRoles({ email: D.email, admin: !!R.admin, resident: !!R.resident, volunteer: !!R.volunteer || !!R.resident, church: !!R.church, sabbath: R.sabbath || "", residency: R.residency || "" });
    $("#hHi").textContent = D.first ? `Hi, ${D.first}!` : "Hi there!";
    const insider = R.resident || R.admin;
    const parts = [], volish = R.volunteer || R.resident || R.admin;
    if (R.admin || R.approver) parts.push(ready("core") ? sec(() => D.alerts ? alertsCard() : "", "Alerts") : waiting("core", "Alerts"));
    parts.push(quick(insider, R));
    const week = ready("week") ? sec(() => weekCard(insider), "This week") : waiting("week", "This week");
    const shifts = ready("shifts") ? (D.shifts ? [sec(myShifts, "Your shifts"), sec(pickups, "Shifts to pick up")] : []) : volish ? [waiting("shifts", insider ? "Your shifts" : "Volunteer opportunities")] : [];
    // Residents: the week first. Volunteers (community members): volunteer opportunities right after Submit an event.
    if (insider) { parts.push(week); parts.push(...shifts); }
    else { parts.push(...shifts.slice().reverse()); parts.push(week); }
    if (ready("church")) { if (D.church) { parts.push(sec(supper, "Supper Church")); if ((D.church.audio || []).length) parts.push(sec(listenCard, "Listen this week")); if (D.church.note) parts.push(sec(noteCard, "From Brit")); } }
    else if (R.church || R.resident || R.admin) parts.push(waiting("church", "Supper Church"));
    if (ready("core")) parts.push(sec(() => extras(R), "Yours"));
    app.innerHTML = parts.filter(Boolean).join("");
    wire();
  }

  /* ---------- Admin alerts ---------- */
  function alertsCard() {
    const list = D.alerts || [];
    return `<section class="hcard alerts" aria-labelledby="hA"><header><h2 id="hA">Alerts${list.length ? ` · ${list.length}` : ""}</h2>${D.alertKinds ? `<a href="#" id="aPrefs">Email me about…</a>` : ""}</header>
      ${list.length ? `<ul class="al">${list.slice(0, 12).map((a, i) => `<li>
          <${a.link ? `a class="go" href="${esc(a.link)}"` : "div"}><span class="t">${esc(a.type)}</span><b>${esc(a.title)}</b>${a.sub ? `<span class="s">${esc(a.sub)}</span>` : ""}</${a.link ? "a" : "div"}>
          ${a.id ? `<button type="button" class="done" data-done="${esc(a.id)}">Done</button>` : a.link ? `<a class="more" href="${esc(a.link)}">${a.kind === "events" ? "Review" : "Open"}</a>` : ""}</li>`).join("")}</ul>
          ${list.length > 12 ? `<p class="empty-s">And ${list.length - 12} more.</p>` : ""}`
        : `<p class="empty-s">All caught up. Nothing waiting for you.</p>`}
    </section>`;
  }
  function prefsDialog() {
    let dlg = $("#prefDlg");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "prefDlg"; dlg.className = "dates-dlg"; document.body.appendChild(dlg); dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); }
    const on = new Set(D.alertEmails || []);
    dlg.innerHTML = `<div class="dd-in"><h2>Email me about…</h2><p class="st-hint" style="margin:-4px 0 8px">Everything shows in Alerts here either way. Tick what you'd also like by email.</p>
      <form class="prefs" id="prefF">${D.alertKinds.map(([k, l]) => `<label><input type="checkbox" value="${esc(k)}"${on.has(k) ? " checked" : ""}><span>${esc(l)}</span></label>`).join("")}</form>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" data-close>Cancel</button><button class="btn btn-forest btn-sm" id="prefGo">Save</button></div></div>`;
    dlg.querySelector("[data-close]").onclick = () => dlg.close();
    dlg.querySelector("#prefGo").onclick = async ev => {
      const b = ev.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try { const r = await call({ action: "homeAlertPrefs", kinds: [...dlg.querySelectorAll("input:checked")].map(c => c.value) }); D.alertEmails = r.alertEmails; keep(D); dlg.close(); flash("Saved your alert emails."); }
      catch (err) { b.disabled = false; b.textContent = "Save"; flash(err.message, true); }
    };
    dlg.showModal();
  }

  /* ---------- Quick actions ---------- */
  function quick(insider, R) {
    if (insider) return `<section class="quick" aria-label="Quick actions"><div class="row">
        <a class="qbtn a" href="submit.html"><span aria-hidden="true">＋</span> Submit an event</a><a class="qbtn b" href="stays.html"><span aria-hidden="true">🛏️</span> Book a guest room</a></div>
        <a class="qsmall" href="admin.html?tab=venues">Reserve a space</a></section>`;
    return `<section class="quick" aria-label="Quick actions"><div class="row one"><a class="qbtn a" href="submit.html"><span aria-hidden="true">＋</span> Submit an event</a></div></section>`;
  }

  /* ---------- This week ---------- */
  function weekCard(insider) {
    const evs = D.week || [], today = localYmd(new Date()), tmr = localYmd(new Date(Date.now() + 86400000));
    const byDay = {};
    evs.forEach(e => { const s = new Date(e.start), day = e.allDay ? e.start.slice(0, 10) : localYmd(s); const k = day < today ? today : day; (byDay[k] = byDay[k] || []).push(e); });
    const days = Object.keys(byDay).sort().slice(0, 7);
    const label = d => d === today ? "Today" : d === tmr ? "Tomorrow" : fmt(d, { weekday: "long", month: "short", day: "numeric" });
    const row = e => {
      const time = e.allDay ? "All day" : t12(new Date(e.start));
      const inner = `<span class="tm">${esc(time)}</span><span><b>${esc(e.title)}</b>${e.residents ? `<span class="tag">Residents</span>` : ""}${e.location ? `<span class="loc">${esc(e.location)}</span>` : ""}</span>`;
      return e.residents ? `<li><div>${inner}</div></li>` : `<li><a href="index.html?event=${encodeURIComponent(String(e.id).split("_")[0])}">${inner}</a></li>`;
    };
    return `<section class="hcard" aria-labelledby="hW"><header><h2 id="hW">This week</h2><a href="index.html">Full calendar</a></header>
      ${days.length ? `<div class="days">${days.map(d => `<div class="day${d === today ? " today" : ""}"><h3>${esc(label(d))}</h3><ul class="evs">${byDay[d].map(row).join("")}</ul></div>`).join("")}</div>`
        : `<p class="empty-s">Nothing on the calendar this week yet.</p>`}
      ${insider ? `<p class="empty-s" style="font-size:13px">Public and residents' calendars together. <span class="tag" style="margin:0">Residents</span> = residents' calendar only.</p>` : ""}
    </section>`;
  }

  /* ---------- Shifts ---------- */
  function when(s) { return (s.date ? fmt(s.date, { weekday: "short", month: "short", day: "numeric" }) + " · " : "") + s.time; }
  function myShifts() {
    const m = D.shifts.mine || [], mo = D.shifts.monthly;
    const monthly = mo && mo.items && mo.items.length ? `<div class="hmonth"><p class="mh"><b>Monthly chore${mo.items.length > 1 ? "s" : ""} · ${esc(mo.label.split(" ")[0])}</b><a href="portal.html?tab=chores">${mo.done} of ${mo.total} done in the house</a></p>
      <ul class="shifts">${mo.items.map(i => `<li class="mc${i.done ? " done" : ""}"><button type="button" class="mcheck" data-mdone="${esc(i.id)}" aria-pressed="${!!i.done}" aria-label="${i.done ? "Uncheck" : "Check off"} ${esc(i.chore)}">${i.done ? "✓" : ""}</button>
        <span><b>${esc(i.chore)}</b><span class="md">${i.done ? "Done " + esc(fmt(i.done, { month: "short", day: "numeric" })) + ". Thank you!" : esc(i.details || "Any day this month")}</span></span></li>`).join("")}</ul></div>` : "";
    return `<section class="hcard" aria-labelledby="hS"><header><h2 id="hS">Your shifts</h2><a href="portal.html">Volunteer portal</a></header>
      ${monthly}${m.length ? `<ul class="shifts">${m.map(s => `<li><b>${esc(s.title)}</b><span>${esc(when(s))}</span><span class="n">${s.kind === "cover" ? "Covering" : s.kind === "chore" ? "Your regular" : "Signed up"}</span></li>`).join("")}</ul>`
        : `<p class="empty-s">No shifts coming up${monthly ? "" : ". Pick one up below!"}</p>`}</section>`;
  }
  function pickups() {
    const p = D.shifts.pick || [];
    return `<section class="hcard" aria-labelledby="hP"><header><h2 id="hP">${D.roles.resident || D.roles.admin ? "Shifts to pick up" : "Volunteer opportunities"}</h2><a href="portal.html">${D.shifts.pickTotal > p.length ? "See all " + D.shifts.pickTotal : "Volunteer portal"}</a></header>
      ${p.length ? `<ul class="shifts">${p.map(s => { const off = s.missing && s.missing.length; return `<li class="${off ? "off" : ""}"><b>${esc(s.title)}</b><span>${esc(when(s))}</span>
          <span class="n">${off ? "Needs " + esc(s.missing.join(" and ")) : esc(s.note || "")}</span></li>`; }).join("")}</ul><a class="btn btn-forest btn-sm" href="portal.html" style="justify-self:start">Pick up a shift</a>`
        : `<p class="empty-s">Nothing needs covering right now. Thank you!</p>`}</section>`;
  }

  /* ---------- Supper Church and Brit's note ---------- */
  function supper() {
    const s = D.church.sunday; if (!s) return "";
    const kinds = { Side: "Side", Dessert: "Dessert", Other: "Other", Drink: "Drink" };
    return `<section class="hcard" aria-labelledby="hC"><header><h2 id="hC">Supper Church · ${esc(fmt(s.date, { weekday: "long", month: "short", day: "numeric" }))}</h2><a href="church.html">Church family</a></header>
      <div class="sup">${s.style === "No Supper Church" ? `<div class="main"><span>🕯️ <b>${esc(s.title || "No Supper Church this week")}</b>${s.dayNote ? " · " + esc(s.dayNote) : ""}</span></div>`
        : s.style === "Potluck" ? `<div class="main"><span>🥧 <b>${esc(s.title || "Potluck")}</b>: bring a dish to share!</span><a class="btn btn-primary btn-sm" href="church.html#sun-${esc(s.date)}">I'm bringing…</a></div>`
        : s.main ? `<div class="main"><span>Main dish: <b>${esc(s.main.what || "something good")}</b> · ${esc(s.main.mine ? "you" : s.main.name)}</span></div>`
        : `<div class="main need"><b>Main dish still needed!</b><a class="btn btn-primary btn-sm" href="church.html">I'll make it</a></div>`}
        ${s.bringing.length ? `<ul>${s.bringing.map(b => `<li>${esc(kinds[b.kind] || b.kind)}${b.what ? ": " + esc(b.what) : ""} (${esc(b.mine ? "you" : b.name)})</li>`).join("")}</ul>` : s.style === "No Supper Church" ? "" : `<p class="empty-s">${s.style === "Potluck" ? "Nobody's said what they're bringing yet." : "No sides or desserts yet."}</p>`}
        ${s.style === "No Supper Church" ? "" : `<a class="more" href="church.html#sun-${esc(s.date)}">${s.style === "Potluck" ? "Say what you're bringing →" : "Bring a side or dessert →"}</a>`}</div></section>`;
  }
  function listenCard() {
    const ICON = { "Weekly message": "🎙️", "Psalm of the week": "📖", "Proverb of the week": "📜", "Kids Bible story": "🌱" };
    return `<section class="hcard" aria-labelledby="hLs"><header><h2 id="hLs">Listen this week</h2><a href="church.html#listen">All recordings</a></header>
      <ul class="shifts">${D.church.audio.map(a => `<li><b>${ICON[a.kind] || "🎧"} ${esc(a.title)}</b><span>${esc(a.kind)}</span><span class="n">${a.seconds ? Math.max(1, Math.round(a.seconds / 60)) + " min" : ""}</span></li>`).join("")}</ul>
      <a class="btn btn-forest btn-sm" href="church.html#listen" style="justify-self:start">Listen</a></section>`;
  }
  function noteCard() {
    const n = D.church.note;
    return `<section class="hcard" aria-labelledby="hN"><header><h2 id="hN">From Brit</h2><a href="church.html">All notes</a></header>
      <a class="note" href="church.html#note-${esc(n.id)}">${n.image ? `<img src="${esc(n.image)}" alt="" loading="lazy">` : ""}<h3>${esc(n.title || "A note for the church family")}</h3><p>${esc(n.excerpt)}</p>
        <small>${esc(n.by || "Brit")} · ${esc(fmt(n.posted, { month: "short", day: "numeric" }))}</small></a></section>`;
  }

  /* ---------- Their own things: events, applications ---------- */
  function extras(R) {
    const m = D.mine || {}, bits = [];
    if (m.upcoming || m.waiting) bits.push(`<a href="mine.html?mine=1"><b>${m.upcoming}</b><span>of your events coming up</span></a>`, m.waiting ? `<a href="mine.html?mine=1"><b>${m.waiting}</b><span>waiting for review</span></a>` : "");
    if (R.sabbath && !/^Not /.test(R.sabbath)) bits.push(`<a href="sabbath.html"><b>🌿</b><span>Sabbath 365: ${esc(R.sabbath)}</span></a>`);
    if (R.residency && !R.resident && !/^Not /.test(R.residency)) bits.push(`<a href="residency.html"><b>🏡</b><span>Living at Heirloom: ${esc(R.residency)}</span></a>`);
    if (!R.resident && !R.volunteer && !R.admin) bits.push(`<a href="profile.html"><b>🙋</b><span>Want to volunteer? Say so on your profile</span></a>`);
    const shown = bits.filter(Boolean);
    return shown.length ? `<section class="hcard" aria-labelledby="hM"><header><h2 id="hM">Yours</h2><a href="mine.html?mine=1">My events</a></header><div class="mini">${shown.join("")}</div></section>` : "";
  }

  function wire() {
    app.querySelectorAll("[data-done]").forEach(b => b.onclick = async () => {
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { const r = await call({ action: "homeAlertDone", id: b.dataset.done, part: "core" }); D.alerts = r.alerts; draw(); flash("Cleared for everyone."); }
      catch (err) { b.disabled = false; b.textContent = "Done"; flash(err.message, true); }
    });
    app.querySelectorAll("[data-mdone]").forEach(b => b.onclick = async () => {
      const it = D.shifts.monthly.items.find(i => i.id === b.dataset.mdone), on = !it.done;
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try {
        const r = await call({ action: "volMonthlyDone", id: it.id, done: on }), M = r.monthly;
        D.shifts.monthly = { month: M.month, label: M.label, endsOn: M.endsOn, items: M.items.filter(x => x.mine), total: M.items.length, done: M.items.filter(x => x.done).length };
        keep(D); draw(); flash(on ? it.chore + ": done. Thank you!" : it.chore + " is unchecked.");
      } catch (err) { b.disabled = false; b.textContent = it.done ? "✓" : ""; flash(err.message, true); }
    });
    const pf = $("#aPrefs"); if (pf) pf.onclick = e => { e.preventDefault(); prefsDialog(); };
    app.querySelectorAll("[data-retry]").forEach(b => b.onclick = () => { state[b.dataset.retry] = "loading"; safeDraw(); load(b.dataset.retry); });
  }

  /* ---------- Preview mode: home.html?demo=admin | resident | volunteer | other ---------- */
  function demo(b) {
    const who = QS.get("demo") || "resident", t = localYmd(new Date());
    const at = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };
    const plus = n => localYmd(new Date(Date.now() + n * 86400000));
    if (!demoD) {
      const admin = who === "admin", resident = admin || who === "resident", volunteer = who === "volunteer";
      demoD = { ok: true, email: "you@example.com", first: admin ? "Brit" : resident ? "Lindsey" : volunteer ? "Ana" : "Erin", today: t,
        roles: { admin, approver: admin, resident, volunteer, church: resident || volunteer, partner: who === "other" ? "Soundbird" : "", sabbath: who === "other" ? "Interview" : "", residency: "" },
        week: [{ id: "e1_1", title: "Farm Work Day", start: at(0, 9), end: at(0, 12), location: "Garden" }, { id: "r1", title: "House meeting", start: at(1, 18, 45), end: at(1, 20), location: "Farmhouse", residents: true },
          { id: "e2_1", title: "Sound Bath at the Sanctuary", start: at(2, 19), end: at(2, 20, 30), location: "Yurt", source: "soundbird" }, { id: "r2", title: "Room 2: Kim Lee (Lindsey's sister)", start: plus(3) + "T00:00:00.000Z", end: plus(5) + "T00:00:00.000Z", allDay: true, residents: true },
          { id: "e3_1", title: "Supper Church", start: at(5, 17, 30), end: at(5, 19), location: "Farmhouse" }].filter(e => resident || !e.residents),
        mine: { upcoming: who === "other" ? 3 : 1, waiting: who === "other" ? 1 : 0 } };
      if (admin) { demoD.alerts = [{ id: "", kind: "events", type: "Event request", title: "Knit & Sip on the Porch", sub: "Sue Miller · Sat, Nov 22", link: "admin.html" },
          { id: "A1", kind: "trainings", type: "Training request", title: "Ana Diaz · Goat milking", sub: "", link: "admin.html?tab=people" },
          { id: "A2", kind: "sabbath", type: "Sabbath 365 request", title: "Jo Rivera", sub: "Nov 29 – Dec 6 · 7 nights", link: "stays.html" },
          { id: "", kind: "volunteers", type: "New volunteers", title: "2 new volunteers to contact", sub: "Kim Lee, Sam Ortiz", link: "admin.html?tab=people" }];
        demoD.alertKinds = [["events", "New event requests (and changes waiting for review)"], ["volunteers", "New volunteers"], ["trainings", "Training requests"], ["stays", "Guest stays booked by residents"], ["sabbath", "Sabbath 365 applications and date requests"], ["residency", "Resident interest forms"], ["chores", "Chore chart changes (slots taken or given up, coverage)"], ["venues", "Venue reservations"]];
        demoD.alertEmails = ["events", "volunteers", "trainings", "stays", "sabbath", "residency"]; }
      if (resident || volunteer) demoD.shifts = { mine: [{ date: plus(1), title: "Animal chores (AM)", time: "7–8am", kind: "chore" }, { date: plus(4), title: "Farm Work Day", time: "9am–12pm", kind: "signup" }],
        pick: [{ date: plus(2), title: "Collecting eggs", time: "5–5:30pm", kind: "cover", note: "Mark needs a sub", missing: [] }, { date: plus(6), title: "Goat milking", time: "6–7am", kind: "cover", note: "Needs someone", missing: volunteer ? ["Goat milking training"] : [] },
          { date: "", title: "Garden watering", time: "Thursday 6–7pm", kind: "slot", note: "Needs a new regular", missing: [] }], pickTotal: 5,
        monthly: resident ? { month: localYmd(new Date()).slice(0, 7), label: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }), total: 8, done: 3,
          items: [{ id: "MC-4", chore: "Main Floor Bathroom", details: "Clean + restock", done: "" }] } : null };
      if (resident || volunteer) demoD.church = { sunday: { date: plus((7 - new Date().getDay()) % 7 || 7), style: "Potluck", title: "Thanksgiving potluck", main: null, bringing: [{ kind: "Side", what: "Roasted squash", name: "Martha S.", mine: false }, { kind: "Dessert", what: "", name: "Ana D.", mine: false }] },
        audio: [{ kind: "Weekly message", title: "Waiting well", seconds: 482 }, { kind: "Psalm of the week", title: "Psalm 130", seconds: 214 }], note: { id: "N1", title: "Advent is almost here", by: "Brit", posted: plus(-4), excerpt: "This Sunday we begin Advent together. Bring a candle if you have one, and come ready to sit with the waiting…", image: "images/farmhouse.jpg", themes: ["Advent"] } };
    }
    if (b.action === "volMonthlyDone") { const it = demoD.shifts.monthly.items.find(x => x.id === b.id); it.done = b.done ? localYmd(new Date()) : ""; demoD.shifts.monthly.done += b.done ? 1 : -1;
      return { ok: true, monthly: { month: demoD.shifts.monthly.month, label: demoD.shifts.monthly.label, items: demoD.shifts.monthly.items.map(x => Object.assign({ mine: true }, x)).concat(Array.from({ length: 7 }, (_, k) => ({ id: "x" + k, done: k < demoD.shifts.monthly.done - (it.done ? 1 : 0) ? "y" : "" }))) } }; }
    if (b.action === "homeAlertDone") demoD.alerts = demoD.alerts.filter(a => a.id !== b.id);
    if (QS.has("slow") && b.part === QS.get("slow")) return new Promise(() => {});
    if (b.action === "homeAlertPrefs") demoD.alertEmails = b.kinds;
    return new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(demoD))), 250));
  }
})();
