/* Heirloom Activities — "Add to Home Screen"
   Makes the site installable as an app (icon on the home screen, opens full screen).
   Signed-in people on phones see a one-time prompt; the Profile page always has the option.
   Android / Chrome: a real Install button. iPhone / iPad: Apple doesn't allow a button, so
   we show the two steps (Share, then Add to Home Screen). */
(function () {
  if (window.self !== window.top) return; // not inside the Squarespace embed
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => { /* fine: the site works without it */ });

  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const phone = ios || /Android/i.test(ua) || (window.matchMedia && matchMedia("(max-width: 760px) and (pointer: coarse)").matches);
  const KEY = "heirloom-install-seen";
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  const markSeen = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* fine */ } };
  const signedIn = () => { try { return !!(JSON.parse(localStorage.getItem("heirloom-session") || "null") || {}).token; } catch (e) { return false; } };
  let deferred = null; // Chrome's saved install prompt

  const css = `
  .hl-inst { position: fixed; left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); z-index: 60; margin: 0 auto; max-width: 520px; background: var(--forest-deep, #1c3024); color: #fff; border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,.35); padding: 14px 16px; display: grid; grid-template-columns: 48px 1fr; gap: 6px 12px; align-items: center; }
  .hl-inst img { width: 48px; height: 48px; border-radius: 12px; grid-row: span 2; align-self: start; }
  .hl-inst b { font-size: 16.5px; } .hl-inst p { margin: 0; font-size: 14.5px; color: #dfe6da; line-height: 1.45; grid-column: 2; }
  .hl-inst .row { grid-column: 1 / -1; display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
  .hl-inst button { appearance: none; border: 0; border-radius: 999px; min-height: 42px; padding: 8px 18px; font: inherit; font-weight: 700; font-size: 14.5px; cursor: pointer; }
  .hl-inst .yes { background: var(--wheat, #d8b56f); color: #1c3024; } .hl-inst .no { background: rgba(255,255,255,.14); color: #fff; }
  .hl-inst .ico { display: inline-block; width: 18px; height: 18px; vertical-align: -4px; }`;
  const share = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;

  function show(force) {
    if (standalone() || document.querySelector(".hl-inst")) return false;
    if (!force && (!phone || !signedIn() || seen())) return false;
    if (!deferred && !ios && !force) return false; // nothing we can offer on this browser
    if (!document.getElementById("hl-inst-css")) { const s = document.createElement("style"); s.id = "hl-inst-css"; s.textContent = css; document.head.appendChild(s); }
    const el = document.createElement("div");
    el.className = "hl-inst"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Add Heirloom to your home screen");
    const how = deferred ? `Opens full screen, like an app. No app store needed.`
      : ios ? `Tap ${share} <b>Share</b> at the ${/CriOS|FxiOS/.test(ua) ? "top" : "bottom"} of the screen, then <b>Add to Home Screen</b>.`
      : `Open your browser's menu and choose <b>Install app</b> or <b>Add to Home screen</b>.`;
    el.innerHTML = `<img src="images/app-icon-192.png" alt=""><b>Add Heirloom to your home screen</b><p>${how}</p>
      <div class="row"><button type="button" class="no">${deferred ? "Not now" : "Got it"}</button>${deferred ? `<button type="button" class="yes">Install</button>` : ""}</div>`;
    document.body.appendChild(el);
    el.querySelector(".no").onclick = () => { markSeen(); el.remove(); };
    const yes = el.querySelector(".yes");
    if (yes) yes.onclick = async () => { const d = deferred; deferred = null; el.remove(); markSeen(); try { d.prompt(); await d.userChoice; } catch (e) { /* fine */ } };
    return true;
  }

  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; show(false); refreshButtons(); });
  window.addEventListener("appinstalled", () => { markSeen(); const el = document.querySelector(".hl-inst"); if (el) el.remove(); refreshButtons(); });
  // iPhones never fire that event: show the steps once the page has settled (and after any welcome popup)
  if (ios) setTimeout(() => { if (!document.querySelector("dialog[open]")) show(false); }, 2500);

  // Any button with data-install (the Profile page has one) opens the same prompt, whenever they like
  function refreshButtons() { document.querySelectorAll("[data-install]").forEach(b => { b.hidden = standalone(); b.onclick = () => show(true); }); }
  window.HLInstall = { show: () => show(true), refresh: refreshButtons, installed: standalone };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshButtons); else refreshButtons();
})();
