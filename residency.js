/* Heirloom Activities — Living at Heirloom (residency)
   Not signed in, or not applied: what residency involves (from the 2026 Resident Interest Form & FAQ)
   and the interest form itself (no account needed). It goes to Pastor Brit (staff@).
   Applicants: where they are in the discernment process.
   Residents: applications Brit has shared with them (from the interview with residents onward),
   and, during the feedback week, a place to send Brit feedback (only Brit and the admins see it).
   Admins: every application, with a link to the person's People profile. */
(function () {
  const C = window.HEIRLOOM;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const opened = Date.now();
  const QS = new URLSearchParams(location.search);
  const focusP = QS.get("p");
  // ?apply = always the about + form (the link for the website's button); ?edit=…&k=… = the edit link in the applicant's emailed copy
  const EDIT = QS.get("edit") ? { edit: QS.get("edit"), k: QS.get("k") || "" } : null, APPLY = QS.has("apply");
  let session = null, data = null, demoR = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO && /demo=resident/.test(location.search)) session = { token: "demo", email: "lisa@example.com" };
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const short = s => s ? parse(s).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }) : "";
  const longD = s => s ? parse(s).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }) : "";

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

  /* ---------- About residency (Heirloom's own words, from the 2026 Resident Interest Form & FAQ) ---------- */
  const FAQ = `<div class="faq">
    <details><summary>Discernment</summary><div class="in">
      <p>We are an intentional Christian community, grounded in the transforming love of God, engaged in Christ-centered practices, and responsive to the work of the Holy Spirit. Community living means sharing the benefits and burdens: it is beautiful and challenging. We recognize that it's not for everyone and that people who commit to living in community do so with intention and purpose (usually out of a sense of calling from God), either for a season or for a lifetime.</p>
      <p>We approach residency as a mutual discernment process. We ask: is Heirloom the right community for someone in this season? Are they the right resident for this community in this season? The residency application is not a guarantee of acceptance. Open rooms do not mean "first come, first serve" access to applications. Our pastoral staff will engage in an ongoing conversation with potential residents to discern next steps together.</p>
      <blockquote>"Encourage one another to love &amp; good works." Hebrews 10:24a</blockquote></div></details>
    <details><summary>The discernment process</summary><div class="in">
      <ul><li>Interest form</li><li>Interview with staff</li><li>Fill out the application</li><li>Background check</li><li>Meet with residents</li><li>Housing placement or waitlist</li><li>Ministry Safe class completed</li><li>Lease made and move in</li></ul>
      <p>Our discernment process takes 3-4 weeks. Communal discernment takes time and this process cannot be rushed. When reasonably possible, anyone interested in residency should first make a guest visit to Heirloom. We include community residents in the discernment process and encourage you to join a group conversation and community events. At any point, either party may decide not to continue.</p>
      <p>Residency usually starts with a 3-month stay. Throughout that time, we discern together whether it becomes a year-long lease.</p>
      <p>Those who commit to residency are required to pass a child safety background check as well as child safety education and certification. This is a basic requirement of all participants (including staff). We believe the whole community is responsible to care for children. On a separate form, you'll also be asked to sign a liability release, sexual harassment and boundaries policy, and general respect clause. We need a photocopy of your ID and confirmation of income.</p></div></details>
    <details><summary>The Heirloom Covenant</summary><div class="in">
      <p>All residents enter into a covenant relationship with Heirloom, making a shared commitment to God and to the community.</p>
      <p>As Heirloom, we confess God first loves us and we respond to this generous and transforming love by seeking restorative relationships with God, ourselves, others, and creation.</p>
      <p>As Heirloom, we work to nurture a community that bears witness to the love of God through hospitality, sustainability, and creativity.</p>
      <p>As Heirloom, our life together is rooted in the values and tension of acceptance and transformation, action and rest, community and solitude, resistance and embrace.</p>
      <p>As Heirloom, we desire to grow in Christlikeness and commit together to pray, eat, work, and play.</p>
      <p>As members of the Heirloom community, we belong to one another and commit to engaging with vulnerability, respect, and love.</p></div></details>
    <details><summary>Rhythms of community: pray, eat, work and play</summary><div class="in">
      <p>All residents are expected to take part in our community rhythms. We understand each person has other responsibilities, like jobs, family, travel or illness, but residency means choosing to prioritize these rhythms. They may change, but currently include:</p>
      <ul><li>Daily prayers (encouraged, currently Monday-Thursday at 8:00am)</li><li>Weekly house meeting (required, currently Wednesdays at 6:45pm)</li><li>Weekly Supper Church (encouraged, Sundays at 5:30pm), with a turn to cook about every 3 months</li>
        <li>Community meals (optional sign-up Monday-Thursday, $3/meal, with options for cooking and/or cleaning)</li><li>Daily and weekly chores (3 or more times a week, depending on the season)</li><li>Monthly farm work days</li>
        <li>Supporting the ministries of Heirloom, including animal chores (at least 4 hours a week)</li><li>A weekly sabbath day and regular time away, encouraged</li><li>Optional community activities: coffee with staff, movie nights and more</li></ul></div></details>
    <details><summary>Rooms, rent and what's included</summary><div class="in">
      <p>Rent and utilities only cover a portion of what it costs to operate the farm. We're committed to making Heirloom a financially viable living option in the midst of an unjust housing market, so we all share in income-generating activities. Anyone is welcome to contribute more than the monthly rate as a tithe or offering. Rent may increase at the end of the annual lease.</p>
      <p>Spaces range from $650 to $1,250 a month; some can accommodate a pet and some can't (no spots currently take more than one cat or dog). Utilities are an all-inclusive $150 a month per person (internet, electricity, heat and AC, water, trash), plus $30 a month to the community fund for shared household items and generosity.</p>
      <p>Full-time residents have access to the farmhouse, pool, autoshop, woodshop, work spaces, garden, the 95-acre hills, food grown on the land, 7 nights of guest stays to give to friends and family, and more.</p></div></details>
    <details><summary>Questions?</summary><div class="in"><p>Pastor Brit Bolerjack · <a href="mailto:staff@heirloomeastbay.com">staff@heirloomeastbay.com</a></p></div></details>
  </div>`;

  /* ---------- Load ---------- */
  if (EDIT) { editForm(); return; }
  if (APPLY || !session || !session.token) { applyForm(); return; }
  load();
  async function editForm() {
    try { const r = await call(Object.assign({ action: "residencyLoad" }, EDIT)); applyForm(r.answers, r); }
    catch (err) { app.innerHTML = `<div class="card"><h2>We couldn't open your form</h2><p>${esc(err.message || "Something went wrong")}.</p><p>Questions? Email Pastor Brit at <a href="mailto:staff@heirloomeastbay.com">staff@heirloomeastbay.com</a>.</p></div>`; }
  }
  async function load(msg) {
    try { data = await call({ action: "residencyGet" }); }
    catch (err) {
      if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } session = null; applyForm(); return; }
      app.innerHTML = `<div class="card"><h2>Couldn't load this page</h2><p>${esc(err.message || "Something went wrong")}.</p><p><button class="btn btn-primary" onclick="location.reload()">Try again</button></p></div>`; return;
    }
    if (window.HLNav) HLNav.setRoles({ email: data.email, admin: !!data.admin, resident: !!data.resident, residency: data.stage });
    if (data.resident || data.admin) return residentsView(msg);
    if (!data.stage && !data.applied) return applyForm();
    return progress(msg);
  }

  /* ---------- Applicants: where things are ---------- */
  function progress(msg) {
    const st = data.stage || "Applied";
    if (/^Not /.test(st)) { app.innerHTML = `<section class="card"><h2>Living at Heirloom</h2><p>Thank you for your interest in living at Heirloom. If you have questions, reach out to Pastor Brit at <a href="mailto:${esc(data.staff)}">${esc(data.staff)}</a>.</p></section>`; return; }
    const order = ["Applied", "Brit reviewing", "One-on-one with Brit", "Interview with residents", "Resident feedback week", "Approved (moving in)"];
    const at = Math.max(0, order.indexOf(st));
    const steps = [["Interest form", data.appliedOn ? "We got it on " + short(data.appliedOn) + "." : "We got your form."], ["Pastor Brit reads it", "She'll reach out if there's a space that's a good fit."],
      ["A conversation with Brit", "One on one, to get to know each other."], ["Meet the residents", "An interview with the community."], ["Discernment", "Residents share their thoughts with Brit over about a week."],
      ["Welcome home", data.moveIn ? "Moving in " + longD(data.moveIn) + (data.space ? " · " + data.space : "") + "." : "A move-in date and lease."]];
    app.innerHTML = `${msg ? `<p class="msg ok" role="status">${esc(msg)}</p>` : ""}
      <section class="card"><h2>${data.first ? "Thanks, " + esc(data.first) + "!" : "Thank you"}</h2>
        <p>${st === "Waitlist" ? "You're on our waitlist. Brit will reach out when a space opens that fits." : "Here's where you are in our discernment process. It usually takes 3-4 weeks, and either of us can pause at any point."}</p>
        ${st === "Waitlist" ? "" : `<ol class="steps">${steps.map(([t, d], i) => `<li class="${i < at || i === 0 ? "done" : i === at + 1 ? "now" : ""}"><i>${i < at || i === 0 ? "✓" : i + 1}</i><div><b>${esc(t)}</b>${esc(d)}</div></li>`).join("")}</ol>`}
        <p style="margin-top:14px">Questions? Email <a href="mailto:${esc(data.staff)}">${esc(data.staff)}</a>.</p></section>
      <section class="card"><h2>About residency</h2>${FAQ}</section>`;
  }

  /* ---------- Residents and admins: applications ---------- */
  const SHOW = [["Applying for", "Applying for"], ["Arrival", "Hoping to arrive"], ["Departure", "Leaving"], ["Rooming", "Rooming preference"], ["Pets", "Pets"], ["Pet details", "About their pet"],
    ["Call to community", "Their call to live in Christian community"], ["Appealing and challenging", "What's appealing, and what seems challenging"], ["Faith statement", "Their current faith"],
    ["Church engagement", "Engagement with the Body of Christ"], ["Roommates would say", "How roommates would describe them"], ["Boss would say", "How a boss would describe them"],
    ["Commitments", "Job and personal commitments"], ["Lifestyle", "Lifestyle"],
    ["Phone", "Phone"], ["Rent plan", "How they'll pay rent"], ["Position", "Position"], ["Location", "Where"], ["Dates", "Dates"], ["Roles", "Roles and responsibilities"], ["Rewards", "Rewards"], ["Challenges", "Challenges"],
    ["Medical or allergies", "Allergies or medical needs"], ["Children note", "About volunteering with children"]];
  function residentsView(msg) {
    const L = data.list;
    app.innerHTML = `${msg ? `<p class="msg ok" role="status">${esc(msg)}</p>` : ""}
      <section class="card"><h2>${data.admin ? "Resident applications" : "Applications shared with residents"}</h2>
        <p>${data.admin ? "Everyone who's filled out the interest form and isn't a resident yet. Residents see an application once Brit moves it to the interview with residents (without employment, rent and medical answers)." : "Brit shares an application here when the person meets with the residents. During their feedback week, tell Brit what you think, here or in person. Only Brit and the admins see what you write."}</p>
        ${L.length ? `<div class="apps">${L.map(card).join("")}</div>` : `<p style="margin:0;color:var(--muted)">${data.admin ? "No applications right now." : "Nothing shared with residents right now."}</p>`}</section>
      ${data.admin ? "" : `<section class="card"><h2>About residency</h2>${FAQ}</section>`}`;
    app.querySelectorAll("form[data-fb]").forEach(f => f.onsubmit = async e => {
      e.preventDefault();
      const b = f.querySelector("button"), lean = f.querySelector('input[name="lean"]:checked'), comment = f.querySelector("textarea").value.trim();
      if (!lean && !comment) { f.querySelector(".warn").textContent = "Choose how you're feeling or write a note."; return; }
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Sending…`;
      try { data = await call({ action: "residencyFeedback", applicant: f.dataset.fb, leaning: lean ? lean.value : "", comment }); residentsView("Thank you! Brit will see your feedback."); }
      catch (err) { b.disabled = false; b.textContent = "Send to Brit"; f.querySelector(".warn").textContent = (err.message || "Something went wrong") + "."; }
    });
    if (focusP) { const el = document.getElementById("a-" + focusP.toLowerCase()); if (el) { el.open = true; el.scrollIntoView({ block: "start" }); } }
  }
  function card(a) {
    const ans = a.app ? SHOW.filter(([k]) => a.app[k]).map(([k, l]) => `<dt>${esc(l)}</dt><dd>${esc(a.app[k])}</dd>`).join("") : "";
    const fb = a.feedbackOpen ? `<form class="f" data-fb="${esc(a.email)}" style="gap:10px;margin-top:4px">
        <p style="margin:0;font-weight:700">Your feedback for Brit${a.feedbackUntil ? `, by ${esc(longD(a.feedbackUntil))}` : ""}</p>
        <div class="lean" role="radiogroup" aria-label="How are you feeling?">${data.leanings.map(l => `<label><input type="radio" name="lean" value="${esc(l)}"${a.mine && a.mine.leaning === l ? " checked" : ""}>${esc(l)}</label>`).join("")}</div>
        <textarea maxlength="4000" placeholder="Anything you'd like Brit to know (optional)">${esc(a.mine ? a.mine.comment : "")}</textarea>
        <p class="warn"></p><div><button class="btn btn-primary btn-sm">${a.mine ? "Update my feedback" : "Send to Brit"}</button>${a.mine ? ` <span class="note">Sent ${esc(short(String(a.mine.when).slice(0, 10)))}</span>` : ""}</div></form>` : "";
    return `<details class="appc${a.feedbackOpen ? " open" : ""}" id="a-${esc(a.email)}"${a.feedbackOpen || focusP === a.email ? " open" : ""}>
      <summary style="cursor:pointer;list-style:none"><h3>${esc(a.name)} <span class="pill ${a.feedbackOpen ? "wait" : /Approved/.test(a.stage) ? "ok" : "off"}">${esc(a.feedbackOpen ? "Feedback week" + (a.feedbackUntil ? " · until " + short(a.feedbackUntil) : "") : a.stage)}</span></h3>
        ${data.admin && a.feedbackCount ? `<span class="note">${a.feedbackCount} resident${a.feedbackCount === 1 ? "" : "s"} gave feedback</span>` : ""}</summary>
      ${fb}
      ${ans ? `<dl>${ans}</dl>` : `<p class="note">No interest form on file.</p>`}
      ${data.admin ? `<p style="margin:0"><a class="btn btn-outline btn-sm" href="admin.html?tab=people&p=${encodeURIComponent(a.email)}">Open their People profile</a></p>` : ""}
    </details>`;
  }

  /* ---------- The interest form ---------- */
  function applyForm(pre, info) {
    let me = {}; try { me = JSON.parse(localStorage.getItem("heirloom-me") || "{}") || {}; } catch (e) { /* fine */ }
    const signed = pre ? pre["Email"] : session && session.email;
    const ta = (k, q, opt, ph) => `<label class="q">${q}${opt ? ` <span class="opt">(optional)</span>` : ` <span class="req">*</span>`}<textarea data-a="${esc(k)}" maxlength="6000"${ph ? ` placeholder="${esc(ph)}"` : ""}></textarea></label>`;
    const tx = (k, q, opt, v, type) => `<label class="q">${q}${opt ? ` <span class="opt">(optional)</span>` : ` <span class="req">*</span>`}<input type="${type || "text"}" data-a="${esc(k)}" maxlength="200" value="${esc(v || "")}"${type === "email" && signed ? " readonly" : ""}></label>`;
    app.innerHTML = `
      ${pre ? `<section class="card"><h2>Edit your interest form</h2><p>Your answers are filled in below. Change anything you like, check the two boxes at the end again, and save. Pastor Brit will see the updated version, and we'll email you a fresh copy.</p>
        <p class="note" style="margin:0;color:var(--muted)">First sent ${esc(short(info && info.submitted))}${info && info.updated ? " · last changed " + esc(short(info.updated)) : ""}</p></section>` : ""}
      <section class="card"${pre ? " hidden" : ""}><h2>Resident interest form</h2>
        <p>We approach residency as a mutual discernment process. After you send this, Pastor Brit will read it and reach out about next steps. Parts of your form may be shared with all residents as part of discernment (not your employment, rent plan or medical answers).</p>
        ${FAQ}</section>
      <form class="card f" id="ra" novalidate>
        <h3 class="part">Part 1: About you</h3>
        <div class="two">${tx("Full name", "Full name", false, me.name)}${tx("Preferred name", "Preferred name", true)}</div>
        <div class="two">${tx("Email", "Email", false, signed || me.email, "email")}${tx("Phone", "Phone", true, me.phone, "tel")}</div>
        <fieldset><legend>Applying for <span class="req">*</span></legend><div class="choices">
          <label><input type="radio" name="term" value="Short term (2-3 months)">Short term: 2-3 months</label><label><input type="radio" name="term" value="Long term (over 3 months)">Long term: over 3 months</label></div></fieldset>
        <div class="two"><label class="q">Hoping to arrive <span class="opt">(optional)</span><input type="date" data-a="Arrival"></label><label class="q" id="depWrap" hidden>Hoping to leave <span class="opt">(optional)</span><input type="date" data-a="Departure"></label></div>
        <fieldset><legend>Rooming preference</legend><div class="choices"><label><input type="radio" name="room" value="Personal room">Personal room</label><label><input type="radio" name="room" value="Shared room">Shared room</label><label><input type="radio" name="room" value="Either">Either</label></div></fieldset>
        <fieldset><legend>Do you have a pet you'd like to live with you here?</legend><div class="choices"><label><input type="radio" name="pets" value="Yes">Yes</label><label><input type="radio" name="pets" value="No">No</label></div>
          <p class="lead">We don't currently have any spots that can take more than one cat or dog.</p></fieldset>
        <div id="petWrap" hidden>${ta("Pet details", "Tell us about your pet", true)}</div>

        <h3 class="part">Part 2: Current work</h3>
        <p class="lead">Only Pastor Brit and the admin team see this part.</p>
        ${ta("Rent plan", "If you're not currently employed, how do you plan to pay rent while you live with us?", true)}
        <div class="two">${tx("Position", "Position", true)}${tx("Location", "Where", true)}</div>
        ${tx("Dates", "Dates employed or volunteered", true)}
        ${ta("Roles", "Roles and responsibilities", true)}
        <div class="two">${ta("Rewards", "Rewards", true)}${ta("Challenges", "Challenges", true)}</div>

        <h3 class="part">Part 3: Communal life</h3>
        ${ta("Call to community", "Tell us about your call to live in Christian community.")}
        ${ta("Appealing and challenging", "What about living at Heirloom is appealing to you? What seems challenging?")}

        <h3 class="part">Part 4: Faith &amp; spirituality</h3>
        <p class="lead">We're an intentional Christian community affiliated with the Church of the Nazarene and rooted in the traditional Christian confession of faith, such as the Apostles' Creed. We don't require denominational membership, but we do ask all residents to take part as covenantal members of Heirloom, abiding by our Covenant and Rule of Life. (Denominational membership lets residents take part in the church board and decision-making.) We'd love to hear about your faith journey: church engagement, personal practices, core convictions, and your questions and doubts.</p>
        ${ta("Faith statement", "Write a brief statement of your current faith.")}
        ${ta("Church engagement", "Describe your engagement with the communal Body of Christ. Include any denominational background or current church membership, and tell us about your relationship with the Church of the Nazarene.")}

        <h3 class="part">Part 5: Personality, commitments &amp; lifestyle</h3>
        ${ta("Roommates would say", "How would your former or current roommates describe you? Include your top strengths and weaknesses.", true)}
        ${ta("Boss would say", "How would a former or current boss describe you? Include your top strengths and weaknesses.", true)}
        ${ta("Commitments", "What job and personal or family commitments will you have while living at Heirloom? How do you plan to balance them with your commitments to the community?", true)}
        ${ta("Lifestyle", "Describe your lifestyle as it relates to living in community: entertainment and hobbies, pet peeves, routines and habits, how you engage with roommates, your approach to chores and cleanliness, your cooking style…", true)}
        ${ta("Medical or allergies", "Anything else relevant, like allergies or medical needs? (Only Brit and the admins see this.)", true)}

        <h3 class="part">Part 6: Declaration, authorization &amp; release</h3>
        <p class="lead">All residents will have the opportunity to volunteer and be around children and minors.</p>
        ${ta("Children note", "If there's any known reason you shouldn't volunteer with children, please tell us here. (Only Brit and the admins see this.)", true)}
        <label class="chk"><input type="checkbox" name="certify"><span>I certify that the information in this application is complete and true. <span class="req">*</span></span></label>
        <label class="chk"><input type="checkbox" name="consent"><span>I authorize Heirloom, in partnership with the NorCal District of the Church of the Nazarene, to perform a background check, and I agree to complete the online child safety education courses as a requirement of community living. <span class="req">*</span></span></label>
        ${tx("Signature", "Type your full name as your signature")}
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="warn" id="raWarn"></p>
        <div><button class="btn btn-primary" id="raGo">${pre ? "Save my changes" : "Send my interest form"}</button></div>
      </form>`;
    const f = $("#ra");
    f.addEventListener("change", e => {
      if (e.target.name === "term") $("#depWrap").hidden = !/Short/.test(e.target.value);
      if (e.target.name === "pets") $("#petWrap").hidden = e.target.value !== "Yes";
    });
    if (pre) {
      const toYmd = v => { const t = Date.parse(v + " 12:00 UTC"); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
      f.querySelectorAll("[data-a]").forEach(el => { const v = pre[el.dataset.a]; if (v != null && v !== "") el.value = el.type === "date" ? toYmd(v) : v; });
      [["term", "Applying for"], ["room", "Rooming"], ["pets", "Pets"]].forEach(([n, k]) => { const c = [...f.querySelectorAll(`input[name="${n}"]`)].find(x => x.value === pre[k]); if (c) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } });
    }
    $("#raGo").onclick = async e => {
      e.preventDefault();
      const A = {}; f.querySelectorAll("[data-a]").forEach(el => { if (!el.closest("[hidden]")) A[el.dataset.a] = el.value.trim(); });
      const pick = n => { const c = f.querySelector(`input[name="${n}"]:checked`); return c ? c.value : ""; };
      A["Applying for"] = pick("term"); A["Rooming"] = pick("room"); A["Pets"] = pick("pets");
      ["Arrival", "Departure"].forEach(k => { if (A[k]) A[k] = parse(A[k]).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }); });
      const warn = $("#raWarn"), need = (k, t) => { if (!A[k]) { warn.textContent = t; const el = f.querySelector(`[data-a="${k}"]`); if (el) el.focus(); return true; } };
      if (need("Full name", "Please add your full name.")) return;
      if (!/^\S+@\S+\.\S+$/.test(A["Email"] || "")) { warn.textContent = "Please add a valid email."; return; }
      if (!A["Applying for"]) { warn.textContent = "Please choose short-term or long-term residency."; return; }
      if (need("Call to community", "Please tell us about your call to live in Christian community.") || need("Appealing and challenging", "Please tell us what's appealing and what seems challenging.")
        || need("Faith statement", "Please write a brief statement of your current faith.") || need("Church engagement", "Please tell us about your engagement with the Body of Christ.")) return;
      if (!f.certify.checked || !f.consent.checked) { warn.textContent = "Please check both boxes in Part 6."; return; }
      if (need("Signature", "Please type your full name as your signature.")) return;
      warn.textContent = "";
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Sending…`;
      try {
        await call(Object.assign({ action: "residencyApply", answers: A, certify: true, consent: true, website: f.website.value, elapsed: Date.now() - opened }, EDIT || {}));
        if (pre) {
          app.innerHTML = `<section class="card"><h2>Your changes are saved</h2><p>Pastor Brit can see your updated form, and we emailed you a fresh copy. You can use the link in that email again if anything else changes.</p></section>`;
          window.scrollTo({ top: 0, behavior: "smooth" }); return;
        }
        if (session && session.token && !APPLY) return load("Thank you! Your interest form is in.");
        app.innerHTML = `<section class="card"><h2>Thank you, ${esc(A["Preferred name"] || A["Full name"].split(" ")[0])}!</h2><p>Your interest form is in. We emailed you a copy, with a link to edit it if anything changes. Pastor Brit will read it and reach out about next steps.</p>
          <p>To see where things are, <a href="mine.html?next=residency.html">log in</a> any time with ${esc(A["Email"])}. We'll email you a code, no password needed.</p></section>`;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) { b.disabled = false; b.textContent = pre ? "Save my changes" : "Send my interest form"; warn.textContent = (err.message || "Something went wrong") + "."; }
    };
  }

  /* ---------- Preview mode ---------- */
  function demo(b) {
    const t = new Date().toISOString().slice(0, 10), plus = n => new Date(Date.parse(t + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
    if (!demoR) demoR = { ok: true, email: "lisa@example.com", admin: false, resident: true, stage: "", applied: false, first: "Lisa", staff: "staff@heirloomeastbay.com", leanings: ["Excited", "Supportive", "Some questions", "Concerns"],
      list: [{ email: "sam@example.com", name: "Sam Ortiz", stage: "Resident feedback week", feedbackOpen: true, feedbackUntil: plus(5), mine: null,
        app: { "Applying for": "Short term (2-3 months)", "Arrival": "January 4, 2027", "Rooming": "Personal room", "Pets": "Yes", "Pet details": "One very calm orange cat", "Call to community": "I grew up in a big, loud church family and have been longing for that kind of shared life again.", "Appealing and challenging": "The rhythm of prayer and work is appealing. Early mornings will be a challenge!", "Faith statement": "I follow Jesus, and I'm learning to hold my questions with more peace.", "Church engagement": "Raised Nazarene; currently attending a small church in Oakland.", "Lifestyle": "Quiet evenings, loves to bake bread, tidy but not fussy." } },
        { email: "kai@example.com", name: "Kai Moreno", stage: "Interview with residents", feedbackOpen: false, app: { "Applying for": "Long term (over 3 months)", "Call to community": "…", "Faith statement": "…" } }] };
    if (b.action === "residencyLoad") return new Promise(r => setTimeout(() => r({ ok: true, submitted: plus(-3), updated: "", answers: { "Full name": "Sam Ortiz", "Preferred name": "Sam", "Email": "sam@example.com", "Phone": "510-555-0199", "Applying for": "Short term (2-3 months)", "Arrival": "January 4, 2027", "Rooming": "Personal room", "Pets": "Yes", "Pet details": "One very calm orange cat", "Call to community": "I grew up in a big, loud church family.", "Appealing and challenging": "Prayer and work; early mornings!", "Faith statement": "I follow Jesus.", "Church engagement": "Raised Nazarene.", "Signature": "Sam Ortiz" } }), 300));
    if (b.action === "residencyApply") return new Promise(r => setTimeout(() => r({ ok: true, applied: true }), 400));
    if (b.action === "residencyFeedback") demoR.list.find(a => a.email === b.applicant).mine = { leaning: b.leaning, comment: b.comment, when: t + " 12:00" };
    return new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(demoR))), 300));
  }
})();
