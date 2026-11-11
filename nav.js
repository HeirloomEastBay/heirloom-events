/* Heirloom Activities — the top-right menu, the same on every page.
   Signed out: Log in. Signed in: My events, Volunteer portal and Admin panel
   (for the people who have them), and Profile. Pages tell it who's signed in with HLNav.setRoles(). */
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
      ? [["mine.html?mine=1", "My events", "Events"], (r.volunteer || r.admin) && ["portal.html", "Volunteer portal", "Volunteer"], r.admin && ["admin.html", "Admin panel", "Admin"], ["profile.html", "Profile"]].filter(Boolean)
      : [["mine.html", "Log in"]];
    nav.innerHTML = links.map(([href, label, short]) => {
      const on = here === href.split("?")[0];
      const text = short ? `<span class="l-long">${label}</span><span class="l-short">${short}</span>` : label;
      return `<a class="nav-link${on ? " on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}${short ? ` aria-label="${label}"` : ""}>${text}</a>`;
    }).join("") + `<a class="btn btn-outline btn-sm nav-cal" href="index.html">See the calendar</a>`;
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
