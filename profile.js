/* Heirloom Activities — Profile: anyone signed in can update their own contact info.
   Address and emergency contact are only asked for here (never on public forms),
   and only admins can see them. */
(function () {
  const C = window.HEIRLOOM;
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  let session = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO) { $("#demoBanner").hidden = false; session = session || { token: "demo", email: "you@example.com" }; }
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: session.token }, body)) });
    return res.json();
  }
  function signIn(note) {
    app.innerHTML = `<div class="empty"><h2>${note || "Please log in"}</h2><p>We'll email you a 6-digit code, then bring you right back here.</p>
      <p style="margin-top:14px"><a class="btn btn-primary" href="mine.html?next=profile">Log in</a></p></div>`;
  }
  if (!session || !session.token) return signIn();

  async function load() {
    app.innerHTML = `<p class="loading">Loading your profile…</p>`;
    try {
      const r = await call({ action: "profileGet" });
      if (!r.ok) {
        if (r.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } if (window.HLNav) HLNav.signedOut(); return signIn("Your sign-in expired"); }
        throw new Error(r.error);
      }
      render(r);
    } catch (err) {
      app.innerHTML = `<div class="empty"><h2>We couldn't load your profile</h2><p>${esc(err.message || "Please try again in a minute.")}</p><p style="margin-top:14px"><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
      $("#retry").onclick = load;
    }
  }

  function render(r) {
    if (window.HLNav) HLNav.setRoles({ email: r.email, admin: !!r.admin, volunteer: !!r.volunteer, resident: !!r.resident, church: !!r.church });
    try { localStorage.setItem("heirloom-me", JSON.stringify({ email: r.email, name: (r.first + " " + r.last).trim(), phone: r.phone })); } catch (e) { /* fine */ }
    const s = r.stats;
    const hours = s && s.hours ? (s.hours === 1 ? "1" : String(s.hours)) : "0";
    const power = (r.trainings || []).some(t => /power tool|woodshop|machin/i.test(t));
    const access = [
      [r.member || (r.role === "Resident" ? "Resident" : "Community member"), true],
      r.partner && ["Community partner: " + r.partner, true],
      r.role === "Volunteer" && [r.status === "Active volunteer" ? "Approved volunteer" : "Volunteer · " + r.status, r.status === "Active volunteer"],
      r.role === "Volunteer" && ["Background check " + (r.bg === "Cleared" ? "cleared" : r.bg === "Sent" ? "sent, waiting to clear" : "not done yet"), r.bg === "Cleared"],
      r.role === "Volunteer" && ["Trainings: " + (r.trainings.length ? r.trainings.join(", ") : "none yet"), r.trainings.length > 0],
      r.role === "Resident" && ["Volunteer: trained for everything" + (power ? ", including power tools & woodshop" : " except power tools & woodshop"), true],
      [r.church ? "Part of the church family" : "Not signed up for church family updates", !!r.church],
      ["Your events go up " + (r.trusted || r.approver || r.admin ? "right away" : "after a quick review"), true],
      r.approver && ["You approve other people's events", true],
      r.admin && ["You can use the Admin page", true]
    ].filter(Boolean);
    const hi = $("#hi"); if (hi && (r.greet || r.first)) hi.textContent = "Hi, " + (r.greet || r.first) + "!";
    if (window.HLProfile && r.done) HLProfile.remember(r);
    app.innerHTML = `
      ${r.powerPending ? `<section class="card" style="border:2px solid var(--wheat)">
        <h2>One step left: power tools &amp; woodshop</h2>
        <p>You've been approved to use power tools and the woodshop. Please read and accept the safety agreement before your first shift.</p>
        <p><button type="button" class="btn btn-primary" id="agree">Read and accept</button></p></section>` : ""}
      ${s ? `<section class="card impact" aria-label="How you've helped">
        <div><b>${esc(hours)}</b><span>hour${hours === "1" ? "" : "s"} helped</span></div>
        <div><b>${s.shifts}</b><span>shift${s.shifts === 1 ? "" : "s"}</span></div>
        <div><b style="font-size:20px;line-height:1.6">${esc(s.last ? s.lastText.replace(/^\w+, /, "") : "Soon!")}</b><span>last helped</span></div>
      </section>` : ""}
      <form class="card" id="pf" novalidate>
        <h2>About you</h2>
        ${HLProfile.fields(r)}
        <p class="lock" style="margin-top:-4px">${(r.others || []).length ? `You can also log in with ${esc(r.others.join(", "))}. ` : ""}To change your email${(r.others || []).length ? "s" : ""} or add another one, ask the Heirloom team.</p>
        <p class="msg err" id="err" hidden></p>
        <div class="saverow"><button class="btn btn-primary" id="save">Save</button><span class="note" id="ok" aria-live="polite"></span></div>
      </form>
      <section class="card">
        <h2>Your access</h2>
        <ul class="access">${access.map(([t, on]) => `<li class="${on ? "" : "no"}">${esc(t)}</li>`).join("")}</ul>
        ${r.powerAccepted ? `<p class="lock">Power tools safety agreement accepted ${esc(String(r.powerAccepted).split(" · ")[0])}.</p>` : ""}
        <p style="display:flex;flex-wrap:wrap;gap:8px">${r.volunteer ? `<a class="btn btn-forest btn-sm" href="portal.html">Open the volunteer portal</a>` : ""}${r.church ? `<a class="btn btn-forest btn-sm" href="church.html">Open the church family page</a>` : ""}</p>
      </section>
      <p style="text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" class="btn btn-forest btn-sm" data-install hidden>Add to Home Screen</button><button type="button" class="btn btn-outline btn-sm" id="out">Sign out</button></p>`;
    if (window.HLInstall) HLInstall.refresh();
    if ($("#agree")) $("#agree").onclick = () => HLProfile.powerDialog(r, res => { render(res); $("#ok").textContent = "Thank you! You're all set for power tools and the woodshop."; });
    const f = $("#pf");
    f.addEventListener("input", () => { $("#ok").textContent = ""; });
    f.onsubmit = async e => {
      e.preventDefault();
      const err = $("#err"); err.hidden = true;
      const bad = HLProfile.check(f); if (bad) { err.textContent = bad; err.hidden = false; return; }
      const b = $("#save"); b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        const asked = !!(f.querySelector('[data-p="volunteer"]') || {}).checked;
        const res = await call(Object.assign({ action: "profileSave", done: true }, HLProfile.collect(f)));
        if (!res.ok) { if (res.signedOut) return signIn("Your sign-in expired"); throw new Error(res.error); }
        render(res); $("#ok").textContent = asked ? "Saved. Thank you! Someone from Heirloom will be in touch about volunteering." : "Saved. Thank you!";
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "Save"; }
    };
    $("#out").onclick = () => { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } if (window.HLNav) HLNav.signedOut(); location.href = "index.html"; };
  }

  // Preview mode
  let demoMe = { ok: true, email: "you@example.com", first: "Ana", last: "Diaz", phone: "510-555-0142", address: "", emergency: "", news: true,
    role: "Volunteer", member: "Community member", status: "Active volunteer", admin: false, approver: false, trusted: false, volunteer: true, bg: "Cleared", trainings: ["Animal feeding", "Power tools & woodshop"],
    preferred: "", pronouns: "", birthday: "", dietary: "Vegetarian", allergies: "", about: "", interests: ["Animals", "Garden"], greet: "Ana", church: false, partner: "", powerPending: true, powerAccepted: "", done: true,
    interestOptions: ["Animals", "Garden", "Land & trails", "Hospitality & meals", "Workshops & classes", "Woodshop & building", "Events", "Supper Church"],
    stats: { hours: 12, shifts: 11, last: "2026-11-04", lastText: "Wed, Nov 4" } };
  async function demo(b) {
    await new Promise(r => setTimeout(r, 350));
    if (b.action === "profileSave") { const keep = Object.assign({}, b); delete keep.action; delete keep.done; delete keep.volunteer; Object.assign(demoMe, keep, { greet: b.preferred || b.first }); }
    return JSON.parse(JSON.stringify(Object.assign({ email: session.email }, demoMe, { email: session.email })));
  }
  load();
})();
