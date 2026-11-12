(function () {
  if (window.__heirloomEmbeds) return; window.__heirloomEmbeds = 1;
  var ORIGIN = "https://heirloomeastbay.github.io";
  function frames() { return [].slice.call(document.querySelectorAll('iframe[src^="' + ORIGIN + '"]')); }
  function hello(f) { try { f.contentWindow.postMessage({ heirloomHello: 1 }, "*"); } catch (e) {} }
  function watch(f) {
    if (f.__hl) return; f.__hl = 1;
    f.setAttribute("scrolling", "no"); f.style.overflow = "hidden";
    f.addEventListener("load", function () { hello(f); });
    hello(f);
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data) return;
    var f = frames().filter(function (x) { return x.contentWindow === e.source; })[0];
    if (!f) return;
    if (e.data.heirloomHeight) { f.style.height = e.data.heirloomHeight + "px"; f.contentWindow.postMessage({ heirloomAck: 1 }, "*"); }
    if (e.data.heirloomScrollTo != null) { var y = f.getBoundingClientRect().top + window.pageYOffset + Number(e.data.heirloomScrollTo) - 80; window.scrollTo({ top: Math.max(0, y), behavior: "smooth" }); }
  });
  frames().forEach(watch);
  new MutationObserver(function () { frames().forEach(watch); }).observe(document.documentElement, { childList: true, subtree: true });
})();
