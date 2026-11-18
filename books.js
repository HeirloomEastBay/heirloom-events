/* Heirloom — Books we read together: a public list of the church family's books (now and before).
   Comes from the "Church books" tab through ?action=churchBooks; no sign-in needed. */
(function () {
  const C = window.HEIRLOOM, app = document.getElementById("app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = d => d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" }) : "";
  document.getElementById("footLine").textContent = `${C.ADDRESS} · ${C.EMAIL}`;
  const SAMPLE = [{ title: "Sample Psalms & Proverbs book", author: "An author", for: "Psalms & Proverbs", cover: "", buy: "https://example.com", buyLabel: "Books on Bee", started: "2026-09-01", finished: "", note: "Our book for the Psalm and Proverb of the week.", current: true },
    { title: "Sample kids' story Bible", author: "Another author", for: "Kids Bible stories", cover: "", buy: "", buyLabel: "", started: "2026-11-01", finished: "", note: "", current: true },
    { title: "An earlier kids' book", author: "", for: "Kids Bible stories", cover: "", buy: "", buyLabel: "", started: "2026-09-15", finished: "2026-10-31", note: "", current: false }];
  const card = (b, past) => `<article class="book">${b.cover ? `<img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" loading="lazy">` : `<div class="nocover" aria-hidden="true">📚</div>`}
    <div class="bi"><span class="bfor">${esc(b.for)}</span><h3>${esc(b.title)}</h3>${b.author ? `<p>${esc(b.author)}</p>` : ""}
      ${past ? `<p>${esc(fmt(b.started))}${b.finished ? " – " + esc(fmt(b.finished)) : ""}</p>` : b.note ? `<p>${esc(b.note)}</p>` : ""}
      ${b.buy ? `<p class="bact"><a class="btn btn-${past ? "outline" : "primary"} btn-sm" href="${esc(b.buy)}" target="_blank" rel="noopener">${esc(b.buyLabel ? "Buy at " + b.buyLabel : "Get the book")} ↗</a></p>` : ""}</div></article>`;
  function draw(books) {
    const now = books.filter(b => b.current), past = books.filter(b => !b.current && b.finished);
    app.innerHTML = `<section class="sec"><h2>Reading now</h2>${now.length ? `<div class="books">${now.map(b => card(b)).join("")}</div>` : `<p class="empty-s">We'll post our books here soon.</p>`}</section>
      ${past.length ? `<section class="sec past"><h2>Books we've read</h2><div class="books">${past.map(b => card(b, true)).join("")}</div></section>` : ""}`;
  }
  if (!C.API_URL) { draw(SAMPLE); return; }
  fetch(C.API_URL + "?action=churchBooks").then(r => r.json()).then(d => { if (!d.ok) throw new Error(d.error); draw(d.books || []); })
    .catch(() => { app.innerHTML = `<p class="empty-s">Couldn't load the books right now. Please try again in a moment.</p>`; });
})();
