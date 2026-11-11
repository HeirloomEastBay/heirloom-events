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
    if (window.HLNav) HLNav.setRoles({ email: r.email, admin: !!r.admin, volunteer: !!r.volunteer });
    try { localStorage.setItem("heirloom-me", JSON.stringify({ email: r.email, name: (r.first + " " + r.last).trim(), phone: r.phone })); } catch (e) { /* fine */ }
    const s = r.stats;
    const hours = s && s.hours ? (s.hours === 1 ? "1" : String(s.hours)) : "0";
    const access = [
      r.role === "Resident" && ["Resident", true],
      r.role === "Volunteer" && [r.status === "Active volunteer" ? "Approved volunteer" : "Volunteer · " + r.status, r.status === "Active volunteer"],
      r.role === "Volunteer" && ["Background check " + (r.bg === "Cleared" ? "cleared" : r.bg === "Sent" ? "sent, waiting to clear" : "not done yet"), r.bg === "Cleared"],
      r.role === "Volunteer" && ["Trainings: " + (r.trainings.length ? r.trainings.join(", ") : "none yet"), r.trainings.length > 0],
      ["Your events go up " + (r.trusted || r.approver || r.admin ? "right away" : "after a quick review"), true],
      r.approver && ["You approve other people's events", true],
      r.admin && ["You can use the Admin page", true]
    ].filter(Boolean);
    app.innerHTML = `
      ${s ? `<section class="card impact" aria-label="How you've helped">
        <div><b>${esc(hours)}</b><span>hour${hours === "1" ? "" : "s"} helped</span></div>
        <div><b>${s.shifts}</b><span>shift${s.shifts === 1 ? "" : "s"}</span></div>
        <div><b style="font-size:20px;line-height:1.6">${esc(s.last ? s.lastText.replace(/^\w+, /, "") : "Soon!")}</b><span>last helped</span></div>
      </section>` : ""}
      <form class="card" id="pf" novalidate>
        <h2>Contact info</h2>
        <div class="two">
          <label class="f">First name<input id="first" autocomplete="given-name" maxlength="60" value="${esc(r.first)}" required></label>
          <label class="f">Last name<input id="last" autocomplete="family-name" maxlength="60" value="${esc(r.last)}"></label>
        </div>
        <label class="f">Email<input type="email" value="${esc(r.email)}" disabled></label>
        <p class="lock" style="margin-top:-6px">${(r.others || []).length ? `You can also log in with ${esc(r.others.join(", "))}. ` : ""}To change your email${(r.others || []).length ? "s" : ""} or add another one, ask the Heirloom team.</p>
        <label class="f"><span>Phone <span class="opt">(optional)</span></span><input id="phone" type="tel" autocomplete="tel" maxlength="40" value="${esc(r.phone)}"></label>
        <label class="f"><span>Address <span class="opt">(optional)</span></span><input id="address" autocomplete="street-address" maxlength="300" value="${esc(r.address)}"></label>
        <label class="f"><span>Emergency contact <span class="opt">(optional)</span></span><input id="emergency" maxlength="200" placeholder="Name, relationship, phone" value="${esc(r.emergency)}"></label>
        <label class="chk"><input type="checkbox" id="news"${r.news ? " checked" : ""}> Send me Heirloom news &amp; updates</label>
        <p class="lock">🔒 Your phone, address and emergency contact are private. Only the Heirloom admin team can see them.</p>
        <p class="msg err" id="err" hidden></p>
        <div class="saverow"><button class="btn btn-primary" id="save">Save</button><span class="note" id="ok" aria-live="polite"></span></div>
      </form>
      <section class="card">
        <h2>Your access</h2>
        <ul class="access">${access.map(([t, on]) => `<li class="${on ? "" : "no"}">${esc(t)}</li>`).join("")}</ul>
        ${r.volunteer ? `<p><a class="btn btn-forest btn-sm" href="portal.html">Open the volunteer portal</a></p>` : `<p>Want to help out on the farm? <a href="volunteer.html" style="color:var(--forest);font-weight:600">Sign up to volunteer</a>.</p>`}
      </section>
      <p style="text-align:center"><button type="button" class="btn btn-outline btn-sm" id="out">Sign out</button></p>`;
    const f = $("#pf");
    f.addEventListener("input", () => { $("#ok").textContent = ""; });
    f.onsubmit = async e => {
      e.preventDefault();
      const err = $("#err"); err.hidden = true;
      if (!$("#first").value.trim()) { err.textContent = "Please add your first name."; err.hidden = false; $("#first").focus(); return; }
      const b = $("#save"); b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        const res = await call({ action: "profileSave", first: $("#first").value, last: $("#last").value, phone: $("#phone").value,
          address: $("#address").value, emergency: $("#emergency").value, news: $("#news").checked });
        if (!res.ok) { if (res.signedOut) return signIn("Your sign-in expired"); throw new Error(res.error); }
        render(res); $("#ok").textContent = "Saved. Thank you!";
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "Save"; }
    };
    $("#out").onclick = () => { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } if (window.HLNav) HLNav.signedOut(); location.href = "index.html"; };
  }

  // Preview mode
  let demoMe = { ok: true, email: "you@example.com", first: "Ana", last: "Diaz", phone: "510-555-0142", address: "", emergency: "", news: true,
    role: "Volunteer", status: "Active volunteer", admin: false, approver: false, trusted: false, volunteer: true, bg: "Cleared", trainings: ["Animal chores"],
    stats: { hours: 12, shifts: 11, last: "2026-11-04", lastText: "Wed, Nov 4" } };
  async function demo(b) {
    await new Promise(r => setTimeout(r, 350));
    if (b.action === "profileSave") Object.assign(demoMe, { first: b.first, last: b.last, phone: b.phone, address: b.address, emergency: b.emergency, news: b.news });
    return JSON.parse(JSON.stringify(Object.assign({ email: session.email }, demoMe, { email: session.email })));
  }
  load();
})();
