/* Heirloom Events — shared helpers (used by the calendar and the form) */
(function () {
  const C = window.HEIRLOOM;
  const TZ = C.TIMEZONE;

  /* ---------- Time zone helpers (everything shows in farm time) ---------- */
  const partsFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short"
  });
  function parts(d) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: o.weekday };
  }
  // A Date for a wall-clock time at the farm, wherever the viewer is
  function zoned(y, m, d, h = 0, min = 0) {
    let guess = Date.UTC(y, m - 1, d, h, min);
    for (let i = 0; i < 2; i++) {
      const p = parts(new Date(guess));
      const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
      guess += Date.UTC(y, m - 1, d, h, min) - asUTC;
    }
    return new Date(guess);
  }
  const pad = n => String(n).padStart(2, "0");
  function dayKey(d) { const p = parts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }

  function fmtClock(d) {
    const p = parts(d);
    const h12 = ((p.h + 11) % 12) + 1;
    return { text: p.min ? `${h12}:${pad(p.min)}` : `${h12}`, ampm: p.h < 12 ? "am" : "pm" };
  }
  function fmtTimeRange(start, end, allDay) {
    if (allDay) return "All day";
    const a = fmtClock(start);
    if (!end || +end === +start) return a.text + a.ampm;
    const b = fmtClock(end);
    return a.ampm === b.ampm ? `${a.text}–${b.text}${b.ampm}` : `${a.text}${a.ampm}–${b.text}${b.ampm}`;
  }
  const fmt = (d, opts) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts }).format(d);

  /* ---------- Photos ---------- */
  function matchImage(text, presets, fallbacks, seed) {
    const hay = " " + (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
    for (const p of presets || C.PRESETS) {
      const words = String(p.keywords || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (words.some(w => hay.includes(" " + w.replace(/[^a-z0-9]+/g, " ").trim() + " "))) return p.image;
    }
    const f = fallbacks || C.FALLBACKS;
    let h = 0; for (const ch of String(seed || text || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return f[h % f.length];
  }

  /* ---------- Calendar links ---------- */
  function gcalStamp(d, allDay) {
    if (allDay) { const p = parts(d); return `${p.y}${pad(p.m)}${pad(p.d)}`; }
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  function addToGoogleLink(ev) {
    const end = ev.end || new Date(+ev.start + 3600000);
    const endForAllDay = ev.allDay ? new Date(+end + (dayKey(end) === dayKey(ev.start) ? 86400000 : 0)) : end;
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates: `${gcalStamp(ev.start, ev.allDay)}/${gcalStamp(endForAllDay, ev.allDay)}`,
      details: [ev.description, ev.link ? "More info: " + ev.link : ""].filter(Boolean).join("\n\n"),
      location: ev.address && ev.address !== C.ADDRESS ? ev.address : (ev.location && ev.location !== "Heirloom" ? ev.location + ", Heirloom, " + C.ADDRESS : C.ADDRESS),
      ctz: TZ
    });
    return "https://calendar.google.com/calendar/render?" + q;
  }
  // Directions: the event's own address if it's off the farm, otherwise Heirloom
  function directionsLink(ev) {
    let dest = ev.address;
    if (!dest) dest = /\d/.test(ev.location || "") && /,/.test(ev.location || "") ? ev.location : C.ADDRESS;
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest);
  }

  // "More details" HTML: keep only simple, safe tags before showing it
  const SAFE_TAGS = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, UL: 1, OL: 1, LI: 1, A: 1, IMG: 1, H3: 1, H4: 1, BLOCKQUOTE: 1 };
  function sanitize(html) {
    const doc = new DOMParser().parseFromString("<div>" + (html || "") + "</div>", "text/html");
    const root = doc.body.firstChild;
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1 || !SAFE_TAGS[n.tagName]) {
          if (n.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE)$/.test(n.tagName)) { walk(n); n.replaceWith(...n.childNodes); }
          else n.remove();
          return;
        }
        [...n.attributes].forEach(a => {
          const keep = (n.tagName === "A" && a.name === "href" && /^(https?:|mailto:)/i.test(a.value)) ||
                       (n.tagName === "IMG" && (a.name === "alt" || (a.name === "src" && /^(https:|data:image\/|blob:)/i.test(a.value))));
          if (!keep) n.removeAttribute(a.name);
        });
        if (n.tagName === "A") { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); }
        if (n.tagName === "IMG" && !n.getAttribute("src")) { n.remove(); return; }
        walk(n);
      });
    })(root);
    return root.innerHTML;
  }

  function subscribeLink() {
    return "https://calendar.google.com/calendar/u/0?cid=" + btoa(C.PUBLIC_CALENDAR_ID).replace(/=+$/, "");
  }
  function icsLink() {
    return "https://calendar.google.com/calendar/ical/" + encodeURIComponent(C.PUBLIC_CALENDAR_ID) + "/public/basic.ics";
  }

  /* ---------- Sample events for demo mode ---------- */
  function sampleEvents() {
    const t = parts(new Date());
    const base = zoned(t.y, t.m, t.d, 12);
    const at = (daysAhead, h, min = 0) => {
      const p = parts(new Date(+base + daysAhead * 86400000));
      return zoned(p.y, p.m, p.d, h, min);
    };
    const nextDow = (dow) => { // 0=Sun
      const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(t.wd);
      return ((dow - wd + 7) % 7) || 7;
    };
    const out = [];
    const add = (o) => out.push(Object.assign({ id: "s" + out.length, location: "Heirloom" }, o));

    const thu = nextDow(4);
    for (let w = 0; w < 6; w++) add({
      id: "goats_" + w, title: "Happy Hour with the Goats", start: at(thu + 7 * w, 16), end: at(thu + 7 * w, 18),
      description: "BYOB, we'll provide the goats. Come hang out in the goat pen as the sun goes down, meet the herd and bring a friend.",
      cost: "Free", recurring: "Every Thursday", location: "Goat pen"
    });
    add({ title: "Moonlight Hike", start: at(nextDow(2), 18), end: at(nextDow(2), 20),
      description: "A slow walk up the hill behind the farmhouse under the full moon. Wear sturdy shoes and bring a headlamp just in case.",
      cost: "Free", location: "Meet at the parking area" });
    add({ title: "Garden Workday", start: at(nextDow(6), 9), end: at(nextDow(6), 12),
      description: "Help us put the garden to bed for winter: pulling squash vines, spreading compost and planting garlic. Gloves and snacks provided.",
      cost: "Free", location: "The garden" });
    add({ title: "Kids' Morning with the Chickens", start: at(nextDow(6) + 7, 10), end: at(nextDow(6) + 7, 11, 30),
      description: "Little ones can help collect eggs, scatter feed and hold a hen (if she's willing). Grown-ups stay with their kids.",
      cost: "$5 per family, suggested", location: "Chicken coop", rsvp: true, eventId: "EV-demo-chickens", spotsLeft: 0 });
    add({ title: "Painting in the Farmhouse", start: at(nextDow(0) + 7, 14), end: at(nextDow(0) + 7, 16, 30),
      description: "An unhurried afternoon of painting the farm. All supplies provided; no experience needed.",
      cost: "$25", rsvp: true, eventId: "EV-demo-painting", spotsLeft: 3,
      details: "<h3>What we'll do</h3><p>We'll set up easels on the porch and in the sunroom and paint whatever catches your eye: the farmhouse, the hills, the goats if they hold still.</p><ul><li>All paints, brushes and canvases provided</li><li>Tea and cookies from the farm kitchen</li><li>Kids 10+ welcome with a grown-up</li></ul><p><b>Bring:</b> an apron or clothes you don't mind getting paint on.</p><img src=\"images/painting.jpg\" alt=\"Painting at an easel\"><p>Questions? <a href=\"mailto:staff@heirloomeastbay.com\">Email us</a>.</p>" });
    add({ title: "Fall Harvest Potluck", start: at(nextDow(6) + 21, 17), end: at(nextDow(6) + 21, 20),
      description: "Bring a dish to share and settle in at the long tables on the lawn. We'll supply cider, plates and a bonfire.",
      cost: "Free", location: "The big lawn" });
    add({ title: "Tomato Canning Workshop", start: at(nextDow(3) + 14, 18), end: at(nextDow(3) + 14, 20, 30),
      description: "Learn water-bath canning with the last of this year's tomatoes and go home with a jar of sauce.",
      cost: "$15", rsvp: true, eventId: "EV-demo-canning", spotsLeft: null });

    // Plantify's Sunday open garden (synced from their schedule page once live)
    const sun = nextDow(0);
    [["Bed prep and cover crops", "Workday"], ["Seed saving and garden games", "Community Connect"], ["Winter planting", "Workday"]].forEach(([t, tag], i) => add({
      id: "plantify_" + i, source: "plantify", title: t, start: at(sun + 7 * i, 11), end: at(sun + 7 * i, 14),
      description: tag + " at Plantify's Sunday Open Garden. Free, all ages, no RSVP.",
      location: "Paradise Community Garden", address: "Paradise Community Garden, 20097 Mission Blvd, Hayward, CA 94541", cost: "Free",
      link: "https://bigdudd3.github.io/plantify-schedule/", linkLabel: "Plantify schedule"
    }));

    // A neighbor hosting something
    add({ id: "community_1", source: "community", hostName: "The Castro Valley Knitters", title: "Knit & Sip on the Porch",
      start: at(nextDow(3) + 7, 18), end: at(nextDow(3) + 7, 20), location: "Farmhouse",
      description: "Bring a project (or learn to cast on) and a mug. Tea and yarn scraps provided.", cost: "Free" });

    // The Soundbird Sanctuary (imported from Eventbrite once live)
    [["Full Moon Sound Bath", 19, 18, 30, 20, 0, "From $35"], ["Sound Healing for Beginners", 12, 10, 0, 11, 30, "From $25"]].forEach(([t, d, h1, m1, h2, m2, cost]) => add({
      id: "soundbird_" + d, source: "soundbird-sanctuary", title: t, start: at(d, h1, m1), end: at(d, h2, m2),
      description: "Lie back and let gongs, crystal bowls and chimes wash over you in the farmhouse. Bring a mat and a blanket.",
      location: "Heirloom", cost, link: "https://www.eventbrite.com/o/the-soundbird-sanctuary-121418754117", linkLabel: "Get tickets"
    }));

    out.forEach(e => { if (e.rsvp) e.occurrence = dayKey(e.start); });
    out.forEach(e => { e.image = matchImage(e.title + " " + e.description, null, null, e.title); });
    return out.sort((a, b) => a.start - b.start);
  }

  window.HL = { parts, zoned, dayKey, fmt, fmtTimeRange, matchImage, addToGoogleLink, directionsLink, sanitize, subscribeLink, icsLink, sampleEvents, pad };
})();
