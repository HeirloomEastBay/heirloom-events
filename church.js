/* Heirloom Activities — Church family page
   For residents and anyone who turned on "church family" in their Profile.
   Top to bottom: how many Sundays still need a main dish, notes (a small blog any admin
   can post to, searchable by words, theme and scripture), the next Sundays' food sign-ups,
   and what Supper Church is.
   The main dish is the one that matters most, so a Sunday without one stands out. */
(function () {
  const C = window.HEIRLOOM, H = window.HL;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app"), dlg = $("#dlg"), dlgIn = $("#dlgIn");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  let session = null, data = null, demoState = null;
  try { session = JSON.parse(localStorage.getItem("heirloom-session") || "null"); } catch (e) { /* storage off */ }
  if (DEMO) session = session || { token: "demo", email: "ana@example.com" };
  $("#footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;

  /* ---------- What Supper Church is (from heirloomeastbay.com/supper-church; edit the words here) ---------- */
  const ABOUT = `
    <p>Supper Church is a Sunday meal and a time of reflection at Heirloom, a place to connect with God, yourself, each other and creation. <b>Everyone is welcome, really, everyone.</b></p>
    <p><b>When:</b> Sundays at 5:30pm, except fifth Sundays. Setup starts at 5:00pm.</p>
    <p><b>Where:</b> ${esc(C.ADDRESS)}. On the front lawn when it's warm, in the sunporch when it's cold or rainy.</p>
    <p><b>What to bring:</b> nothing is required. The hosts make the main dish, and you're welcome to bring a side or dessert to share.</p>
    <p><b>How the evening goes:</b></p>
    <ol><li>We share a meal at the table.</li><li>We sing the Doxology together.</li><li>A community member or pastor shares a Scripture reading and a short reflection.</li><li>We pray over the bread and grape juice and pass them around the table.</li></ol>
    <p>Questions? <a href="mailto:${esc(C.EMAIL)}">${esc(C.EMAIL)}</a> · <a href="https://www.heirloomeastbay.com/supper-church" target="_blank" rel="noopener">More on the website</a></p>`;

  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: session && session.token }, body)) });
    const r = await res.json();
    if (!r.ok) { const e = new Error(r.error || "Something went wrong"); e.signedOut = r.signedOut; e.notChurch = r.notChurch; throw e; }
    return r;
  }
  function flash(text, bad) {
    const el = document.createElement("p");
    el.className = "msg " + (bad ? "err" : "ok"); el.textContent = text; el.setAttribute("role", "status");
    app.prepend(el); el.scrollIntoView({ block: "nearest" }); setTimeout(() => el.remove(), 7000);
  }
  function openDlg(html) { dlgIn.innerHTML = html; if (!dlg.open) dlg.showModal(); }

  /* ---------- Dates ---------- */
  const dateOf = ymd => new Date(ymd + "T12:00:00Z");
  const fmt = (ymd, o) => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, o)).format(dateOf(ymd));
  const longDay = ymd => fmt(ymd, { weekday: "long", month: "long", day: "numeric" });
  const shortDay = ymd => fmt(ymd, { month: "short", day: "numeric" });
  const today = () => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); return p; };
  const away = ymd => Math.round((dateOf(ymd) - dateOf(today())) / 86400000);
  const whenWord = ymd => { const n = away(ymd); return n === 0 ? "Today" : n < 7 ? "This Sunday" : n < 14 ? "Next Sunday" : "In " + Math.round(n / 7) + " weeks"; };
  const postedText = s => { const d = String(s || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? fmt(d, { month: "long", day: "numeric" }) : ""; };

  /* ---------- Note text ----------
     Notes are the same cleaned HTML as an event's "More details" (headings, bold, lists,
     links, photos), and they're cleaned again here before they're shown. Notes written
     before the blog editor are a small kind of Markdown, still shown by mdToHtml. */
  function inline(t) {
    return esc(t)
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (m, a, b) => `<a href="${b}" target="_blank" rel="noopener">${a}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
  function mdToHtml(md) {
    return String(md || "").replace(/\r/g, "").split(/\n{2,}/).map(block => {
      const lines = block.split("\n").filter(l => l.trim() !== "");
      if (!lines.length) return "";
      if (lines.every(l => /^\s*[-•]\s+/.test(l))) return "<ul>" + lines.map(l => "<li>" + inline(l.replace(/^\s*[-•]\s+/, "")) + "</li>").join("") + "</ul>";
      if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) return "<ol>" + lines.map(l => "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>").join("") + "</ol>";
      return "<p>" + lines.map(inline).join("<br>") + "</p>";
    }).join("");
  }
  const bodyHtml = n => n.format === "html" ? H.sanitize(n.note) : mdToHtml(n.note);
  const plain = n => { const d = document.createElement("div"); d.innerHTML = bodyHtml(n); return d.textContent || ""; };
  // "1 Corinthians 13:4-7" -> "1 Corinthians" (for the scripture filter)
  const bookOf = p => { const m = String(p).match(/^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z ]*?)\s*\d/); return (m ? m[1] : String(p)).replace(/\s+/g, " ").trim(); };
  const passageLink = p => "https://www.biblegateway.com/passage/?search=" + encodeURIComponent(p);
  const nf = { q: "", theme: "", book: "" }; // what the notes are filtered by
  const splitList = v => String(v || "").split(/[;,\n]/).map(t => t.replace(/\s+/g, " ").trim()).filter((t, i, a) => t && a.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i);

  /* ---------- Load ---------- */
  if (!session || !session.token) {
    app.innerHTML = `<div class="empty"><h2>Please log in</h2><p>The church family page is for people who've signed in. We'll email you a code.</p><p><a class="btn btn-primary" href="mine.html">Log in</a></p></div>`;
    return;
  }
  load();
  async function load() {
    try { data = await call({ action: "churchGet" }); }
    catch (err) {
      if (err.signedOut) { try { localStorage.removeItem("heirloom-session"); } catch (e) { /* fine */ } if (window.HLNav) HLNav.signedOut();
        app.innerHTML = `<div class="empty"><h2>Please log in again</h2><p><a class="btn btn-primary" href="mine.html">Log in</a></p></div>`; return; }
      if (err.notChurch) { app.innerHTML = `<div class="empty"><h2>This page is for the church family</h2>
        <p>That's anyone who'd like to see the Supper Church sign-ups and notes from Pastor Brit. You don't need to be an official member.</p>
        <p><a class="btn btn-primary" href="profile.html">Turn it on in your Profile</a></p></div>
        <details class="about" open><summary>What is Supper Church?</summary><div class="in">${ABOUT}</div></details>`; return; }
      app.innerHTML = `<div class="empty"><h2>Couldn't load this page</h2><p>${esc(err.message || "Something went wrong")}.</p><p><button class="btn btn-primary" onclick="location.reload()">Try again</button></p></div>`; return;
    }
    if (window.HLNav) HLNav.setRoles({ email: data.email, church: true, admin: !!data.admin, resident: !!data.resident, volunteer: !!data.volunteer });
    if (data.me) $("#hello").textContent = "Church family";
    render();
    // Links like church.html#listen or #note-… land on that part once it's drawn
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { if (t.tagName === "DETAILS") t.open = true; const o = t.closest("details.older"); if (o) o.open = true; setTimeout(() => t.scrollIntoView({ block: "start" }), 50); } }
  }

  /* ---------- Draw ---------- */
  function noteHtml(n, open) {
    const tags = `${(n.scripture || []).map(p => `<a class="pill script" href="${passageLink(p)}" target="_blank" rel="noopener" title="Read ${esc(p)}">📖 ${esc(p)}</a>`).join("")}${(n.themes || []).map(t => `<button type="button" class="pill theme" data-theme="${esc(t)}" title="Show notes about ${esc(t)}">${esc(t)}</button>`).join("")}`;
    const meta = `${n.sunday ? `<span class="pill kind">For ${esc(fmt(n.sunday, { weekday: "short", month: "short", day: "numeric" }))}</span>` : ""}<span>${esc(n.by || "Heirloom")} · ${esc(postedText(n.posted))}${n.edited ? " · edited" : ""}</span>
      ${data.canPost ? `<button class="quiet" data-edit="${esc(n.id)}">Edit</button><button class="quiet del" data-del="${esc(n.id)}">Remove</button>` : ""}`;
    const inner = `<p class="meta">${meta}</p>${tags ? `<p class="tags">${tags}</p>` : ""}<div class="body">${bodyHtml(n)}</div>`;
    if (open) return `<article class="note" id="note-${esc(n.id)}"><h3>${esc(n.title || "A note for the church family")}</h3>${inner}</article>`;
    return `<details class="note" id="note-${esc(n.id)}"><summary>${esc(n.title || "A note for the church family")}<small>${esc(postedText(n.posted))}</small></summary>${inner}</details>`;
  }
  // The notes list, with whatever search and filters are on
  function notesHtml() {
    const q = nf.q.trim().toLowerCase(), on = !!(q || nf.theme || nf.book);
    const hit = n => (!nf.theme || (n.themes || []).some(t => t.toLowerCase() === nf.theme.toLowerCase()))
      && (!nf.book || (n.scripture || []).some(p => bookOf(p).toLowerCase() === nf.book.toLowerCase()))
      && (!q || [n.title, n.by, (n.themes || []).join(" "), (n.scripture || []).join(" "), plain(n)].join(" ").toLowerCase().includes(q));
    const list = data.notes.filter(hit);
    if (!data.notes.length) return `<div class="empty"><p>No notes yet.${data.canPost ? " Write the first one!" : ""}</p></div>`;
    if (on) return `<p class="found">${list.length} ${list.length === 1 ? "note" : "notes"} ${[q && `with “${esc(nf.q.trim())}”`, nf.theme && `about ${esc(nf.theme)}`, nf.book && `from ${esc(nf.book)}`].filter(Boolean).join(", ")} <button type="button" class="quiet" id="nfClear">Show all</button></p>`
      + (list.length ? `<div class="older" style="margin-top:0">${list.map((x, i) => noteHtml(x, i === 0)).join("")}</div>` : `<div class="empty"><p>Nothing matches. Try a different word, theme or book.</p></div>`);
    return noteHtml(list[0], true) + (list.length > 1 ? `<details class="older"><summary>Earlier notes (${list.length - 1})</summary>${list.slice(1).map(x => noteHtml(x, false)).join("")}</details>` : "");
  }
  function drawNotes() {
    $("#noteList").innerHTML = notesHtml();
    const box = $("#noteList");
    box.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => { nf.theme = b.dataset.theme; if ($("#nfTheme")) $("#nfTheme").value = nf.theme; drawNotes(); $("#hN").scrollIntoView({ block: "start" }); });
    if ($("#nfClear")) $("#nfClear").onclick = () => { nf.q = nf.theme = nf.book = ""; ["#nfQ", "#nfTheme", "#nfBook"].forEach(k => { if ($(k)) $(k).value = ""; }); drawNotes(); };
    box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => noteDlg(data.notes.find(n => n.id === b.dataset.edit)));
    box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const n = data.notes.find(x => x.id === b.dataset.del);
      openDlg(`<h2>Remove this note?</h2><p>"${esc(n.title || "A note for the church family")}" comes off this page. If it was posted to Discord, it stays there.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" data-x>Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
      dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
      $("#go").onclick = async e => { e.currentTarget.disabled = true;
        try { data = await call({ action: "churchNoteRemove", id: n.id }); dlg.close(); render(); flash("Note removed."); }
        catch (err) { dlg.close(); flash((err.message || "Something went wrong") + ".", true); } };
    });
  }
  function sunHtml(s, i) {
    const note = data.notes.find(n => n.sunday === s.date);
    const adminLink = data.admin ? `<button class="quiet" data-day="${i}">Change this Sunday</button>` : "";
    const head = `<h3>${esc(fmt(s.date, { weekday: "short", month: "long", day: "numeric" }))} <small>${esc(whenWord(s.date))}</small></h3>`;
    if (s.style === "No Supper Church") return `<article class="sun off" id="sun-${s.date}">${head}
      <p class="day-banner">🕯️ <b>${esc(s.title || "No Supper Church this week")}</b>${s.dayNote ? `<span>${esc(s.dayNote)}</span>` : ""}</p>
      ${adminLink ? `<div class="acts">${adminLink}</div>` : ""}</article>`;
    if (s.style === "Potluck") {
      const mineP = k => `<button class="quiet" data-change="${esc(k.id)}" data-sun="${i}">Change</button><button class="quiet del" data-remove="${esc(k.id)}">Remove</button>`;
      return `<article class="sun potluck" id="sun-${s.date}">${head}
        <p class="day-banner">🥧 <b>${esc(s.title || "Potluck")}</b><span>${esc(s.dayNote || "Everyone brings a dish to share. No one main dish needed.")}</span></p>
        <ul class="bring" aria-label="Bringing">${s.bringing.length ? s.bringing.map(b => `<li><span class="pill kind">${esc(b.kind)}</span><span>${esc(b.what || "A dish to share")}</span><span class="by">${b.mine ? "You" : esc(b.name)}</span>${b.mine ? mineP(b) : data.admin ? `<button class="quiet del" data-remove="${esc(b.id)}">Remove</button>` : ""}</li>`).join("") : `<li class="none">Nobody's said what they're bringing yet.</li>`}</ul>
        <div class="acts"><button class="btn btn-primary btn-sm" data-bring="${i}" data-kind="Main">I'm bringing a dish</button>${note ? `<a class="note-link" href="#note-${esc(note.id)}" data-open="${esc(note.id)}">📝 Note for this Sunday</a>` : ""}${adminLink}</div>
      </article>`;
    }
    const mine = k => `<button class="quiet" data-change="${esc(k.id)}" data-sun="${i}">Change</button><button class="quiet del" data-remove="${esc(k.id)}">Remove</button>`;
    const main = s.main
      ? `<div class="main-row"><span><span class="pill ok">✓ Main dish</span></span><span class="dish">${esc(s.main.what || "Main dish (to be announced)")}</span>
           <span class="by">${s.main.mine ? "You're making it. Thank you!" : "Made by " + esc(s.main.name)}${s.main.mine ? " " + mine(s.main) : data.admin ? ` <button class="quiet del" data-remove="${esc(s.main.id)}">Remove</button>` : ""}</span></div>`
      : `<div class="main-need"><span><span class="pill need">Main dish needed</span></span><p>Nobody has the main yet. Can you make it?</p>
           <div><button class="btn btn-primary" data-bring="${i}" data-kind="Main">I'll make the main</button></div></div>`;
    const list = s.bringing.length
      ? s.bringing.map(b => `<li><span class="pill kind">${esc(b.kind)}</span><span>${esc(b.what || (b.kind === "Other" ? "Something to share" : "A " + b.kind.toLowerCase()))}</span><span class="by">${b.mine ? "You" : esc(b.name)}</span>${b.mine ? mine(b) : data.admin ? `<button class="quiet del" data-remove="${esc(b.id)}">Remove</button>` : ""}</li>`).join("")
      : `<li class="none">No sides or desserts yet.</li>`;
    return `<article class="sun${s.main ? "" : " need"}" id="sun-${s.date}">
      <h3>${esc(fmt(s.date, { weekday: "short", month: "long", day: "numeric" }))} <small>${esc(whenWord(s.date))}</small></h3>
      ${main}
      <ul class="bring" aria-label="Also coming">${list}</ul>
      <div class="acts"><button class="btn btn-outline btn-sm" data-bring="${i}" data-kind="Side">I'm bringing something</button>${note ? `<a class="note-link" href="#note-${esc(note.id)}" data-open="${esc(note.id)}">📝 Note for this Sunday</a>` : ""}${adminLink}</div>
    </article>`;
  }
  function render() {
    const usual = data.sundays.filter(s => (s.style || "Usual") === "Usual"), need = usual.filter(s => !s.main).length, n = usual.length;
    const uniq = a => a.filter((t, i) => t && a.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i).sort((a, b) => a.localeCompare(b));
    const themes = uniq(data.notes.flatMap(x => x.themes || [])), books = uniq(data.notes.flatMap(x => (x.scripture || []).map(bookOf)));
    app.innerHTML = `
      <div class="need-bar${need ? "" : " done"}" role="status">${need
        ? `<b>${need}</b><span>of the next ${n} Sundays still ${need === 1 ? "needs" : "need"} a main dish. ${need ? `<a href="#sun-${usual.find(s => !s.main).date}">See which</a>` : ""}</span>`
        : `<span>✓ Every one of the next ${n} Sundays has a main dish. Thank you!</span>`}</div>

      ${listenHtml()}

      ${booksHtml()}

      ${songHtml()}

      <section aria-labelledby="hN">
        <div class="sec-h"><div><h2 id="hN">Notes</h2><p>From Pastor Brit and the Heirloom team. Search by word, theme or scripture.</p></div>
          ${data.canPost ? `<button class="btn btn-forest btn-sm" id="write">Write a note</button>` : ""}</div>
        ${data.notes.length > 1 ? `<div class="nfind" role="search">
          <input type="search" id="nfQ" placeholder="Search notes…" aria-label="Search notes" value="${esc(nf.q)}">
          ${themes.length ? `<select id="nfTheme" aria-label="Theme"><option value="">All themes</option>${themes.map(t => `<option${t.toLowerCase() === nf.theme.toLowerCase() ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
          ${books.length ? `<select id="nfBook" aria-label="Scripture"><option value="">All scripture</option>${books.map(t => `<option${t.toLowerCase() === nf.book.toLowerCase() ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
        </div>` : ""}
        <div id="noteList"></div>
      </section>

      ${eventsHtml()}

      <section aria-labelledby="hS">
        <div class="sec-h"><div><h2 id="hS">Supper Church</h2><p>Sundays at 5:30pm, setup at 5:00. The main dish is the one we need most; sides and desserts are a bonus. Sign up as far ahead as you like.</p></div></div>
        ${data.dietary.length ? `<p class="diet"><b>Cooking for the group?</b> In the church family: ${data.dietary.map(d => `<span>${d.count} ${esc(d.label)}</span>`).join("")}</p>` : ""}
        <div class="suns">${data.sundays.map((s, i) => ({ d: s.date, h: sunHtml(s, i) })).concat((data.skipped || []).map(d => ({ d, h: `<article class="sun skip"><h3>${esc(fmt(d, { weekday: "short", month: "long", day: "numeric" }))}</h3><p>No Supper Church: it's a fifth Sunday.</p></article>` })))
          .sort((a, b) => a.d.localeCompare(b.d)).map(x => x.h).join("")}</div>
      </section>

      <details class="about"><summary>What is Supper Church?</summary><div class="in">${ABOUT}</div></details>`;
    drawNotes();
    if ($("#nfQ")) $("#nfQ").oninput = e => { nf.q = e.target.value; drawNotes(); };
    if ($("#nfTheme")) $("#nfTheme").onchange = e => { nf.theme = e.target.value; drawNotes(); };
    if ($("#nfBook")) $("#nfBook").onchange = e => { nf.book = e.target.value; drawNotes(); };
    wire();
  }

  function wire() {
    app.querySelectorAll("[data-bring]").forEach(b => b.onclick = () => bringDlg(data.sundays[+b.dataset.bring], b.dataset.kind));
    app.querySelectorAll("[data-change]").forEach(b => b.onclick = () => {
      const s = data.sundays[+b.dataset.sun], k = [s.main].concat(s.bringing).filter(Boolean).find(x => x.id === b.dataset.change);
      bringDlg(s, k.kind, k);
    });
    app.querySelectorAll("[data-remove]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { data = await call({ action: "churchUnbring", id: b.dataset.remove }); render(); flash("Removed."); }
      catch (err) { b.disabled = false; flash((err.message || "Something went wrong") + ".", true); }
    });
    app.querySelectorAll("[data-open]").forEach(a => a.onclick = () => { const el = document.getElementById("note-" + a.dataset.open); if (!el) { nf.q = nf.theme = nf.book = ""; drawNotes(); } const t = document.getElementById("note-" + a.dataset.open); if (t) { if (t.closest("details.older")) t.closest("details.older").open = true; if (t.tagName === "DETAILS") t.open = true; } });
    if ($("#write")) $("#write").onclick = () => noteDlg();
    if ($("#songEdit")) $("#songEdit").onclick = () => songDlg(data.song);
    if ($("#songNew")) $("#songNew").onclick = () => songDlg(null);
    if ($("#evNew")) $("#evNew").onclick = () => eventDlg();
    app.querySelectorAll("[data-day]").forEach(b => b.onclick = () => dayDlg(data.sundays[+b.dataset.day]));
    wireListen();
    if ($("#bkNew")) $("#bkNew").onclick = () => bookDlg();
    app.querySelectorAll("[data-bkedit]").forEach(b => b.onclick = () => bookDlg(data.books.find(x => x.id === b.dataset.bkedit)));
    app.querySelectorAll("[data-bkdel]").forEach(b => b.onclick = () => {
      const bk = data.books.find(x => x.id === b.dataset.bkdel);
      openDlg(`<h2>Remove this book?</h2><p>"${esc(bk.title)}" comes off the church page and the public book list. (To show it as finished instead, edit it and add the date you finished.)</p>
        <div class="btns"><button class="btn btn-outline btn-sm" data-x>Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
      dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
      $("#go").onclick = async e => { e.currentTarget.disabled = true;
        try { data = await call({ action: "churchBookRemove", id: bk.id }); dlg.close(); render(); flash("Book removed."); } catch (err) { dlg.close(); flash((err.message || "Something went wrong") + ".", true); } };
    });
  }

  /* ---------- Books we read from ---------- */
  const shortDate = d => d ? fmt(d, { month: "short", day: "numeric", year: "numeric" }) : "";
  function bookCard(b, small) {
    return `<article class="book${small ? " small" : ""}" id="book-${esc(b.id)}">
      ${b.cover ? `<img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" loading="lazy">` : `<div class="nocover" aria-hidden="true">📚</div>`}
      <div class="bi"><span class="bfor">${esc(b.for)}</span><h3>${esc(b.title)}</h3>${b.author ? `<p class="bau">${esc(b.author)}</p>` : ""}
        ${small ? `<p class="bdates">${esc(shortDate(b.started))}${b.finished ? " – " + esc(shortDate(b.finished)) : ""}</p>` : b.note ? `<p class="bnote">${esc(b.note)}</p>` : ""}
        <p class="bact">${b.buy ? `<a class="btn btn-${small ? "outline" : "primary"} btn-sm" href="${esc(b.buy)}" target="_blank" rel="noopener">${esc(b.buyLabel ? "Buy at " + b.buyLabel : "Get the book")} ↗</a>` : ""}
          ${data.admin ? `<button class="quiet" data-bkedit="${esc(b.id)}">Edit</button><button class="quiet del" data-bkdel="${esc(b.id)}">Remove</button>` : ""}</p></div>
    </article>`;
  }
  function booksHtml() {
    const books = data.books || [], now = books.filter(b => b.current), past = books.filter(b => !b.current && b.finished);
    if (!books.length && !data.admin) return "";
    return `<section aria-labelledby="hB" id="books"><div class="sec-h"><div><h2 id="hB">Books we're reading</h2><p>The Psalms &amp; Proverbs and Kids Bible story readings come from these. <a href="books.html">All our books ↗</a></p></div>
        ${data.admin ? `<button class="btn btn-forest btn-sm" id="bkNew">Add a book</button>` : ""}</div>
      ${now.length ? `<div class="books">${now.map(b => bookCard(b)).join("")}</div>` : `<p class="empty-s">No books added yet.</p>`}
      ${past.length ? `<details class="older"><summary>Books we've read (${past.length})</summary><div class="books past">${past.map(b => bookCard(b, true)).join("")}</div></details>` : ""}
    </section>`;
  }
  function bookDlg(b) {
    let cover = null;
    openDlg(`<h2>${b ? "Edit book" : "Add a book"}</h2>
      <label class="f">For<select id="bk_for">${(data.bookFor || []).map(f => `<option${b && b.for === f ? " selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
      <label class="f">Title<input id="bk_title" maxlength="160" value="${esc(b ? b.title : "")}" placeholder="The Jesus Storybook Bible"></label>
      <label class="f">Author <span class="opt">(optional)</span><input id="bk_author" maxlength="160" value="${esc(b ? b.author : "")}"></label>
      <div class="f"><span>Cover <span class="opt">(a photo of it, or the publisher's image)</span></span>
        <label class="pickfile pickimg"><input type="file" id="bk_cover" accept="image/*"><span id="bk_cname">${b && b.cover ? "Keep the current cover" : "Choose a cover image"}</span></label>
        ${b && b.cover ? `<img class="bkprev" src="${esc(b.cover)}" alt="">` : `<img class="bkprev" alt="" hidden>`}</div>
      <div class="two"><label class="f">Buy link <span class="opt">(optional)</span><input id="bk_buy" inputmode="url" value="${esc(b ? b.buy : "")}" placeholder="https://…"></label>
        <label class="f">Store <span class="opt">(optional)</span><input id="bk_label" maxlength="60" value="${esc(b ? b.buyLabel : "")}" placeholder="Books on Bee"></label></div>
      <div class="two"><label class="f">Started<input type="date" id="bk_start" value="${esc(b ? b.started : today())}"></label>
        <label class="f">Finished <span class="opt">(leave empty while reading)</span><input type="date" id="bk_end" value="${esc(b ? b.finished : "")}"></label></div>
      <label class="f">A note <span class="opt">(optional)</span><textarea id="bk_note" rows="2" maxlength="600">${esc(b ? b.note : "")}</textarea></label>
      ${b ? "" : `<p class="opt" style="margin:0;font-size:13.5px">Adding a new book finishes the current one of the same kind, so it moves to "Books we've read".</p>`}
      <p class="err" id="bkErr" hidden></p>
      <div class="btns"><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary btn-sm" id="bkGo">${b ? "Save" : "Add the book"}</button></div>`);
    const q = k => dlgIn.querySelector(k), err = q("#bkErr");
    q("[data-x]").onclick = () => dlg.close();
    q("#bk_cover").onchange = async () => {
      const f = q("#bk_cover").files[0]; if (!f) return;
      try { const img = await loadImage(f), scale = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cover = c.toDataURL("image/jpeg", 0.85); q(".bkprev").src = cover; q(".bkprev").hidden = false; q("#bk_cname").textContent = f.name; }
      catch (x) { err.textContent = "Couldn't read that image."; err.hidden = false; }
    };
    q("#bkGo").onclick = async e => {
      const btn = e.currentTarget, v = k => q(k).value.trim(); err.hidden = true;
      let buy = v("#bk_buy"); if (buy && !/^https?:\/\//i.test(buy)) buy = "https://" + buy;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        data = await call({ action: "churchBook", id: b ? b.id : undefined, for: q("#bk_for").value, title: v("#bk_title"), author: v("#bk_author"), buy: buy, buyLabel: v("#bk_label"),
          started: v("#bk_start"), finished: v("#bk_end"), note: v("#bk_note"), cover: cover ? { data: cover.split(",")[1] } : undefined, _demoCover: DEMO ? cover : undefined });
        dlg.close(); render(); flash(b ? "Saved." : "Book added.");
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; btn.disabled = false; btn.textContent = b ? "Save" : "Add the book"; }
    };
  }

  /* ---------- Listen: Brit's weekly recordings ---------- */
  const af = { q: "", kind: "", theme: "", book: "" };
  const ICON = { "Weekly message": "🎙️", "Psalm of the week": "📖", "Proverb of the week": "📜", "Kids Bible story": "🌱", "Other": "🎧" };
  // Which book a recording is read from: the book for its kind that was current that week
  const BOOK_OF = { "Psalm of the week": "Psalms & Proverbs", "Proverb of the week": "Psalms & Proverbs", "Kids Bible story": "Kids Bible stories" };
  const bookFor = a => { if (a.bookId) { const picked = (data.books || []).find(b => b.id === a.bookId); if (picked) return picked; }
    const f = BOOK_OF[a.kind]; if (!f) return null; const end = addDaysYmd(a.week, 6);
    return (data.books || []).find(b => b.for === f && (!b.started || b.started <= end) && (!b.finished || b.finished >= a.week)) || null; };
  const mins = sec => sec ? (sec < 60 ? sec + " sec" : Math.round(sec / 60) + " min") : "";
  const weekText = w => "Week of " + fmt(w, { month: "long", day: "numeric" });
  const addDaysYmd = (d, n) => { const t = dateOf(d); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  function recHtml(a) {
    const tags = `${(a.scripture || []).map(p => `<a class="pill script" href="${passageLink(p)}" target="_blank" rel="noopener">📖 ${esc(p)}</a>`).join("")}${(a.themes || []).map(t => `<button type="button" class="pill theme" data-atheme="${esc(t)}">${esc(t)}</button>`).join("")}`;
    return `<article class="rec" id="rec-${esc(a.id)}">
      <p class="rk"><span>${ICON[a.kind] || "🎧"} ${esc(a.kind)}</span>${a.seconds ? `<span>${esc(mins(a.seconds))}</span>` : ""}</p>
      <h3>${esc(a.title)}</h3>
      ${tags ? `<p class="tags">${tags}</p>` : ""}
      ${(bk => bk ? `<p class="rbook">📚 From <a href="#book-${esc(bk.id)}">${esc(bk.title)}</a>${a.pages ? ", " + esc(/^\s*(p|pg|pp|page)/i.test(a.pages) ? a.pages : (/[-–,]/.test(a.pages) ? "pp. " : "p. ") + a.pages) : ""}</p>` : a.pages ? `<p class="rbook">📚 ${esc(a.pages)}</p>` : "")(bookFor(a))}
      <audio controls preload="none" src="${esc(a.url)}"></audio>
      ${a.description ? `<details class="rd"><summary>About this one</summary><p>${esc(a.description)}</p></details>` : ""}
      <p class="rf"><a href="${esc(a.page)}" target="_blank" rel="noopener">Trouble playing? Open it</a>${data.canPost ? ` <button class="quiet" data-aedit="${esc(a.id)}">Edit</button><button class="quiet del" data-adel="${esc(a.id)}">Remove</button>` : ""}</p>
    </article>`;
  }
  function listenHtml() {
    const all = data.audio || [];
    if (!all.length && !data.canPost) return "";
    const wk = data.thisWeek, now = all.filter(a => a.week === wk);
    const q = af.q.trim().toLowerCase(), on = !!(q || af.kind || af.theme || af.book);
    const hit = a => (!af.kind || a.kind === af.kind) && (!af.theme || (a.themes || []).some(t => t.toLowerCase() === af.theme.toLowerCase()))
      && (!af.book || (a.scripture || []).some(p => bookOf(p).toLowerCase() === af.book.toLowerCase()))
      && (!q || [a.title, a.kind, a.description, (a.themes || []).join(" "), (a.scripture || []).join(" ")].join(" ").toLowerCase().includes(q));
    const earlier = all.filter(a => a.week !== wk && a.week < wk);
    const uniq = arr => arr.filter((t, i) => t && arr.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i).sort((x, y) => x.localeCompare(y));
    const themes = uniq(all.flatMap(a => a.themes || [])), books = uniq(all.flatMap(a => (a.scripture || []).map(bookOf)));
    const byWeek = list => { const g = {}; list.forEach(a => (g[a.week] = g[a.week] || []).push(a)); return Object.keys(g).sort().reverse().map(w => `<div class="wk"><h4>${esc(weekText(w))}</h4>${g[w].map(recHtml).join("")}</div>`).join(""); };
    const found = all.filter(hit);
    return `<section class="listen" aria-labelledby="hL" id="listen">
      <div class="sec-h"><div><h2 id="hL">Listen</h2><p>${esc(weekText(wk))}: the weekly message, Psalm of the week and Kids Bible story.</p></div>
        ${data.canPost ? `<button class="btn btn-forest btn-sm" id="aNew">Add a recording</button>` : ""}</div>
      ${all.length > 2 ? `<div class="nfind" role="search">
        <input type="search" id="afQ" placeholder="Search recordings…" aria-label="Search recordings" value="${esc(af.q)}">
        <select id="afKind" aria-label="Kind"><option value="">Everything</option>${(data.audioKinds || []).map(k => `<option${k === af.kind ? " selected" : ""}>${esc(k)}</option>`).join("")}</select>
        ${themes.length ? `<select id="afTheme" aria-label="Theme"><option value="">All themes</option>${themes.map(t => `<option${t.toLowerCase() === af.theme.toLowerCase() ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
        ${books.length ? `<select id="afBook" aria-label="Scripture"><option value="">All scripture</option>${books.map(t => `<option${t.toLowerCase() === af.book.toLowerCase() ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
      </div>` : ""}
      <div id="recList">${on
        ? `<p class="found">${found.length} ${found.length === 1 ? "recording" : "recordings"} found <button type="button" class="quiet" id="afClear">Show all</button></p>${found.length ? byWeek(found) : `<div class="empty"><p>Nothing matches. Try a different word, theme or book.</p></div>`}`
        : (now.length ? `<div class="recs">${now.map(recHtml).join("")}</div>` : `<p class="empty-s">Nothing posted for this week yet.${data.canPost ? " Add the first recording!" : ""}</p>`)
          + (earlier.length ? `<details class="older"><summary>Earlier weeks (${earlier.length})</summary>${byWeek(earlier)}</details>` : "")}</div>
    </section>`;
  }
  function wireListen() {
    const redraw = () => { const sec = $("#listen"); if (!sec) return; sec.outerHTML = listenHtml(); wireListen(); };
    if ($("#aNew")) $("#aNew").onclick = () => audioDlg();
    if ($("#afQ")) $("#afQ").oninput = e => { af.q = e.target.value; const pos = e.target.selectionStart; redraw(); const i = $("#afQ"); i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { /* fine */ } };
    [["#afKind", "kind"], ["#afTheme", "theme"], ["#afBook", "book"]].forEach(([k, f]) => { if ($(k)) $(k).onchange = e => { af[f] = e.target.value; redraw(); }; });
    if ($("#afClear")) $("#afClear").onclick = () => { af.q = af.kind = af.theme = af.book = ""; redraw(); };
    document.querySelectorAll("#listen [data-atheme]").forEach(b => b.onclick = () => { af.theme = b.dataset.atheme; redraw(); $("#hL").scrollIntoView({ block: "start" }); });
    document.querySelectorAll("#listen [data-aedit]").forEach(b => b.onclick = () => audioDlg(data.audio.find(a => a.id === b.dataset.aedit)));
    document.querySelectorAll("#listen [data-adel]").forEach(b => b.onclick = () => {
      const a = data.audio.find(x => x.id === b.dataset.adel);
      openDlg(`<h2>Remove this recording?</h2><p>"${esc(a.title)}" comes off the church page. The file stays in the Church Audio folder in Google Drive.</p>
        <div class="btns"><button class="btn btn-outline btn-sm" data-x>Keep it</button><button class="btn btn-primary btn-sm" id="go">Remove</button></div>`);
      dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
      $("#go").onclick = async e => { e.currentTarget.disabled = true;
        try { data = await call({ action: "churchAudioRemove", id: a.id }); dlg.close(); render(); flash("Recording removed."); }
        catch (err) { dlg.close(); flash((err.message || "Something went wrong") + ".", true); } };
    });
    // Only one plays at a time
    document.querySelectorAll("#listen audio").forEach(au => au.addEventListener("play", () => document.querySelectorAll("#listen audio").forEach(o => { if (o !== au) o.pause(); })));
  }
  const MAX_MB = 30;
  function audioDlg(a) {
    const wk = data.thisWeek, weeks = [addDaysYmd(wk, 7), wk, addDaysYmd(wk, -7), addDaysYmd(wk, -14)];
    if (a && weeks.indexOf(a.week) === -1) weeks.push(a.week);
    const used = (data.audio || []).filter(x => x.week === wk).map(x => x.kind);
    // Psalm and Proverb share a slot: usually one or the other each week
    const slot = k => /Psalm|Proverb/.test(k) ? "pp" : k, usedSlots = used.map(slot);
    const kind0 = a ? a.kind : (data.audioKinds || []).find(k => k !== "Other" && usedSlots.indexOf(slot(k)) === -1) || "Other";
    let file = null;
    openDlg(`<h2>${a ? "Edit recording" : "Add a recording"}</h2>
      <div class="two"><label class="f">Which<select id="au_kind">${(data.audioKinds || []).map(k => `<option${k === kind0 ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
        <label class="f">Week<select id="au_week">${weeks.map(w => `<option value="${w}"${w === (a ? a.week : wk) ? " selected" : ""}>${esc(weekText(w))}${w === wk ? " (this week)" : w > wk ? " (next week)" : ""}</option>`).join("")}</select></label></div>
      <div class="f"><span>${a ? "Replace the recording <span class=\"opt\">(optional)</span>" : "The recording"}</span>
        <label class="pickfile"><input type="file" id="au_file" accept="audio/*,.m4a,.mp3,.aac,.wav,.caf"><span id="au_fname">${a ? "Keep the current one" : "Choose a voice memo"}</span></label>
        <small class="opt">On iPhone: in Voice Memos, tap ⋯ → Save to Files, then pick it here. Up to ${MAX_MB} MB (about an hour).</small></div>
      <label class="f">Title<input id="au_title" maxlength="140" placeholder="Psalm 23: The Lord is my shepherd" value="${esc(a ? a.title : "")}"></label>
      <div class="two au-book"><label class="f">From the book<select id="au_book"></select></label>
        <label class="f">Pages <span class="opt">(optional)</span><input id="au_pages" maxlength="40" placeholder="42–47" value="${esc(a ? a.pages || "" : "")}"></label></div>
      <div class="two"><label class="f">Scripture <span class="opt">(optional)</span><input id="au_scr" maxlength="200" placeholder="Psalm 23; John 10:11" value="${esc(a ? (a.scripture || []).join("; ") : "")}"></label>
        <label class="f">Themes <span class="opt">(optional)</span><input id="au_themes" maxlength="200" placeholder="Rest, Trust" value="${esc(a ? (a.themes || []).join(", ") : "")}"></label></div>
      <label class="f">About it <span class="opt">(optional)</span><textarea id="au_desc" rows="3" maxlength="4000" placeholder="A few words on what this one's about.">${esc(a ? a.description : "")}</textarea></label>
      ${a ? "" : `<label class="chk"><input type="checkbox" id="au_disc"${data.discord ? " checked" : " disabled"}><span>Also post it to #church-fam on Discord${data.discord ? "" : " <small class=\"opt\">(not connected)</small>"}</span></label>`}
      <p class="err" id="auErr" hidden></p>
      <div class="btns"><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary btn-sm" id="auGo">${a ? "Save" : "Post"}</button></div>`);
    const q = k => dlgIn.querySelector(k), err = q("#auErr");
    q("[data-x]").onclick = () => dlg.close();
    // The book list follows the kind: current books of that kind first, then earlier ones
    const fillBooks = () => {
      const k = q("#au_kind").value, f = BOOK_OF[k], wk = q("#au_week").value, sel = q("#au_book");
      q(".au-book").hidden = !f && !(a && a.pages);
      const list = (data.books || []).filter(b => !f || b.for === f);
      const auto = bookFor({ kind: k, week: wk, bookId: "" });
      const keep = a && a.bookId ? a.bookId : "";
      sel.innerHTML = `<option value="">${auto ? "The current one: " + esc(auto.title) : "None"}</option>` + list.filter(b => !auto || b.id !== auto.id).map(b => `<option value="${esc(b.id)}"${b.id === keep ? " selected" : ""}>${esc(b.title)}${b.current ? "" : " (earlier)"}</option>`).join("");
    };
    q("#au_kind").addEventListener("change", fillBooks); q("#au_week").addEventListener("change", fillBooks); fillBooks();
    q("#au_file").onchange = () => {
      const f = q("#au_file").files[0]; file = null; err.hidden = true; if (!f) return;
      if (f.size > MAX_MB * 1024 * 1024) { err.textContent = "That file is " + (f.size / 1048576).toFixed(1) + " MB, over the " + MAX_MB + " MB limit."; err.hidden = false; return; }
      file = { f, seconds: 0 };
      q("#au_fname").textContent = f.name + " · " + (f.size / 1048576).toFixed(1) + " MB";
      // How long it is (for the page and, later, podcast apps)
      const probe = new Audio(); probe.preload = "metadata"; probe.onloadedmetadata = () => { if (isFinite(probe.duration)) { file.seconds = Math.round(probe.duration); q("#au_fname").textContent += " · " + mins(file.seconds); } URL.revokeObjectURL(probe.src); };
      probe.src = URL.createObjectURL(f);
      if (!q("#au_title").value.trim()) q("#au_title").value = f.name.replace(/\.[^.]+$/, "").replace(/^New Recording\s*\d*$/i, "");
    };
    q("#auGo").onclick = async e => {
      const b = e.currentTarget; err.hidden = true;
      if (!a && !file) { err.textContent = "Choose a recording first."; err.hidden = false; return; }
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> ${file ? "Uploading " + (file.f.size / 1048576).toFixed(1) + " MB…" : "Saving…"}`;
      try {
        let audio = null;
        if (file) {
          const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Couldn't read that file")); r.readAsDataURL(file.f); });
          audio = { data: String(dataUrl).split(",")[1], type: file.f.type || "audio/mp4", name: file.f.name, seconds: file.seconds };
        }
        data = await call({ action: "churchAudio", id: a ? a.id : undefined, kind: q("#au_kind").value, week: q("#au_week").value, title: q("#au_title").value.trim(),
          scripture: splitList(q("#au_scr").value.replace(/,(?=\s*(?:[1-3]\s*)?[A-Za-z])/g, ";")), themes: splitList(q("#au_themes").value), description: q("#au_desc").value.trim(),
          bookId: q(".au-book").hidden ? "" : q("#au_book").value, pages: q(".au-book").hidden ? "" : q("#au_pages").value.trim(),
          discord: !a && q("#au_disc") && q("#au_disc").checked, audio: audio, _demoUrl: DEMO && file ? URL.createObjectURL(file.f) : undefined });
        dlg.close(); render(); flash(a ? "Saved." : "Posted. It's on the church page" + (!a && q("#au_disc") && q("#au_disc").checked ? " and #church-fam." : "."));
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = a ? "Save" : "Post"; }
    };
  }

  /* ---------- A special Sunday (admins): potluck, or no Supper Church ---------- */
  function dayDlg(s) {
    const st = s.style || "Usual";
    openDlg(`<h2>${esc(longDay(s.date))}</h2>
      <div class="kinds" role="radiogroup" aria-label="This Sunday">${[["Usual", "Usual Supper Church"], ["Potluck", "Potluck"], ["No Supper Church", "No Supper Church"]].map(([k, l]) => `<label><input type="radio" name="dstyle" value="${k}"${k === st ? " checked" : ""}>${l}</label>`).join("")}</div>
      <p class="dhint" style="margin:0;font-size:14.5px"></p>
      <label class="f dname">Name <span class="opt">(optional)</span><input id="d_title" maxlength="80" value="${esc(s.title || "")}" placeholder="Thanksgiving potluck"></label>
      <label class="f dnote">Note <span class="opt">(optional)</span><textarea id="d_note" rows="3" maxlength="600" placeholder="Bring a dish to share. We'll have the turkey!">${esc(s.dayNote || "")}</textarea></label>
      ${data.discord ? `<label class="chk dann"><input type="checkbox" id="d_ann" checked><span>Tell #church-fam on Discord</span></label>` : ""}
      ${s.bringing.length || s.main ? `<p class="opt" style="margin:0;font-size:13.5px">Sign-ups so far stay as they are.</p>` : ""}
      <p class="err" id="dErr" hidden></p>
      <div class="btns"><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary btn-sm" id="dGo">Save</button></div>`);
    const q = k => dlgIn.querySelector(k);
    const sync = () => { const v = q('input[name="dstyle"]:checked').value;
      q(".dhint").textContent = v === "Potluck" ? "Everyone brings a dish to share; no one main dish needed." : v === "No Supper Church" ? "Sign-ups close for this Sunday, and the reminders skip it." : "One main dish, plus sides and desserts.";
      q(".dname").hidden = q(".dnote").hidden = v === "Usual"; if (q(".dann")) q(".dann").hidden = v === "Usual"; };
    dlgIn.querySelectorAll('input[name="dstyle"]').forEach(r => r.onchange = sync); sync();
    q("[data-x]").onclick = () => dlg.close();
    q("#dGo").onclick = async e => {
      const b = e.currentTarget, v = q('input[name="dstyle"]:checked').value; b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try { data = await call({ action: "churchDay", sunday: s.date, style: v, title: v === "Usual" ? "" : q("#d_title").value.trim(), note: v === "Usual" ? "" : q("#d_note").value.trim(), announce: v !== "Usual" && q("#d_ann") && q("#d_ann").checked });
        dlg.close(); render(); flash(v === "Potluck" ? "It's a potluck!" : v === "No Supper Church" ? "Marked: no Supper Church that Sunday." : "Back to the usual Supper Church."); }
      catch (x) { q("#dErr").textContent = (x.message || "Something went wrong") + "."; q("#dErr").hidden = false; b.disabled = false; b.textContent = "Save"; }
    };
  }

  /* ---------- Song of the month ---------- */
  const monthName = m => { const [y, mo] = String(m || "").split("-").map(Number); return y ? new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" }) : ""; };
  const thisMonth = () => today().slice(0, 7);
  const nextMonth = m => { const [y, mo] = m.split("-").map(Number); return mo === 12 ? (y + 1) + "-01" : y + "-" + String(mo + 1).padStart(2, "0"); };
  function songHtml() {
    const s = data.song;
    if (!s) return data.admin ? `<section class="song" aria-labelledby="hSong"><div class="sec-h"><div><h2 id="hSong">Song of the month</h2><p>The song we're learning together at Supper Church. Nothing posted yet.</p></div>
      <button class="btn btn-forest btn-sm" id="songNew">Add the song of the month</button></div></section>` : "";
    const lyrics = s.lyricsOk && s.lyrics ? `<details class="lyrics"><summary>Lyrics</summary><div class="ly">${esc(s.lyrics)}</div></details>`
      : s.lyricsLink ? `<p><a class="btn btn-outline btn-sm" href="${esc(s.lyricsLink)}" target="_blank" rel="noopener">Lyrics ↗</a></p>` : "";
    return `<section class="song" aria-labelledby="hSong">
      <div class="sec-h"><div><span class="kick">Song of the month · ${esc(monthName(s.month))}</span><h2 id="hSong">${esc(s.title)}</h2>${s.writers ? `<p>${esc(s.writers)}</p>` : ""}</div>
        ${data.admin ? `<div class="sbtns"><button class="btn btn-outline btn-sm" id="songEdit">Edit</button><button class="btn btn-forest btn-sm" id="songNew">New song</button></div>` : ""}</div>
      ${s.youtube ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(s.youtube)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
      ${s.note ? `<p class="snote">${esc(s.note)}</p>` : ""}
      ${lyrics}
      ${s.copyright ? `<p class="cr">${esc(s.copyright)}</p>` : ""}
    </section>`;
  }
  function songDlg(s) {
    const songs = data.songs || [];
    const fill = x => {
      x = x || { month: songs.some(o => o.month === thisMonth()) ? nextMonth(thisMonth()) : thisMonth() };
      dlgIn.querySelector("#sgMonth").value = x.month || ""; ["title", "writers", "copyright", "note"].forEach(k => { dlgIn.querySelector("#sg_" + k).value = x[k] || ""; });
      dlgIn.querySelector("#sg_youtube").value = x.youtubeUrl || ""; dlgIn.querySelector("#sg_lyricsLink").value = x.lyricsLink || "";
      dlgIn.querySelector("#sg_lyrics").value = x.lyricsDraft || x.lyrics || ""; dlgIn.querySelector("#sgOk").checked = !!x.lyricsOk; dlgIn.querySelector("#sgDel").hidden = !x.id;
      cur = x;
    };
    let cur = null;
    openDlg(`<h2>Song of the month</h2>
      ${songs.length ? `<label class="f">Which song<select id="sgPick"><option value="">＋ A new song</option>${songs.map(o => `<option value="${esc(o.id)}"${s && s.id === o.id ? " selected" : ""}>${esc(monthName(o.month))}: ${esc(o.title)}</option>`).join("")}</select></label>` : ""}
      <div class="two"><label class="f">Month<input type="month" id="sgMonth" required></label><label class="f">Title<input id="sg_title" maxlength="120" placeholder="Be Thou My Vision"></label></div>
      <label class="f">Writers <span class="opt">(optional)</span><input id="sg_writers" maxlength="200" placeholder="Words and music by…"></label>
      <label class="f">YouTube link <span class="opt">(it plays right on the page)</span><input id="sg_youtube" inputmode="url" placeholder="https://www.youtube.com/watch?v=…"></label>
      <label class="f">A note <span class="opt">(optional)</span><textarea id="sg_note" rows="2" maxlength="600" placeholder="We'll sing it every Sunday this month. Here's a practice video."></textarea></label>
      <label class="f">Copyright line <span class="opt">(shown under the song)</span><input id="sg_copyright" maxlength="200" placeholder="© 2014 Example Music · CCLI license #…"></label>
      <label class="f">Lyrics link <span class="opt">(the publisher, SongSelect or a lyric video)</span><input id="sg_lyricsLink" inputmode="url" placeholder="https://…"></label>
      <label class="f">Lyrics <span class="opt">(only shown when the box below is ticked)</span><textarea id="sg_lyrics" rows="5" maxlength="6000"></textarea></label>
      <label class="chk"><input type="checkbox" id="sgOk"><span><b>Public domain, or we have permission</b> to share these lyrics. A CCLI church license covers lyrics on a screen or in a bulletin, not on a website, so most newer songs need the link above instead.</span></label>
      <p class="err" id="sgErr" hidden></p>
      <div class="btns"><button class="quiet del" id="sgDel" hidden>Remove this song</button><span style="flex:1"></span><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary btn-sm" id="sgGo">Save</button></div>`);
    fill(s);
    const pick = dlgIn.querySelector("#sgPick"); if (pick) pick.onchange = () => fill(songs.find(o => o.id === pick.value) || null);
    dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
    dlgIn.querySelector("#sgDel").onclick = async e => { if (!cur || !cur.id) return; e.currentTarget.disabled = true;
      try { data = await call({ action: "churchSongRemove", id: cur.id }); dlg.close(); render(); flash("Song removed."); } catch (err) { dlg.close(); flash((err.message || "Something went wrong") + ".", true); } };
    dlgIn.querySelector("#sgGo").onclick = async e => {
      const b = e.currentTarget, v = k => dlgIn.querySelector(k).value.trim(), err = dlgIn.querySelector("#sgErr");
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        data = await call({ action: "churchSong", id: cur && cur.id || undefined, month: v("#sgMonth"), title: v("#sg_title"), writers: v("#sg_writers"), copyright: v("#sg_copyright"), youtube: v("#sg_youtube"),
          lyricsLink: v("#sg_lyricsLink"), lyrics: dlgIn.querySelector("#sg_lyrics").value, lyricsOk: dlgIn.querySelector("#sgOk").checked, note: v("#sg_note") });
        dlg.close(); render(); flash("Saved the song of the month.");
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "Save"; }
    };
  }

  /* ---------- Church events ---------- */
  const t12 = hm => { if (!hm) return ""; const [h, m] = hm.split(":").map(Number); return ((h % 12) || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm"); };
  const REPEATS = [["none", "Doesn't repeat"], ["weekly", "Every week"], ["biweekly", "Every other week"], ["monthlyNth", "Monthly (same weekday)"], ["monthlyDate", "Monthly (same date)"]];
  function eventsHtml() {
    const ev = data.events || [];
    if (!ev.length && !data.admin) return "";
    return `<section aria-labelledby="hE"><div class="sec-h"><div><h2 id="hE">Church events</h2><p>What's coming up. Public ones are on the Heirloom calendar too.</p></div>
        ${data.admin ? `<button class="btn btn-forest btn-sm" id="evNew">Add a church event</button>` : ""}</div>
      ${ev.length ? `<ul class="cev">${ev.map(e => `<li>
          <span class="cd"><small>${esc(fmt(e.next, { month: "short" }))}</small><b>${esc(fmt(e.next, { day: "numeric" }))}</b></span>
          <span class="ci"><b>${esc(e.title)}</b><span>${esc([fmt(e.next, { weekday: "long" }), e.allDay ? "All day" : t12(e.start) + (e.end ? "–" + t12(e.end) : ""), e.location].filter(Boolean).join(" · "))}</span>
            ${e.repeats ? `<span class="rep">${esc(e.repeats)}${e.until ? " until " + esc(fmt(e.until, { month: "short", day: "numeric" })) : ""}</span>` : ""}
            ${e.public ? "" : `<span class="pill kind">Church family only</span>`}
            ${e.description ? `<details><summary>Details</summary><p>${esc(e.description)}</p>${e.link ? `<p><a href="${esc(e.link)}" target="_blank" rel="noopener">More info ↗</a></p>` : ""}</details>` : ""}</span></li>`).join("")}</ul>`
        : `<p class="empty-s">No church events coming up yet.</p>`}
    </section>`;
  }
  function eventDlg() {
    openDlg(`<h2>Add a church event</h2>
      <label class="f">What<input id="ev_title" maxlength="90" placeholder="Advent candle-making night"></label>
      <div class="two"><label class="f">Date<input type="date" id="ev_date" min="${today()}"></label><label class="f">Repeats<select id="ev_repeat">${REPEATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label></div>
      <label class="chk"><input type="checkbox" id="ev_allDay"><span>All day</span></label>
      <div class="two ev-times"><label class="f">Starts<input type="time" id="ev_start" value="17:30"></label><label class="f">Ends <span class="opt">(optional)</span><input type="time" id="ev_end" value="19:00"></label></div>
      <label class="f ev-until" hidden>Until<input type="date" id="ev_until"></label>
      <label class="f">Where<input id="ev_loc" list="evLocs" maxlength="120" value="Farmhouse"><datalist id="evLocs">${(data.locations || []).map(l => `<option value="${esc(l)}">`).join("")}</datalist></label>
      <label class="f">Description<textarea id="ev_desc" rows="4" maxlength="1300" placeholder="What to expect, what to bring, who it's for…"></textarea></label>
      <div class="two"><label class="f">Scripture <span class="opt">(optional)</span><input id="ev_scr" maxlength="120" placeholder="Luke 2:1-20"></label><label class="f">Theme <span class="opt">(optional)</span><input id="ev_theme" maxlength="80" placeholder="Advent"></label></div>
      <label class="f">Link <span class="opt">(optional)</span><input id="ev_link" inputmode="url" placeholder="https://…"></label>
      <label class="chk"><input type="checkbox" id="ev_pub" checked><span><b>Put it on the public Heirloom calendar</b>. Untick to keep it on the church page and the residents' calendar only.</span></label>
      <label class="chk ev-disc"><input type="checkbox" id="ev_disc" checked><span><b>Post it to #church-events</b> on Discord${data.eventsDiscord ? "" : `<br><small class="opt">That channel isn't connected yet. It'll post once it is (add it on the Discord channels tab with Event type "Church").</small>`}</span></label>
      <p class="err" id="evErr" hidden></p>
      <div class="btns"><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary btn-sm" id="evGo">Add the event</button></div>`);
    const q = k => dlgIn.querySelector(k);
    const sync = () => { q(".ev-times").hidden = q("#ev_allDay").checked; q(".ev-until").hidden = q("#ev_repeat").value === "none"; q(".ev-disc").hidden = !q("#ev_pub").checked; };
    ["#ev_allDay", "#ev_repeat", "#ev_pub"].forEach(k => q(k).onchange = sync); sync();
    q("[data-x]").onclick = () => dlg.close();
    q("#evGo").onclick = async e => {
      const b = e.currentTarget, v = k => q(k).value.trim(), err = q("#evErr"), pub = q("#ev_pub").checked;
      let link = v("#ev_link"); if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Adding…`; err.hidden = true;
      try {
        data = await call({ action: "churchEvent", title: v("#ev_title"), date: v("#ev_date"), allDay: q("#ev_allDay").checked, startTime: v("#ev_start"), endTime: v("#ev_end"),
          repeat: q("#ev_repeat").value, until: v("#ev_until"), location: v("#ev_loc"), description: v("#ev_desc"), scripture: v("#ev_scr"), theme: v("#ev_theme"), link: link,
          public: pub, discord: pub && q("#ev_disc").checked });
        dlg.close(); render();
        const live = data.posted && data.posted.status === "published";
        flash(live ? (pub ? "Added. It's on the public calendar" + (q("#ev_disc") && q("#ev_disc").checked && data.eventsDiscord ? " and will post to #church-events shortly." : ".") : "Added to the church page and the residents' calendar.")
          : "Saved. It's waiting for review" + (data.posted && data.posted.held ? " because of a word in the title." : "."));
      } catch (x) { err.textContent = (x.message || "Something went wrong") + "."; err.hidden = false; b.disabled = false; b.textContent = "Add the event"; }
    };
  }

  /* ---------- "I'm bringing…" ---------- */
  function bringDlg(s, kind, existing) {
    const pot = s.style === "Potluck";
    const mainFree = pot || !s.main || (existing && existing.kind === "Main");
    const kinds = (mainFree ? ["Main"] : []).concat(["Side", "Dessert", "Other"]);
    if (!kinds.includes(kind)) kind = "Side";
    const label = { Main: "The main dish", Side: "A side", Dessert: "A dessert", Other: "Something else" };
    openDlg(`<h2>${esc(longDay(s.date))}</h2>
      <p>${existing ? "Change what you're bringing." : pot ? `It's a potluck${s.title ? ": " + esc(s.title) : ""}! Bring whatever you'd like to share.` : mainFree ? "The main dish is the one we need most. Sides, desserts and anything else are welcome too." : `${esc(s.main.name)} is making the main${s.main.what ? " (" + esc(s.main.what) + ")" : ""}. What would you like to add?`}</p>
      <div class="kinds" role="radiogroup" aria-label="What are you bringing?">${kinds.map(k => `<label><input type="radio" name="kind" value="${k}"${k === kind ? " checked" : ""}>${label[k]}</label>`).join("")}</div>
      <label class="f"><span>What is it? <span class="opt">(optional, but it helps everyone plan)</span></span><input type="text" id="what" maxlength="120" value="${esc(existing ? existing.what : "")}" placeholder="Veggie lasagna, green salad, apple pie…"></label>
      ${data.dietary.length ? `<p style="font-size:14px">In the church family: ${data.dietary.map(d => d.count + " " + esc(d.label)).join(" · ")}</p>` : ""}
      <div class="btns"><span class="err" id="berr" hidden></span><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary" id="go">${existing ? "Save" : "Sign me up"}</button></div>`);
    dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
    $("#go").onclick = async e => {
      const b = e.currentTarget, k = dlgIn.querySelector('input[name="kind"]:checked').value, what = $("#what").value.trim();
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try {
        data = await call({ action: "churchBring", sunday: s.date, kind: k, what: what, id: existing ? existing.id : undefined });
        dlg.close(); render();
        flash(existing ? "Updated. Thank you!" : k === "Main" ? `Thank you! You're making the main dish on ${longDay(s.date)}.` : `Thank you! You're on the list for ${longDay(s.date)}.`);
      } catch (err) { $("#berr").textContent = (err.message || "Something went wrong") + "."; $("#berr").hidden = false; b.disabled = false; b.textContent = existing ? "Save" : "Sign me up"; }
    };
  }

  /* ---------- Write a note (admins) ----------
     The same editor as the event form's "More details": bold, italics, headings, lists,
     links and photos. Photos are shrunk in the browser and saved to the photo folder. */
  const loadImage = file => new Promise((ok, no) => { const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = URL.createObjectURL(file); });
  function noteDlg(n) {
    const opts = data.sundays.map(s => s.date).concat(n && n.sunday && !data.sundays.some(s => s.date === n.sunday) ? [n.sunday] : []);
    const known = [...new Set(data.notes.flatMap(x => x.themes || []))].sort((a, b) => a.localeCompare(b));
    dlg.classList.add("wide");
    openDlg(`<h2>${n ? "Edit note" : "Write a note"}</h2>
      <p>Everyone in the church family sees this at the top of the page${n ? "" : data.discord ? ", and it can go to #church-fam on Discord too" : ""}.</p>
      <label class="f"><span>Title</span><input type="text" id="nTitle" maxlength="140" value="${esc(n ? n.title : "")}" placeholder="This Sunday at Supper Church"></label>
      <div class="rte">
        <div class="rte-bar" role="toolbar" aria-label="Formatting">
          <button type="button" data-cmd="bold" aria-label="Bold" title="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" aria-label="Italic" title="Italic"><i>I</i></button>
          <button type="button" data-cmd="heading" aria-label="Heading" title="Heading">H</button>
          <button type="button" data-cmd="insertUnorderedList" aria-label="Bulleted list" title="Bulleted list">• List</button>
          <button type="button" data-cmd="insertOrderedList" aria-label="Numbered list" title="Numbered list">1. List</button>
          <button type="button" data-cmd="blockquote" aria-label="Quote" title="Quote">❝ Quote</button>
          <button type="button" data-cmd="link" aria-label="Add a link" title="Add a link">Link</button>
          <button type="button" data-cmd="image" aria-label="Add an image" title="Add an image">🖼 Image</button>
        </div>
        <div class="rte-link" id="linkRow" hidden><input type="text" id="linkUrl" placeholder="https://…" inputmode="url" aria-label="Link address"><button type="button" class="btn btn-forest btn-sm" id="linkAdd">Add link</button><button type="button" class="btn btn-outline btn-sm" id="linkNo">Cancel</button></div>
        <div class="ed" id="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note" data-ph="Write your note here. Add headings, lists, links or photos…">${n ? bodyHtml(n) : ""}</div>
      </div>
      <input type="file" id="edPhoto" accept="image/*" hidden><p class="edstat" id="edStat" aria-live="polite"></p>
      <label class="f"><span>Scripture <span class="opt">(optional; separate passages with a semicolon)</span></span><input type="text" id="nScr" maxlength="300" value="${esc(n ? (n.scripture || []).join("; ") : "")}" placeholder="Luke 14:15-24; Psalm 23"></label>
      <label class="f"><span>Themes <span class="opt">(optional; separate with commas)</span></span><input type="text" id="nThemes" maxlength="250" value="${esc(n ? (n.themes || []).join(", ") : "")}" placeholder="Hospitality, Advent, Rest"></label>
      ${known.length ? `<p class="sugg">Used before: ${known.map(t => `<button type="button" class="pill theme" data-add="${esc(t)}">${esc(t)}</button>`).join("")}</p>` : ""}
      <label class="f"><span>Is this about a specific Sunday? <span class="opt">(optional)</span></span><select id="nSun"><option value="">No, it's a general note</option>${opts.map(d => `<option value="${d}"${n && n.sunday === d ? " selected" : ""}>${esc(longDay(d))}</option>`).join("")}</select></label>
      ${n ? "" : data.discord ? `<label class="chk"><input type="checkbox" id="nDisc" checked><span>Also post to #church-fam on Discord</span></label>` : `<p style="font-size:14px">Discord isn't connected for the church channel yet, so this stays in the app.</p>`}
      <div class="btns"><span class="err" id="nerr" hidden></span><button class="btn btn-outline btn-sm" data-x>Cancel</button><button class="btn btn-primary" id="go">${n ? "Save" : "Post"}</button></div>`);
    dlg.addEventListener("close", () => dlg.classList.remove("wide"), { once: true });
    const ed = $("#ed"); let range = null;
    const save = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    const back = () => { ed.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
    ["keyup", "mouseup", "input", "focus"].forEach(ev => ed.addEventListener(ev, save));
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) { /* fine */ }
    dlgIn.querySelector(".rte-bar").addEventListener("mousedown", e => e.preventDefault()); // keep the text selected
    dlgIn.querySelectorAll(".rte-bar button").forEach(b => b.onclick = () => {
      const cmd = b.dataset.cmd; back();
      if (cmd === "heading" || cmd === "blockquote") { const tag = cmd === "heading" ? "h3" : "blockquote", cur = (document.queryCommandValue("formatBlock") || "").toLowerCase(); document.execCommand("formatBlock", false, cur === tag ? "p" : tag); }
      else if (cmd === "link") { $("#linkRow").hidden = false; $("#linkUrl").value = ""; $("#linkUrl").focus(); return; }
      else if (cmd === "image") { if (ed.querySelectorAll("img").length >= 6) { $("#edStat").textContent = "That's the limit of 6 images in one note."; return; } $("#edPhoto").click(); return; }
      else document.execCommand(cmd, false, null);
      save();
    });
    $("#linkAdd").onclick = () => {
      let url = $("#linkUrl").value.trim(); if (!url) return;
      if (!/^(https?:|mailto:)/i.test(url)) url = (/@/.test(url) && !/\//.test(url) ? "mailto:" : "https://") + url;
      back(); const sel = getSelection();
      if (sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${esc(url)}">${esc(url.replace(/^mailto:/, ""))}</a>&nbsp;`); else document.execCommand("createLink", false, url);
      $("#linkRow").hidden = true; save();
    };
    $("#linkNo").onclick = () => { $("#linkRow").hidden = true; back(); };
    $("#linkUrl").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#linkAdd").click(); } });
    $("#edPhoto").addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      $("#edStat").textContent = "Adding your image…";
      try {
        const img = await loadImage(file), scale = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        back(); document.execCommand("insertHTML", false, `<img src="${c.toDataURL("image/jpeg", 0.8)}" alt=""><p><br></p>`); $("#edStat").textContent = ""; save();
      } catch (err) { $("#edStat").textContent = "We couldn't read that image. Try a different one."; }
      e.target.value = "";
    });
    // Pasting from Word or Google Docs: keep the simple formatting, drop the rest
    ed.addEventListener("paste", e => { const html = e.clipboardData.getData("text/html"), text = e.clipboardData.getData("text/plain"); e.preventDefault();
      if (html) document.execCommand("insertHTML", false, H.sanitize(html).replace(/<img[^>]*>/g, "")); else document.execCommand("insertText", false, text); });
    dlgIn.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { const cur = splitList($("#nThemes").value); if (!cur.some(t => t.toLowerCase() === b.dataset.add.toLowerCase())) cur.push(b.dataset.add); $("#nThemes").value = cur.join(", "); });
    dlgIn.querySelector("[data-x]").onclick = () => dlg.close();
    $("#go").onclick = async e => {
      const b = e.currentTarget, title = $("#nTitle").value.trim();
      const box = document.createElement("div"); box.innerHTML = H.sanitize(ed.innerHTML).trim();
      if (!title && !box.textContent.trim() && !box.querySelector("img")) { $("#nerr").textContent = "Write something first."; $("#nerr").hidden = false; return; }
      const images = [];
      box.querySelectorAll("img").forEach(im => { const src = im.getAttribute("src") || ""; if (src.startsWith("data:image/")) { const id = images.length; images.push({ id, data: src.split(",")[1] }); im.setAttribute("src", "cid:img" + id); } });
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> ${n ? "Saving" : "Posting"}…${images.length ? " (uploading photos)" : ""}`;
      try {
        data = await call({ action: "churchNote", id: n ? n.id : undefined, title: title, format: "html", note: box.innerHTML.replace(/(?:<p>(?:<br>|\s|&nbsp;)*<\/p>\s*)+$/, ""), images: images, themes: splitList($("#nThemes").value), scripture: splitList($("#nScr").value.replace(/,(?=\s*(?:[1-3]\s*)?[A-Za-z])/g, ";")),
          sunday: $("#nSun").value, discord: $("#nDisc") ? $("#nDisc").checked : false, _demoHtml: DEMO ? H.sanitize(ed.innerHTML).replace(/(?:<p>(?:<br>|\s|&nbsp;)*<\/p>\s*)+$/, "") : undefined });
        const disc = $("#nDisc") && $("#nDisc").checked;
        dlg.close(); render(); flash(n ? "Note saved." : "Posted. The church family will see it here" + (disc ? " and on Discord." : "."));
      } catch (err) { $("#nerr").textContent = (err.message || "Something went wrong") + "."; $("#nerr").hidden = false; b.disabled = false; b.textContent = n ? "Save" : "Post"; }
    };
  }

  // A second of silence, so the sample players work in preview mode
  function silentWav() { const n = 8000, buf = new ArrayBuffer(44 + n), v = new DataView(buf), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    let s = ""; new Uint8Array(buf).forEach(c => s += String.fromCharCode(c)); return "data:audio/wav;base64," + btoa(s); }

  /* ---------- Preview mode (no backend connected) ---------- */
  function demo(b) {
    if (!demoState) {
      const suns = []; let d = dateOf(today()); while (d.getUTCDay() !== 0) d = new Date(+d + 86400000);
      for (; suns.length < 8; d = new Date(+d + 7 * 86400000)) if (d.getUTCDate() <= 28) suns.push(d.toISOString().slice(0, 10));
      demoState = { ok: true, email: "ana@example.com", admin: true, canPost: true, resident: false, volunteer: true, me: "Ana", discord: true, kinds: ["Main", "Side", "Dessert", "Other"],
        dietary: [{ label: "vegetarian", count: 4 }, { label: "gluten-free", count: 1 }, { label: "nuts allergy", count: 1 }],
        notes: [{ id: "N-1", posted: today() + " 09:00", by: "Brit P.", sunday: suns[0], title: "This Sunday: the great banquet", format: "html", themes: ["Hospitality", "The table"], scripture: ["Luke 14:15-24"],
            note: "<p>We're reading <strong>Luke 14</strong> together: the story of the great banquet, and who gets invited.</p><h3>For Sunday</h3><ul><li>Dress warm, we're on the lawn if it's dry</li><li>Kids are welcome at the table</li></ul><blockquote>Go out to the roads and country lanes and compel them to come in, so that my house will be full.</blockquote><p>Here's the <a href=\"https://example.com\">Doxology</a> if you'd like to learn the tune.</p>", edited: false },
          { id: "N-2", posted: "2026-11-08 17:00", by: "Brit P.", sunday: "", title: "Thank you for last week", note: "What a full table. Thank you to everyone who cooked and cleaned up!", edited: false, format: "", themes: ["Gratitude"], scripture: ["Psalm 23"] },
          { id: "N-3", posted: "2026-11-01 17:00", by: "Brit P.", sunday: "", title: "Rest is not a reward", format: "html", themes: ["Rest", "Hospitality"], scripture: ["Matthew 11:28-30", "Psalm 127:2"], note: "<p>A few thoughts on sabbath as we head into a busy season on the farm.</p>", edited: false }],
        song: { id: "SG-1", month: today().slice(0, 7), title: "Be Thou My Vision", writers: "Irish hymn, 8th century · translated by Mary Byrne (1905)", copyright: "Public domain", youtube: "", youtubeUrl: "",
          lyricsLink: "", lyricsOk: true, lyrics: "Be Thou my vision, O Lord of my heart;\nNaught be all else to me, save that Thou art.", note: "We'll sing it every Sunday this month." },
        songs: [], events: [{ id: "EV-1", title: "Advent candle-making night", next: suns[1], date: suns[1], until: "", repeats: "", start: "18:30", end: "20:00", allDay: false, location: "Farmhouse", description: "Bring a jar. We'll make Advent candles together.", link: "", public: true },
          { id: "EV-2", title: "Prayer walk", next: suns[0], date: suns[0], until: "", repeats: "Weekly", start: "07:00", end: "07:45", allDay: false, location: "Orchard", description: "", link: "", public: false }],
        eventsDiscord: false, locations: ["Farmhouse", "Orchard", "Yurt", "Barn"],
        audioKinds: ["Weekly message", "Psalm of the week", "Proverb of the week", "Kids Bible story", "Other"], bookFor: ["Psalms & Proverbs", "Kids Bible stories"],
        books: [{ id: "BK-1", title: "Sample Psalms & Proverbs book", author: "An author", for: "Psalms & Proverbs", cover: "", buy: "https://example.com", buyLabel: "Books on Bee", started: "2026-09-01", finished: "", note: "Our book for the Psalm and Proverb of the week.", current: true },
          { id: "BK-2", title: "Sample kids' story Bible", author: "Another author", for: "Kids Bible stories", cover: "", buy: "", buyLabel: "", started: "2026-11-01", finished: "", note: "", current: true },
          { id: "BK-3", title: "An earlier kids' book", author: "", for: "Kids Bible stories", cover: "", buy: "", buyLabel: "", started: "2026-09-15", finished: "2026-10-31", note: "", current: false }], thisWeek: (() => { const t = dateOf(today()), wd = t.getUTCDay(); t.setUTCDate(t.getUTCDate() + (wd === 0 ? 1 : 1 - wd)); return t.toISOString().slice(0, 10); })(),
        audio: [],
        skipped: (() => { const out = []; let t = dateOf(today()); while (t.getUTCDay() !== 0) t = new Date(+t + 86400000); for (; t.toISOString().slice(0, 10) <= suns[suns.length - 1]; t = new Date(+t + 7 * 86400000)) if (t.getUTCDate() > 28) out.push(t.toISOString().slice(0, 10)); return out; })(),
        sundays: suns.map((day, i) => ({ date: day, style: i === 0 ? "Potluck" : "Usual", title: i === 0 ? "Thanksgiving potluck" : "", dayNote: i === 0 ? "A Thanksgiving-style potluck! Bring a dish to share: mains, sides and desserts all welcome." : "", main: i === 0 ? { id: "D-1", kind: "Main", what: "Veggie lasagna", name: "Riss K.", mine: false } : i === 2 ? { id: "D-4", kind: "Main", what: "", name: "Ana D.", mine: true } : null,
          bringing: i === 0 ? [{ id: "D-2", kind: "Side", what: "Green salad", name: "Lisa S.", mine: false }, { id: "D-3", kind: "Dessert", what: "Apple crisp", name: "Ana D.", mine: true }] : [] })) };
    }
    demoState.events.sort((a, c) => a.next.localeCompare(c.next));
    if (!demoState.audio.length && !demoState._seeded) { demoState._seeded = true; const w = demoState.thisWeek, prev = (() => { const t = dateOf(w); t.setUTCDate(t.getUTCDate() - 7); return t.toISOString().slice(0, 10); })(), sil = silentWav();
      demoState.audio = [{ id: "AU-1", week: w, kind: "Weekly message", title: "Waiting well", description: "On Advent as a season of waiting, and what it asks of us.", scripture: ["Isaiah 40:31"], themes: ["Advent", "Waiting"], url: sil, page: sil, seconds: 482, posted: "", by: "Brit P." },
        { id: "AU-2", week: w, kind: "Psalm of the week", title: "Psalm 130", description: "", scripture: ["Psalm 130"], themes: ["Waiting"], pages: "88–90", url: sil, page: sil, seconds: 214, posted: "", by: "Brit P." },
        { id: "AU-3", week: prev, kind: "Kids Bible story", title: "Noah and the rainbow", description: "", scripture: ["Genesis 9:8-17"], themes: ["Promises"], pages: "36–43", url: sil, page: sil, seconds: 305, posted: "", by: "Brit P." }]; }
    const S = demoState, all = () => S.sundays.flatMap(s => [s.main].concat(s.bringing).filter(Boolean));
    if (b.action === "churchBring") {
      const s = S.sundays.find(x => x.date === b.sunday);
      if (b.id) { const k = all().find(x => x.id === b.id); S.sundays.forEach(x => { if (x.main === k) x.main = null; x.bringing = x.bringing.filter(y => y !== k); }); k.kind = b.kind; k.what = b.what; if (b.kind === "Main") s.main = k; else s.bringing.push(k); }
      else { const k = { id: "D-" + Math.random().toString(36).slice(2, 7), kind: b.kind, what: b.what, name: "Ana D.", mine: true }; if (b.kind === "Main" && (s.style || "Usual") === "Usual") s.main = k; else s.bringing.push(k); }
    }
    if (b.action === "churchUnbring") S.sundays.forEach(x => { if (x.main && x.main.id === b.id) x.main = null; x.bringing = x.bringing.filter(y => y.id !== b.id); });
    if (b.action === "churchNote") { const f = { title: b.title, note: b._demoHtml || b.note, format: "html", themes: b.themes || [], scripture: b.scripture || [], sunday: b.sunday };
      if (b.id) Object.assign(S.notes.find(n => n.id === b.id), f, { edited: true });
      else S.notes.unshift(Object.assign({ id: "N-" + Math.random().toString(36).slice(2, 7), posted: today() + " 12:00", by: "Ana D.", edited: false }, f)); }
    if (b.action === "churchNoteRemove") S.notes = S.notes.filter(n => n.id !== b.id);
    if (!S.songs.length && S.song) S.songs = [Object.assign({ lyricsDraft: S.song.lyrics }, S.song)];
    if (b.action === "churchSong") {
      if (!b.title) return Promise.reject(new Error("Add the song's title"));
      const yt = (b.youtube.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/) || [])[1] || "";
      const f = { month: b.month, title: b.title, writers: b.writers, copyright: b.copyright, youtube: yt, youtubeUrl: b.youtube, lyricsLink: b.lyricsLink, lyricsOk: !!b.lyricsOk, lyrics: b.lyricsOk ? b.lyrics : "", lyricsDraft: b.lyrics, note: b.note };
      if (b.id) Object.assign(S.songs.find(x => x.id === b.id), f); else S.songs.unshift(Object.assign({ id: "SG-" + Math.random().toString(36).slice(2, 6) }, f));
    }
    if (b.action === "churchSongRemove") S.songs = S.songs.filter(x => x.id !== b.id);
    if (b.action === "churchAudio") {
      const f = { kind: b.kind, week: b.week, title: b.title || b.kind, description: b.description, scripture: b.scripture || [], themes: b.themes || [], bookId: b.bookId, pages: b.pages };
      if (b.audio) Object.assign(f, { url: b._demoUrl, page: b._demoUrl, seconds: b.audio.seconds });
      if (b.id) Object.assign(S.audio.find(x => x.id === b.id), f); else S.audio.push(Object.assign({ id: "AU-" + Math.random().toString(36).slice(2, 6), posted: "", by: "Ana D." }, f));
      const order = k => S.audioKinds.indexOf(k); S.audio.sort((x, y) => x.week < y.week ? 1 : x.week > y.week ? -1 : order(x.kind) - order(y.kind));
    }
    if (b.action === "churchAudioRemove") S.audio = S.audio.filter(x => x.id !== b.id);
    if (b.action === "churchBook") {
      if (!b.title) return Promise.reject(new Error("Add the book's title"));
      const f = { title: b.title, author: b.author, for: b.for, buy: b.buy, buyLabel: b.buyLabel, started: b.started, finished: b.finished, note: b.note };
      if (b._demoCover) f.cover = b._demoCover;
      if (b.id) Object.assign(S.books.find(x => x.id === b.id), f);
      else { S.books.forEach(x => { if (x.for === b.for && !x.finished) { x.finished = addDaysYmd(b.started, -1); } }); S.books.unshift(Object.assign({ id: "BK-" + Math.random().toString(36).slice(2, 6), cover: "" }, f)); }
      S.books.forEach(x => { x.current = (!x.started || x.started <= today()) && (!x.finished || x.finished >= today()); });
    }
    if (b.action === "churchBookRemove") S.books = S.books.filter(x => x.id !== b.id);
    if (b.action === "churchDay") { const sd = S.sundays.find(x => x.date === b.sunday); const all2 = [sd.main].concat(sd.bringing).filter(Boolean);
      Object.assign(sd, { style: b.style, title: b.title, dayNote: b.note }); if (b.style === "Usual") { sd.main = all2.find(x => x.kind === "Main") || null; sd.bringing = all2.filter(x => x !== sd.main); } else { sd.main = null; sd.bringing = all2; } }
    if (b.action === "churchSong" || b.action === "churchSongRemove") { S.songs.sort((a, c) => a.month < c.month ? 1 : -1); S.song = S.songs.find(x => x.month <= today().slice(0, 7)) || null; }
    if (b.action === "churchEvent") {
      if (!b.title) return Promise.reject(new Error("Please add an event name"));
      if (!b.date) return Promise.reject(new Error("Please pick a date"));
      S.events.push({ id: "EV-" + Math.random().toString(36).slice(2, 6), title: b.title, next: b.date, date: b.date, until: b.until, repeats: { weekly: "Weekly", biweekly: "Every other week" }[b.repeat] || "", start: b.startTime, end: b.endTime, allDay: b.allDay, location: b.location, description: b.description, link: b.link, public: b.public });
      S.events.sort((a, c) => a.next.localeCompare(c.next)); S.posted = { ok: true, status: "published" };
    }
    return Promise.resolve(JSON.parse(JSON.stringify(S)));
  }
})();
