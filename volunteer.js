/* Heirloom Activities — volunteer form
   volunteer.html          → full page
   volunteer.html?embed=1  → just the form, for heirloomeastbay.com/volunteer */
(function () {
  const C = window.HEIRLOOM;
  const $ = s => document.querySelector(s);
  const form = $("#volForm");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const openedAt = Date.now();
  const EMBED = new URLSearchParams(location.search).has("embed");
  if (EMBED) document.body.classList.add("embed");

  if (!C.API_URL && !EMBED) $("#demoBanner").hidden = false;
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  const INTERESTS = C.VOLUNTEER_INTERESTS || ["Weekly animal chores (approx. 1 hour/week)", "Monthly Workdays (2 hours/month)", "One-off Projects", "I'm not sure"];
  const HEARD = C.VOLUNTEER_HEARD || ["Social Media", "Website/Google", "A Friend"];
  $("#areas").innerHTML = INTERESTS.map((a, i) =>
    `<label class="check"><input type="checkbox" name="areas" id="a${i}" value="${esc(a)}">${esc(a)}</label>`).join("");
  $("#heard").innerHTML = HEARD.map((a, i) =>
    `<label class="check"><input type="radio" name="heard" id="h${i}" value="${esc(a)}">${esc(a)}</label>`).join("");

  form.addEventListener("change", e => { const f = e.target.closest("[data-f]"); if (f) f.classList.remove("invalid"); resize(); });
  form.addEventListener("input", e => { const f = e.target.closest("[data-f]"); if (f) f.classList.remove("invalid"); });

  function values() {
    const fd = new FormData(form);
    return {
      first: (fd.get("first") || "").trim(), last: (fd.get("last") || "").trim(),
      email: (fd.get("email") || "").trim(), news: !!$("#news").checked,
      areas: fd.getAll("areas"), heard: fd.get("heard") || "",
      comments: (fd.get("comments") || "").trim(), website: fd.get("website") || ""
    };
  }

  function validate(v) {
    const bad = [];
    if (!v.first) bad.push("first");
    if (!v.last) bad.push("last");
    if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push("email");
    if (!v.areas.length) bad.push("areas");
    form.querySelectorAll("[data-f]").forEach(f => f.classList.toggle("invalid", bad.includes(f.dataset.f)));
    resize();
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
        <p>We got your form. One of the residents will be in touch soon.</p>
        ${r.demo ? `<p class="hint">(Preview mode: nothing was actually sent.)</p>` : ""}
        ${EMBED ? "" : `<div class="btns"><a class="btn btn-primary" href="index.html">See what's coming up</a></div>`}
      </div>`;
      resize();
      if (EMBED) window.parent.postMessage({ heirloomScrollTo: true }, "*"); else window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      $("#formError").textContent = (err.message && err.message.length < 140 ? err.message + ". " : "") + "Your form wasn't sent. Please try again, or email " + C.EMAIL + ".";
      $("#formError").classList.add("on");
      btn.disabled = false; btn.textContent = "Submit";
      resize();
    }
  });

  /* ---------- Embed: tell the host page how tall we are ---------- */
  let lastH = 0;
  function resize() {
    if (!EMBED || window.parent === window) return;
    requestAnimationFrame(() => {
      const h = Math.ceil(document.documentElement.getBoundingClientRect().height) + 2;
      if (h !== lastH) { lastH = h; window.parent.postMessage({ heirloomHeight: h }, "*"); }
    });
  }
  if (EMBED) {
    window.addEventListener("load", resize);
    window.addEventListener("resize", () => { lastH = 0; resize(); });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(document.body);
    window.addEventListener("message", ev => {
      if (!ev.data) return;
      if (ev.data.heirloomHello) { lastH = 0; resize(); }
      if (ev.data.heirloomHello || ev.data.heirloomAck) document.documentElement.classList.add("sized");
    });
    [300, 1200, 3000].forEach(t => setTimeout(() => { lastH = 0; resize(); }, t));
  }
})();
