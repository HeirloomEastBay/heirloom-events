/* Heirloom Activities — automatic flyers and social images
   HLFlyer.make(event, kind) draws the event in Heirloom's colors and fonts:
     "flyer"  → printable letter-size PDF with a QR code
     "square" → 1080×1080 image for Instagram/Facebook posts
     "story"  → 1080×1920 image for Instagram/Facebook stories
   Everything happens in the visitor's browser. The PDF and QR code
   libraries (in vendor/) are only loaded the first time someone asks. */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const COL = { forest: "#2e4a36", deep: "#1c3024", barn: "#8e2f27", wheat: "#d8b56f", cream: "#f4efe3", paper: "#fbf8f1", ink: "#1f2a22", muted: "#5d665e", sage: "#e3e8dc" };
  const F = {
    title: w => `${w || 600} {s}px Recoleta, Fraunces, Georgia, serif`,
    label: () => `700 {s}px Brown, Figtree, system-ui, sans-serif`,
    body: w => `${w || 400} {s}px Figtree, system-ui, sans-serif`
  };
  const font = (f, s) => f.replace("{s}", Math.round(s));

  /* ---------- Loading things ---------- */
  const scripts = {};
  function script(src) {
    return scripts[src] = scripts[src] || new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => { delete scripts[src]; fail(new Error("Couldn't load " + src)); };
      document.head.appendChild(s);
    });
  }
  function img(src, cors) {
    return new Promise((ok, fail) => {
      const i = new Image();
      if (cors) i.crossOrigin = "anonymous";
      i.onload = () => ok(i); i.onerror = () => fail(new Error("image"));
      i.src = src;
    });
  }
  // Photos from other websites (Google Drive, Eventbrite) can only be drawn
  // if that site allows it, so we try directly, then through our own backend,
  // then fall back to a farm photo.
  async function photo(src) {
    const fallback = "images/farmhouse.jpg";
    if (!src) return img(fallback);
    const local = /^(data:|blob:)/.test(src) || !/^https?:/i.test(src) || new URL(src, location.href).origin === location.origin;
    if (local) return img(src).catch(() => img(fallback));
    try { return await img(src, true); } catch (e) { /* try the backend */ }
    if (C.API_URL) {
      try {
        const r = await (await fetch(C.API_URL + "?action=flyerImage&src=" + encodeURIComponent(src))).json();
        if (r.ok && r.data) return await img(r.data);
      } catch (e) { /* use the farm photo */ }
    }
    return img(fallback);
  }
  async function fonts() {
    if (!document.fonts || !document.fonts.load) return;
    await Promise.all(["600 80px Recoleta", "700 30px Brown", "400 30px Figtree", "600 30px Figtree", "600 80px Fraunces"]
      .map(f => document.fonts.load(f).catch(() => null)));
  }

  /* ---------- Drawing helpers ---------- */
  function cover(ctx, im, x, y, w, h) {
    const r = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / r, sh = h / r;
    ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = [];
    let line = "";
    words.forEach(w => {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }
  // Biggest size (from max down to min) where the text fits in maxLines
  function fit(ctx, text, f, maxW, maxLines, max, min) {
    for (let s = max; s >= min; s -= 2) {
      ctx.font = font(f, s);
      const lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) return { size: s, lines };
    }
    ctx.font = font(f, min);
    return { size: min, lines: clip(ctx, wrap(ctx, text, maxW), maxLines, maxW) };
  }
  function clip(ctx, lines, n, maxW) {
    if (lines.length <= n) return lines;
    const out = lines.slice(0, n);
    let last = out[n - 1];
    while (last && ctx.measureText(last + "…").width > maxW) last = last.replace(/\s*\S+$/, "");
    out[n - 1] = last + "…";
    return out;
  }
  function spaced(ctx, text, x, y, spacing, align) {
    if ("letterSpacing" in ctx) { ctx.letterSpacing = spacing + "px"; ctx.textAlign = align || "left"; ctx.fillText(text, x, y); ctx.letterSpacing = "0px"; return; }
    // Older browsers: space the letters by hand
    const w = [...text].reduce((n, ch) => n + ctx.measureText(ch).width + spacing, -spacing);
    let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.textAlign = "left";
    [...text].forEach(ch => { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; });
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function chip(ctx, text, x, y, size, bg, fg) {
    ctx.font = font(F.label(), size);
    const pad = size * 0.9, w = ctx.measureText(text.toUpperCase()).width + size * 0.08 * text.length + pad * 2, h = size * 2.1;
    ctx.fillStyle = bg; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textBaseline = "middle";
    spaced(ctx, text.toUpperCase(), x + pad, y + h / 2 + size * 0.06, size * 0.08);
    ctx.textBaseline = "alphabetic";
    return w;
  }
  function dateTile(ctx, e, x, y, w) {
    const p = H.parts(e.start), h = w * 1.12;
    ctx.save();
    ctx.shadowColor = "rgba(20,30,22,.28)"; ctx.shadowBlur = w * 0.12; ctx.shadowOffsetY = w * 0.03;
    ctx.fillStyle = COL.paper; rrect(ctx, x, y, w, h, w * 0.1); ctx.fill();
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = COL.barn; ctx.font = font(F.label(), w * 0.15); spaced(ctx, p.wd.toUpperCase(), x + w / 2, y + h * 0.27, w * 0.02, "center");
    ctx.fillStyle = COL.ink; ctx.font = font(F.title(), w * 0.5); ctx.textAlign = "center"; ctx.fillText(String(p.d), x + w / 2, y + h * 0.7);
    ctx.fillStyle = COL.muted; ctx.font = font(F.label(), w * 0.14); spaced(ctx, H.fmt(e.start, { month: "short" }).toUpperCase(), x + w / 2, y + h * 0.89, w * 0.02, "center");
    ctx.textAlign = "left";
  }
  function icon(ctx, kind, x, y, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.11; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    if (kind === "clock") { ctx.arc(x + s / 2, y + s / 2, s * 0.42, 0, Math.PI * 2); ctx.moveTo(x + s / 2, y + s * 0.27); ctx.lineTo(x + s / 2, y + s / 2); ctx.lineTo(x + s * 0.66, y + s * 0.6); }
    else {
      const cx = x + s / 2;
      ctx.moveTo(cx, y + s * 0.95);
      ctx.bezierCurveTo(cx - s * 0.1, y + s * 0.82, cx - s * 0.38, y + s * 0.55, cx - s * 0.38, y + s * 0.38);
      ctx.arc(cx, y + s * 0.38, s * 0.38, Math.PI, 0);
      ctx.bezierCurveTo(cx + s * 0.38, y + s * 0.55, cx + s * 0.1, y + s * 0.82, cx, y + s * 0.95);
      ctx.moveTo(cx + s * 0.13, y + s * 0.38); ctx.arc(cx, y + s * 0.38, s * 0.13, 0, Math.PI * 2);
    }
    ctx.stroke(); ctx.restore();
  }
  function metaLine(ctx, kind, text, x, y, size, maxW, color) {
    icon(ctx, kind, x, y - size * 0.85, size, color);
    ctx.fillStyle = color; ctx.font = font(F.body(600), size);
    const t = clip(ctx, wrap(ctx, text, maxW - size * 1.5), 1, maxW - size * 1.5)[0];
    ctx.fillText(t, x + size * 1.5, y);
  }
  async function qr(text, size) {
    await script("vendor/qrcode.js");
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = Math.floor(size / (n + 2)), c = document.createElement("canvas");
    c.width = c.height = cell * (n + 2);
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = COL.deep;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + 1) * cell, (r + 1) * cell, cell, cell);
    return c;
  }

  /* ---------- What goes on it ---------- */
  function info(e) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, "");
    const plain = base.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const id = e.ref || String(e.id || "").split("_")[0];
    const url = e.rsvp && e.eventId ? base + "?rsvp=" + encodeURIComponent(e.eventId) : id ? base + "?event=" + encodeURIComponent(id) : base;
    const kicker = e.source === "community" ? "Hosted by " + (e.hostName || "a community member")
      : e.partnerName ? "With " + e.partnerName : "Heirloom Activities";
    const when = H.fmt(e.start, { weekday: "long", month: "long", day: "numeric" }) + " · " + H.fmtTimeRange(e.start, e.end, e.allDay);
    const home = "Heirloom, Castro Valley";
    const loc = /^heirloom$/i.test(String(e.location || "").trim()) ? "" : e.location;
    const addr = e.address && e.address !== loc && e.address !== C.ADDRESS ? e.address : "";
    const place = !loc ? home : addr ? (addr.indexOf(loc) === 0 ? addr : loc + " · " + addr) : loc + " · " + home;
    return { url, plain, kicker, when, place, cta: e.rsvp ? "Scan to RSVP" : "Scan for details", siteLine: plain };
  }
  const slug = t => String(t || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "event";

  /* ---------- Printable flyer (letter, 8.5×11 at 200 dpi) ---------- */
  async function drawFlyer(e, im, badge) {
    const W = 1700, Hh = 2200, M = 120, c = canvas(W, Hh), ctx = c.getContext("2d"), t = info(e);
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, Hh);
    const photoH = 830;
    cover(ctx, im, 0, 0, W, photoH);
    ctx.drawImage(badge, M - 30, 70, 230, 230);
    dateTile(ctx, e, W - M - 250, photoH - 190, 250);

    let y = photoH + 110;
    ctx.fillStyle = COL.barn; ctx.font = font(F.label(), 34);
    spaced(ctx, t.kicker.toUpperCase(), M, y, 5);
    const bandTop = Hh - 380;
    y += 40;
    const ti = fit(ctx, e.title, F.title(), W - M * 2, 3, 140, 76);
    ctx.fillStyle = COL.ink; ctx.font = font(F.title(), ti.size);
    ti.lines.forEach(l => { y += ti.size * 1.06; ctx.fillText(l, M, y); });
    y += 90;
    metaLine(ctx, "clock", t.when + (e.recurring ? " · " + e.recurring : ""), M, y, 46, W - M * 2, COL.forest); y += 76;
    metaLine(ctx, "pin", t.place, M, y, 46, W - M * 2, COL.forest); y += 50;
    if (e.cost) { y += 26; chip(ctx, e.cost, M, y, 30, COL.wheat, COL.deep); y += 63; }
    const room = bandTop - 60 - y;
    if (e.description && room > 100) {
      ctx.font = font(F.body(), 42); ctx.fillStyle = COL.muted;
      const lines = clip(ctx, wrap(ctx, e.description, W - M * 2), Math.min(5, Math.floor((room - 20) / 62)), W - M * 2);
      y += 20;
      lines.forEach(l => { y += 62; ctx.fillText(l, M, y); });
    }

    // Forest band with the QR code
    ctx.fillStyle = COL.deep; ctx.fillRect(0, bandTop, W, Hh - bandTop);
    const qs = 280, code = await qr(t.url, qs);
    ctx.fillStyle = "#fff"; rrect(ctx, M - 10, bandTop + 50, qs + 20, qs + 20, 22); ctx.fill();
    ctx.drawImage(code, M, bandTop + 60, qs, qs);
    const tx = M + qs + 80;
    ctx.fillStyle = COL.wheat; ctx.font = font(F.title(), 78); ctx.fillText(t.cta, tx, bandTop + 145);
    ctx.fillStyle = COL.cream; ctx.font = font(F.body(600), 36);
    ctx.fillText(clip(ctx, [t.plain], 1, W - tx - M)[0], tx, bandTop + 215);
    ctx.fillStyle = "rgba(244,239,227,.75)"; ctx.font = font(F.body(), 32);
    ctx.fillText(C.ADDRESS, tx, bandTop + 275);
    ctx.fillText(C.EMAIL, tx, bandTop + 322);
    return c;
  }

  /* ---------- Square post (1080×1080) ---------- */
  function drawSquare(e, im, badge) {
    const S = 1080, M = 70, c = canvas(S, S), ctx = c.getContext("2d"), t = info(e);
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, S, S);
    const photoH = 520;
    cover(ctx, im, 0, 0, S, photoH);
    ctx.drawImage(badge, 40, 40, 150, 150);
    dateTile(ctx, e, S - M - 170, photoH - 130, 170);

    let y = photoH + 72;
    ctx.fillStyle = COL.barn; ctx.font = font(F.label(), 24); spaced(ctx, t.kicker.toUpperCase(), M, y, 3.5);
    const ti = fit(ctx, e.title, F.title(), S - M * 2, 2, 86, 50);
    ctx.fillStyle = COL.ink; ctx.font = font(F.title(), ti.size);
    y += 6;
    ti.lines.forEach(l => { y += ti.size * 1.06; ctx.fillText(l, M, y); });
    y += 62;
    metaLine(ctx, "clock", t.when, M, y, 32, S - M * 2, COL.forest); y += 52;
    metaLine(ctx, "pin", t.place, M, y, 32, S - M * 2, COL.forest); y += 26;
    if (e.cost && y + 44 < S - 92) chip(ctx, e.cost, M, y, 19, COL.wheat, COL.deep);
    // Footer line
    ctx.fillStyle = COL.forest; ctx.fillRect(0, S - 76, S, 76);
    ctx.fillStyle = COL.cream; ctx.font = font(F.body(600), 26); ctx.textBaseline = "middle";
    ctx.fillText((e.rsvp ? "RSVP at " : "Details at ") + t.siteLine, M, S - 38);
    ctx.textBaseline = "alphabetic";
    return c;
  }

  /* ---------- Story (1080×1920) ---------- */
  function drawStory(e, im, badge) {
    const W = 1080, Hh = 1920, M = 80, c = canvas(W, Hh), ctx = c.getContext("2d"), t = info(e);
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, Hh);
    const photoH = 900;
    cover(ctx, im, 0, 0, W, photoH);
    // Soft shade at the top so phone icons stay readable
    const g = ctx.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "rgba(20,30,22,.45)"); g.addColorStop(1, "rgba(20,30,22,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 320);
    ctx.drawImage(badge, M - 10, 170, 180, 180);
    dateTile(ctx, e, W - M - 210, photoH - 160, 210);

    let y = photoH + 110;
    ctx.fillStyle = COL.barn; ctx.font = font(F.label(), 30); spaced(ctx, t.kicker.toUpperCase(), M, y, 4.5);
    const ti = fit(ctx, e.title, F.title(), W - M * 2, 3, 112, 66);
    ctx.fillStyle = COL.ink; ctx.font = font(F.title(), ti.size);
    y += 14;
    ti.lines.forEach(l => { y += ti.size * 1.06; ctx.fillText(l, M, y); });
    y += 80;
    metaLine(ctx, "clock", t.when, M, y, 38, W - M * 2, COL.forest); y += 64;
    if (e.recurring) { ctx.fillStyle = COL.muted; ctx.font = font(F.body(600), 32); ctx.fillText(e.recurring, M + 57, y - 6); y += 54; }
    metaLine(ctx, "pin", t.place, M, y, 38, W - M * 2, COL.forest); y += 40;
    if (e.cost) { y += 26; chip(ctx, e.cost, M, y, 24, COL.wheat, COL.deep); y += 50; }
    const footTop = Hh - 230;
    if (e.description && footTop - y > 110) {
      ctx.font = font(F.body(), 34); ctx.fillStyle = COL.muted;
      const n = Math.min(4, Math.floor((footTop - y - 50) / 50));
      clip(ctx, wrap(ctx, e.description, W - M * 2), n, W - M * 2).forEach((l, i) => ctx.fillText(l, M, y + 60 + i * 50));
    }
    ctx.fillStyle = COL.deep; ctx.fillRect(0, footTop, W, Hh - footTop);
    ctx.fillStyle = COL.wheat; ctx.font = font(F.title(), 54); ctx.fillText(e.rsvp ? "RSVP online" : "Details online", M, footTop + 92);
    ctx.fillStyle = COL.cream; ctx.font = font(F.body(600), 30); ctx.fillText(t.siteLine, M, footTop + 148);
    return c;
  }

  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  const toBlob = (c, type, q) => new Promise(ok => c.toBlob(ok, type, q));

  /* ---------- Public ---------- */
  async function make(e, kind) {
    await fonts();
    const [im, badge] = await Promise.all([photo(e.image), img("images/logo-badge.png")]);
    const name = slug(e.title) + "-" + H.dayKey(e.start);
    if (kind === "flyer") {
      const [c] = await Promise.all([drawFlyer(e, im, badge), script("vendor/jspdf.umd.min.js")]);
      const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
      pdf.setProperties({ title: e.title + " · Heirloom Activities" });
      pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 612, 792);
      return { blob: pdf.output("blob"), filename: name + "-flyer.pdf", canvas: c };
    }
    const c = kind === "story" ? drawStory(e, im, badge) : drawSquare(e, im, badge);
    return { blob: await toBlob(c, "image/jpeg", 0.92), filename: name + (kind === "story" ? "-story.jpg" : "-post.jpg"), canvas: c };
  }

  // Phones: open the share sheet (Instagram, Messages…); computers: download
  async function deliver(r, title) {
    const file = window.File ? new File([r.blob], r.filename, { type: r.blob.type }) : null;
    const phone = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    if (phone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return "shared"; }
      catch (err) { if (err && err.name === "AbortError") return "cancelled"; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(r.blob); a.download = r.filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return "downloaded";
  }

  // The "Share this event" buttons, used in the event popup and after submitting
  const KINDS = [
    ["flyer", "Printable flyer", "PDF · letter size, with a QR code"],
    ["square", "Square post", "1080 × 1080 for feeds"],
    ["story", "Story", "1080 × 1920 for stories"]
  ];
  function buttons(getEvent) {
    const box = document.createElement("div");
    box.className = "share-kit";
    box.innerHTML = `<p class="share-h">Share this event</p><div class="share-btns">${KINDS.map(([k, l, s]) =>
      `<button type="button" class="share-btn" data-kind="${k}"><b>${l}</b><small>${s}</small></button>`).join("")}</div>
      <p class="share-msg" role="status"></p>`;
    const msg = box.querySelector(".share-msg");
    box.querySelectorAll(".share-btn").forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const label = b.innerHTML;
      b.disabled = true; b.innerHTML = `<b><span class="spinner"></span> Making it…</b><small>Just a moment</small>`;
      msg.textContent = "";
      try {
        const e = await getEvent();
        const r = await make(e, b.dataset.kind);
        const how = await deliver(r, e.title);
        msg.textContent = how === "downloaded" ? `Saved ${r.filename} to your downloads.` : how === "shared" ? "Shared!" : "";
      } catch (err) {
        console.error(err);
        msg.textContent = "Sorry, that didn't work. Please try again.";
      }
      b.disabled = false; b.innerHTML = label;
    });
    return box;
  }

  window.HLFlyer = { make, deliver, buttons, info };
})();
