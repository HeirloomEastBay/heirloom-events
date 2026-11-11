/* Heirloom Activities — volunteer portal
   Sign in on My events (emailed code); volunteers land here.
   Tabs: Sign up · My shifts · Chore chart · Coverage */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const qs = new URLSearchParams(location.search);
  let session = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO) { $("#demoBanner").hidden = false; session = session || { token: "demo", email: "ana@example.com" }; }
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); e.signedOut = r.signedOut; throw e; }
    return r;
  }

  if (!session || !session.token) {
    app.innerHTML = `<div class="empty"><h2>Please log in</h2><p>Volunteers log in with a code we email you.</p><p><a class="btn btn-primary" href="mine.html">Log in</a></p></div>`;
    return;
  }

  /* ---------- Dates ---------- */
  const dateOf = ymd => { const [y, m, d] = ymd.split("-").map(Number); return H.zoned(y, m, d, 12); };
  const dayName = ymd => H.fmt(dateOf(ymd), { weekday: "long", month: "long", day: "numeric" });
  const shortDay = ymd => H.fmt(dateOf(ymd), { weekday: "short", month: "short", day: "numeric" });
  const t12 = hhmm => { if (!hhmm) return ""; const [h, m] = hhmm.split(":").map(Number); return ((h % 12) || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm"); };

  /* ---------- Load ---------- */
  let data = null;
  const state = { tab: ["signup", "mine", "chores", "coverage"].includes(qs.get("tab")) ? qs.get("tab") : "signup", area: "" };
  async function load(keepTab) {
    try {
      data = await call({ action: "volPortal" });
      header();
      $("#tabs").hidden = false;
      show(keepTab ? state.tab : state.tab);
    } catch (err) {
      if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ }
        app.innerHTML = `<div class="empty"><h2>Your sign-in expired</h2><p><a class="btn btn-primary" href="mine.html">Log in again</a></p></div>`; return; }
      app.innerHTML = `<div class="empty"><h2>We couldn't load the portal</h2><p>${esc(err.message)}</p><p><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
      $("#retry").onclick = () => load();
    }
  }

  function header() {
    const me = data.me;
    $("#hello").textContent = me && me.first ? `Hi, ${me.first}!` : "Volunteer portal";
    if (window.HLNav) HLNav.setRoles({ email: data.email, admin: !!data.admin, volunteer: !!data.me, resident: !!data.resident });
    $("#signOut").hidden = false;
    $("#signOut").onclick = () => { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } if (window.HLNav) HLNav.signedOut(); location.href = "index.html"; };
    const b = [];
    if (me && me.resident) b.push(`<span class="ok">Resident</span>`);
    else if (me) {
      b.push(me.active ? `<span class="ok">Approved volunteer</span>` : `<span>${esc(me.status)}</span>`);
      if (me.bgCleared) b.push(`<span class="ok">Background check cleared</span>`);
      me.trainings.forEach(t => b.push(`<span>${esc(t)}</span>`));
    }
    $("#badges").innerHTML = b.join("");
    impact();
    const n = mineShifts().length; $("#nMine").hidden = !n; $("#nMine").textContent = n;
    const c = data.coverage.filter(x => !x.missing.length).length; $("#nCover").hidden = !c; $("#nCover").textContent = c;
  }

  /* ---------- How you've helped, with a little celebration at milestones ---------- */
  const MILESTONES = [[h => h.shifts >= 1, "first", "You did your first volunteer shift. Welcome to the crew!"],
    ...[10, 25, 50, 100, 200, 500, 1000].map(n => [h => h.hours >= n, "h" + n, `You've helped for ${n} hours. Thank you!`])];
  function impact() {
    const s = data.stats, box = $("#impact");
    if (!s || !data.me) { box.hidden = true; return; }
    const hours = s.hours === 1 ? "1 hour" : `${s.hours} hours`;
    box.innerHTML = s.shifts
      ? `<span><b>${esc(String(s.hours))}</b>${s.hours === 1 ? "hour" : "hours"} helped</span><span><b>${s.shifts}</b>shift${s.shifts === 1 ? "" : "s"}</span>${s.last ? `<span>Last helped ${esc(shortDay(s.last))}</span>` : ""}`
      : `<span>Your hours will add up here after your first shift.</span>`;
    box.hidden = false;
    // Which milestones are new since last time on this device?
    const key = "heirloom-milestones-" + data.email;
    let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { /* fine */ }
    const reached = MILESTONES.filter(m => m[0](s));
    const fresh = reached.filter(m => !(seen || []).includes(m[1]));
    try { localStorage.setItem(key, JSON.stringify(reached.map(m => m[1]))); } catch (e) { /* fine */ }
    if (!fresh.length) return;
    const top = fresh[fresh.length - 1];
    box.insertAdjacentHTML("beforeend", `<p class="yay" role="status">🎉 ${esc(top[2])}${top[1] === "first" ? "" : ` That's ${esc(hours)} and ${s.shifts} shifts so far.`}</p>`);
    confetti();
  }
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas"); c.id = "confetti"; document.body.appendChild(c);
    const x = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const W = c.width = innerWidth * dpr, Hh = c.height = innerHeight * dpr;
    const colors = ["#e3b65a", "#2e4a36", "#9fb6a4", "#b5452f", "#f4efe3", "#e9e1f3"];
    const bits = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: Hh * .35, vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
      w: (6 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[Math.floor(Math.random() * colors.length)] }));
    const t0 = performance.now();
    (function frame(t) {
      x.clearRect(0, 0, W, Hh);
      bits.forEach(b => { b.vy += .45 * dpr; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.fillStyle = b.c; x.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); x.restore(); });
      if (t - t0 < 3500) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  // Reminder emails the day before, per chore (off by default) or per coverage (on by default)
  const remBtn = (on, attr) => `<button type="button" class="rem" ${attr} aria-pressed="${on}">${on ? "🔔 Reminder emails on" : "🔕 Reminder emails off"}</button>`;
  function wireRem(root) {
    root.querySelectorAll("[data-rem-slot], [data-rem-cover]").forEach(b => b.onclick = async () => {
      const on = b.getAttribute("aria-pressed") !== "true", slotId = b.dataset.remSlot, coverId = b.dataset.remCover;
      b.disabled = true;
      try {
        await call(slotId ? { action: "volReminder", slotId, on } : { action: "volReminder", coverId, on });
        if (slotId) data.chores.forEach(c => { if (c.id === slotId) c.reminders = on; });
        else data.myCovers.forEach(r => { if (r.id === coverId) r.reminder = on; });
        root.querySelectorAll(slotId ? `[data-rem-slot="${slotId}"]` : `[data-rem-cover="${coverId}"]`).forEach(x => x.outerHTML = remBtn(on, slotId ? `data-rem-slot="${esc(slotId)}"` : `data-rem-cover="${esc(coverId)}"`));
        wireRem(root);
        flash(on ? "We'll email you a reminder the day before." : "Reminders off for this one.");
      } catch (err) { b.disabled = false; flash(err.message + ".", true); }
    });
  }

  function show(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach(t => { const on = t.dataset.tab === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    history.replaceState(null, "", tab === "signup" ? "portal.html" : "portal.html?tab=" + tab);
    ({ signup: renderSignup, mine: renderMine, chores: renderChores, coverage: renderCoverage })[tab]();
  }
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => show(t.dataset.tab));

  function statusNote() {
    if (!data.me) return `<p class="note">We don't have a volunteer form from <b>${esc(data.email)}</b> yet. <a href="volunteer.html">Fill out the volunteer form</a> and a resident will be in touch. Meanwhile you can sign up for anything open to everyone.</p>`;
    if (!data.me.active) return `<p class="note">Thanks for signing up! Once a resident approves you, you'll be able to join the chore chart and volunteers-only shifts. Meanwhile you can sign up for anything open to everyone.</p>`;
    return "";
  }
  const needText = miss => miss.length ? `Needs ${miss.join(" and ")}` : "";

  /* ---------- Sign up ---------- */
  function renderSignup() {
    const areas = [...new Set(data.opps.map(o => o.area))];
    const list = data.opps.filter(o => !state.area || o.area === state.area);
    let html = statusNote() + `<div class="panel-h"><div><h2>Ways to help</h2><p>Everything coming up in the next 3 months. Tap Sign up and you're on the list, and we'll email you a reminder the day before.</p></div></div>`;
    if (areas.length > 1) html += `<div class="filters" role="group" aria-label="Area">${["", ...areas].map(a => `<button type="button" data-a="${esc(a)}" aria-pressed="${a === state.area}">${esc(a || "All")}</button>`).join("")}</div>`;
    if (!list.length) html += `<div class="empty"><h2>Nothing posted right now</h2><p>New opportunities show up here. Check back soon!</p></div>`;
    let last = "";
    list.forEach((o, i) => {
      if (o.date !== last) { html += (last ? "</div>" : "") + `<h3 class="day-h">${esc(dayName(o.date))}</h3><div class="list">`; last = o.date; }
      const tags = [`<span class="tag vol">${esc(o.area)}</span>`];
      if (o.who === "Approved volunteers") tags.push(`<span class="tag plain">Volunteers only</span>`);
      if (o.bg) tags.push(`<span class="tag plain">Background check</span>`);
      if (o.training) tags.push(`<span class="tag plain">${esc(o.training)} training</span>`);
      if (o.spots) tags.push(`<span class="tag ${o.full ? "warn" : ""}">${o.going} of ${o.spots} signed up</span>`);
      if (o.mine) tags.push(`<span class="tag mine">${o.mine === "Waitlist" ? "On the waitlist" : "You're signed up"}</span>`);
      const act = o.mine ? `<button class="btn-quiet" data-cancel="${i}">Cancel my spot</button>`
        : o.missing.length ? `<span class="needs">${esc(needText(o.missing))}</span>`
        : `<button class="btn btn-primary btn-sm" data-sign="${i}">${o.full ? "Join the waitlist" : "Sign up"}</button>`;
      html += `<article class="item${o.image ? "" : " noimg"}">${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy">` : ""}<div>
        <h3>${esc(o.title)}</h3><p class="when">${esc(o.time)}${o.location ? " · " + esc(o.location) : ""}</p>
        <div class="tags">${tags.join("")}</div>${o.description ? `<p class="desc">${esc(o.description)}</p>` : ""}<div class="acts">${act}</div></div></article>`;
    });
    if (last) html += "</div>";
    app.innerHTML = html;
    app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { state.area = b.dataset.a; renderSignup(); });
    app.querySelectorAll("[data-sign]").forEach(b => b.onclick = () => { const o = list[+b.dataset.sign];
      run(b, { action: "volSignup", eventId: o.id, date: o.date }, `You're signed up for ${o.title} on ${shortDay(o.date)}. We emailed you a confirmation.`); });
    app.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => { const o = list[+b.dataset.cancel];
      confirmDlg(`Cancel your spot?`, `${o.title} on ${dayName(o.date)}. If there's a waitlist, the next person moves in.`, "Cancel my spot",
        btn => run(btn, { action: "volCancel", rid: o.rid }, "You're off the list. Thanks for letting us know!")); });
  }

  /* ---------- My shifts ---------- */
  // Everything this person is doing: sign-ups, their regular slots (minus dates others cover), and dates they're covering
  function mineShifts() {
    const out = [];
    data.mySignups.forEach(o => out.push({ kind: "signup", date: o.date, start: o.start, end: o.end, title: o.title, time: o.time, location: o.location, o }));
    const reqs = {}; data.myRequests.forEach(r => reqs[r.slotId + "|" + r.date] = r);
    data.chores.filter(c => c.mine).forEach(c => c.next.slice(0, 6).forEach(date => {
      const r = reqs[c.id + "|" + date];
      if (r && r.status === "Covered") return;
      out.push({ kind: "slot", date, start: c.start, end: c.end, title: c.chore, time: c.time, slot: c, req: r });
    }));
    data.myCovers.forEach(r => out.push({ kind: "cover", date: r.date, start: r.start, end: r.end, title: r.chore, time: r.time, r }));
    return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }
  function renderMine() {
    const list = mineShifts();
    let html = statusNote() + `<div class="panel-h"><div><h2>My shifts</h2><p>Your sign-ups, your regular chore slots and any dates you're covering.</p></div>
      ${list.length ? `<button class="btn btn-outline btn-sm" id="ics">Add to my calendar</button>` : ""}</div>`;
    if (!list.length) html += `<div class="empty"><h2>No shifts yet</h2><p>Sign up for something on the Sign up tab, or take an open slot on the chore chart.</p>
      <p><button class="btn btn-primary" data-go="signup">See ways to help</button></p></div>`;
    let last = "";
    const remSeen = {}; // the reminder switch is per chore, so show it on its next date only
    list.forEach((s, i) => {
      if (s.date !== last) { html += (last ? "</div>" : "") + `<h3 class="day-h">${esc(dayName(s.date))}</h3><div class="list">`; last = s.date; }
      const tag = s.kind === "signup" ? `<span class="tag vol">Signed up</span>${s.o.mine === "Waitlist" ? `<span class="tag warn">Waitlist</span>` : ""}`
        : s.kind === "cover" ? `<span class="tag mine">${s.r.pool ? "You're covering" : "Covering for " + esc(s.r.by)}</span>`
        : `<span class="tag">Regular slot</span>${s.req ? `<span class="tag warn">Coverage requested</span>` : ""}`;
      const act = s.kind === "signup" ? `<button class="btn-quiet" data-cancel="${i}">Cancel my spot</button>`
        : s.kind === "slot" ? (s.req ? `<button class="btn-quiet" data-uncover="${i}">I can make it after all</button>` : `<button class="btn btn-outline btn-sm" data-cover="${i}">I need coverage</button>`)
        : `<span class="needs">Can't make it? Let ${s.r.pool ? "the Heirloom team" : esc(s.r.by)} know.</span>`;
      const firstOfSlot = s.kind === "slot" && !s.req && !remSeen[s.slot.id] && (remSeen[s.slot.id] = true);
      const rem = firstOfSlot && !s.req ? remBtn(!!s.slot.reminders, `data-rem-slot="${esc(s.slot.id)}"`) : s.kind === "cover" ? remBtn(!!s.r.reminder, `data-rem-cover="${esc(s.r.id)}"`) : "";
      html += `<article class="item noimg"><div><h3>${esc(s.title)}</h3><p class="when">${esc(s.time)}${s.location ? " · " + esc(s.location) : ""}</p>
        <div class="tags">${tag}</div><div class="acts">${act}${rem}</div></div></article>`;
    });
    if (last) html += "</div>";
    app.innerHTML = html;
    wireRem(app);
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));
    if ($("#ics")) $("#ics").onclick = () => downloadIcs(list);
    app.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => { const s = list[+b.dataset.cancel];
      confirmDlg("Cancel your spot?", `${s.title} on ${dayName(s.date)}.`, "Cancel my spot", btn => run(btn, { action: "volCancel", rid: s.o.rid }, "You're off the list. Thanks for letting us know!")); });
    app.querySelectorAll("[data-cover]").forEach(b => b.onclick = () => coverDlg(list[+b.dataset.cover].slot, list[+b.dataset.cover].date));
    app.querySelectorAll("[data-uncover]").forEach(b => b.onclick = () => { const s = list[+b.dataset.uncover];
      run(b, { action: "volCoverCancel", id: s.req.id }, `Got it. You're back on for ${shortDay(s.date)}.`); });
  }

  /* ---------- Chore chart ---------- */
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function renderChores() {
    const ch = data.chores;
    let html = statusNote() + `<div class="panel-h"><div><h2>Chore chart</h2><p>Regular weekly chores. Open ones are up for grabs, first come, first served. "Volunteers" means the volunteer pool shares it; if you'd like to own one every week, you can take it. If you can't make one of your dates, ask for coverage and we'll let the other volunteers know.</p></div></div>`;
    if (!ch.length) html += `<div class="empty"><h2>The chore chart is empty</h2><p>Once slots are added, they'll show up here.</p></div>`;
    else html += `<div class="week">${DAYS.map(d => {
      const slots = ch.filter(c => c.day === d);
      return `<section class="dcol" aria-label="${d}"><h3>${d}</h3>${slots.length ? slots.map(c => {
        const i = ch.indexOf(c);
        const who = c.mine ? `<span class="who">You</span>` : c.open ? `<span class="who open">Open</span>` : `<span class="who">${esc(c.who)}</span>`;
        const canTake = (c.open || c.pool) && !c.missing.length;
        const act = c.mine ? `<button class="btn btn-outline btn-sm" data-cover="${i}">I need coverage</button>${remBtn(!!c.reminders, `data-rem-slot="${esc(c.id)}"`)}<button class="btn-quiet" data-drop="${i}" style="justify-self:start;padding:2px 0">Give up this slot</button>`
          : c.open ? (c.missing.length ? `<span class="needs">${esc(needText(c.missing))}</span>` : `<button class="btn btn-primary btn-sm" data-claim="${i}">Take this slot</button>`)
          : canTake ? `<button class="btn-quiet" data-claim="${i}" style="justify-self:start;padding:2px 0">Make it my regular slot</button>` : "";
        return `<div class="slot${c.mine ? " mine" : c.open ? " open" : ""}"><b>${esc(c.chore)}</b><span class="t">${esc(c.time)}</span>
          ${c.training ? `<span class="tag plain">${esc(c.training)}</span>` : ""}${who}${act}</div>`;
      }).join("") : `<p class="empty-day">No slots</p>`}</section>`;
    }).join("")}</div>`;
    app.innerHTML = html;
    wireRem(app);
    app.querySelectorAll("[data-claim]").forEach(b => b.onclick = () => { const c = ch[+b.dataset.claim];
      confirmDlg(`Take ${c.day}s, ${c.time}?`, `${c.chore}, every week${c.pool ? ", as your own regular slot" : ""}. If you can't make a date, you can ask for coverage here.`, "Take this slot",
        btn => run(btn, { action: "volClaim", slotId: c.id }, `It's yours: ${c.chore}, ${c.day}s ${c.time}. Thank you! Want an email the day before? Turn on reminders in My shifts.`)); });
    app.querySelectorAll("[data-drop]").forEach(b => b.onclick = () => { const c = ch[+b.dataset.drop];
      confirmDlg(`Give up ${c.day}s?`, `${c.chore}, ${c.time}. We'll let the other volunteers know it's open. If you only need a date or two off, ask for coverage instead.`, "Give it up",
        btn => run(btn, { action: "volDrop", slotId: c.id }, "Thanks for letting us know. The slot is open for someone else now.")); });
    app.querySelectorAll("[data-cover]").forEach(b => b.onclick = () => coverDlg(ch[+b.dataset.cover]));
  }

  /* ---------- Coverage ---------- */
  function renderCoverage() {
    const open = data.coverage, mine = data.myRequests;
    let html = statusNote() + `<div class="panel-h"><div><h2>Coverage</h2><p>Dates other volunteers need covered. Only volunteers see these. Thank you for stepping in!</p></div></div>`;
    if (!open.length) html += `<div class="empty"><h2>Nothing needs covering</h2><p>When someone needs a date covered, it shows up here and we'll email you.</p></div>`;
    else html += `<div class="list">${open.map((r, i) => `<article class="item noimg"><div><h3>${esc(r.chore)}</h3>
      <p class="when">${esc(dayName(r.date))} · ${esc(r.time)}</p><div class="tags"><span class="tag warn">${r.pool ? "Needs someone" : esc(r.by) + " needs coverage"}</span></div>
      ${r.note ? `<p class="desc">“${esc(r.note)}”</p>` : ""}
      <div class="acts">${r.missing.length ? `<span class="needs">${esc(needText(r.missing))}</span>` : `<button class="btn btn-primary btn-sm" data-take="${i}">I can cover</button>`}</div></div></article>`).join("")}</div>`;
    if (mine.length) html += `<h3 class="day-h" style="margin-top:28px">Your requests</h3><div class="list">${mine.map((r, i) => `<article class="item noimg"><div><h3>${esc(r.chore)}</h3>
      <p class="when">${esc(dayName(r.date))} · ${esc(r.time)}</p>
      <div class="tags">${r.status === "Covered" ? `<span class="tag mine">Covered by ${esc(r.coveredBy)}</span>` : `<span class="tag warn">Still open</span>`}</div>
      ${r.status === "Open" ? `<div class="acts"><button class="btn-quiet" data-unreq="${i}">I can make it after all</button></div>` : ""}</div></article>`).join("")}</div>`;
    app.innerHTML = html;
    app.querySelectorAll("[data-take]").forEach(b => b.onclick = () => { const r = open[+b.dataset.take];
      confirmDlg(`Cover ${shortDay(r.date)}?`, r.pool ? `${r.chore}, ${r.time}. Thank you for pitching in!` : `${r.chore}, ${r.time}, for ${r.by}. We'll let them know.`, "I'll cover it",
        btn => run(btn, { action: "volCoverTake", id: r.id }, `Thank you! You're covering ${r.chore} on ${shortDay(r.date)}. We'll email you a reminder the day before.`)); });
    app.querySelectorAll("[data-unreq]").forEach(b => b.onclick = () => run(b, { action: "volCoverCancel", id: mine[+b.dataset.unreq].id }, "Got it. Your request is cancelled."));
  }

  /* ---------- Dialogs and actions ---------- */
  const dlg = $("#dlg"), dlgIn = $("#dlgIn");
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  function confirmDlg(title, text, yes, go) {
    dlgIn.innerHTML = `<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="btns"><button class="btn btn-outline btn-sm" id="no">Never mind</button><button class="btn btn-primary btn-sm" id="yes">${esc(yes)}</button></div>`;
    dlg.showModal();
    $("#no").onclick = () => dlg.close();
    $("#yes").onclick = e => go(e.currentTarget);
  }
  function coverDlg(slot, preselect) {
    const taken = {}; data.myRequests.forEach(r => { if (r.slotId === slot.id) taken[r.date] = r.status; });
    dlgIn.innerHTML = `<h2>Coverage for ${esc(slot.chore)}</h2><p>${esc(slot.day)}s, ${esc(slot.time)}. Pick the dates you need covered. We'll email the volunteers who can do it.</p>
      <div class="dates">${slot.next.map(d => `<label class="${taken[d] ? "off" : ""}"><input type="checkbox" value="${d}"${taken[d] ? " disabled" : d === preselect ? " checked" : ""}>${esc(shortDay(d))}${taken[d] ? ` <small>(${taken[d] === "Covered" ? "covered" : "asked"})</small>` : ""}</label>`).join("")}</div>
      <label class="lbl" for="cnote">Note <span class="opt">(optional)</span></label><textarea id="cnote" maxlength="500" placeholder="Out of town that weekend. Thanks so much!"></textarea>
      <div class="btns"><button class="btn btn-outline btn-sm" id="no">Never mind</button><button class="btn btn-primary btn-sm" id="yes">Ask for coverage</button></div>`;
    dlg.showModal();
    $("#no").onclick = () => dlg.close();
    $("#yes").onclick = e => {
      const dates = [...dlgIn.querySelectorAll(".dates input:checked")].map(i => i.value);
      if (!dates.length) return showErr("Pick at least one date.");
      run(e.currentTarget, { action: "volCover", slotId: slot.id, dates, note: $("#cnote").value.trim() },
        `We asked the other volunteers to cover ${dates.map(shortDay).join(", ")}. We'll email you when someone does.`);
    };
  }
  function showErr(m) {
    let el = dlg.open ? dlgIn.querySelector(".msg.err") : null;
    if (dlg.open && !el) { dlgIn.insertAdjacentHTML("beforeend", `<p class="msg err"></p>`); el = dlgIn.querySelector(".msg.err"); }
    if (el) el.textContent = m; else flash(m, true);
  }
  async function run(btn, body, okMsg) {
    const label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Working…`;
    try {
      await call(body);
      if (dlg.open) dlg.close();
      await load(true);
      flash(okMsg);
    } catch (err) {
      btn.disabled = false; btn.innerHTML = label;
      showErr(err.message + ".");
    }
  }
  function flash(text, bad) {
    const el = document.createElement("p");
    el.className = "msg " + (bad ? "err" : "ok"); el.textContent = text; el.setAttribute("role", "status");
    app.prepend(el); el.scrollIntoView({ block: "nearest" }); setTimeout(() => el.remove(), 7000);
  }

  /* ---------- "Add to my calendar": a calendar file with the next few weeks of shifts ---------- */
  function downloadIcs(list) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const dt = (ymd, hhmm) => ymd.replace(/-/g, "") + "T" + (hhmm || "09:00").replace(":", "") + "00";
    const escI = s => String(s || "").replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const ev = list.map((s, i) => [
      "BEGIN:VEVENT", `UID:heirloom-${s.kind}-${s.date}-${i}-${(s.title || "").replace(/\W/g, "").slice(0, 20)}@heirloomeastbay.com`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Los_Angeles:${dt(s.date, s.start)}`, `DTEND;TZID=America/Los_Angeles:${dt(s.date, s.end || s.start)}`,
      `SUMMARY:${escI((s.kind === "cover" ? "Covering: " : "") + s.title)}`, `LOCATION:${escI((s.location ? s.location + ", " : "") + "Heirloom, " + C.ADDRESS)}`,
      `DESCRIPTION:${escI("Heirloom volunteer shift. See or change it in the volunteer portal.")}`, "END:VEVENT"].join("\r\n"));
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Heirloom Activities//Volunteer portal//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "heirloom-volunteer-shifts.ics";
    document.body.appendChild(a); a.click(); a.remove();
    flash("Downloaded. Open the file to add your shifts to your calendar.");
  }

  /* ---------- Preview mode: sample data ---------- */
  const dIn = n => { const d = new Date(Date.now() + n * 86400000); return H.dayKey(d); };
  const nextDow = (dow, extra) => { const d = new Date(); const add = ((dow - d.getDay() + 7) % 7) || 7; return dIn(add + (extra || 0)); };
  const demoData = {
    ok: true, email: "ana@example.com", admin: false, hasEvents: true, form: "volunteer.html",
    me: { name: "Ana Diaz", first: "Ana", status: "Active volunteer", active: true, bgCleared: true, trainings: ["Animal chores", "Goat milking"] },
    opps: [
      { id: "EV-1", date: nextDow(6), title: "Garden Workday", time: "9am–12pm", start: "09:00", end: "12:00", location: "The garden", description: "Putting the garden to bed for winter. Gloves and snacks provided.", image: "images/squash-tunnel.jpg", area: "Workday", who: "Anyone", bg: false, training: "", spots: 10, going: 4, full: false, mine: "", rid: "", missing: [] },
      { id: "EV-2", date: nextDow(0), title: "Sunday goat milking", time: "7am–8am", start: "07:00", end: "08:00", location: "Goat pen", description: "", image: "images/goats.jpg", area: "Animal chores", who: "Approved volunteers", bg: true, training: "Goat milking", spots: 1, going: 0, full: false, mine: "Going", rid: "R-1", missing: [] },
      { id: "EV-3", date: nextDow(5, 7), title: "Fence repair on the back pasture", time: "1pm–4pm", start: "13:00", end: "16:00", location: "Back pasture", description: "Restringing the goat fence before winter.", image: "", area: "One-off project", who: "Anyone", bg: true, training: "Power tools", spots: 4, going: 4, full: true, mine: "", rid: "", missing: ["Power tools training"] }
    ],
    chores: [
      { id: "S-1", chore: "Evening animal chores", day: "Tuesday", start: "15:00", end: "16:00", time: "3pm–4pm", training: "Animal chores", mine: true, open: false, who: "", missing: [], next: [0, 7, 14, 21, 28, 35, 42, 49].map(n => nextDow(2, n)) },
      { id: "S-2", chore: "Evening animal chores", day: "Thursday", start: "15:00", end: "16:00", time: "3pm–4pm", training: "Animal chores", mine: false, open: true, who: "", missing: [], next: [] },
      { id: "S-3", chore: "Evening animal chores", day: "Saturday", start: "15:00", end: "16:00", time: "3pm–4pm", training: "Animal chores", mine: false, open: false, who: "Bo", missing: [], next: [] },
      { id: "S-4", chore: "Morning milking", day: "Saturday", start: "07:00", end: "08:00", time: "7am–8am", training: "Goat milking", mine: false, open: false, who: "Priya", missing: [], next: [] },
      { id: "S-5", chore: "Chicken coop clean-out", day: "Monday", start: "16:00", end: "17:00", time: "4pm–5pm", training: "", mine: false, open: true, who: "", missing: [], next: [] },
      { id: "S-6", chore: "AM animal chores", day: "Monday", start: "09:00", end: "10:00", time: "by 10am", training: "Animal chores", mine: false, open: false, pool: true, who: "Volunteers", missing: [], next: [] }
    ],
    coverage: [{ id: "C-1", slotId: "S-3", chore: "Evening animal chores", date: nextDow(6, 7), time: "3pm–4pm", start: "15:00", end: "16:00", by: "Bo", note: "Visiting family that weekend!", status: "Open", missing: [] }],
    myRequests: [], myCovers: [{ id: "C-9", slotId: "S-4", chore: "Morning milking", date: nextDow(6), time: "7am–8am", start: "07:00", end: "08:00", by: "Priya", note: "", status: "Covered", coveredBy: "Ana", reminder: true, missing: [] }], mySignups: [],
    stats: { hours: 10.5, shifts: 9, first: dIn(-70), last: dIn(-5) }
  };
  demoData.mySignups = demoData.opps.filter(o => o.mine);
  async function demo(b) {
    await new Promise(r => setTimeout(r, 300));
    if (b.action === "volPortal") return JSON.parse(JSON.stringify(demoData));
    if (b.action === "volReminder") { demoData.chores.forEach(c => { if (c.id === b.slotId) c.reminders = b.on; }); demoData.myCovers.forEach(r => { if (r.id === b.coverId) r.reminder = b.on; }); }
    return { ok: true };
  }

  load();
})();
