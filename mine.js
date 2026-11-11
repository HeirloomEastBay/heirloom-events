/* Heirloom Activities — "My events": sign in with an emailed code, then manage your events */
(function () {
  const C = window.HEIRLOOM;
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safe = u => /^https?:\/\//i.test(u || "") ? u : "";
  const KEY = "heirloom-session", ME = "heirloom-me";
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off: they'll sign in each visit */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* fine */ } }
  };
  const DEMO = !C.API_URL;
  if (DEMO) $("#demoBanner").hidden = false;
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
    return res.json();
  }

  /* ---------- Step 1: email ---------- */
  function askEmail(prefill, note) {
    app.innerHTML = `<form class="signin" id="emailForm" novalidate>
      <h2>Sign in</h2>
      <p>Enter the email you used when you shared your events. We'll email you a 6-digit code.</p>
      ${note ? `<p class="msg ok">${esc(note)}</p>` : ""}
      <label for="email">Email</label>
      <input type="email" id="email" autocomplete="email" inputmode="email" maxlength="120" value="${esc(prefill || "")}" required>
      <p class="msg err" id="err" hidden></p>
      <button class="btn btn-primary" id="go">Email me a code</button>
      <p class="small">No password needed. You'll stay signed in on this device for 30 days.</p>
    </form>`;
    $("#email").focus();
    $("#emailForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("#email").value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return showErr("Please enter a valid email.");
      busy($("#go"), "Sending…");
      try {
        const r = await call({ action: "loginStart", email });
        if (!r.ok) throw new Error(r.error);
        askCode(email);
      } catch (err) { showErr((err.message || "Something went wrong") + "."); unbusy($("#go"), "Email me a code"); }
    };
  }

  /* ---------- Step 2: code ---------- */
  function askCode(email) {
    app.innerHTML = `<form class="signin" id="codeForm" novalidate>
      <h2>Check your email</h2>
      <p>We sent a 6-digit code to <b>${esc(email)}</b>. It works for 10 minutes. Check your spam folder if it's not there in a minute.</p>
      <label for="code">Code</label>
      <input class="code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required>
      <p class="msg err" id="err" hidden></p>
      <button class="btn btn-primary" id="go">Sign in</button>
      <p class="small"><button type="button" class="link-btn" id="resend">Send a new code</button> · <button type="button" class="link-btn" id="other">Use a different email</button></p>
    </form>`;
    const input = $("#code");
    input.focus();
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
      if (input.value.length === 6) $("#codeForm").requestSubmit();
    });
    $("#codeForm").onsubmit = async e => {
      e.preventDefault();
      if (input.value.length !== 6) return showErr("Enter all 6 digits.");
      busy($("#go"), "Checking…");
      try {
        const r = await call({ action: "loginVerify", email, code: input.value });
        if (!r.ok) throw new Error(r.error);
        store.set(KEY, { token: r.token, email: r.email });
        load();
      } catch (err) { showErr((err.message || "Something went wrong") + "."); unbusy($("#go"), "Sign in"); input.select(); }
    };
    $("#resend").onclick = async () => {
      try { const r = await call({ action: "loginStart", email }); if (!r.ok) throw new Error(r.error); showErr(""); input.value = ""; input.focus();
        $("#err").hidden = false; $("#err").className = "msg ok"; $("#err").textContent = "New code sent."; }
      catch (err) { showErr((err.message || "Something went wrong") + "."); }
    };
    $("#other").onclick = () => askEmail("");
  }

  /* ---------- Step 3: their events ---------- */
  async function load() {
    const s = store.get(KEY);
    if (!s || !s.token) return askEmail((store.get(ME) || {}).email);
    app.innerHTML = `<p class="loading">Loading your events…</p>`;
    try {
      const r = await call({ action: "myEvents", token: s.token });
      if (!r.ok) {
        if (r.signedOut) { store.del(KEY); return askEmail(s.email, "Your sign-in expired. We'll send you a new code."); }
        throw new Error(r.error);
      }
      // Remember name, email and phone so the Submit form can fill them in
      store.set(ME, { email: r.email, name: r.name, phone: r.phone });
      // Came from the Admin page to sign in: go back there
      // Admins go straight to the Admin page (its "My events" link adds ?mine=1 to stay here)
      if (r.admin && !new URLSearchParams(location.search).has("mine")) { location.replace("admin.html"); return; }
      // Volunteers go to their portal (it links back here if they've posted events)
      if (r.volunteer && !new URLSearchParams(location.search).has("mine")) { location.replace("portal.html"); return; }
      render(r);
    } catch (err) {
      app.innerHTML = `<div class="empty"><h2>We couldn't load your events</h2><p>${esc(err.message || "Please try again in a minute.")}</p>
        <p><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
      $("#retry").onclick = load;
    }
  }

  function statusChip(e) {
    if (e.status === "Published" && e.changesPending) return `<span class="status pending">Changes waiting for review</span>`;
    if (e.status === "Published") return `<span class="status">On the calendar</span>`;
    if (e.status === "Pending" || e.status === "Approved") return `<span class="status pending">Waiting for review</span>`;
    return `<span class="status off">${esc(e.status === "Declined" ? "Not added" : e.status)}</span>`;
  }

  function card(e) {
    const off = /^(Declined|Cancelled|Unpublished)$/.test(e.status);
    const rsvp = e.rsvp && !off ? `<span class="chip spots">${e.going} going${e.spots ? " of " + e.spots : ""}</span>` : "";
    const edit = safe(e.editUrl), guests = safe(e.guestsUrl);
    return `<article class="mine${off || e.past ? " dim" : ""}">
      <img src="${esc(e.image || "images/farmhouse.jpg")}" alt="" loading="lazy">
      <div>
        <h3>${esc(e.title)}</h3>
        <p class="when">${esc(e.when)}${e.location ? " · " + esc(e.location) : ""}</p>
        <div class="row">${statusChip(e)}${rsvp}</div>
        <div class="acts">
          ${edit && !e.past ? `<a class="btn btn-primary btn-sm" href="${esc(edit)}">Edit or cancel</a>` : ""}
          ${guests ? `<a class="btn btn-outline btn-sm" href="${esc(guests)}" target="_blank" rel="noopener">Guest list</a>` : ""}
          ${e.status === "Published" && !e.past && /public/i.test(e.calendars || "") ? `<a class="btn btn-outline btn-sm" href="index.html?event=${encodeURIComponent(e.id)}&flyer=1">Flyer &amp; images</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  function render(r) {
    const up = r.events.filter(e => !e.past), past = r.events.filter(e => e.past);
    app.innerHTML = `
      <div class="who">
        <p>Signed in as <b>${esc(r.email)}</b></p>
        <div class="tools">
          ${r.admin ? `<a class="btn btn-forest btn-sm" href="admin.html">Back to Admin</a>` : ""}
          <a class="btn btn-primary btn-sm" href="submit.html">Submit a new event</a>
          <button type="button" class="btn btn-outline btn-sm" id="out">Sign out</button>
        </div>
      </div>
      ${!r.events.length ? `<div class="empty"><h2>No events yet</h2><p>Once you submit an event with this email, it'll show up here.</p>
        <p><a class="btn btn-primary" href="submit.html">Submit an event</a></p></div>` : ""}
      ${up.length ? `<div class="group-h"><h2>Upcoming</h2></div><div class="mine-list">${up.map(card).join("")}</div>` : ""}
      ${past.length ? `<div class="group-h"><h2>Past</h2></div><div class="mine-list">${past.slice(0, 30).map(card).join("")}</div>` : ""}`;
    $("#out").onclick = () => { store.del(KEY); askEmail(r.email); };
  }

  /* ---------- Little helpers ---------- */
  function showErr(m) { const el = $("#err"); if (!el) return; el.className = "msg err"; el.textContent = m; el.hidden = !m; }
  function busy(b, t) { b.disabled = true; b.innerHTML = `<span class="spinner"></span> ${esc(t)}`; }
  function unbusy(b, t) { b.disabled = false; b.textContent = t; }

  // Preview mode: pretend backend (code is 123456)
  async function demo(b) {
    await new Promise(r => setTimeout(r, 500));
    if (b.action === "loginStart") return { ok: true };
    if (b.action === "loginVerify") return b.code === "123456" ? { ok: true, token: "demo", email: b.email } : { ok: false, error: "That code doesn't match. In preview mode it's 123456" };
    const s = store.get(KEY) || {};
    const d = n => { const x = new Date(Date.now() + n * 86400000); return x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); };
    return { ok: true, email: s.email || "you@example.com", name: "", phone: "", admin: true, events: [
      { id: "1", title: "Happy Hour with the Goats", when: d(2) + ", 4–6pm · Every Thursday", location: "Goat pen", status: "Published", image: "images/goats.jpg", rsvp: false, calendars: "Public, Residents", editUrl: "https://example.com/", past: false },
      { id: "2", title: "Painting in the Farmhouse", when: d(9) + ", 2–4:30pm", location: "Farmhouse", status: "Published", image: "images/painting.jpg", rsvp: true, spots: 12, going: 9, calendars: "Public", editUrl: "https://example.com/", guestsUrl: "https://example.com/", past: false },
      { id: "3", title: "Knit & Sip on the Porch", when: d(16) + ", 6–8pm", location: "Farmhouse", status: "Pending", image: "images/farmhouse-lawn.jpg", editUrl: "https://example.com/", past: false },
      { id: "4", title: "Fall Harvest Potluck", when: d(-12) + ", 5–8pm", location: "The big lawn", status: "Published", image: "images/tomatoes.jpg", past: true }
    ] };
  }

  load();
})();
