/* Heirloom Activities — the top-right menu, the same on every page.
   Signed out: Log in. Signed in: My events, Volunteer portal, Church family, Admin panel (or
   Resident panel, for residents) for the people who have them, and Profile. Pages tell it who's signed in with HLNav.setRoles(). */
(function () {
  const nav = document.querySelector(".site-header .nav");
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  let session = read("heirloom-session"), roles = read("heirloom-roles");
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function draw() {
    if (!nav) return;
    const signed = !!(session && session.token);
    const r = signed && roles && roles.email === session.email ? roles : {};
    const links = signed
      ? [["mine.html?mine=1", "My events", "Events"], (r.volunteer || r.admin) && ["portal.html", "Volunteer portal", "Volunteer"], (r.church || r.resident) && ["church.html", "Church family", "Church"], r.admin ? ["admin.html", "Admin panel", "Admin"] : r.resident && ["admin.html", "Resident panel", "Panel"], ["profile.html", "Profile"]].filter(Boolean)
      : [["mine.html", "Log in"]];
    nav.innerHTML = links.map(([href, label, short]) => {
      const on = here === href.split("?")[0];
      const text = short ? `<span class="l-long">${label}</span><span class="l-short">${short}</span>` : label;
      return `<a class="nav-link${on ? " on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}${short ? ` aria-label="${label}"` : ""}>${text}</a>`;
    }).join("") + (signed ? `<a class="nav-link" id="navOut" href="index.html">Sign out</a>` : "")
      + `<a class="btn btn-outline btn-sm nav-cal" href="index.html">See the calendar</a>`;
    const out = document.getElementById("navOut");
    if (out) out.onclick = e => {
      e.preventDefault();
      ["heirloom-session", "heirloom-roles", "heirloom-me", "heirloom-welcomed"].forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* fine */ } });
      try { sessionStorage.removeItem("heirloom-checked"); } catch (e) { /* fine */ }
      location.href = "index.html";
    };
  }
  draw();

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
