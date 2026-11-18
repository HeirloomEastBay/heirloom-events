/* Heirloom Activities — the menu, the same on every page.
   Top right: Home, My events, Volunteer portal, Church family, Admin panel (or Resident panel), Profile, for the
   people who have them. On phones, signed-in people get a tab bar along the bottom instead, set by role:
     Admins:     Admin · Home · Calendar · Guest rooms · More
     Residents:  Home · Calendar · Guest rooms · Church · More
     Volunteers: Home · Calendar · Shifts · (Church) · More
     Everyone else: Home · Calendar · My events · (Church) · More
   "More" opens everything else. Pages tell it who's signed in with HLNav.setRoles(). */
(function () {
  const nav = document.querySelector(".site-header .nav");
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  let session = read("heirloom-session"), roles = read("heirloom-roles");
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const qs = new URLSearchParams(location.search);
  const embedded = qs.has("embed") || (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bed: '<path d="M3 18.5V7M3 14h18v4.5M21 14v-2.5a3 3 0 0 0-3-3h-7V14"/><circle cx="7" cy="11" r="2"/>',
    church: '<path d="M12 3v5M9.5 5.5h5M5 21V12l7-4 7 4v9"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
    hands: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10V6a1.5 1.5 0 0 1 3 0v6"/><path d="M16 12V9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.6 14.8a1.5 1.5 0 0 1 2.4-1.8L7 14"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    admin: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
  };

  function links(r) {
    return [["home.html", "Home"], ["mine.html?mine=1", "My events", "Events"], (r.volunteer || r.admin || r.resident) && ["portal.html", "Volunteer portal", "Volunteer"],
      (r.church || r.resident || r.admin) && ["church.html", "Church family", "Church"], r.sabbath && !/^Not /.test(r.sabbath) && ["sabbath.html", "Sabbath 365", "Sabbath"],
      r.residency && !r.resident && !/^Not /.test(r.residency) && ["residency.html", "Living at Heirloom", "Residency"],
      r.admin ? ["admin.html", "Admin panel", "Admin"] : r.resident && ["admin.html", "Resident panel", "Panel"], ["profile.html", "Profile"]].filter(Boolean);
  }
  function tabsFor(r) {
    const T = { admin: ["admin.html", "Admin", "admin"], home: ["home.html", "Home", "home"], cal: ["index.html", "Calendar", "cal"], stays: ["stays.html", "Guest rooms", "bed"],
      church: ["church.html", "Church", "church"], shifts: ["portal.html", "Shifts", "hands"], mine: ["mine.html?mine=1", "My events", "list"] };
    if (r.admin) return [T.admin, T.home, T.cal, T.stays];
    if (r.resident) return [T.home, T.cal, T.stays, T.church];
    if (r.volunteer) return [T.home, T.cal, T.shifts].concat(r.church ? [T.church] : []);
    return [T.home, T.cal, T.mine].concat(r.church ? [T.church] : []);
  }

  function signOut(e) {
    if (e) e.preventDefault();
    ["heirloom-session", "heirloom-roles", "heirloom-me", "heirloom-welcomed", "heirloom-home-v1"].forEach(k => { try { localStorage.removeItem(k); } catch (x) { /* fine */ } });
    try { sessionStorage.removeItem("heirloom-checked"); } catch (x) { /* fine */ }
    location.href = "index.html";
  }

  function draw() {
    const signed = !!(session && session.token);
    const r = signed && roles && roles.email === session.email ? roles : {};
    if (nav) {
      const L = signed ? links(r) : [["mine.html", "Log in"]];
      nav.innerHTML = L.map(([href, label, short]) => {
        const on = here === href.split("?")[0];
        const text = short ? `<span class="l-long">${label}</span><span class="l-short">${short}</span>` : label;
        return `<a class="nav-link${on ? " on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}${short ? ` aria-label="${label}"` : ""}>${text}</a>`;
      }).join("") + (signed ? `<a class="nav-link" id="navOut" href="index.html">Sign out</a>` : "")
        + `<a class="btn btn-outline btn-sm nav-cal" href="index.html">See the calendar</a>`;
      const out = document.getElementById("navOut"); if (out) out.onclick = signOut;
    }
    tabBar(signed, r);
  }

  /* ---------- Bottom tab bar (phones, signed in) ---------- */
  function tabBar(signed, r) {
    let bar = document.getElementById("hlTabs");
    if (!signed || embedded) { if (bar) bar.remove(); document.body.classList.remove("has-tabs"); return; }
    if (!bar) { bar = document.createElement("nav"); bar.id = "hlTabs"; bar.className = "tabbar"; bar.setAttribute("aria-label", "App"); document.body.appendChild(bar); }
    document.body.classList.add("has-tabs");
    const tabs = tabsFor(r), inTabs = tabs.map(t => t[0].split("?")[0]);
    const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
    const rest = links(r).filter(([href]) => inTabs.indexOf(href.split("?")[0]) === -1);
    const moreOn = rest.some(([href]) => here === href.split("?")[0]);
    bar.innerHTML = tabs.map(([href, label, ic]) => { const on = here === href.split("?")[0]; return `<a href="${href}"${on ? ' class="on" aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></a>`; }).join("")
      + `<button type="button" id="tabMore"${moreOn ? ' class="on"' : ""} aria-haspopup="dialog">${icon("more")}<span>More</span></button>`;
    bar.querySelector("#tabMore").onclick = () => moreSheet(rest);
  }
  function moreSheet(rest) {
    let d = document.getElementById("hlMore");
    if (!d) { d = document.createElement("dialog"); d.id = "hlMore"; d.className = "more-sheet"; document.body.appendChild(d); d.addEventListener("click", e => { if (e.target === d) d.close(); }); }
    const items = [["submit.html", "＋ Submit an event"]].concat(rest.map(([h, l]) => [h, l]));
    d.innerHTML = `<div class="ms-in"><div class="ms-h"><b>More</b><button type="button" class="ms-x" aria-label="Close">×</button></div>
      ${items.map(([h, l]) => `<a href="${h}"${here === h.split("?")[0] ? ' aria-current="page"' : ""}>${l}</a>`).join("")}<a href="index.html" id="msOut" class="ms-out">Sign out</a></div>`;
    d.querySelector(".ms-x").onclick = () => d.close();
    d.querySelector("#msOut").onclick = signOut;
    d.showModal();
  }

  if (document.body) draw(); else document.addEventListener("DOMContentLoaded", draw);

  window.HLNav = {
    setRoles(o) {
      session = read("heirloom-session");
      roles = Object.assign({}, roles && session && roles.email === session.email ? roles : {}, o, { email: o.email || (session && session.email) });
      try { localStorage.setItem("heirloom-roles", JSON.stringify(roles)); } catch (e) { /* fine */ }
      draw();
    },
    signedOut() {
      session = null; roles = null;
      try { localStorage.removeItem("heirloom-roles"); } catch (e) { /* fine */ }
      draw();
    }
  };
})();
