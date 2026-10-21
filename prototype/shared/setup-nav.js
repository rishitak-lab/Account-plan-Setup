/**
 * Shared Setup nav helpers for non-versioned pages (Agents, Templates).
 * Returns to live Workflow Setup landing (version switcher lives only there).
 */
(function () {
  function setupHref() {
    if (typeof window.APAppHref === "function") return window.APAppHref("landing");
    if (typeof window.APSetupHref === "function") return window.APSetupHref();
    var match = location.pathname.match(/^(.*?\/prototype)(?:\/|$)/);
    if (match) return match[1] + "/landing/index.html";
    if (location.hostname.indexOf("github.io") !== -1) {
      return "/Account-plan-Setup/prototype/landing/index.html";
    }
    return "/landing/index.html";
  }

  function rewrite() {
    document.querySelectorAll("[data-ap-setup-link]").forEach(function (link) {
      link.setAttribute("href", setupHref());
    });
    if (typeof window.APRewriteNav === "function") window.APRewriteNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rewrite);
  } else {
    rewrite();
  }
})();
