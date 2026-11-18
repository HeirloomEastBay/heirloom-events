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
      <div class="acts"><button class="btn btn-outline btn-sm" data-bring="${i}" data-kind="Side">I'm bringing something</button>${note ? `<a class="note-link" href="#note-${esc(note.id)}" data-open="${esc(note.id)}">📝 Note for this Sunday</a>` : ""}</div>
    </article>`;
  }
  function render() {
    const need = data.sundays.filter(s => !s.main).length, n = data.sundays.length;
    const uniq = a => a.filter((t, i) => t && a.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i).sort((a, b) => a.localeCompare(b));
    const themes = uniq(data.notes.flatMap(x => x.themes || [])), books = uniq(data.notes.flatMap(x => (x.scripture || []).map(bookOf)));
    app.innerHTML = `
      <div class="need-bar${need ? "" : " done"}" role="status">${need
        ? `<b>${need}</b><span>of the next ${n} Sundays still ${need === 1 ? "needs" : "need"} a main dish. ${need ? `<a href="#sun-${data.sundays.find(s => !s.main).date}">See which</a>` : ""}</span>`
        : `<span>✓ Every one of the next ${n} Sundays has a main dish. Thank you!</span>`}</div>

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
        <div class="suns">${data.sundays.map(sunHtml).join("")}</div>
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
    const mainFree = !s.main || (existing && existing.kind === "Main");
    const kinds = (mainFree ? ["Main"] : []).concat(["Side", "Dessert", "Other"]);
    if (!kinds.includes(kind)) kind = "Side";
    const label = { Main: "The main dish", Side: "A side", Dessert: "A dessert", Other: "Something else" };
    openDlg(`<h2>${esc(longDay(s.date))}</h2>
      <p>${existing ? "Change what you're bringing." : mainFree ? "The main dish is the one we need most. Sides, desserts and anything else are welcome too." : `${esc(s.main.name)} is making the main${s.main.what ? " (" + esc(s.main.what) + ")" : ""}. What would you like to add?`}</p>
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
        sundays: suns.map((day, i) => ({ date: day, main: i === 0 ? { id: "D-1", kind: "Main", what: "Veggie lasagna", name: "Riss K.", mine: false } : i === 2 ? { id: "D-4", kind: "Main", what: "", name: "Ana D.", mine: true } : null,
          bringing: i === 0 ? [{ id: "D-2", kind: "Side", what: "Green salad", name: "Lisa S.", mine: false }, { id: "D-3", kind: "Dessert", what: "Apple crisp", name: "Ana D.", mine: true }] : [] })) };
    }
    demoState.events.sort((a, c) => a.next.localeCompare(c.next));
    const S = demoState, all = () => S.sundays.flatMap(s => [s.main].concat(s.bringing).filter(Boolean));
    if (b.action === "churchBring") {
      const s = S.sundays.find(x => x.date === b.sunday);
      if (b.id) { const k = all().find(x => x.id === b.id); S.sundays.forEach(x => { if (x.main === k) x.main = null; x.bringing = x.bringing.filter(y => y !== k); }); k.kind = b.kind; k.what = b.what; if (b.kind === "Main") s.main = k; else s.bringing.push(k); }
      else { const k = { id: "D-" + Math.random().toString(36).slice(2, 7), kind: b.kind, what: b.what, name: "Ana D.", mine: true }; if (b.kind === "Main") s.main = k; else s.bringing.push(k); }
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
