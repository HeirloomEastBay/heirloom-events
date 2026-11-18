/* Heirloom Activities — the profile questions, shared by the Profile page and the
   "Welcome" popup people see the first time they sign in. Also the power tools
   safety agreement. Everything except a name is optional.
   Phone, address, emergency contact, birthday, pronouns, dietary needs and
   allergies are only shown to the person and to admins. */
(function () {
  const C = window.HEIRLOOM || {};
  const DEMO = !C.API_URL;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };

  const css = `
  .hp-form { display: grid; gap: 12px; }
  .hp-form h3 { font-family: var(--f-title, Georgia, serif); font-size: 18px; color: var(--forest); margin: 10px 0 0; }
  .hp-form label.f { display: grid; gap: 4px; font-weight: 600; font-size: 15px; }
  .hp-form label.f input, .hp-form label.f textarea { width: 100%; min-height: 48px; padding: 10px 13px; background: #fff; border: 1.5px solid var(--line); border-radius: 10px; font: inherit; font-size: 16px; font-weight: 400; }
  .hp-form label.f textarea { min-height: 84px; resize: vertical; }
  .hp-form label.f input:focus, .hp-form label.f textarea:focus { outline: none; border-color: var(--forest); box-shadow: 0 0 0 3px rgba(46,74,54,.15); }
  .hp-form label.f input:disabled { background: var(--cream); color: var(--ink-soft); }
  .hp-form .opt { font-weight: 400; color: var(--muted); }
  .hp-form .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hp-form .three { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .hp-form .two { grid-template-columns: 1fr; } }
  .hp-form .chk { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; font-size: 15.5px; }
  .hp-form .chk input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--forest); flex: none; }
  .hp-form .chk small { display: block; color: var(--ink-soft); font-size: 13.5px; margin-top: 2px; }
  .hp-form .picks { display: flex; flex-wrap: wrap; gap: 8px; }
  .hp-form .picks label { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 6px 13px; border: 1.5px solid var(--line); border-radius: 999px; background: #fff; font-size: 14.5px; cursor: pointer; }
  .hp-form .picks input { accent-color: var(--forest); }
  .hp-form .picks label:has(input:checked) { border-color: var(--forest); background: var(--sage-soft); }
  .hp-form .lock { font-size: 13.5px; color: var(--muted); margin: 0; }
  .hp-dlg { border: 0; border-radius: 18px; padding: 0; width: min(640px, calc(100vw - 20px)); max-height: calc(100dvh - 20px); background: var(--paper, #fbf8f1); color: var(--ink, #1f2a22); box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  .hp-dlg::backdrop { background: rgba(31,42,34,.55); }
  .hp-dlg .in { padding: 22px 20px 18px; display: grid; gap: 12px; }
  .hp-dlg h2 { font-family: var(--f-title, Georgia, serif); font-size: 26px; color: var(--forest); margin: 0; }
  .hp-dlg p { margin: 0; color: var(--ink-soft); }
  .hp-dlg .bar { position: sticky; bottom: 0; background: var(--paper, #fbf8f1); border-top: 1px solid var(--line); padding: 12px 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; align-items: center; }
  .hp-dlg .bar .err { margin-right: auto; color: var(--barn-dark, #8e2f27); font-weight: 600; font-size: 14px; }
  .hp-agree { background: #fff; border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 16px; font-size: 14.5px; line-height: 1.5; max-height: 44vh; overflow: auto; }
  .hp-agree p { margin: 0 0 10px; color: var(--ink); } .hp-agree p:last-child { margin: 0; }`;
  function addCss() { if (document.getElementById("hp-css")) return; const s = document.createElement("style"); s.id = "hp-css"; s.textContent = css; document.head.appendChild(s); }

  async function api(body) {
    const session = read("heirloom-session");
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    return res.json();
  }

  /* ---------- The questions ---------- */
  function fields(r) {
    const resident = r.role === "Resident";
    const f = (id, label, val, o) => { o = o || {};
      return `<label class="f"><span>${label}${o.req ? "" : ` <span class="opt">(optional)</span>`}</span><input data-p="${id}" type="${o.type || "text"}" maxlength="${o.max || 200}" value="${esc(val || "")}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${o.ac ? ` autocomplete="${o.ac}"` : ""}${o.list ? ` list="${o.list}"` : ""}></label>`; };
    const picked = r.interests || [];
    const volLine = resident ? "" : r.role === "Volunteer"
      ? `<p class="lock">🌱 You're signed up to volunteer${r.status && r.status !== "Active volunteer" ? " (" + esc(String(r.status).toLowerCase()) + ")" : ""}. See your shifts in the volunteer portal.</p>`
      : `<label class="chk"><input type="checkbox" data-p="volunteer"><span><b>I'd like to volunteer on the farm</b>
          <small>Someone from Heirloom will reach out. Regular volunteers do a one-time background check (we cover it), then get trained on each kind of chore, like animal feeding or gardening. Drop-in workdays on the calendar are open to everyone, no sign-up needed.</small></span></label>`;
    return `<div class="hp-form">
      <div class="two">${f("first", "First name", r.first, { req: true, max: 60, ac: "given-name" })}${f("last", "Last name", r.last, { req: true, max: 60, ac: "family-name" })}</div>
      <div class="two">${f("preferred", "Preferred name", r.preferred, { max: 60, ph: "What should we call you?" })}${f("pronouns", "Pronouns", r.pronouns, { max: 40, list: "hp-pronouns", ph: "she/her, he/him, they/them…" })}</div>
      <datalist id="hp-pronouns"><option value="she/her"><option value="he/him"><option value="they/them"><option value="she/they"><option value="he/they"></datalist>
      <label class="f"><span>Email</span><input type="email" value="${esc(r.email)}" disabled></label>
      <div class="two">${f("phone", "Phone", r.phone, { type: "tel", max: 40, ac: "tel" })}${f("birthday", "Birthday", r.birthday, { type: "date", max: 10 })}</div>
      ${resident ? `<label class="chk"><input type="checkbox" data-p="birthdayShow"${r.birthdayShow !== false ? " checked" : ""}><span>Show my birthday on the residents' calendar<small>Just the month and day, and only residents see that calendar.</small></span></label>` : ""}
      <h3>Address <span class="opt">(optional)</span></h3>
      <label class="f"><span>Street</span><input data-p="address" maxlength="300" autocomplete="address-line1" value="${esc(r.address || "")}"></label>
      <div class="three"><label class="f"><span>City</span><input data-p="city" maxlength="80" autocomplete="address-level2" value="${esc(r.city || "")}"></label>
        <label class="f"><span>State</span><input data-p="state" maxlength="30" autocomplete="address-level1" value="${esc(r.state || "")}"></label>
        <label class="f"><span>Zip</span><input data-p="zip" maxlength="12" inputmode="numeric" autocomplete="postal-code" value="${esc(r.zip || "")}"></label></div>
      <h3>Emergency contact <span class="opt">(optional)</span></h3>
      <div class="two"><label class="f"><span>Their name</span><input data-p="emergency" maxlength="200" placeholder="Name and relationship" value="${esc(r.emergency || "")}"></label>
        <label class="f"><span>Their phone</span><input data-p="emergencyPhone" type="tel" maxlength="40" value="${esc(r.emergencyPhone || "")}"></label></div>
      <h3>Food</h3>
      <div class="two">${f("dietary", "Dietary restrictions", r.dietary, { max: 300, ph: "Vegetarian, gluten-free…" })}${f("allergies", "Allergies", r.allergies, { max: 300, ph: "Nuts, shellfish…" })}</div>
      <h3>What are you interested in at the farm?</h3>
      <div class="picks">${(r.interestOptions || []).map(o => `<label><input type="checkbox" data-p="interest" value="${esc(o)}"${picked.includes(o) ? " checked" : ""}>${esc(o)}</label>`).join("")}</div>
      ${resident ? "" : `<h3>Getting involved</h3>${volLine}
      <label class="chk"><input type="checkbox" data-p="church"${r.church ? " checked" : ""}><span><b>I'd like to be part of the church family</b>
        <small>You'll see the Supper Church sign-ups (who's bringing what on Sundays) and notes from Pastor Brit. You don't need to be an official member, and you can turn this off any time.</small></span></label>`}
      <label class="f"><span>Anything else you'd like us to know? <span class="opt">(optional)</span></span><textarea data-p="about" maxlength="2000">${esc(r.about || "")}</textarea></label>
      <label class="chk"><input type="checkbox" data-p="news"${r.news ? " checked" : ""}><span>Send me Heirloom news &amp; updates</span></label>
      <p class="lock">🔒 Your phone, address, emergency contact, birth year, pronouns, dietary needs and allergies are private. Only you and the Heirloom admin team can see them. (People cooking for Supper Church see a count like "2 vegetarian, 1 nut allergy", with no names.${resident ? " Your birthday's month and day show on the residents' calendar unless you turn that off above." : ""})</p>
    </div>`;
  }
  function collect(root) {
    const v = k => { const el = root.querySelector(`[data-p="${k}"]`); return el ? el.value : undefined; };
    const c = k => { const el = root.querySelector(`[data-p="${k}"]`); return el ? el.checked : undefined; };
    const b = { first: v("first"), last: v("last"), preferred: v("preferred"), pronouns: v("pronouns"), phone: v("phone"), birthday: v("birthday"), address: v("address"),
      city: v("city"), state: v("state"), zip: v("zip"), emergency: v("emergency"), emergencyPhone: v("emergencyPhone"), dietary: v("dietary"), allergies: v("allergies"), about: v("about"), news: c("news"),
      interests: [...root.querySelectorAll('[data-p="interest"]:checked')].map(x => x.value) };
    if (c("church") !== undefined) b.church = c("church");
    if (c("birthdayShow") !== undefined) b.birthdayShow = c("birthdayShow");
    if (c("volunteer")) b.volunteer = true;
    return b;
  }
  function check(root) {
    const first = root.querySelector('[data-p="first"]'), pref = root.querySelector('[data-p="preferred"]');
    if (!first.value.trim() && !pref.value.trim()) { first.focus(); return "Please add your first name."; }
    const last = root.querySelector('[data-p="last"]');
    if (!last.value.trim()) { last.focus(); return "Please add your last name."; }
    return "";
  }

  function dialog(html) {
    addCss();
    const d = document.createElement("dialog");
    d.className = "hp-dlg"; d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.showModal();
    return d;
  }

  /* ---------- First sign-in ---------- */
  function welcome(r) {
    const name = r.greet || r.first || "";
    const d = dialog(`<form method="dialog" novalidate><div class="in">
        <h2>Welcome${name ? ", " + esc(name) : ""}!</h2>
        <p>Tell us a little about you. Only your first and last name are needed; fill in whatever else you like, and you can change any of it later on your Profile.</p>
        ${fields(r)}
      </div><div class="bar"><span class="err" hidden></span><button type="button" class="btn btn-outline btn-sm" data-a="later">Not now</button><button type="button" class="btn btn-primary" data-a="save">Save</button></div></form>`);
    const err = d.querySelector(".err");
    d.querySelector('[data-a="later"]').onclick = () => d.close();
    d.querySelector('[data-a="save"]').onclick = async e => {
      const bad = check(d); err.hidden = !bad; err.textContent = bad; if (bad) return;
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        const res = await api(Object.assign({ action: "profileSave", done: true }, collect(d)));
        if (!res.ok) throw new Error(res.error || "Something went wrong");
        remember(res); d.close();
        if (res.powerPending) powerDialog(res);
        if (window.HLNav) HLNav.setRoles({ email: res.email, admin: !!res.admin, volunteer: !!res.volunteer, resident: !!res.resident, church: !!res.church });
        document.dispatchEvent(new CustomEvent("heirloom-profile", { detail: res }));
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "Save"; }
    };
  }
  function remember(r) {
    try {
      localStorage.setItem("heirloom-welcomed", r.email);
      localStorage.setItem("heirloom-me", JSON.stringify({ email: r.email, name: ((r.preferred || r.first) + " " + r.last).trim(), first: r.greet || r.preferred || r.first, phone: r.phone }));
    } catch (e) { /* fine */ }
  }
  // Called on every signed-in page, and right after someone signs in (fresh = true). It asks the
  // server once per visit: first the Welcome questions, then (for someone newly approved for
  // power tools) the safety agreement, before anything else.
  async function maybeWelcome(fresh) {
    if (DEMO || (!fresh && /profile\.html$/i.test(location.pathname))) return;
    const session = read("heirloom-session");
    if (!session || !session.token) return;
    let seen = false; try { seen = sessionStorage.getItem("heirloom-checked") === session.email; } catch (e) { /* fine */ }
    if (seen && fresh !== true) return;
    try {
      const r = await api({ action: "profileGet" });
      if (!r.ok) return;
      try { sessionStorage.setItem("heirloom-checked", session.email); } catch (e) { /* fine */ }
      if (!r.done) return welcome(r);
      remember(r);
      if (r.powerPending) powerDialog(r, () => { if (/portal\.html|profile\.html/i.test(location.pathname)) location.reload(); });
    } catch (e) { /* try again next page */ }
  }

  /* ---------- Power tools and woodshop: safety and assumption of risk ----------
     Wording version 2026-11 (matches POWER_AGREEMENT in Code.gs). If you change the
     words, bump both so the Sheet shows which version each person accepted. */
  const AGREEMENT = `
    <p>Before you use power tools, machinery or the woodshop at Heirloom, please read and accept the following.</p>
    <p><b>Safety.</b> I will use only the tools I have been trained on at Heirloom. I will wear eye and ear protection and closed-toe shoes, tie back loose hair and clothing, and never work impaired, overtired, or alone without someone knowing I'm there. I will check tools before use, stop if something seems unsafe, and report any injury or damaged equipment to a resident or admin right away.</p>
    <p><b>Assumption of risk.</b> I understand that working with power tools and machinery carries risks that can't be eliminated, including cuts, burns, eye and hearing injury, amputation and, in rare cases, death. I am choosing to take part voluntarily and I assume these risks.</p>
    <p><b>Release.</b> To the fullest extent California law allows, I release Heirloom, its residents, staff and volunteers from claims for injury or loss arising from my use of tools and machinery, including claims based on ordinary negligence. I agree to cover my own medical costs.</p>`;
  function powerDialog(r, onDone) {
    const d = dialog(`<form method="dialog" novalidate><div class="in">
        <h2>Power tools &amp; woodshop</h2>
        <p>One more step before this training counts: safety and assumption of risk.</p>
        <div class="hp-agree" tabindex="0">${AGREEMENT}</div>
        <div class="hp-form">
          <label class="chk"><input type="checkbox" data-a="adult"><span>I am 18 or older.</span></label>
          <label class="f"><span>Type your full name to accept</span><input data-a="name" maxlength="80" autocomplete="name" value="${esc(((r.first || "") + " " + (r.last || "")).trim())}"></label>
        </div>
      </div><div class="bar"><span class="err" hidden></span><button type="button" class="btn btn-outline btn-sm" data-a="no">Not now</button><button type="button" class="btn btn-primary" data-a="yes">I have read this and agree</button></div></form>`);
    const err = d.querySelector(".err");
    d.querySelector('[data-a="no"]').onclick = () => d.close();
    d.querySelector('[data-a="yes"]').onclick = async e => {
      const name = d.querySelector('[data-a="name"]').value.trim(), adult = d.querySelector('[data-a="adult"]').checked;
      const bad = !adult ? "Please confirm you're 18 or older." : !name ? "Please type your name." : "";
      err.hidden = !bad; err.textContent = bad; if (bad) return;
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        const res = DEMO ? Object.assign({}, r, { ok: true, powerPending: false, powerAccepted: "today · " + name }) : await api({ action: "profileAccept", name: name, adult: true });
        if (!res.ok) throw new Error(res.error || "Something went wrong");
        d.close(); if (onDone) onDone(res);
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "I have read this and agree"; }
    };
  }

  window.HLProfile = { fields: r => { addCss(); return fields(r); }, collect, check, powerDialog, maybeWelcome, remember };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => maybeWelcome()); else maybeWelcome();
})();
