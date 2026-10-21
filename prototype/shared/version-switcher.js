(function () {
  const versions = Array.isArray(window.AP_UI_VERSIONS) ? window.AP_UI_VERSIONS : [];
  if (!versions.length) return;

  const STORAGE_KEY = "ap-ui-version";

  function versionFromPath() {
    const match = location.pathname.match(/\/versions\/(v\d+)(?:\/|$)/);
    if (match) return match[1];
    const live = versions.find(function (item) {
      return item.base === "" || item.base === "/";
    });
    return live ? live.id : versions[versions.length - 1].id;
  }

  function prototypePrefix() {
    if (typeof window.APPrototypePrefix === "function") return window.APPrototypePrefix();
    // GitHub Pages: /Account-plan-Setup/prototype/...
    // Local server from prototype/: /create/... or /landing/...
    const match = location.pathname.match(/^(.*?\/prototype)(?:\/|$)/);
    return match ? match[1] : "";
  }

  function landingHref(version) {
    const base = (version.base || "").replace(/\/$/, "");
    // Versioned landings live under /versions/vN/landing
    if (base) {
      const prefix = prototypePrefix();
      const path = base + "/landing/index.html";
      return prefix ? prefix + path : path;
    }
    if (typeof window.APAppHref === "function") return window.APAppHref("landing");
    const prefix = prototypePrefix();
    return (prefix || "") + "/landing/index.html";
  }

  function remember(id) {
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
      /* ignore */
    }
  }

  function closeMenus() {
    document.querySelectorAll("[data-ap-version]").forEach(function (root) {
      const button = root.querySelector("[data-ap-version-button]");
      const menu = root.querySelector("[data-ap-version-menu]");
      if (button) button.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
      root.classList.remove("slds-is-open");
    });
  }

  function mount(root) {
    const button = root.querySelector("[data-ap-version-button]");
    const label = root.querySelector("[data-ap-version-label]");
    const menu = root.querySelector("[data-ap-version-menu]");
    if (!button || !label || !menu) return;
    const list = menu.querySelector(".slds-dropdown__list") || menu;

    const currentId = versionFromPath();
    const current =
      versions.find(function (item) {
        return item.id === currentId;
      }) || versions[0];
    remember(current.id);
    label.textContent = current.label;
    button.setAttribute("aria-label", "UI version, " + current.label);

    list.innerHTML = "";
    versions.forEach(function (item) {
      const selected = item.id === current.id;
      const option = document.createElement("a");
      option.href = landingHref(item);
      option.title = item.note || item.label;
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", selected ? "true" : "false");
      if (selected) {
        option.className = "slds-is-selected";
        option.setAttribute("aria-current", "true");
      }
      option.innerHTML = '<span class="slds-truncate">' + item.label + "</span>";
      option.addEventListener("click", function (event) {
        remember(item.id);
        if (selected) {
          event.preventDefault();
          closeMenus();
        }
      });
      const li = document.createElement("li");
      li.className = "slds-dropdown__item";
      li.setAttribute("role", "presentation");
      li.appendChild(option);
      list.appendChild(li);
    });

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      const open = button.getAttribute("aria-expanded") === "true";
      closeMenus();
      if (!open) {
        button.setAttribute("aria-expanded", "true");
        menu.hidden = false;
        root.classList.add("slds-is-open");
      }
    });
  }

  document.addEventListener("click", closeMenus);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenus();
  });

  document.querySelectorAll("[data-ap-version]").forEach(mount);

  // Agents / Templates always return to the Setup landing for the last selected version.
  window.APSetupHref = function () {
    var id = null;
    try {
      id = sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      id = null;
    }
    var current =
      versions.find(function (item) {
        return item.id === id;
      }) ||
      versions.find(function (item) {
        return item.base === "" || item.base === "/";
      }) ||
      versions[versions.length - 1];
    return landingHref(current);
  };

  document.querySelectorAll("[data-ap-setup-link]").forEach(function (link) {
    link.setAttribute("href", window.APSetupHref());
    link.addEventListener("click", function () {
      link.setAttribute("href", window.APSetupHref());
    });
  });

  if (typeof window.APAppHref === "function") {
    document.querySelectorAll("[data-ap-nav]").forEach(function (link) {
      var page = link.getAttribute("data-ap-nav");
      if (page) link.setAttribute("href", window.APAppHref(page));
    });
  }
})();
