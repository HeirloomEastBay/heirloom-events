/* Heirloom Activities — Sabbath 365
   Free retreat nights in the guest rooms: 365 a year across the whole program, up to 3 weeks each.
   Not signed in, or not applied yet: the application (no account needed).
   Applied: where the application is (contacted, interview, background check, approved).
   Approved: the Sabbath 365 badge, and a form to request dates. Requests wait until
   Pastor Brit or an admin confirms them (and picks a room) on the Guest rooms page. */
(function () {
  const C = window.HEIRLOOM;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const opened = Date.now();
  let session = null, data = null, demoS = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO && /demo=approved/.test(location.search)) session = { token: "demo", email: "jo@example.com" };
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  const p2 = n => String(n).padStart(2, "0");
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const ymd = d => d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate());
  const add = (s, n) => ymd(new Date(+parse(s) + n * 86400000));
  const nights = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const long = s => parse(s).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "long", day: "numeric" });
  const short = s => parse(s).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); e.signedOut = r.signedOut; throw e; }
    return r;
  }
  function flash(text, bad) {
    const el = document.createElement("p"); el.className = "msg " + (bad ? "err" : "ok"); el.textContent = text; el.setAttribute("role", "status");
    app.prepend(el); el.scrollIntoView({ block: "nearest" }); setTimeout(() => el.remove(), 8000);
  }
  const countHtml = c => c ? `<div class="count" role="status"><b>${c.nights}</b><span>of ${c.goal} Sabbath nights given in ${c.year}</span><span class="meter" aria-hidden="true"><i style="width:${Math.min(100, c.nights / c.goal * 100)}%"></i></span></div>` : "";
  const ABOUT = `<p>Each Sabbath stay is a free guest room on the farm for up to three weeks. It's meant especially for people who need rest and for those who serve their communities: ministry leaders, nonprofit partners, and anyone who needs a space to rest.</p>
    <p>We consider applications based on need and fit. Approvals depend on availability, a short conversation with our team, and a cleared background check. Someone from Heirloom may reach out to learn more.</p>`;

  /* ---------- Load ---------- */
  if (!session || !session.token) { applyForm(); return; }
  load();
  async function load(msg) {
    try { data = await call({ action: "sabbathGet" }); }
    catch (err) {
      if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } session = null; applyForm(); return; }
      app.innerHTML = `<div class="card"><h2>Couldn't load this page</h2><p>${esc(err.message || "Something went wrong")}.</p><p><button class="btn btn-primary" onclick="location.reload()">Try again</button></p></div>`; return;
    }
    if (window.HLNav) HLNav.setRoles({ email: data.email, sabbath: data.stage });
    if (!data.stage && !data.applied) return applyForm();
    if (data.stage === "Approved") return approved(msg);
    if (/^Not /i.test(data.stage)) return notNow();
    return progress(msg);
  }

  /* ---------- Where your application is ---------- */
  function progress(msg) {
    const st = data.stage || "Applied";
    const order = ["Applied", "Contacted", "Interview scheduled", "Background check sent", "Approved"];
    const at = Math.max(0, order.indexOf(st));
    const steps = [
      ["Applied", data.appliedOn ? "We got your application on " + short(data.appliedOn) + "." : "We got your application."],
      ["We'll reach out", "Someone from our team will get in touch."],
      ["A short conversation", data.interviewDone ? "Done. Thank you!" : "A chance to get to know each other."],
      ["Background check", data.bg === "Cleared" || data.resident ? "Cleared." : "We'll send you a form to fill out yourself."],
      ["Approved", "Then you can pick your dates."]];
    const done = i => i < at || (i === 2 && data.interviewDone) || (i === 3 && (data.bg === "Cleared" || data.resident)) || i === 0;
    app.innerHTML = `${msg ? `<p class="msg ok" role="status">${esc(msg)}</p>` : ""}
      <section class="card"><h2>${data.first ? "Thanks, " + esc(data.first) + "!" : "Thank you for applying"}</h2>
        <p>Here's where your Sabbath 365 application is.</p>
        <ol class="steps">${steps.map(([t, d], i) => `<li class="${done(i) ? "done" : i === at + 1 || (i === at && i > 0) ? "now" : ""}"><i>${done(i) ? "✓" : i + 1}</i><div><b>${esc(t)}</b>${esc(d)}</div></li>`).join("")}</ol>
        <p style="margin-top:14px">Questions? Email <a href="mailto:${esc(data.staff)}">${esc(data.staff)}</a>.</p></section>
      ${countHtml(data.count)}
      <details class="card"><summary style="cursor:pointer;font-weight:600;color:var(--forest)">About Sabbath 365</summary><div style="margin-top:10px;color:var(--ink-soft)">${ABOUT}</div></details>`;
  }
  function notNow() {
    app.innerHTML = `<section class="card"><h2>Sabbath 365</h2><p>Thank you for your interest in a Sabbath stay. If you have questions, reach out to <a href="mailto:${esc(data.staff)}">${esc(data.staff)}</a>.</p></section>${countHtml(data.count)}`;
  }

  /* ---------- Approved: the badge, and requesting dates ---------- */
  function approved(msg) {
    const waiting = data.stays.find(s => s.status === "Requested");
    const upcoming = data.stays.filter(s => s.status === "Booked" && s.checkout >= data.today);
    const min = add(data.today, 1), full = new Set(data.full || []);
    const list = data.stays.length ? `<ul class="mine">${data.stays.map(s => {
      const pill = s.status === "Requested" ? `<span class="pill wait">Waiting for confirmation</span>` : s.status === "Booked" ? `<span class="pill ok">Confirmed${s.rooms && s.rooms.length ? " · Room " + esc(s.rooms.join(" & ")) : ""}</span>` : `<span class="pill off">${esc(s.status)}</span>`;
      return `<li><div><b>${esc(long(s.checkin))} → ${esc(long(s.checkout))}</b><br><span>${nights(s.checkin, s.checkout)} night${nights(s.checkin, s.checkout) === 1 ? "" : "s"}${s.guests ? " · " + s.guests + " " + (s.guests == 1 ? "person" : "people") : ""}</span></div>
        <div>${pill}${s.status === "Requested" ? ` <button class="quiet" data-withdraw="${esc(s.id)}">Withdraw</button>` : ""}</div></li>`; }).join("")}</ul>` : "";
    app.innerHTML = `${msg ? `<p class="msg ok" role="status">${esc(msg)}</p>` : ""}
      <section class="card"><p style="margin:0 0 10px"><span class="badge">🌿 Sabbath 365</span></p>
        <h2>${data.first ? "Welcome, " + esc(data.first) + "!" : "You're approved"}</h2>
        <p>You're approved for a Sabbath 365 retreat at Heirloom. ${waiting ? "Your dates are waiting for Pastor Brit or the team to confirm them. We'll email you." : upcoming.length ? "We're looking forward to having you." : "Pick the dates you'd like below. They're confirmed once Pastor Brit or the team says yes, and we'll email you."}</p>
        ${list}</section>
      ${waiting ? "" : `<section class="card"><h2>Request your dates</h2>
        <p>Up to ${data.max} nights. Dates aren't confirmed until someone from Heirloom says yes.</p>
        <form class="f" id="rq" novalidate>
          <div class="two"><label class="q">Arriving<input type="date" name="checkin" min="${min}" required></label><label class="q">Leaving<input type="date" name="checkout" min="${add(min, 1)}" required></label></div>
          <p class="note" id="len"></p><p class="warn" id="rqWarn"></p>
          <label class="q">How many people?<input type="number" name="guests" min="1" max="12" value="1"></label>
          <label class="q">Anything we should know? <span class="opt">(optional)</span><textarea name="note" maxlength="1000" placeholder="Who's coming with you, arrival time, anything that would help your stay"></textarea></label>
          ${full.size ? `<p class="note">Fully booked: ${[...full].slice(0, 12).map(short).join(", ")}${full.size > 12 ? "…" : ""}.</p>` : ""}
          <div><button class="btn btn-primary" id="rqGo">Request these dates</button></div>
        </form></section>`}
      ${countHtml(data.count)}`;
    app.querySelectorAll("[data-withdraw]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { data = await call({ action: "sabbathRequestCancel", id: b.dataset.withdraw }); approved("Withdrawn. You can pick other dates now."); }
      catch (err) { b.disabled = false; flash((err.message || "Something went wrong") + ".", true); }
    });
    const f = $("#rq"); if (!f) return;
    const check = () => {
      const ci = f.checkin.value, co = f.checkout.value, warn = $("#rqWarn"), len = $("#len");
      if (ci && (!co || co <= ci)) { f.checkout.value = add(ci, Math.min(3, data.max)); }
      const a = f.checkin.value, b = f.checkout.value;
      if (!a || !b) { len.textContent = ""; warn.textContent = ""; return ""; }
      const n = nights(a, b), busy = []; for (let d = a; d < b; d = add(d, 1)) if (full.has(d)) busy.push(d);
      len.textContent = n + " night" + (n === 1 ? "" : "s");
      const bad = n > data.max ? `That's ${n} nights. Sabbath stays are up to ${data.max}.` : busy.length ? `Every room is taken on ${busy.slice(0, 3).map(short).join(", ")}. Please pick other dates.` : "";
      warn.textContent = bad; return bad;
    };
    f.addEventListener("change", check);
    $("#rqGo").onclick = async e => {
      e.preventDefault();
      if (!f.checkin.value || !f.checkout.value) { $("#rqWarn").textContent = "Pick your arrival and leaving dates."; return; }
      if (check()) return;
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Sending…`;
      try { data = await call({ action: "sabbathRequest", checkin: f.checkin.value, checkout: f.checkout.value, guests: f.guests.value, note: f.note.value }); approved("Sent! Pastor Brit or the team will confirm your dates and email you."); }
      catch (err) { b.disabled = false; b.textContent = "Request these dates"; $("#rqWarn").textContent = (err.message || "Something went wrong") + "."; }
    };
  }

  /* ---------- The application (no account needed) ---------- */
  function applyForm() {
    let me = {}; try { me = JSON.parse(localStorage.getItem("heirloom-me") || "{}") || {}; } catch (e) { /* fine */ }
    const signedEmail = session && session.email;
    const yn = (name, label) => `<fieldset><legend>${label}</legend><div class="choices">${["Yes", "No", "Other"].map(v => `<label><input type="radio" name="${name}" value="${v}">${v}</label>`).join("")}</div>
      <input type="text" class="other" name="${name}Other" maxlength="200" placeholder="Tell us more" hidden aria-label="${esc(label)}: other"></fieldset>`;
    app.innerHTML = `
      <section class="card"><h2>Apply for a Sabbath stay</h2>${ABOUT}</section>
      <form class="card f" id="ap" novalidate>
        <div class="two"><label class="q">Full name <span class="req">*</span><input type="text" name="name" maxlength="120" autocomplete="name" value="${esc(me.name || "")}"></label>
          <label class="q">Email <span class="req">*</span><input type="email" name="email" maxlength="120" autocomplete="email" value="${esc(signedEmail || me.email || "")}"${signedEmail ? " readonly" : ""}></label></div>
        <label class="q">Phone <span class="opt">(optional)</span><input type="tel" name="phone" maxlength="40" autocomplete="tel" value="${esc(me.phone || "")}"></label>
        <label class="q">Why would you like to stay at Heirloom? <span class="req">*</span><textarea name="why" maxlength="4000"></textarea></label>
        <fieldset><legend>How did you hear about our Sabbath Stays? <span class="req">*</span></legend><div class="choices">${["Social Media", "Email Newsletter", "Website", "A Friend", "Other"].map(v => `<label><input type="radio" name="heard" value="${v}">${v}</label>`).join("")}</div>
          <input type="text" class="other" name="heardOther" maxlength="200" placeholder="Where did you hear about it?" hidden aria-label="Heard about it: other"></fieldset>
        <label class="q">How many nights would you like to stay on the farm? <span class="opt">(up to 3 weeks)</span><input type="number" name="nights" min="1" max="21" inputmode="numeric"></label>
        <label class="q">Who would be staying with you?<textarea name="who" maxlength="1000" placeholder="Just me, my spouse, my family of four…"></textarea></label>
        <label class="q">Do you have a preferred season, month or dates? <span class="opt">(we can't guarantee specific dates, but we'll do our best)</span><textarea name="dates" maxlength="1000"></textarea></label>
        ${yn("pastor", "Do you identify as a pastor or minister?")}
        <label class="q">Are you a leader of a nonprofit or community group?<textarea name="leader" maxlength="1000" placeholder="If so, tell us a little about it"></textarea></label>
        ${yn("marginalized", "Do you identify as a member of any marginalized groups? (including but not limited to BIPOC and LGBTQIA+ communities)")}
        <label class="q">Anything you'd like us to know as we consider your application?<textarea name="more" maxlength="4000"></textarea></label>
        <label class="chk"><input type="checkbox" name="consent"><span>I consent to receiving a separate background check form to fill out myself. <span class="req">*</span></span></label>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="note">Your answers go only to the Heirloom team.</p>
        <p class="warn" id="apWarn"></p>
        <div><button class="btn btn-primary" id="apGo">Send my application</button></div>
      </form>`;
    const f = $("#ap");
    f.addEventListener("change", e => { const n = e.target.name; if (["heard", "pastor", "marginalized"].includes(n)) { const o = f.elements[n + "Other"]; o.hidden = e.target.value !== "Other"; if (!o.hidden) o.focus(); } });
    $("#apGo").onclick = async e => {
      e.preventDefault();
      const v = n => (f.elements[n] && f.elements[n].value || "").trim(), pick = n => { const c = f.querySelector(`input[name="${n}"]:checked`); return c ? c.value : ""; };
      const other = (n) => pick(n) === "Other" ? ("Other" + (v(n + "Other") ? ": " + v(n + "Other") : "")) : pick(n);
      const warn = $("#apWarn"), say = (t, el) => { warn.textContent = t; if (el) el.focus(); };
      if (!v("name")) return say("Please add your full name.", f.elements.name);
      if (!/^\S+@\S+\.\S+$/.test(v("email"))) return say("Please add a valid email.", f.elements.email);
      if (!v("why")) return say("Please tell us why you'd like to stay at Heirloom.", f.elements.why);
      if (!pick("heard")) return say("Please tell us how you heard about Sabbath Stays.");
      if (!f.elements.consent.checked) return say("Please check the box about the background check form.", f.elements.consent);
      if (v("nights") && Number(v("nights")) > 21) return say("Sabbath stays are up to 3 weeks (21 nights).", f.elements.nights);
      say("");
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Sending…`;
      try {
        await call({ action: "sabbathApply", name: v("name"), email: v("email"), phone: v("phone"), why: v("why"), heard: pick("heard"), heardOther: v("heardOther"), nights: v("nights"), who: v("who"), dates: v("dates"),
          pastor: other("pastor"), leader: v("leader"), marginalized: other("marginalized"), more: v("more"), consent: true, website: v("website"), elapsed: Date.now() - opened });
        if (session && session.token) return load("Thank you! Your application is in.");
        app.innerHTML = `<section class="card"><h2>Thank you, ${esc(v("name").split(" ")[0])}!</h2><p>Your application is in. We emailed you a copy, and someone from the Heirloom team will be in touch.</p>
          <p>To see where your application is, <a href="mine.html?next=sabbath.html">log in</a> any time with ${esc(v("email"))}. We'll email you a code, no password needed.</p></section>`;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) { b.disabled = false; b.textContent = "Send my application"; say((err.message || "Something went wrong") + "."); }
    };
  }

  /* ---------- Preview mode ---------- */
  function demo(b) {
    const t = ymd(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
    if (!demoS) demoS = { ok: true, email: "jo@example.com", first: "Jo", stage: "Approved", applied: true, appliedOn: add(t, -30), interviewDone: true, bg: "Cleared", resident: false, max: 21,
      count: { year: Number(t.slice(0, 4)), nights: 47, goal: 365, waiting: 0 }, full: [add(t, 20), add(t, 21)], today: t, staff: "staff@heirloomeastbay.com",
      stays: [{ id: "S1", checkin: add(t, -120), checkout: add(t, -113), status: "Booked", rooms: ["2"], guests: 1 }] };
    if (b.action === "sabbathApply") return new Promise(r => setTimeout(() => r({ ok: true, applied: true }), 400));
    if (b.action === "sabbathRequest") demoS.stays.unshift({ id: "S" + Date.now(), checkin: b.checkin, checkout: b.checkout, status: "Requested", rooms: [], guests: Number(b.guests) || 1 });
    if (b.action === "sabbathRequestCancel") demoS.stays = demoS.stays.filter(s => s.id !== b.id);
    return new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(demoS))), 300));
  }
})();
