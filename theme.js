/* Heirloom Activities — Light or dark. Runs in <head> before the page draws, so there's no flash.
   The choice ("light", "dark" or "auto" = match the phone or computer) is kept on this device and on
   the person's profile (Profile → Appearance), so it follows them to other devices after they log in.
   The Squarespace embed always stays light. */
(function () {
  const KEY = "heirloom-theme", mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const embed = /[?&]embed\b/.test(location.search) || (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const get = () => { try { return localStorage.getItem(KEY) || "light"; } catch (e) { return "light"; } };
  function apply() {
    const v = get(), dark = !embed && (v === "dark" || (v === "auto" && mq && mq.matches));
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#16201a" : "#2e4a36";
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
  window.HLTheme = { get, set(v) { try { localStorage.setItem(KEY, /^(light|dark|auto)$/.test(v) ? v : "light"); } catch (e) { /* fine */ } apply(); } };
  document.addEventListener("DOMContentLoaded", apply);
})();
