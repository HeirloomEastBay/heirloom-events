/* Heirloom Events — public calendar page
   index.html          → events splash page (hero, schedule, photos, links home)
   index.html?embed=1  → calendar only, for the Squarespace embed */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const params = new URLSearchParams(location.search);
  const EMBED = params.has("embed");
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";

  if (EMBED) document.body.classList.add("embed");

  /* ---------- Fill in links from config ---------- */
  const LINKS = {
    main: C.MAIN_SITE,
    visit: C.MAIN_SITE + "/visit-the-farm-1",
    supper: C.MAIN_SITE + "/supper-church",
    newsletter: C.MAIN_SITE + "/newsletter",
    stay: C.STAY, donate: C.DONATE, instagram: C.INSTAGRAM,
    directions: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(C.ADDRESS),
    email: "mailto:" + C.EMAIL
  };
  document.querySelectorAll("[data-link]").forEach(a => {
    a.href = LINKS[a.dataset.link];
    if (a.dataset.link === "email") a.textContent = C.EMAIL;
    else a.target = "_blank", a.rel = "noopener";
  });
  document.querySelectorAll('[data-text="address"]').forEach(el => el.textContent = C.ADDRESS);
  document.querySelectorAll(".subscribe").forEach(a => a.href = H.subscribeLink());
  // In the embed, links should open outside the iframe
  if (EMBED) document.querySelectorAll('a[href="submit.html"]').forEach(a => a.target = "_top");

  const ICON = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
  };

  let events = [];
  let view = params.get("view") === "month" ? "month" : "list";
  const now = new Date();
  let monthCursor = (() => { const p = H.parts(now); return { y: p.y, m: p.m }; })();
  let selectedDay = null;
  let source = "all";
  let partners = (C.PARTNERS || []).slice();
  // Neighbors and friends hosting something: grouped with community partners
  const COMMUNITY = { slug: "community", label: "Community members", name: "Community member", color: "#4f7a64" };
  const partnerOf = e => e.source === "community" ? COMMUNITY : partners.find(p => p.slug === e.source);
  const byId = {};
  // source: "all" | "heirloom" | "partners" (every community partner) | "p:<slug>" (one partner)
  const isPartner = e => (e.source || "heirloom") !== "heirloom";
  const shownEvents = () => source === "all" ? events
    : source === "heirloom" ? events.filter(e => !isPartner(e))
    : source === "partners" ? events.filter(isPartner)
    : events.filter(e => e.source === source.slice(2));

  /* ---------- Load ---------- */
  // The last events we loaded are kept in the visitor's browser, so a repeat
  // visit shows them instantly while the latest list loads in the background.
  const STORE = "heirloom-feed-v1";
  let linkOpened = false;
  function applyFeed(data) {
    if (data.partners) partners = data.partners;
    if (data.publicCalendarId) { // the Sheet decides which calendar is live
      C.PUBLIC_CALENDAR_ID = data.publicCalendarId;
      document.querySelectorAll(".subscribe").forEach(a => a.href = H.subscribeLink());
    }
    events = data.events.map(e => Object.assign({}, e, {
      start: new Date(e.start), end: e.end ? new Date(e.end) : null,
      image: e.image || H.matchImage(e.title + " " + (e.description || ""), null, null, e.title)
    })).sort((a, b) => a.start - b.start);
  }
  function openLinkOnce() { if (!linkOpened) { linkOpened = true; openFromLink(); } }

  async function load() {
    if (!C.API_URL) {
      renderSkeleton();
      $("#demoBanner").hidden = false;
      events = H.sampleEvents();
      render(); return openFromLink();
    }
    let shown = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (saved && saved.ok && Date.now() - saved.savedAt < 7 * 86400000) { applyFeed(saved); render(); shown = true; }
    } catch (e) { /* no saved copy; that's fine */ }
    if (!shown) renderSkeleton();
    try {
      const res = await fetch(C.API_URL + "?action=events", { redirect: "follow" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not load events");
      try { localStorage.setItem(STORE, JSON.stringify(Object.assign({}, data, { savedAt: Date.now() }))); } catch (e) { /* storage off */ }
      applyFeed(data);
      if (!$("#rsvpDialog").open) render(); // don't redraw under someone mid-RSVP
      openLinkOnce();
    } catch (err) {
      console.error(err);
      if (shown) { openLinkOnce(); return; } // keep showing the saved list
      $("#view").innerHTML = `<div class="empty"><h3>We couldn't load the calendar</h3>
        <p>Please try again in a minute, or <a href="${esc(H.subscribeLink())}" target="_blank" rel="noopener">view it in Google Calendar</a>.</p></div>`;
      resize();
    }
  }

  /* ---------- Render ---------- */
  function render() {
    document.querySelectorAll(".seg button[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    renderSourceTabs();
    renderNextUp();
    if (view === "list") renderList(); else renderMonth();
    resize();
  }

  // All · Heirloom · one tab per partner that has upcoming events
  // All · Heirloom · Community partners (with a row to narrow to one partner)
  function renderSourceTabs() {
    const live = partners.concat([COMMUNITY]).filter(p => events.some(e => e.source === p.slug && +(e.end || e.start) >= +now));
    $("#sourceWrap").hidden = !live.length;
    if (!live.length) { $("#partnerBar").hidden = true; source = "all"; return; }
    if (source.startsWith("p:") && !live.some(p => "p:" + p.slug === source)) source = "partners";
    const top = source.startsWith("p:") ? "partners" : source;
    const seg = $("#sourceSeg");
    seg.innerHTML = [["all", "All"], ["heirloom", "Heirloom"], ["partners", "Community partners"]]
      .map(([v, l]) => `<button type="button" data-source="${v}" aria-pressed="${v === top}">${l}</button>`).join("");
    seg.querySelectorAll("button").forEach(b => b.onclick = () => { source = b.dataset.source; selectedDay = null; render(); });

    const bar = $("#partnerBar");
    bar.hidden = top !== "partners";
    if (top === "partners") {
      bar.innerHTML = `<p>${esc($("#partnerInfo p").textContent)}</p><div class="p-chips" role="group" aria-label="Partner">
        <button type="button" class="p-chip" data-p="partners" aria-pressed="${source === "partners"}">All partners</button>
        ${live.map(p => `<button type="button" class="p-chip" style="--c:${esc(p.color)}" data-p="p:${esc(p.slug)}" aria-pressed="${source === "p:" + p.slug}"><i></i>${esc(p.label)}</button>`).join("")}
      </div>`;
      bar.querySelectorAll(".p-chip").forEach(b => b.onclick = () => { source = b.dataset.p; selectedDay = null; render(); });
    }
  }
  // The ⓘ next to the tabs: tap to open, tap anywhere else to close
  $("#partnerInfoBtn").onclick = ev => {
    ev.stopPropagation();
    const open = $("#partnerInfo").hidden;
    $("#partnerInfo").hidden = !open; $("#partnerInfoBtn").setAttribute("aria-expanded", String(open));
  };
  document.addEventListener("click", ev => {
    if (!ev.target.closest("#partnerInfo")) { $("#partnerInfo").hidden = true; $("#partnerInfoBtn").setAttribute("aria-expanded", "false"); }
  });

  function renderNextUp() {
    const box = $("#nextUp");
    if (!box) return;
    const e = events.find(x => +(x.end || x.start) >= +now && (x.source || "heirloom") === "heirloom") || events.find(x => +(x.end || x.start) >= +now);
    if (!e) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="img"><img src="${esc(e.image)}" alt=""></div>
      <div class="body"><span class="label">Next up</span><h2>${esc(e.title)}</h2>
      <span class="when">${esc(H.fmt(e.start, { weekday: "long", month: "long", day: "numeric" }))} · ${esc(H.fmtTimeRange(e.start, e.end, e.allDay))}</span></div>`;
  }

  function cardHTML(e) {
    const p = H.parts(e.start);
    const chips = [];
    const partner = partnerOf(e);
    if (e.source === "community") chips.push(`<span class="chip partner" style="--c:${esc(COMMUNITY.color)}" title="Hosted by a member of the wider Heirloom community">Hosted by ${esc(e.hostName || "a community member")}</span>`);
    else if (partner) chips.push(`<span class="chip partner" style="--c:${esc(partner.color)}" title="Community partner event">With ${esc(partner.label)}</span>`);
    if (e.recurring) chips.push(`<span class="chip">${esc(e.recurring)}</span>`);
    if (e.cost) chips.push(`<span class="chip cost">${esc(e.cost)}</span>`);
    if (e.rsvp && e.spotsLeft != null) chips.push(e.spotsLeft > 0
      ? `<span class="chip spots">${e.spotsLeft} spot${e.spotsLeft === 1 ? "" : "s"} left</span>`
      : `<span class="chip full">Full · waitlist open</span>`);
    const link = safeUrl(e.link);
    byId[e.id] = e;
    return `<article class="card">
      <div class="card-media">
        <img src="${esc(e.image)}" alt="" loading="lazy">
        <div class="date-tile" aria-hidden="true">
          <div class="dow">${esc(p.wd)}</div><div class="num">${p.d}</div><div class="mon">${esc(H.fmt(e.start, { month: "short" }))}</div>
        </div>
      </div>
      <div class="card-body">
        <h4>${esc(e.title)}</h4>
        <div class="meta">
          <span>${ICON.clock}<span class="visually-hidden">${esc(H.fmt(e.start, { weekday: "long", month: "long", day: "numeric" }))}, </span>${esc(H.fmtTimeRange(e.start, e.end, e.allDay))}</span>
          ${e.location ? `<span>${ICON.pin}${esc(e.location)}</span>` : ""}
        </div>
        ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
        ${e.later && e.later.length ? `<p class="also"><b>Also:</b> ${esc(e.later.slice(0, 4).map(d => H.fmt(d, { month: "short", day: "numeric" })).join(", "))}${e.later.length > 4 ? " and more" : ""}</p>` : ""}
        ${e.description ? `<p class="desc">${esc(e.description)}</p><button class="more" type="button" hidden>Read more</button>` : ""}
        <div class="card-actions">
          ${e.rsvp ? `<button type="button" class="btn btn-primary btn-sm" data-rsvp="${esc(e.id)}">${e.spotsLeft === 0 ? "Join the waitlist" : "RSVP"}</button>` : ""}
          ${link ? `<a class="btn ${e.rsvp ? "btn-outline" : "btn-primary"} btn-sm" href="${esc(link)}" target="_blank" rel="noopener">${esc(e.linkLabel || "Learn more")} ${ICON.arrow}</a>` : ""}
          <a class="btn btn-outline btn-sm" href="${esc(H.addToGoogleLink(e))}" target="_blank" rel="noopener">${ICON.plus} Add to calendar</a>
        </div>
      </div>
    </article>`;
  }

  function wireCards(root) {
    root.querySelectorAll("[data-rsvp]").forEach(b => b.onclick = () => openRsvp(byId[b.dataset.rsvp], b));
    root.querySelectorAll(".desc").forEach(d => {
      const btn = d.nextElementSibling;
      if (d.scrollHeight > d.clientHeight + 2) {
        btn.hidden = false;
        btn.onclick = () => { const open = d.classList.toggle("open"); btn.textContent = open ? "Show less" : "Read more"; resize(); };
      }
    });
  }

  function upcoming() {
    return shownEvents().filter(e => +(e.end || e.start) >= +now);
  }

  // A repeating event shows once (its next date), with the later dates listed underneath
  function collapseSeries(list) {
    const seen = {}, out = [];
    list.forEach(e => {
      if (!e.recurring) return out.push(e);
      const key = String(e.id).split("_")[0] + "|" + e.title;
      if (seen[key]) seen[key].later.push(e.start);
      else { seen[key] = Object.assign({}, e, { later: [] }); out.push(seen[key]); }
    });
    return out;
  }

  function renderList() {
    const list = collapseSeries(upcoming());
    if (!list.length) {
      $("#view").innerHTML = `<div class="empty"><h3>Nothing on the calendar just yet</h3><p>New events are added often, so check back soon.</p></div>`;
      return;
    }
    let html = "", lastMonth = "";
    list.forEach(e => {
      const m = H.fmt(e.start, { month: "long", year: "numeric" });
      if (m !== lastMonth) { html += (lastMonth ? "</div>" : "") + `<div class="month-head"><h3>${esc(m)}</h3></div><div class="cards">`; lastMonth = m; }
      html += cardHTML(e);
    });
    $("#view").innerHTML = html + "</div>";
    wireCards($("#view"));
  }

  function eventsByDay() {
    const map = {};
    shownEvents().forEach(e => {
      let d = new Date(e.start);
      const endKey = e.end ? H.dayKey(new Date(+e.end - (e.allDay ? 1 : 0))) : H.dayKey(e.start);
      for (let i = 0; i < 31; i++) {
        const k = H.dayKey(d);
        (map[k] = map[k] || []).push(e);
        if (k >= endKey) break;
        d = new Date(+d + 86400000);
      }
    });
    return map;
  }

  function renderMonth() {
    const { y, m } = monthCursor;
    const first = H.zoned(y, m, 1, 12);
    const startDow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(H.parts(first).wd);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const todayKey = H.dayKey(now);
    const byDay = eventsByDay();
    const cells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    let grid = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="dow" aria-hidden="true">${d.slice(0, 1)}<span class="visually-hidden">${d}</span></div>`).join("");
    for (let i = 0; i < cells; i++) {
      const dnum = i - startDow + 1;
      if (dnum < 1 || dnum > daysInMonth) { grid += `<div class="day out" aria-hidden="true"></div>`; continue; }
      const key = `${y}-${H.pad(m)}-${H.pad(dnum)}`;
      const list = byDay[key] || [];
      const cls = ["day", key === todayKey ? "today" : "", key === selectedDay ? "sel" : ""].join(" ");
      const label = `${H.fmt(H.zoned(y, m, dnum, 12), { weekday: "long", month: "long", day: "numeric" })}, ${list.length || "no"} event${list.length === 1 ? "" : "s"}`;
      grid += `<button type="button" class="${cls}" data-day="${key}" aria-label="${esc(label)}">
        <span class="n">${dnum}</span>
        ${list.slice(0, 2).map(e => `<span class="pill${partnerOf(e) ? " partner" : ""}"${partnerOf(e) ? ` style="--c:${esc(partnerOf(e).color)}"` : ""}>${e.allDay ? "" : `<b>${esc(H.fmtTimeRange(e.start, null, false))}</b> `}${esc(e.title)}</span>`).join("")}
        ${list.length > 2 ? `<span class="more-n">+${list.length - 2} more</span>` : ""}
        ${list.length ? `<span class="dots">${list.slice(0, 3).map(() => "<i></i>").join("")}</span>` : ""}
      </button>`;
    }

    // Events for the chosen day, or the rest of the month
    let detail = "";
    const monthKey = `${y}-${H.pad(m)}`;
    const shown = selectedDay ? (byDay[selectedDay] || [])
      : shownEvents().filter(e => H.dayKey(e.start).startsWith(monthKey) && +(e.end || e.start) >= +now);
    const heading = selectedDay
      ? H.fmt(H.zoned(+selectedDay.slice(0, 4), +selectedDay.slice(5, 7), +selectedDay.slice(8, 10), 12), { weekday: "long", month: "long", day: "numeric" })
      : "Coming up this month";
    detail = shown.length
      ? `<div class="day-list"><h3>${esc(heading)}</h3><div class="cards">${shown.map(cardHTML).join("")}</div></div>`
      : `<div class="day-list"><div class="empty"><h3>${esc(heading)}</h3><p>${selectedDay ? "Nothing scheduled this day." : "Nothing else scheduled this month."}</p></div></div>`;

    $("#view").innerHTML = `
      <div class="month-nav">
        <button class="icon-btn" type="button" id="prevM" aria-label="Previous month">${ICON.left}</button>
        <h3>${esc(H.fmt(first, { month: "long", year: "numeric" }))}</h3>
        <button class="icon-btn" type="button" id="nextM" aria-label="Next month">${ICON.right}</button>
      </div>
      <div class="grid">${grid}</div>${detail}`;

    $("#prevM").onclick = () => { monthCursor = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }; selectedDay = null; render(); };
    $("#nextM").onclick = () => { monthCursor = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }; selectedDay = null; render(); };
    $("#view").querySelectorAll(".day[data-day]").forEach(b => b.onclick = () => {
      selectedDay = selectedDay === b.dataset.day ? null : b.dataset.day; render();
    });
    wireCards($("#view"));
  }

  function renderSkeleton() {
    $("#view").innerHTML = `<div class="cards skeleton">${[0, 1].map(() => `<div class="card"><div class="card-media"></div>
      <div class="card-body"><div class="bar" style="width:55%;height:22px"></div><div class="bar" style="width:35%"></div><div class="bar"></div><div class="bar" style="width:80%"></div></div></div>`).join("")}</div>`;
  }

  document.querySelectorAll(".seg button[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; selectedDay = null; render(); });


  /* ---------- RSVP popup ---------- */
  const dlg = $("#rsvpDialog");
  let rsvpDates = [];
  const occurrencesOf = e => events.filter(x => x.rsvp && x.eventId === e.eventId && +(x.end || x.start) >= +now);

  function openRsvp(e, fromButton) {
    if (!e) return;
    rsvpDates = occurrencesOf(e);
    if (!rsvpDates.length) rsvpDates = [e];
    const sel = $("#rsvpDate");
    sel.innerHTML = rsvpDates.map((x, i) => `<option value="${i}">${esc(H.fmt(x.start, { weekday: "short", month: "short", day: "numeric" }))}${x.spotsLeft === 0 ? " (waitlist)" : x.spotsLeft != null ? ` (${x.spotsLeft} left)` : ""}</option>`).join("");
    sel.value = String(Math.max(0, rsvpDates.indexOf(e)));
    $("#rsvpDateField").hidden = rsvpDates.length < 2;
    $("#rsvpTitle").textContent = e.title;
    $("#rsvpForm").hidden = false; $("#rsvpDone").hidden = true; $("#rsvpError").hidden = true;
    $("#rsvpSubmit").disabled = false;
    updateRsvpWhen();
    // In the Squarespace embed the frame is page-tall, so open next to the button
    if (EMBED && fromButton) {
      dlg.style.position = "absolute";
      dlg.style.margin = "0 auto";
      dlg.style.top = Math.max(8, fromButton.getBoundingClientRect().top + window.scrollY - 160) + "px";
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(() => $("#rsvpName").focus(), 50);
    resize();
  }
  function selectedOcc() { return rsvpDates[+$("#rsvpDate").value || 0]; }
  function updateRsvpWhen() {
    const x = selectedOcc();
    $("#rsvpWhen").textContent = `${H.fmt(x.start, { weekday: "long", month: "long", day: "numeric" })} · ${H.fmtTimeRange(x.start, x.end, x.allDay)}`;
    $("#rsvpKicker").textContent = x.spotsLeft === 0 ? "Join the waitlist" : x.spotsLeft != null ? `RSVP · ${x.spotsLeft} spot${x.spotsLeft === 1 ? "" : "s"} left` : "RSVP";
    $("#rsvpSubmit").textContent = x.spotsLeft === 0 ? "Add me to the waitlist" : "Count me in";
  }
  $("#rsvpDate").addEventListener("change", updateRsvpWhen);
  const closeRsvp = () => { dlg.close ? dlg.close() : dlg.removeAttribute("open"); };
  $("#rsvpClose").onclick = closeRsvp;
  dlg.addEventListener("click", ev => { if (ev.target === dlg) closeRsvp(); });
  dlg.addEventListener("close", () => { render(); });

  $("#rsvpForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    const x = selectedOcc();
    const name = $("#rsvpName").value.trim(), email = $("#rsvpEmail").value.trim(), people = +$("#rsvpPeople").value;
    const err = msg => { $("#rsvpError").textContent = msg; $("#rsvpError").hidden = false; };
    if (!name) return err("Please add your name."), $("#rsvpName").focus();
    if (!/^\S+@\S+\.\S+$/.test(email)) return err("Please add an email we can send your confirmation to."), $("#rsvpEmail").focus();
    $("#rsvpError").hidden = true;
    const btn = $("#rsvpSubmit");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Saving…`;
    try {
      let r;
      if (!C.API_URL) {
        await new Promise(res => setTimeout(res, 700));
        const going = x.spotsLeft == null || people <= x.spotsLeft;
        r = { ok: true, status: going ? "Going" : "Waitlist", spotsLeft: x.spotsLeft == null ? null : going ? x.spotsLeft - people : x.spotsLeft, demo: true };
      } else {
        const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "rsvp", eventId: x.eventId, date: x.occurrence, name, email, people, note: $("#rsvpNote").value.trim(), website: $("#rsvpWebsite").value }) });
        r = await res.json();
      }
      if (!r.ok) throw new Error(r.error || "Something went wrong");
      x.spotsLeft = r.spotsLeft;
      const wait = r.status === "Waitlist";
      $("#rsvpForm").hidden = true;
      $("#rsvpDone").innerHTML = `<div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h2>${wait ? "You're on the waitlist" : r.updated ? "RSVP updated" : "You're on the list!"}</h2>
        <p>${wait ? "It's full right now. If a spot opens up, you'll move in automatically and we'll email you." : `See you ${esc(H.fmt(x.start, { weekday: "long" }))}! We sent a confirmation to ${esc(email)}.`}</p>
        ${r.demo ? `<p class="hint">(Preview mode: nothing was actually saved.)</p>` : ""}
        <a class="btn btn-outline" href="${esc(H.addToGoogleLink(x))}" target="_blank" rel="noopener">${ICON.plus} Add to my calendar</a>
        <button type="button" class="btn btn-primary" id="rsvpOk">Done</button>`;
      $("#rsvpDone").hidden = false;
      $("#rsvpOk").onclick = closeRsvp;
    } catch (e2) {
      err((e2.message && e2.message.length < 120 ? e2.message + ". " : "") + "Please try again.");
      btn.disabled = false; updateRsvpWhen();
    }
  });

  // Links like events.html?rsvp=EV-123 open the RSVP popup straight away
  function openFromLink() {
    const id = params.get("rsvp");
    if (!id) return;
    const e = events.find(x => x.rsvp && x.eventId === id && +(x.end || x.start) >= +now);
    if (e) openRsvp(e);
  }

  /* ---------- Tell the parent page how tall we are (embed) ---------- */
  function resize() {
    if (!EMBED || window.parent === window) return;
    requestAnimationFrame(() => window.parent.postMessage({ heirloomHeight: document.documentElement.scrollHeight }, "*"));
  }
  window.addEventListener("load", resize);
  window.addEventListener("resize", resize);
  if (EMBED && "ResizeObserver" in window) new ResizeObserver(resize).observe(document.body);

  load();
})();
