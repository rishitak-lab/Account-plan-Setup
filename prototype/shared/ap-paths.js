/**
 * Resolve Setup app paths under GitHub Pages (/…/prototype/…) and local servers.
 * Default HTML hrefs may point at the GitHub Pages project path; this rewrites
 * them to the correct prefix for the current host.
 */
(function () {
  var PAGES_PREFIX = "/Account-plan-Setup/prototype";

  function prototypePrefix() {
    var match = location.pathname.match(/^(.*?\/prototype)(?:\/|$)/);
    if (match) return match[1];
    // file:// or unexpected host — prefer Pages prefix so published links still work
    if (location.hostname.indexOf("github.io") !== -1) return PAGES_PREFIX;
    return "";
  }

  function appHref(page) {
    var name = String(page || "").replace(/^\/+|\/+$/g, "");
    var prefix = prototypePrefix();
    if (!prefix) return "/" + name + "/index.html";
    return prefix + "/" + name + "/index.html";
  }

  window.APPrototypePrefix = prototypePrefix;
  window.APAppHref = appHref;

  function rewriteNav() {
    document.querySelectorAll("[data-ap-nav]").forEach(function (link) {
      var page = link.getAttribute("data-ap-nav");
      if (!page) return;
      link.setAttribute("href", appHref(page));
    });
  }

  window.APRewriteNav = rewriteNav;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rewriteNav);
  } else {
    rewriteNav();
  }
})();
