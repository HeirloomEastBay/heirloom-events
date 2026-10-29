/* Heirloom Activities — volunteer application */
(function () {
  const C = window.HEIRLOOM;
  const $ = s => document.querySelector(s);
  const form = $("#volForm");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const openedAt = Date.now();

  if (!C.API_URL) $("#demoBanner").hidden = false;
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  // Areas people can pick (edit VOLUNTEER_AREAS in config.js), plus "Other"
  const areas = (C.VOLUNTEER_AREAS || ["Land", "Animals", "Garden", "Workshops"]).concat(["Other"]);
  $("#areas").innerHTML = areas.map((a, i) =>
    `<label><input type="checkbox" name="areas" id="a${i}" value="${esc(a)}">${esc(a)}</label>`).join("");
  form.querySelectorAll('input[name="areas"]').forEach(c => c.addEventListener("change", () => {
    const other = form.querySelector('input[name="areas"][value="Other"]').checked;
    $("#otherRow").hidden = !other;
    if (other && c.value === "Other") $("#otherArea").focus();
    $("[data-f=areas]").classList.remove("invalid");
  }));
  form.addEventListener("input", e => { const f = e.target.closest("[data-f]"); if (f) f.classList.remove("invalid"); });

  function values() {
    const fd = new FormData(form);
    return {
      first: (fd.get("first") || "").trim(), last: (fd.get("last") || "").trim(),
      phone: (fd.get("phone") || "").trim(), email: (fd.get("email") || "").trim(),
      areas: fd.getAll("areas"), other: ($("#otherArea").value || "").trim(),
      enjoy: (fd.get("enjoy") || "").trim(), heard: (fd.get("heard") || "").trim(),
      website: fd.get("website") || ""
    };
  }

  function validate(v) {
    const bad = [];
    if (!v.first) bad.push("first");
    if (!v.last) bad.push("last");
    if (!/\d{3}/.test(v.phone)) bad.push("phone");
    if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push("email");
    const onlyEmptyOther = v.areas.length === 1 && v.areas[0] === "Other" && !v.other;
    if (!v.areas.length || onlyEmptyOther) bad.push("areas");
    $("#areasErr").textContent = onlyEmptyOther ? "Tell us what else you'd like to help with." : "Pick at least one.";
    form.querySelectorAll("[data-f]").forEach(f => f.classList.toggle("invalid", bad.includes(f.dataset.f)));
    return bad;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const v = values();
    const bad = validate(v);
    $("#formError").classList.remove("on");
    if (bad.length) {
      const first = form.querySelector(`[data-f="${bad[0]}"]`);
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = first.querySelector("input, textarea"); if (input) setTimeout(() => input.focus({ preventScroll: true }), 300);
      return;
    }
    const btn = $("#submitBtn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Sending…`;
    try {
      let r;
      if (!C.API_URL) { await new Promise(res => setTimeout(res, 800)); r = { ok: true, demo: true }; }
      else {
        const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(Object.assign({ action: "volunteer", elapsed: Date.now() - openedAt }, v)) });
        r = await res.json();
      }
      if (!r.ok) throw new Error(r.error || "Something went wrong");
      $("#volWrap").innerHTML = `<div class="done">
        <div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h2>Thank you, ${esc(v.first)}!</h2>
        <p>We got your application. Look for an email at ${esc(v.email)} in the next 2 business days to authorize a background check.</p>
        ${r.demo ? `<p class="hint">(Preview mode: nothing was actually sent.)</p>` : ""}
        <div class="btns"><a class="btn btn-primary" href="index.html">See what's coming up</a></div>
      </div>`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      $("#formError").textContent = (err.message && err.message.length < 140 ? err.message + ". " : "") + "Your application wasn't sent. Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = "Send my application";
    }
  });
})();
