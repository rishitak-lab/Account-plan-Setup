/**
 * Shared Setup nav helpers for non-versioned pages (Agents, Templates).
 * Loads versions.js first when returning to Workflow Setup.
 */
(function () {
  function setupHref() {
    if (typeof window.APSetupHref === "function") return window.APSetupHref();
    return "/landing/index.html";
  }

  document.querySelectorAll("[data-ap-setup-link]").forEach(function (link) {
    link.setAttribute("href", setupHref());
    link.addEventListener("click", function () {
      link.setAttribute("href", setupHref());
    });
  });
})();
