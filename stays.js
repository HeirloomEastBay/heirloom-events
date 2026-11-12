/* Heirloom Activities — Guest rooms: overnight stays in the guest rooms.
   Tonight (a card per room), a timeline of the rooms across the coming weeks,
   upcoming and past stays. Residents and admins can add stays; whoever booked
   a stay (or an admin) can change or cancel it. Used on stays.html and on the
   Admin page: HLStays.mount(element) */
(function () {
  const C = window.HEIRLOOM;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const DAY = 86400000;
  const p2 = n => String(n).padStart(2, "0");
  const ymd = d => d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate());
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const add = (s, n) => ymd(new Date(+parse(s) + n * DAY));
  const diff = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
  const fmt = (s, o) => parse(s).toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  const short = s => fmt(s, { weekday: "short", month: "short", day: "numeric" });
  const t12 = hm => { if (!hm) return ""; const [h, m] = hm.split(":").map(Number); return ((h % 12) || 12) + (m ? ":" + p2(m) : "") + (h < 12 ? "am" : "pm"); };
  const nightsTxt = s => { const n = diff(s.checkin, s.checkout); return n <= 0 ? "Day visit" : n + " night" + (n === 1 ? "" : "s"); };
  const live = s => /^(Booked|Blocked)$/.test(s.status);
  const roomsTxt = rooms => (rooms.length === 1 ? "Room " : "Rooms ") + rooms.join(rooms.length === 2 ? " & " : ", ");
  const nightsOf = s => { const n = diff(s.checkin, s.checkout); if (n <= 0) return [s.checkin]; const o = []; for (let i = 0; i < n; i++) o.push(add(s.checkin, i)); return o; };

  let root, D, start, view = "up", q = "", dlg;
  const SPAN = () => (window.innerWidth < 640 ? 14 : 28);

  function token() { try { return (JSON.parse(localStorage.getItem("heirloom-session") || "null") || {}).token; } catch (e) { return ""; } }
  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: token() }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); e.signedOut = r.signedOut; e.notAllowed = r.notAllowed; throw e; }
    return r;
  }

  // The last list we got, so the page shows right away next time (per signed-in person)
  const CACHE = "heirloom-stays-v1";
  function cached() { try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); return c && c.token === token() ? c.D : null; } catch (e) { return null; } }
  function keep(d) { try { localStorage.setItem(CACHE, JSON.stringify({ token: token(), D: d })); } catch (e) { /* fine */ } }
  const busy = () => dlg && dlg.open;

  async function mount(el, opts) {
    root = el; opts = opts || {};
    const c = DEMO ? null : cached();
    if (c) { D = c; start = start || add(D.today, -2); draw(); }
    else root.innerHTML = `<p class="st-load">Loading the guest rooms…</p>`;
    try {
      // 1) What's saved in the Guest stays tab (quick)
      const fresh = await call({ action: "staysGet" });
      if (root !== el) return;
      D = fresh; keep(D);
      if (window.HLNav) HLNav.setRoles({ email: D.email, admin: !!D.admin, resident: true });
      start = start || add(D.today, -2);
      if (!busy()) draw();
      // 2) Then check the residents' calendar for upcoming stays added or changed there
      call({ action: "staysSync", refresh: !!opts.refresh }).then(r => {
        if (!r.changed || !r.stays || root !== el) return;
        D = r; keep(D);
        if (!busy() && root.isConnected) draw();
      }).catch(() => { /* the saved list is fine */ });
    } catch (err) {
      if (c) return; // keep showing the saved list
      root.innerHTML = err.signedOut ? `<div class="empty"><h2>Please log in</h2><p>We'll email you a code, then bring you back here.</p><p style="margin-top:12px"><a class="btn btn-primary" href="mine.html?next=stays">Log in</a></p></div>`
        : `<div class="empty"><h2>${err.notAllowed ? "Just for residents" : "We couldn't load the guest rooms"}</h2><p>${esc(err.message)}.</p>${err.notAllowed ? "" : `<p style="margin-top:12px"><button class="btn btn-primary" id="stRetry">Try again</button></p>`}</div>`;
      const r = root.querySelector("#stRetry"); if (r) r.onclick = () => mount(root, opts);
    }
  }

  function staysIn(room, day) { return D.stays.filter(s => live(s) && s.rooms.includes(room) && nightsOf(s).includes(day)); }

  function draw(msg) {
    const today = D.today, span = SPAN(), end = add(start, span);
    const days = []; for (let i = 0; i < span; i++) days.push(add(start, i));
    // Tonight
    const tonight = D.rooms.map(room => {
      const s = staysIn(room, today)[0], leaving = D.stays.filter(x => live(x) && x.rooms.includes(room) && x.checkout === today && diff(x.checkin, x.checkout) > 0)[0];
      const next = !s && D.stays.filter(x => live(x) && x.rooms.includes(room) && x.checkin > today).sort((a, b) => a.checkin.localeCompare(b.checkin))[0];
      if (s) return `<button type="button" class="st-room full${s.status === "Blocked" ? " blocked" : ""}" data-stay="${esc(s.id)}">
          <span class="st-rn">Room ${esc(room)}</span><b>${esc(s.status === "Blocked" ? "Blocked" : s.guest)}</b>
          <span>${s.purpose ? esc(s.purpose) + " · " : ""}${s.checkout === today ? "leaves today" : "until " + esc(short(s.checkout))}</span></button>`;
      return `<button type="button" class="st-room open" data-new="${esc(room)}"><span class="st-rn">Room ${esc(room)}</span><b>Open tonight</b>
          <span>${leaving ? esc(leaving.guest) + " leaves today" : next ? "Next: " + esc(next.guest || "Blocked") + ", " + esc(short(next.checkin)) : "Nothing booked ahead"}</span></button>`;
    }).join("");
    // Timeline
    const W = 100 / span;
    const head = days.map(d => { const dt = parse(d), wk = dt.getUTCDay(); return `<div class="st-d${d === today ? " today" : ""}${wk === 0 || wk === 6 ? " wknd" : ""}">
      <span>${fmt(d, { weekday: "narrow" })}</span><b>${dt.getUTCDate()}</b>${dt.getUTCDate() === 1 || d === start ? `<i>${fmt(d, { month: "short" })}</i>` : ""}</div>`; }).join("");
    const rows = D.rooms.map(room => {
      const bars = D.stays.filter(s => live(s) && s.rooms.includes(room) && s.checkout >= start && s.checkin < end).map(s => {
        const n = Math.max(0, diff(s.checkin, s.checkout));
        let a = diff(start, s.checkin) + (n ? .5 : .1), b = n ? a + n : a + .8;
        const cutL = a < 0, cutR = b > span;
        a = Math.max(0, a); b = Math.min(span, b);
        if (b <= a) return "";
        return `<button type="button" class="st-bar${s.status === "Blocked" ? " blocked" : ""}${s.canEdit ? " own" : ""}${cutL ? " cutl" : ""}${cutR ? " cutr" : ""}" data-stay="${esc(s.id)}"
          style="left:${a * W}%;width:${(b - a) * W}%" title="${esc((s.status === "Blocked" ? "Blocked" : s.guest) + (s.purpose ? " (" + s.purpose + ")" : "") + " · " + short(s.checkin) + " → " + short(s.checkout))}">
          ${esc(s.status === "Blocked" ? "Blocked" + (s.purpose ? " · " + s.purpose : "") : s.guest + (s.purpose ? " (" + s.purpose + ")" : ""))}</button>`;
      }).join("");
      const cells = days.map(d => `<button type="button" class="st-c${d === today ? " today" : ""}" data-new="${esc(room)}" data-day="${d}" aria-label="Add a stay in Room ${esc(room)} on ${esc(short(d))}"></button>`).join("");
      return `<div class="st-row"><div class="st-rl">Room ${esc(room)}</div><div class="st-track"><div class="st-cells" style="grid-template-columns:repeat(${span},1fr)">${cells}</div>${bars}</div></div>`;
    }).join("");
    // Lists
    const up = D.stays.filter(s => live(s) && s.checkout >= today);
    const past = D.stays.filter(s => s.checkout < today && live(s)).reverse();
    const off = D.stays.filter(s => !live(s)).reverse();
    const list = (view === "up" ? up : view === "past" ? past : off).filter(s => !q || [s.guest, s.purpose, s.host, s.notes, roomsTxt(s.rooms)].join(" ").toLowerCase().includes(q.toLowerCase()));
    root.innerHTML = `
      ${msg ? `<p class="st-msg" role="status">${esc(msg)}</p>` : ""}
      <section class="st-tonight" aria-label="Tonight"><h3>Tonight · ${esc(fmt(today, { weekday: "long", month: "long", day: "numeric" }))}</h3><div class="st-rooms">${tonight}</div></section>
      <section class="st-tl">
        <div class="st-bar-top">
          <div class="st-nav"><button type="button" class="st-arrow" data-move="-1" aria-label="Earlier">‹</button><button type="button" class="btn btn-outline btn-sm" data-move="0">Today</button><button type="button" class="st-arrow" data-move="1" aria-label="Later">›</button>
            <span class="st-range">${esc(fmt(start, { month: "short", day: "numeric" }))} – ${esc(fmt(add(end, -1), { month: "short", day: "numeric", year: "numeric" }))}</span></div>
          <button type="button" class="btn btn-primary btn-sm" data-new="">+ Add a stay</button>
        </div>
        <div class="st-grid"><div class="st-row st-headrow"><div class="st-rl"></div><div class="st-days" style="grid-template-columns:repeat(${span},1fr)">${head}</div></div>${rows}</div>
        <p class="st-hint">Tap an empty day to add a stay there, or a name to see the stay. Check-in ${esc(D.checkinTime)} · check-out ${esc(D.checkoutTime)}.</p>
      </section>
      <section class="st-lists">
        <div class="st-ltop"><div class="mtabs" role="tablist">${[["up", "Upcoming", up.length], ["past", "Past stays", past.length], ["off", "Cancelled", off.length]].map(([k, l, n]) => `<button type="button" role="tab" data-view="${k}" aria-selected="${view === k}">${l}<span class="n">${n}</span></button>`).join("")}</div>
          <input type="search" id="stQ" placeholder="Search guests, notes, rooms" value="${esc(q)}" aria-label="Search stays"></div>
        ${list.length ? `<div class="st-list">${list.slice(0, 150).map(s => `<button type="button" class="st-item${live(s) ? "" : " off"}" data-stay="${esc(s.id)}">
            <span class="st-chips">${s.rooms.map(r => `<span>${esc(r)}</span>`).join("")}</span>
            <span class="st-who"><span class="st-line"><b>${esc(s.status === "Blocked" ? "Blocked" : s.guest)}</b>${s.purpose ? ` <span>(${esc(s.purpose)})</span>` : ""}</span>
              <span class="st-sub">${esc(short(s.checkin))} → ${esc(short(s.checkout))} · ${esc(nightsTxt(s))}${s.guests ? " · " + s.guests + " " + (s.guests == 1 ? "person" : "people") : ""}${s.host ? " · host: " + esc(s.host) : ""}${!live(s) ? " · " + esc(s.status) : ""}</span></span>
          </button>`).join("")}</div>${list.length > 150 ? `<p class="st-hint">Showing 150. Search to find older stays.</p>` : ""}`
          : `<p class="st-empty">${q ? "No stays match that." : view === "up" ? "No upcoming stays." : view === "past" ? "No past stays yet." : "Nothing cancelled."}</p>`}
      </section>`;
    root.querySelectorAll("[data-move]").forEach(b => b.onclick = () => { const m = +b.dataset.move; start = m ? add(start, m * Math.round(SPAN() / 2)) : add(D.today, -2); draw(); });
    root.querySelectorAll("[data-new]").forEach(b => b.onclick = () => form(null, b.dataset.new, b.dataset.day));
    root.querySelectorAll("[data-stay]").forEach(b => b.onclick = () => details(D.stays.find(s => s.id === b.dataset.stay)));
    root.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; draw(); });
    const qi = root.querySelector("#stQ"); qi.oninput = () => { q = qi.value; const pos = qi.selectionStart; draw(); const n = root.querySelector("#stQ"); n.focus(); n.setSelectionRange(pos, pos); };
  }

  /* ---------- Dialogs ---------- */
  function openDlg(html) {
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "dates-dlg st-dlg"; dlg.innerHTML = `<div class="dd-in"></div>`; document.body.appendChild(dlg); dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); }
    dlg.firstElementChild.innerHTML = html; if (!dlg.open) dlg.showModal();
    dlg.querySelectorAll("[data-close]").forEach(b => b.onclick = () => dlg.close());
    return dlg.firstElementChild;
  }
  function details(s) {
    const box = openDlg(`<div class="dd-head"><div><h2>${esc(s.status === "Blocked" ? "Blocked" : s.guest)}</h2><p>${esc(roomsTxt(s.rooms))}${s.purpose ? " · " + esc(s.purpose) : ""}</p></div><button type="button" class="dd-x" data-close aria-label="Close">×</button></div>
      <dl class="st-dl">
        <dt>Check-in</dt><dd>${esc(fmt(s.checkin, { weekday: "long", month: "long", day: "numeric" }))}${s.arriving ? ", arriving ~" + esc(t12(s.arriving)) : ""}</dd>
        <dt>Check-out</dt><dd>${esc(fmt(s.checkout, { weekday: "long", month: "long", day: "numeric" }))}${s.leaving ? ", leaving ~" + esc(t12(s.leaving)) : ""}</dd>
        <dt>Length</dt><dd>${esc(nightsTxt(s))}${s.guests ? " · " + s.guests + " " + (s.guests == 1 ? "person" : "people") : ""}</dd>
        ${s.host ? `<dt>Host</dt><dd>${esc(s.host)}</dd>` : ""}
        ${s.email || s.phone ? `<dt>Contact</dt><dd>${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ""}${s.email && s.phone ? " · " : ""}${s.phone ? `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ""))}">${esc(s.phone)}</a>` : ""}</dd>` : ""}
        ${s.notes ? `<dt>Notes</dt><dd class="st-notes">${esc(s.notes)}</dd>` : ""}
        ${!live(s) ? `<dt>Status</dt><dd>${esc(s.status)}</dd>` : ""}
        ${s.bookedBy ? `<dt>Booked by</dt><dd>${esc(s.bookedBy)}${s.source === "Google Calendar" ? " (in Google Calendar)" : ""}</dd>` : ""}
      </dl>
      <div class="dd-btns">${s.canEdit && live(s) ? `<button class="dd-link" id="stCancel">Cancel this stay</button><button class="btn btn-forest btn-sm" id="stEdit">Edit</button>` : `<span class="st-hint" style="margin-right:auto">${live(s) ? "Only the person who booked it, or an admin, can change it." : ""}</span>`}<button class="btn btn-outline btn-sm" data-close>Close</button></div>`);
    const e = box.querySelector("#stEdit"); if (e) e.onclick = () => form(s);
    const c = box.querySelector("#stCancel"); if (c) c.onclick = () => {
      const b2 = openDlg(`<h2>Cancel ${esc(s.status === "Blocked" ? "this block" : s.guest + "'s stay")}?</h2><p>${esc(roomsTxt(s.rooms))}, ${esc(short(s.checkin))} → ${esc(short(s.checkout))}. It comes off the residents' calendar. It stays in the Sheet under Cancelled.</p>
        <div class="dd-btns"><button class="btn btn-outline btn-sm" id="stNo">Keep it</button><button class="btn btn-primary btn-sm" id="stYes">Cancel the stay</button></div>`);
      b2.querySelector("#stNo").onclick = () => details(s);
      b2.querySelector("#stYes").onclick = async ev => { const b = ev.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
        try { D = await call({ action: "stayCancel", id: s.id }); keep(D); dlg.close(); draw(D.message); } catch (err) { b.disabled = false; b.textContent = "Try again"; errMsg(b2, err); } };
    };
  }
  function errMsg(box, err) { let el = box.querySelector(".dd-err"); if (!el) { el = document.createElement("p"); el.className = "dd-err"; box.querySelector(".dd-btns").before(el); } el.textContent = err.message + "."; }

  function form(s, room, day) {
    const isNew = !s;
    s = s || { rooms: room ? [room] : [], guest: "", purpose: "", checkin: day || D.today, checkout: add(day || D.today, 1), arriving: "", leaving: "", guests: "", email: "", phone: "", host: D.me || "", notes: "", status: "Booked" };
    const box = openDlg(`<h2>${isNew ? "Add a stay" : "Edit stay"}</h2>
      <form id="stForm" class="st-form" novalidate>
        ${D.admin ? `<div class="st-kind" role="radiogroup"><label><input type="radio" name="kind" value="guest"${s.status !== "Blocked" ? " checked" : ""}> A guest</label><label><input type="radio" name="kind" value="block"${s.status === "Blocked" ? " checked" : ""}> Block the room (no guests)</label></div>` : ""}
        <div class="dd-two"><label class="dd-f">Check-in<input type="date" name="checkin" value="${esc(s.checkin)}" required></label>
          <label class="dd-f">Check-out<input type="date" name="checkout" value="${esc(s.checkout)}" required></label></div>
        <div class="dd-f"><span>Room${D.rooms.length > 1 ? "s" : ""}</span><div class="st-pick" id="stPick"></div></div>
        <div class="g-only">
          <label class="dd-f">Guest name<input name="guest" maxlength="80" value="${esc(s.guest)}" placeholder="Sarah Jones, or The Cansler family"></label>
          <label class="dd-f">Who they are / why <span class="opt">(optional, shows in parentheses)</span><input name="purpose" maxlength="80" value="${esc(s.purpose)}" placeholder="Sabbath 365, Lindsey's sister"></label>
        </div>
        <label class="dd-f b-only">Reason <span class="opt">(optional)</span><input name="reason" maxlength="80" value="${esc(s.status === "Blocked" ? s.purpose : "")}" placeholder="Painting, deep clean"></label>
        <div class="g-only">
          <div class="dd-two"><label class="dd-f">Arriving around <span class="opt">(optional)</span><input type="time" name="arriving" value="${esc(s.arriving)}"></label>
            <label class="dd-f">Leaving around <span class="opt">(optional)</span><input type="time" name="leaving" value="${esc(s.leaving)}"></label></div>
          <div class="dd-two"><label class="dd-f">How many people<input type="number" name="guests" min="1" max="40" value="${esc(s.guests)}"></label>
            <label class="dd-f">Host<input name="host" maxlength="80" value="${esc(s.host)}" placeholder="Who's hosting them"></label></div>
          <div class="dd-two"><label class="dd-f">Guest email <span class="opt">(optional)</span><input type="email" name="email" maxlength="120" value="${esc(s.email)}"></label>
            <label class="dd-f">Guest phone <span class="opt">(optional)</span><input type="tel" name="phone" maxlength="40" value="${esc(s.phone)}"></label></div>
          <label class="dd-chk st-notify" hidden><input type="checkbox" name="notifyGuest"${isNew ? " checked" : ""}> Email them a confirmation with the dates and arrival info</label>
        </div>
        <label class="dd-f">Notes <span class="opt">(optional)</span><textarea name="notes" maxlength="1000" placeholder="Allergic to cats. Bringing a dog.">${esc(s.notes)}</textarea></label>
        <p class="st-hint">Guest email and phone are only shown to admins and whoever booked the stay.</p>
      </form>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" id="stBack">${isNew ? "Cancel" : "Back"}</button><button class="btn btn-forest btn-sm" id="stGo">${isNew ? "Book it" : "Save"}</button></div>`);
    const f = box.querySelector("#stForm"), val = n => f.elements[n] ? f.elements[n].value : "";
    const kind = () => { const k = f.querySelector('[name="kind"]:checked'); return k ? k.value : "guest"; };
    const chosen = new Set(s.rooms);
    const paint = () => {
      const ci = val("checkin"), co = val("checkout") || ci;
      const nights = ci ? nightsOf({ checkin: ci, checkout: co < ci ? ci : co }) : [];
      box.querySelector("#stPick").innerHTML = D.rooms.map(r => {
        const taken = D.stays.find(x => x.id !== s.id && live(x) && x.rooms.includes(r) && nightsOf(x).some(n => nights.includes(n)));
        if (taken && chosen.has(r)) chosen.delete(r);
        return `<label class="${taken ? "taken" : ""}"><input type="checkbox" value="${esc(r)}"${chosen.has(r) ? " checked" : ""}${taken ? " disabled" : ""}><b>Room ${esc(r)}</b><span>${taken ? "Taken: " + esc(taken.status === "Blocked" ? "blocked" : taken.guest) : "Open"}</span></label>`;
      }).join("");
      box.querySelectorAll("#stPick input").forEach(c => c.onchange = () => { c.checked ? chosen.add(c.value) : chosen.delete(c.value); });
      const blk = kind() === "block";
      box.querySelectorAll(".g-only").forEach(x => x.hidden = blk); box.querySelector(".b-only").hidden = !blk;
      box.querySelector(".st-notify").hidden = blk || !/\S+@\S+\.\S+/.test(val("email"));
    };
    f.addEventListener("change", e => { if (e.target.name === "checkin" && val("checkout") < val("checkin")) f.elements.checkout.value = add(val("checkin"), 1); paint(); });
    f.elements.email.addEventListener("input", paint);
    paint();
    box.querySelector("#stBack").onclick = () => isNew ? dlg.close() : details(s);
    box.querySelector("#stGo").onclick = async ev => {
      const b = ev.currentTarget, blk = kind() === "block";
      const body = { action: "staySave", id: isNew ? "" : s.id, rooms: [...chosen], blocked: blk, guest: val("guest"), purpose: blk ? val("reason") : val("purpose"),
        checkin: val("checkin"), checkout: val("checkout"), arriving: val("arriving"), leaving: val("leaving"), guests: val("guests"), host: val("host"),
        email: val("email"), phone: val("phone"), notes: val("notes"), notifyGuest: !!(f.elements.notifyGuest && f.elements.notifyGuest.checked && !box.querySelector(".st-notify").hidden) };
      if (!body.rooms.length) return errMsg(box, new Error("Pick at least one room"));
      if (!blk && !body.guest.trim()) { f.elements.guest.focus(); return errMsg(box, new Error("Add the guest's name")); }
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try { D = await call(body); keep(D); dlg.close(); if (body.checkin < start || body.checkin >= add(start, SPAN())) start = add(body.checkin, -2); draw(D.message); }
      catch (err) { b.disabled = false; b.textContent = isNew ? "Book it" : "Save"; errMsg(box, err); }
    };
  }

  /* ---------- Preview mode ---------- */
  let demoD = null;
  async function demo(b) {
    await new Promise(r => setTimeout(r, 300));
    const t = ymd(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
    if (!demoD) {
      const mk = (id, rooms, guest, purpose, a, n, extra) => Object.assign({ id, rooms, guest, purpose, checkin: add(t, a), checkout: add(t, a + n), arriving: "", leaving: "", guests: "", email: "", phone: "", host: "", notes: "", status: "Booked", source: "Google Calendar", canEdit: true, bookedBy: "staff@heirloomeastbay.com" }, extra || {});
      demoD = { ok: true, email: "you@example.com", admin: true, me: "Lindsey Huffman", rooms: ["1", "2", "3", "4"], today: t, checkinTime: "3pm", checkoutTime: "11am", inclCheckout: true, stays: [
        mk("a", ["1", "2", "3"], "Cansler Family", "", -100, 10), mk("b", ["1", "2", "3", "4"], "Concord Board Retreat", "", -80, 2), mk("c", ["1"], "Sarah", "Sabbath 365", -5, 4),
        mk("d", ["1"], "Chris", "Norcal", 1, 4, { arriving: "16:00", guests: 1, host: "Brit" }), mk("e", ["3"], "Rachel Kuhn", "", -1, 3), mk("f", ["2", "3"], "Kim Lee", "Lindsey's sister", 6, 3, { guests: 3, email: "kim@example.com", source: "Website" }),
        mk("g", ["4"], "", "Painting", 10, 2, { status: "Blocked" }), mk("h", ["1"], "Briana Clarke", "", 18, 20) ] };
    }
    const out = m => Object.assign({}, JSON.parse(JSON.stringify(demoD)), { message: m || "" });
    if (b.action === "staySave") {
      const busy = demoD.stays.find(x => x.id !== b.id && live(x) && x.rooms.some(r => b.rooms.includes(r)) && nightsOf(x).some(n => nightsOf({ checkin: b.checkin, checkout: b.checkout }).includes(n)));
      if (busy) throw new Error("Room taken then (" + busy.guest + ")");
      const o = { rooms: b.rooms.sort(), guest: b.blocked ? "" : b.guest, purpose: b.purpose, checkin: b.checkin, checkout: b.checkout, arriving: b.arriving, leaving: b.leaving, guests: b.guests, host: b.host, email: b.email, phone: b.phone, notes: b.notes, status: b.blocked ? "Blocked" : "Booked" };
      if (b.id) Object.assign(demoD.stays.find(x => x.id === b.id), o); else demoD.stays.push(Object.assign({ id: "n" + Date.now(), canEdit: true, source: "Website", bookedBy: "you@example.com" }, o));
      demoD.stays.sort((x, y) => x.checkin.localeCompare(y.checkin));
      return out(b.id ? "Saved. The residents' calendar is updated." : "Booked. It's on the residents' calendar.");
    }
    if (b.action === "staysSync") return { ok: true, changed: 0 };
    if (b.action === "stayCancel") { demoD.stays.find(x => x.id === b.id).status = "Cancelled"; return out("Cancelled. It's off the residents' calendar."); }
    return out();
  }

  window.HLStays = { mount };
  window.addEventListener("resize", () => { if (D && root && root.isConnected && !(dlg && dlg.open)) { clearTimeout(window.__stR); window.__stR = setTimeout(draw, 200); } });
})();
