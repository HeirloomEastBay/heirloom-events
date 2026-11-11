/* Heirloom Activities — the top-right menu, the same on every page.
   Signed out: Log in. Signed in: My events, plus Volunteer portal and Admin panel
   for the people who have them. Pages tell it who's signed in with HLNav.setRoles(). */
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
      ? [["mine.html?mine=1", "My events"], (r.volunteer || r.admin) && ["portal.html", "Volunteer portal"], r.admin && ["admin.html", "Admin panel"]].filter(Boolean)
      : [["mine.html", "Log in"]];
    nav.innerHTML = links.map(([href, label]) => {
      const on = here === href.split("?")[0];
      return `<a class="nav-link${on ? " on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
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
