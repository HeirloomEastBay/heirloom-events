/* Heirloom Activities — Venues: reserve places on the farm by the hour.
   A day view with every venue as a row (reservations, events from the form, and
   anything else on the calendars that mentions the place), a list of reservations,
   and (for admins) the venue list itself. On the Admin and Resident panels:
   HLVenues.mount(element) */
(function () {
  const C = window.HEIRLOOM;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const DAY = 86400000, H0 = 7, H1 = 23; // the day view runs 7am–11pm
  const p2 = n => String(n).padStart(2, "0");
  const ymd = d => d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate());
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const add = (s, n) => ymd(new Date(+parse(s) + n * DAY));
  const fmt = (s, o) => parse(s).toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  const mins = hm => { const m = String(hm || "").match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0; };
  const t12 = hm => { if (!hm) return ""; const [h, m] = hm.split(":").map(Number); return ((h % 12) || 12) + (m ? ":" + p2(m) : "") + (h < 12 ? "am" : "pm"); };
  const range = (a, b) => t12(a) + "–" + t12(b);
  const REPEATS = [["none", "Doesn't repeat"], ["weekly", "Every week"], ["biweekly", "Every other week"], ["monthlyDate", "Monthly (same date)"], ["monthlyNth", "Monthly (same weekday)"]];

  let root, D, day, view = "up", dlg;

  function token() { try { return (JSON.parse(localStorage.getItem("heirloom-session") || "null") || {}).token; } catch (e) { return ""; } }
  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: token() }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); Object.assign(e, { signedOut: r.signedOut, notAllowed: r.notAllowed, clash: r.clash, blocks: r.blocks || [], headsUp: r.headsUp || [], canForce: r.canForce }); throw e; }
    return r;
  }
  async function load(d, msg) {
    try { D = await call({ action: "venuesGet", date: d }); day = D.date; draw(msg || D.message); }
    catch (err) {
      root.innerHTML = `<div class="empty"><h2>${err.notAllowed ? "Just for residents and admins" : err.signedOut ? "Please log in" : "We couldn't load the venues"}</h2><p>${esc(err.message)}.</p>${err.signedOut ? `<p style="margin-top:12px"><a class="btn btn-primary" href="mine.html?next=admin">Log in</a></p>` : ""}</div>`;
    }
  }
  function mount(el) { root = el; root.innerHTML = `<p class="st-load">Loading venues…</p>`; load(day || ""); }

  function draw(msg) {
    const venues = D.venues.filter(v => v.reservable);
    const hours = []; for (let h = H0; h < H1; h++) hours.push(h);
    const span = (H1 - H0) * 60, pct = m => Math.max(0, Math.min(100, (m - H0 * 60) / span * 100));
    const nowLine = day === D.today ? (() => { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); return m > H0 * 60 && m < H1 * 60 ? `<span class="vn-now" style="left:${pct(m)}%"></span>` : ""; })() : "";
    const rows = venues.map(v => {
      const items = D.busy.filter(b => b.venue === v.name && b.date === day);
      const bars = items.map((b, i) => {
        const a = pct(mins(b.start)), z = pct(mins(b.end)), pa = pct(mins(b.padStart)), pz = pct(mins(b.padEnd));
        if (z <= 0 || a >= 100) return "";
        const label = b.kind === "reservation" ? b.title + (b.host ? " (" + b.host + ")" : "") : b.title;
        return (pa < a || pz > z ? `<span class="vn-pad" style="left:${pa}%;width:${pz - pa}%" aria-hidden="true"></span>` : "") +
          `<button type="button" class="vn-bar ${b.kind}" data-busy="${D.busy.indexOf(b)}" style="left:${a}%;width:${Math.max(z - a, 1.5)}%" title="${esc(label + " · " + range(b.start, b.end))}">${esc(label)}</button>`;
      }).join("");
      return `<div class="vn-row"><div class="vn-name"><b>${esc(v.name)}</b>${v.shared ? `<span>can share</span>` : ""}</div>
        <div class="vn-track" data-venue="${esc(v.name)}">${hours.map(h => `<span class="vn-h${h % 2 ? " odd" : ""}"></span>`).join("")}${bars}${nowLine}</div></div>`;
    }).join("");
    const up = D.reservations.filter(r => r.status === "Reserved" && r.last >= D.today);
    const past = D.reservations.filter(r => r.status === "Reserved" && r.last < D.today).reverse();
    const off = D.reservations.filter(r => r.status !== "Reserved").reverse();
    const list = view === "up" ? up : view === "past" ? past : off;
    root.innerHTML = `${msg ? `<p class="st-msg" role="status">${esc(msg)}</p>` : ""}
      <div class="st-bar-top">
        <div class="st-nav"><button type="button" class="st-arrow" data-move="-1" aria-label="Day before">‹</button><button type="button" class="btn btn-outline btn-sm" data-move="0">Today</button><button type="button" class="st-arrow" data-move="1" aria-label="Next day">›</button>
          <label class="vn-date"><span class="visually-hidden">Go to date</span><input type="date" id="vnDate" value="${esc(day)}"></label>
          <span class="st-range">${esc(fmt(day, { weekday: "long", month: "long", day: "numeric" }))}</span></div>
        <div class="st-nav">${D.admin ? `<button type="button" class="btn btn-outline btn-sm" id="vnEdit">Edit venues</button>` : ""}<button type="button" class="btn btn-primary btn-sm" data-new="">+ Reserve a venue</button></div>
      </div>
      <div class="vn-grid"><div class="vn-row vn-head"><div class="vn-name"></div><div class="vn-hours">${hours.map(h => `<span>${h % 2 ? "" : t12(p2(h) + ":00").replace(":00", "")}</span>`).join("")}</div></div>${rows}</div>
      <p class="st-hint"><span class="vn-key reservation"></span> Reserved <span class="vn-key event"></span> Event from the form <span class="vn-key calendar"></span> On a calendar (a heads-up) <span class="vn-key pad"></span> Setup / cleanup. Tap an open time to reserve it.</p>
      <section class="st-lists">
        <div class="st-ltop"><div class="mtabs" role="tablist">${[["up", "Upcoming", up.length], ["past", "Past", past.length], ["off", "Cancelled", off.length]].map(([k, l, n]) => `<button type="button" role="tab" data-view="${k}" aria-selected="${view === k}">${l}<span class="n">${n}</span></button>`).join("")}</div></div>
        ${list.length ? `<div class="st-list">${list.slice(0, 150).map(r => `<button type="button" class="st-item${r.status === "Reserved" ? "" : " off"}" data-res="${esc(r.id)}">
            <span class="vn-ico" aria-hidden="true">📍</span>
            <span class="st-who"><span class="st-line"><b>${esc(r.what)}</b> <span>· ${esc(r.venues.join(", "))}</span></span>
              <span class="st-sub">${esc(fmt(r.date, { weekday: "short", month: "short", day: "numeric" }))}, ${esc(range(r.start, r.end))}${r.repeats ? " · " + esc(r.repeats.toLowerCase()) + " until " + esc(fmt(r.until, { month: "short", day: "numeric" })) : ""}${r.setup ? " · +" + r.setup + " hr setup/cleanup" : ""}${r.host ? " · " + esc(r.host) : ""}</span></span></button>`).join("")}</div>`
          : `<p class="st-empty">${view === "up" ? "No upcoming reservations." : view === "past" ? "No past reservations yet." : "Nothing cancelled."}</p>`}
      </section>`;
    root.querySelectorAll("[data-move]").forEach(b => b.onclick = () => { const m = +b.dataset.move; go(m ? add(day, m) : D.today); });
    root.querySelector("#vnDate").onchange = e => { if (e.target.value) go(e.target.value); };
    root.querySelectorAll("[data-new]").forEach(b => b.onclick = () => form(null));
    root.querySelectorAll(".vn-track").forEach(t => t.onclick = e => {
      if (e.target.closest(".vn-bar")) return;
      const r = t.getBoundingClientRect(), m = H0 * 60 + Math.floor((e.clientX - r.left) / r.width * span / 30) * 30;
      form(null, { venues: [t.dataset.venue], start: p2(Math.floor(m / 60)) + ":" + p2(m % 60), end: p2(Math.min(23, Math.floor(m / 60) + 1)) + ":" + p2(m % 60) });
    });
    root.querySelectorAll("[data-busy]").forEach(b => b.onclick = () => busyInfo(D.busy[+b.dataset.busy]));
    root.querySelectorAll("[data-res]").forEach(b => b.onclick = () => details(D.reservations.find(r => r.id === b.dataset.res)));
    root.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; draw(); });
    const ed = root.querySelector("#vnEdit"); if (ed) ed.onclick = editVenues;
  }
  function go(d) { root.querySelector(".vn-grid").style.opacity = .5; load(d); }

  /* ---------- Dialogs ---------- */
  function openDlg(html) {
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "dates-dlg vn-dlg"; dlg.innerHTML = `<div class="dd-in"></div>`; document.body.appendChild(dlg); dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); }
    dlg.firstElementChild.innerHTML = html; if (!dlg.open) dlg.showModal();
    dlg.querySelectorAll("[data-close]").forEach(b => b.onclick = () => dlg.close());
    return dlg.firstElementChild;
  }
  function errMsg(box, err) { let el = box.querySelector(".dd-err"); if (!el) { el = document.createElement("p"); el.className = "dd-err"; box.querySelector(".dd-btns").before(el); } el.textContent = err.message + "."; return el; }
  function busyInfo(b) {
    if (b.kind === "reservation") return details(D.reservations.find(r => r.id === b.id));
    openDlg(`<div class="dd-head"><div><h2>${esc(b.title)}</h2><p>${esc(b.venue)} · ${esc(fmt(b.date, { weekday: "short", month: "short", day: "numeric" }))}, ${esc(range(b.start, b.end))}</p></div><button type="button" class="dd-x" data-close aria-label="Close">×</button></div>
      <p>${b.kind === "event" ? `An event from the event form (${esc(b.status.toLowerCase())}). It holds ${esc(b.venue)} automatically.` : `On the ${esc(b.status.toLowerCase())}. It mentions ${esc(b.venue)}, so it shows here as a heads-up; it doesn't block reservations.`}</p>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" data-close>Close</button></div>`);
  }
  function details(r) {
    const box = openDlg(`<div class="dd-head"><div><h2>${esc(r.what)}</h2><p>${esc(r.venues.join(", "))}</p></div><button type="button" class="dd-x" data-close aria-label="Close">×</button></div>
      <dl class="st-dl"><dt>When</dt><dd>${esc(fmt(r.date, { weekday: "long", month: "long", day: "numeric" }))}, ${esc(range(r.start, r.end))}</dd>
        ${r.repeats ? `<dt>Repeats</dt><dd>${esc(r.repeats)} until ${esc(fmt(r.until, { month: "long", day: "numeric" }))}</dd>` : ""}
        ${r.setup ? `<dt>Setup</dt><dd>${r.setup} hr before and after</dd>` : ""}
        ${r.host ? `<dt>Host</dt><dd>${esc(r.host)}</dd>` : ""}${r.notes ? `<dt>Notes</dt><dd class="st-notes">${esc(r.notes)}</dd>` : ""}
        ${r.status !== "Reserved" ? `<dt>Status</dt><dd>${esc(r.status)}</dd>` : ""}${r.bookedBy ? `<dt>Reserved by</dt><dd>${esc(r.bookedBy)}</dd>` : ""}</dl>
      <div class="dd-btns">${r.canEdit && r.status === "Reserved" ? `<button class="dd-link" id="vnCancel">Cancel reservation</button><button class="btn btn-forest btn-sm" id="vnEditR">Edit</button>` : `<span class="st-hint" style="margin-right:auto">${r.status === "Reserved" ? "Only the person who reserved it, or an admin, can change it." : ""}</span>`}<button class="btn btn-outline btn-sm" data-close>Close</button></div>`);
    const e = box.querySelector("#vnEditR"); if (e) e.onclick = () => form(r);
    const c = box.querySelector("#vnCancel"); if (c) c.onclick = () => {
      const b2 = openDlg(`<h2>Cancel ${esc(r.what)}?</h2><p>${esc(r.venues.join(", "))}${r.repeats ? ", every date" : ""}. It comes off the residents' calendar.</p>
        <div class="dd-btns"><button class="btn btn-outline btn-sm" id="vnNo">Keep it</button><button class="btn btn-primary btn-sm" id="vnYes">Cancel it</button></div>`);
      b2.querySelector("#vnNo").onclick = () => details(r);
      b2.querySelector("#vnYes").onclick = async ev => { const b = ev.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { D = await call({ action: "venueCancel", id: r.id, date: day }); dlg.close(); draw(D.message); } catch (err) { b.disabled = false; b.textContent = "Try again"; errMsg(b2, err); } };
    };
  }
  function form(r, pre) {
    const isNew = !r;
    r = r || Object.assign({ venues: [], what: "", date: day, start: "18:00", end: "20:00", setup: 0, repeatKey: "none", until: "", host: D.me || "", notes: "" }, pre || {});
    const chosen = new Set(r.venues);
    const box = openDlg(`<h2>${isNew ? "Reserve a venue" : "Edit reservation"}</h2>
      <form id="vnForm" class="st-form" novalidate>
        <label class="dd-f">What's it for<input name="what" maxlength="100" value="${esc(r.what)}" placeholder="Book club, Rehearsal, Birthday party"></label>
        <div class="dd-f"><span>Where <span class="opt">(pick one or more)</span></span><div class="vn-pick">${D.venues.filter(v => v.reservable).map(v => `<label><input type="checkbox" value="${esc(v.name)}"${chosen.has(v.name) ? " checked" : ""}><span>${esc(v.name)}</span></label>`).join("")}</div></div>
        <label class="dd-f">Date<input type="date" name="date" value="${esc(r.date)}"></label>
        <div class="dd-two"><label class="dd-f">Starts<input type="time" name="start" value="${esc(r.start)}" step="900"></label><label class="dd-f">Ends<input type="time" name="end" value="${esc(r.end)}" step="900"></label></div>
        <label class="dd-chk"><input type="checkbox" name="pad"${r.setup ? " checked" : ""}> Add setup &amp; cleanup time</label>
        <label class="dd-f vn-padf" ${r.setup ? "" : "hidden"}>Hours before and after<input type="number" name="setup" min="0.25" max="6" step="0.25" value="${esc(r.setup || 1)}"></label>
        <div class="dd-two"><label class="dd-f">Repeats<select name="repeats">${REPEATS.map(([k, l]) => `<option value="${k}"${k === r.repeatKey ? " selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="dd-f vn-until" ${r.repeatKey === "none" ? "hidden" : ""}>Until<input type="date" name="until" value="${esc(r.until)}"></label></div>
        <label class="dd-f">Host<input name="host" maxlength="80" value="${esc(r.host)}" placeholder="Who's in charge"></label>
        <label class="dd-f">Notes <span class="opt">(optional)</span><textarea name="notes" maxlength="1000" placeholder="We'll need the folding tables.">${esc(r.notes)}</textarea></label>
      </form>
      <div class="vn-clash" hidden></div>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" id="vnBack">${isNew ? "Cancel" : "Back"}</button><button class="btn btn-forest btn-sm" id="vnGo">${isNew ? "Reserve" : "Save"}</button></div>`);
    const f = box.querySelector("#vnForm"), val = n => f.elements[n].value;
    f.elements.pad.onchange = () => box.querySelector(".vn-padf").hidden = !f.elements.pad.checked;
    f.elements.repeats.onchange = () => box.querySelector(".vn-until").hidden = val("repeats") === "none";
    box.querySelectorAll(".vn-pick input").forEach(c => c.onchange = () => { c.checked ? chosen.add(c.value) : chosen.delete(c.value); });
    box.querySelector("#vnBack").onclick = () => isNew ? dlg.close() : details(r);
    const save = async (extra) => {
      const b = box.querySelector("#vnGo");
      const body = Object.assign({ action: "venueSave", id: isNew ? "" : r.id, venues: [...chosen], what: val("what"), date: val("date"), start: val("start"), end: val("end"),
        setup: f.elements.pad.checked ? Number(val("setup")) || 1 : 0, repeats: val("repeats"), until: val("until"), host: val("host"), notes: val("notes") }, extra || {});
      if (!body.what.trim()) { f.elements.what.focus(); return errMsg(box, new Error("Say what it's for")); }
      if (!body.venues.length) return errMsg(box, new Error("Pick at least one venue"));
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      const cl = box.querySelector(".vn-clash"); cl.hidden = true;
      try { D = await call(body); dlg.close(); day = body.date >= D.today ? body.date : day; load(day, D.message); }
      catch (err) {
        b.disabled = false; b.textContent = isNew ? "Reserve" : "Save";
        if (!err.clash) return errMsg(box, err);
        const old = box.querySelector(".dd-err"); if (old) old.remove();
        const li = x => `<li><b>${esc(x.venue)}</b> · ${esc(x.when)}${x.title ? ": " + esc(x.title) : ""}</li>`;
        cl.hidden = false;
        cl.innerHTML = err.blocks.length
          ? `<p><b>Already reserved then:</b></p><ul>${err.blocks.map(li).join("")}</ul>${err.headsUp.length ? `<p>Also happening:</p><ul>${err.headsUp.map(li).join("")}</ul>` : ""}<p>Pick another time or venue.${err.canForce ? " As an admin you can reserve it anyway." : ""}</p>${err.canForce ? `<p><button type="button" class="btn btn-outline btn-sm" id="vnForce">Reserve anyway</button></p>` : ""}`
          : `<p><b>Heads-up, these are happening there then:</b></p><ul>${err.headsUp.map(li).join("")}</ul><p>This place can be shared. Still want to reserve it?</p><p><button type="button" class="btn btn-forest btn-sm" id="vnSure">Yes, reserve it</button></p>`;
        const s1 = cl.querySelector("#vnSure"); if (s1) s1.onclick = () => save({ confirm: true });
        const s2 = cl.querySelector("#vnForce"); if (s2) s2.onclick = () => save({ confirm: true, force: true });
        cl.scrollIntoView({ block: "nearest" });
      }
    };
    box.querySelector("#vnGo").onclick = () => save();
  }
  function editVenues() {
    const rows = D.venues.map(v => Object.assign({}, v, { aliases: v.aliases.join(", ") }));
    const box = openDlg(`<h2>Venues</h2><p>"Public" = anyone can pick it in the event form; the rest only show for residents, approved volunteers and admins. "Can share" = overlapping reservations get a heads-up instead of being refused. "Also called" helps match calendar events and older posts.</p>
      <div class="vn-edit" id="vnRows"></div><p><button type="button" class="btn btn-outline btn-sm" id="vnAdd">+ Add a venue</button></p>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" data-close>Cancel</button><button class="btn btn-forest btn-sm" id="vnSaveList">Save</button></div>`);
    const paint = () => {
      box.querySelector("#vnRows").innerHTML = rows.map((v, i) => `<div class="vn-er" data-i="${i}">
        <input data-k="name" value="${esc(v.name)}" placeholder="Venue name" aria-label="Venue name">
        <input data-k="aliases" value="${esc(v.aliases)}" placeholder="Also called" aria-label="Also called">
        <label title="Anyone can pick it in the event form"><input type="checkbox" data-k="public"${v.public ? " checked" : ""}> Public</label>
        <label title="Residents and admins can reserve it"><input type="checkbox" data-k="reservable"${v.reservable ? " checked" : ""}> Reservable</label>
        <label title="Overlaps get a heads-up instead of being refused"><input type="checkbox" data-k="shared"${v.shared ? " checked" : ""}> Can share</label>
        <button type="button" class="vn-x" data-rm="${i}" aria-label="Remove ${esc(v.name || "this venue")}" title="Remove">×</button></div>`).join("");
      box.querySelectorAll(".vn-er [data-k]").forEach(el => el.oninput = el.onchange = () => { const v = rows[+el.closest(".vn-er").dataset.i]; v[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; });
      box.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { rows.splice(+b.dataset.rm, 1); paint(); });
    };
    paint();
    box.querySelector("#vnAdd").onclick = () => { rows.push({ name: "", aliases: "", public: false, reservable: true, shared: false, notes: "" }); paint(); box.querySelector(".vn-er:last-child input").focus(); };
    box.querySelector("#vnSaveList").onclick = async ev => { const b = ev.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { D = await call({ action: "venueListSave", venues: rows, date: day }); dlg.close(); draw(D.message); } catch (err) { b.disabled = false; b.textContent = "Save"; errMsg(box, err); } };
  }

  /* ---------- Preview mode ---------- */
  let demoD = null;
  async function demo(b) {
    await new Promise(r => setTimeout(r, 250));
    const n = new Date(), today = n.getFullYear() + "-" + p2(n.getMonth() + 1) + "-" + p2(n.getDate());
    if (!demoD) {
      const V = (name, pub, shared, res) => ({ name, aliases: [], public: pub, reservable: res !== false, shared, notes: "" });
      demoD = { venues: [V("Event Barn (Autoshop)", true, false), V("Main House", true, true), V("Main House – Sunroom/Porch", false, false), V("Modular 1 – Small Dance Studio", false, false),
          V("Modular 1 – Kitchenette", false, false), V("Modular 2 – Plant Room", false, false), V("Yurt", true, false), V("Woodshop", false, false), V("Basement", false, false), V("Garage", false, false),
          V("Main Grass Area & Picnic Tables", true, true), V("Garden", true, true), V("Goat Pen", true, true), V("Chicken Coop", true, true), V("Prayer Labyrinth", true, true), V("Meadow & Stage", true, true),
          V("Playground", false, true), V("Pool", false, true), V("Orchard", false, true), V("Creek", false, true), V("Hills", true, true, false)],
        res: [{ id: "r1", venues: ["Yurt"], what: "Book club", date: today, start: "19:00", end: "21:00", setup: 0.5, repeats: "Weekly", repeatKey: "weekly", until: add(today, 60), host: "Lindsey", notes: "", status: "Reserved", canEdit: true, bookedBy: "you@example.com" },
          { id: "r2", venues: ["Modular 1 – Small Dance Studio"], what: "Dance practice", date: today, start: "10:00", end: "11:30", setup: 0, repeats: "", repeatKey: "none", until: "", host: "Theresa", notes: "", status: "Reserved", canEdit: false }],
        extra: [{ kind: "event", id: "EV-1", venue: "Event Barn (Autoshop)", start: "17:00", end: "21:00", title: "Play Night", status: "On the calendar" },
          { kind: "calendar", id: "c1", venue: "Main House – Sunroom/Porch", start: "17:30", end: "20:00", title: "Supper Church: Porch", status: "Residents' calendar" }] };
    }
    if (b.action === "venueSave") {
      if (b.venues.includes("Event Barn (Autoshop)") && b.start < "21:00" && b.end > "17:00" && !b.force) return Promise.reject(Object.assign(new Error("Event Barn (Autoshop) is already reserved then"), { clash: true, blocks: [{ venue: "Event Barn (Autoshop)", when: "Today, 5pm–9pm", title: "Play Night" }], headsUp: [], canForce: true }));
      const o = { venues: b.venues, what: b.what, date: b.date, start: b.start, end: b.end, setup: b.setup, repeatKey: b.repeats, repeats: b.repeats === "none" ? "" : REPEATS.find(x => x[0] === b.repeats)[1], until: b.until, host: b.host, notes: b.notes, status: "Reserved", canEdit: true };
      if (b.id) Object.assign(demoD.res.find(x => x.id === b.id), o); else demoD.res.push(Object.assign({ id: "n" + Date.now() }, o));
    }
    if (b.action === "venueCancel") demoD.res.find(x => x.id === b.id).status = "Cancelled";
    if (b.action === "venueListSave") demoD.venues = b.venues.filter(v => v.name).map(v => Object.assign({}, v, { aliases: String(v.aliases || "").split(/\s*,\s*/).filter(Boolean) }));
    const d = b.date || today;
    const busy = demoD.res.filter(r => r.status === "Reserved" && (r.date === d || (r.repeatKey === "weekly" && r.date <= d && (r.until || d) >= d && (parse(d) - parse(r.date)) / DAY % 7 === 0)))
      .flatMap(r => r.venues.map(v => ({ kind: "reservation", id: r.id, venue: v, date: d, start: r.start, end: r.end, padStart: p2(Math.max(0, Math.floor((mins(r.start) - r.setup * 60) / 60))) + ":" + p2((mins(r.start) - r.setup * 60) % 60), padEnd: p2(Math.floor((mins(r.end) + r.setup * 60) / 60)) + ":" + p2((mins(r.end) + r.setup * 60) % 60), title: r.what, host: r.host })))
      .concat(d === today ? demoD.extra.map(x => Object.assign({ date: d, padStart: x.start, padEnd: x.end }, x)) : []);
    return JSON.parse(JSON.stringify({ ok: true, admin: true, me: "Lindsey Huffman", today, date: d, days: 1, venues: demoD.venues, busy,
      reservations: demoD.res.map(r => Object.assign({ last: r.until || r.date }, r)), message: { venueSave: b.id ? "Saved. The residents' calendar is updated." : "Reserved. It's on the residents' calendar.", venueCancel: "Cancelled. It's off the residents' calendar.", venueListSave: "Saved. The event form uses the new list right away." }[b.action] || "" }));
  }

  window.HLVenues = { mount };
})();
