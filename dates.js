/* Heirloom Activities — "Dates": change or cancel one date of a repeating event.
   Used on the Admin page and on My events: HLDates.open(eventId, { onChange }) */
(function () {
  const C = window.HEIRLOOM;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEMO = !C.API_URL;
  const t12 = hhmm => { if (!hhmm) return ""; const [h, m] = hhmm.split(":").map(Number); return ((h % 12) || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm"); };
  let dlg, box, data, opts = {}, who = {};

  function token() { try { return (JSON.parse(localStorage.getItem("heirloom-session") || "null") || {}).token; } catch (e) { return ""; } }
  async function call(body) {
    if (DEMO) return demo(body);
    const res = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token: token() }, who, body)) });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || "Something went wrong");
    return r;
  }
  function ensure() {
    if (dlg) return;
    dlg = document.createElement("dialog"); dlg.className = "dates-dlg";
    dlg.innerHTML = `<div class="dd-in"></div>`;
    document.body.appendChild(dlg);
    box = dlg.firstElementChild;
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { if (opts.changed && opts.onChange) opts.onChange(); opts.changed = false; });
  }
  // id: a form event's ID, or { cal: "public" | "residents", eventId } for one added in Google Calendar
  async function open(id, o) {
    ensure(); opts = Object.assign({}, o || {}, { changed: false });
    who = typeof id === "object" ? { cal: id.cal, eventId: id.eventId } : { id };
    box.innerHTML = `<p class="dd-load">Loading dates…</p>`;
    dlg.showModal();
    try { data = await call({ action: "datesGet" }); list(); }
    catch (err) { box.innerHTML = `<h2>Dates</h2><p class="dd-err">${esc(err.message)}.</p><div class="dd-btns"><button class="btn btn-outline btn-sm" data-close>Close</button></div>`; wireClose(); }
  }
  function wireClose() { box.querySelectorAll("[data-close]").forEach(b => b.onclick = () => dlg.close()); }
  const usual = () => data.allDay ? "All day" : t12(data.start) + (data.end ? "–" + t12(data.end) : "");

  function list(msg) {
    box.innerHTML = `<div class="dd-head"><div><h2>${esc(data.title)}</h2><p>${esc(data.repeat)} · usually ${esc(usual())}${data.location ? " · " + esc(data.location) : ""}</p></div>
        <button type="button" class="dd-x" data-close aria-label="Close">×</button></div>
      <p class="dd-hint">Move, change or cancel just one date. Everything else about the event stays the same. To change every date, use Edit${data.fromCalendar ? " (or Google Calendar)" : ""}.</p>
      ${msg ? `<p class="dd-ok" role="status">${esc(msg)}</p>` : ""}
      <ul class="dd-list">${data.dates.map((d, i) => `<li class="${d.cancelled ? "off" : d.changed ? "chg" : ""}">
        <div class="dd-date"><b>${d.newDate && !d.cancelled ? `<s>${esc(d.when)}</s> → ${esc(d.newWhen)}` : esc(d.when)}</b>
          <span>${d.cancelled ? "Cancelled" : esc(d.start ? t12(d.start) + (d.end ? "–" + t12(d.end) : "") : usual())}${!d.cancelled && d.location ? " · " + esc(d.location) : ""}${d.going ? ` · ${d.going} going` : ""}</span>
          ${!d.cancelled && d.note ? `<span class="dd-note">“${esc(d.note)}”</span>` : ""}</div>
        <div class="dd-acts">${d.cancelled ? `<button type="button" class="btn btn-outline btn-sm" data-reset="${i}">Bring it back</button>`
          : `<button type="button" class="btn btn-forest btn-sm" data-edit="${i}">Change</button>${d.changed ? `<button type="button" class="dd-link" data-reset="${i}">Back to normal</button>` : ""}<button type="button" class="dd-link" data-cancel="${i}">Cancel this date</button>`}</div>
      </li>`).join("") || `<li><div class="dd-date">No upcoming dates.</div></li>`}</ul>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" data-close>Done</button></div>`;
    wireClose();
    box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => edit(data.dates[+b.dataset.edit]));
    box.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => cancel(data.dates[+b.dataset.cancel]));
    box.querySelectorAll("[data-reset]").forEach(b => b.onclick = async () => {
      const d = data.dates[+b.dataset.reset];
      b.disabled = true; b.innerHTML = `<span class="spinner"></span>`;
      try { data = await call({ action: "dateReset", date: d.date }); opts.changed = true; list(data.message || "Done."); }
      catch (err) { b.disabled = false; b.textContent = "Try again"; alertErr(err); }
    });
  }
  function alertErr(err) {
    let el = box.querySelector(".dd-err"); if (!el) { el = document.createElement("p"); el.className = "dd-err"; box.querySelector(".dd-btns").before(el); }
    el.textContent = err.message + ".";
  }
  const guestsBit = d => d.going ? `<label class="dd-chk"><input type="checkbox" id="ddNotify" checked> Email the ${d.going} ${d.going === 1 ? "person" : "people"} who RSVP'd for this date</label>
      <label class="dd-f">Message to them <span class="opt">(optional)</span><textarea id="ddMsg" maxlength="1000" placeholder="So sorry for the change!"></textarea></label>` : "";

  function cancel(d) {
    box.innerHTML = `<h2>Cancel ${esc(d.newDate ? d.newWhen : d.when)}?</h2>
      <p>Just this one date of <b>${esc(data.title)}</b> comes off the calendar. The other dates stay.</p>
      ${guestsBit(d)}
      <div class="dd-btns"><button class="btn btn-outline btn-sm" id="ddBack">Never mind</button><button class="btn btn-primary btn-sm" id="ddGo">Cancel this date</button></div>`;
    box.querySelector("#ddBack").onclick = () => list();
    box.querySelector("#ddGo").onclick = async e => {
      const b = e.currentTarget, n = box.querySelector("#ddNotify"), m = box.querySelector("#ddMsg");
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Cancelling…`;
      try { data = await call({ action: "dateSave", date: d.date, cancel: true, notify: n ? n.checked : false, message: m ? m.value : "" }); opts.changed = true;
        list(`${d.when} is cancelled.${data.told ? ` We emailed ${data.told} ${data.told === 1 ? "person" : "people"}.` : ""}`); }
      catch (err) { b.disabled = false; b.textContent = "Cancel this date"; alertErr(err); }
    };
  }

  function edit(d) {
    let imageData = null, image = d.image;
    box.innerHTML = `<h2>Change ${esc(d.when)}</h2>
      <p>Only this date changes. Leave anything as it is to keep the usual. To move it, pick a different day.</p>
      <form id="ddForm" novalidate>
        <label class="dd-f">Day<input type="date" id="ddDay" value="${esc(d.newDate || d.date)}" min="${esc(new Date().toISOString().slice(0, 10))}"></label>
        ${data.allDay ? "" : `<div class="dd-two"><label class="dd-f">Starts<input type="time" id="ddStart" value="${esc(d.start || data.start)}"></label>
          <label class="dd-f">Ends<input type="time" id="ddEnd" value="${esc(d.start ? d.end : data.end)}"></label></div>`}
        <label class="dd-f">Where<input id="ddLoc" maxlength="200" list="ddLocs" value="${esc(d.location || data.location)}" placeholder="Pick a spot or type a place">
          <datalist id="ddLocs">${(data.locations || []).map(l => `<option value="${esc(l)}">`).join("")}</datalist></label>
        <label class="dd-f">Note for this date <span class="opt">(shows on the calendar)</span><input id="ddNote" maxlength="300" value="${esc(d.note)}" placeholder="Moved to the barn, rain!"></label>
        <div class="dd-f"><span>Photo for this date <span class="opt">(optional)</span></span>
          <div class="dd-photo"><img id="ddImg" src="${esc(image || data.image || "images/farmhouse.jpg")}" alt="">
            <div><label class="btn btn-outline btn-sm dd-file">Choose a photo<input type="file" id="ddFile" accept="image/*" hidden></label>
            ${image ? `<button type="button" class="dd-link" id="ddUsual">Use the usual photo</button>` : ""}</div></div></div>
        ${guestsBit(d)}
      </form>
      <div class="dd-btns"><button class="btn btn-outline btn-sm" id="ddBack">Back</button><button class="btn btn-forest btn-sm" id="ddGo">Save this date</button></div>`;
    box.querySelector("#ddBack").onclick = () => list();
    box.querySelector("#ddFile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { imageData = await shrink(f); box.querySelector("#ddImg").src = "data:image/jpeg;base64," + imageData; }
      catch (err) { alertErr(new Error("That photo didn't work. Try a JPG or PNG")); }
    };
    const u = box.querySelector("#ddUsual"); if (u) u.onclick = () => { image = ""; imageData = null; box.querySelector("#ddImg").src = data.image || "images/farmhouse.jpg"; u.remove(); };
    box.querySelector("#ddGo").onclick = async e => {
      const b = e.currentTarget, v = id => { const el = box.querySelector(id); return el ? el.value : ""; }, n = box.querySelector("#ddNotify");
      const body = { action: "dateSave", date: d.date, newDate: v("#ddDay") && v("#ddDay") !== d.date ? v("#ddDay") : "", start: v("#ddStart"), end: v("#ddEnd"), location: v("#ddLoc").trim(), note: v("#ddNote").trim(),
        notify: n ? n.checked : false, message: v("#ddMsg") };
      if (imageData) body.imageData = imageData; else if (!image) body.image = "";
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> Saving…`;
      try { data = await call(body); opts.changed = true; list(`${d.when} is ${body.newDate ? "moved" : "updated"}.${data.told ? ` We emailed ${data.told} ${data.told === 1 ? "person" : "people"}.` : ""}`); }
      catch (err) { b.disabled = false; b.textContent = "Save this date"; alertErr(err); }
    };
  }
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .85).split(",")[1]); };
      img.onerror = rej; img.src = url;
    });
  }

  // Preview mode: sample dates
  let demoD = null;
  async function demo(b) {
    await new Promise(r => setTimeout(r, 300));
    if (!demoD) {
      const fri = []; const d = new Date(); for (let i = 0; fri.length < 5 && i < 200; i++) { const x = new Date(Date.now() + i * 86400000); if (x.getDay() === 5 && x.getDate() <= 7) fri.push(x); }
      demoD = { ok: true, id: b.id, title: "First Friday Herd Hang", repeat: "Monthly, first Friday", allDay: false, start: "15:00", end: "17:00", location: "Goat pen", image: "images/goats.jpg",
        locations: ["Farmhouse", "Goat pen", "Barn", "Yurt", "The big lawn"], rsvp: true,
        dates: fri.map((x, i) => ({ date: x.toISOString().slice(0, 10), when: x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), going: [6, 2, 0, 0, 0][i], cancelled: false, changed: false, start: "", end: "", location: "", note: "", image: "" })) };
    }
    const d = demoD.dates.find(x => x.date === b.date);
    if (b.action === "dateSave") {
      if (b.cancel) Object.assign(d, { cancelled: true, changed: true });
      else Object.assign(d, { changed: true, newDate: b.newDate || "", newWhen: b.newDate ? new Date(b.newDate + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "", start: b.start !== demoD.start || b.end !== demoD.end ? b.start : "", end: b.start !== demoD.start || b.end !== demoD.end ? b.end : "",
        location: b.location !== demoD.location ? b.location : "", note: b.note, image: b.imageData ? "images/farmhouse.jpg" : b.image === "" ? "" : d.image });
      return Object.assign({}, JSON.parse(JSON.stringify(demoD)), { told: b.notify ? d.going : 0 });
    }
    if (b.action === "dateReset") { Object.assign(d, { cancelled: false, changed: false, newDate: "", newWhen: "", start: "", end: "", location: "", note: "", image: "" }); return Object.assign({}, JSON.parse(JSON.stringify(demoD)), { message: "Back to normal." }); }
    return JSON.parse(JSON.stringify(demoD));
  }

  window.HLDates = { open };
})();
