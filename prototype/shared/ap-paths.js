/**
 * Resolve Setup app paths under GitHub Pages (/…/prototype/…) and local servers.
 */
(function () {
  function prototypePrefix() {
    var match = location.pathname.match(/^(.*?\/prototype)(?:\/|$)/);
    return match ? match[1] : "";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rewriteNav);
  } else {
    rewriteNav();
  }
})();
