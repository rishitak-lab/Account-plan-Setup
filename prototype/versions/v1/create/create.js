const ICON = "../../../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const DOCTYPE = "../../../node_modules/@salesforce-ux/design-system/assets/icons/doctype-sprite/svg/symbols.svg";
const LANDING = "../landing/index.html";

const status = document.getElementById("create-status");
const contextList = document.getElementById("context-list");
const nameInput = document.getElementById("workflow-name");
const processInput = document.getElementById("workflow-process");
const nameError = document.getElementById("name-error");
const processError = document.getElementById("process-error");
const linkInput = document.getElementById("context-link");
const linkAdd = document.getElementById("context-link-add");
const linkField = document.getElementById("link-field");
const linkError = document.getElementById("link-error");

let contextItems = [];
let checkingLink = false;
let openedId = null;

try {
  const saved = JSON.parse(sessionStorage.getItem("ap-create-draft") || "{}");
  if (saved && saved.fromInventory) {
    openedId = saved.id || null;
    if (saved.name) nameInput.value = saved.name;
    if (saved.process || saved.description) processInput.value = saved.process || saved.description;
    if (saved.industry) document.getElementById("workflow-industry").value = saved.industry;
  }
  if (saved && Array.isArray(saved.files)) {
    saved.files.forEach((name, index) => {
      if (!name) return;
      contextItems.push({
        id: "draft-file-" + index,
        kind: "file",
        name: String(name),
        meta: "Attached",
        example: false
      });
    });
  }
  if (saved && Array.isArray(saved.links)) {
    saved.links.forEach((url, index) => {
      if (!url) return;
      contextItems.push({
        id: "draft-link-" + index,
        kind: "link",
        url: String(url),
        meta: "Accessible"
      });
    });
  }
} catch (error) {
  /* keep empty form */
}

function draft() {
  return {
    id: openedId || "draft-" + Date.now(),
    name: nameInput.value.trim() || "Untitled workflow",
    industry: document.getElementById("workflow-industry").value,
    description: processInput.value.trim().split("\n")[0],
    process: processInput.value.trim(),
    files: contextItems.filter((item) => item.kind === "file").map((item) => item.name),
    links: contextItems.filter((item) => item.kind === "link").map((item) => item.url)
  };
}

function persist(item) {
  sessionStorage.setItem("ap-create-draft", JSON.stringify(item));
}

function goLanding(saved) {
  window.location.href = saved ? LANDING + "?saved=1" : LANDING;
}

function announce(message) {
  status.textContent = message;
}

function setError(input, help, invalid) {
  const field = input.closest(".slds-form-element");
  field.classList.toggle("slds-has-error", invalid);
  help.classList.toggle("slds-hide", !invalid);
  input.setAttribute("aria-invalid", invalid ? "true" : "false");
}

function valid() {
  const nameOk = Boolean(nameInput.value.trim());
  const processOk = Boolean(processInput.value.trim());
  setError(nameInput, nameError, !nameOk);
  setError(processInput, processError, !processOk);
  if (!nameOk) nameInput.focus();
  else if (!processOk) processInput.focus();
  return nameOk && processOk;
}

function setLinkMessage(message, isError) {
  linkField.classList.toggle("slds-has-error", Boolean(isError && message));
  linkError.textContent = message || "";
  linkError.classList.toggle("slds-hide", !message);
  linkInput.setAttribute("aria-invalid", isError ? "true" : "false");
}

function parseLink(value) {
  let raw = value.trim();
  if (!raw) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) raw = "https://" + raw;
  try {
    return new URL(raw);
  } catch (error) {
    return null;
  }
}

function hasAccess(url) {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return host !== "localhost" && !host.endsWith(".internal") && !host.includes("blocked");
}

function fileIcon(name) {
  if (/\.docx?$/i.test(name)) return "word";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.xlsx?$/i.test(name)) return "excel";
  if (/\.pptx?$/i.test(name)) return "ppt";
  if (/\.(png|jpe?g|gif|webp)$/i.test(name)) return "image";
  if (/\.csv$/i.test(name)) return "csv";
  if (/\.txt$/i.test(name)) return "txt";
  return "attachment";
}

function renderContext() {
  contextList.replaceChildren();
  contextList.hidden = contextItems.length === 0;
  contextItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = "ap-create__thumb";
    const isLink = item.kind === "link";
    const title = isLink ? item.url : item.name;
    const glyph = isLink ? "link" : fileIcon(item.name);
    const tile = item.preview
      ? '<img src="' + item.preview + '" alt="" />'
      : '<span class="slds-icon_container ' +
        (isLink ? "slds-icon-utility-link" : "slds-icon-doctype-" + glyph) +
        '"><svg class="slds-icon slds-icon_large' +
        (isLink ? " slds-icon-text-default" : "") +
        '" aria-hidden="true"><use href="' +
        (isLink ? ICON + "#link" : DOCTYPE + "#" + glyph) +
        '"></use></svg></span>';
    li.innerHTML =
      '<div class="ap-create__thumb-tile">' +
      tile +
      '<span class="ap-create__thumb-ok" title="Added">' +
      '<svg class="slds-icon slds-icon_xx-small" aria-hidden="true"><use href="' +
      ICON +
      '#success"></use></svg></span></div><p class="ap-create__thumb-name" title="' +
      title.replace(/"/g, "&quot;") +
      '">' +
      title +
      '</p><p class="ap-create__thumb-meta">' +
      item.meta +
      "</p>";
    if (item.example) {
      const badge = document.createElement("span");
      badge.className = "slds-badge ap-create__thumb-example";
      badge.textContent = "Example";
      li.append(badge);
    }
    const remove = document.createElement("button");
    remove.className = "slds-button slds-button_icon slds-button_icon-border-filled ap-create__thumb-remove";
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + title);
    remove.innerHTML =
      '<svg class="slds-button__icon slds-button__icon_small" aria-hidden="true"><use href="' +
      ICON +
      '#close"></use></svg>';
    remove.addEventListener("click", () => {
      if (item.preview) URL.revokeObjectURL(item.preview);
      contextItems = contextItems.filter((entry) => entry.id !== item.id);
      renderContext();
    });
    li.querySelector(".ap-create__thumb-tile").append(remove);
    contextList.append(li);
  });
}

function addFiles(files) {
  [...files].forEach((file) => {
    const item = {
      id: "file-" + file.name + Date.now(),
      kind: "file",
      name: file.name,
      meta: Math.max(1, Math.round(file.size / 1024)) + " KB",
      example: false
    };
    if (file.type && file.type.startsWith("image/")) item.preview = URL.createObjectURL(file);
    contextItems.push(item);
  });
  renderContext();
}

function addLink() {
  if (checkingLink) return;
  const url = parseLink(linkInput.value);
  if (!url) {
    setLinkMessage("Enter a valid link.", true);
    linkInput.focus();
    return;
  }
  if (contextItems.some((item) => item.kind === "link" && item.url === url.href)) {
    setLinkMessage("This link is already added.", true);
    linkInput.focus();
    return;
  }
  checkingLink = true;
  linkAdd.disabled = true;
  setLinkMessage("Checking access…", false);
  window.setTimeout(() => {
    checkingLink = false;
    linkAdd.disabled = false;
    if (!hasAccess(url)) {
      setLinkMessage("You don't have access to this link.", true);
      linkInput.focus();
      return;
    }
    setLinkMessage("", false);
    contextItems.push({
      id: "link-" + Date.now(),
      kind: "link",
      url: url.href,
      meta: "Accessible"
    });
    linkInput.value = "";
    renderContext();
    linkInput.focus();
  }, 350);
}

document.getElementById("create-save").addEventListener("click", () => {
  persist(draft());
  goLanding(true);
});

document.getElementById("create-next").addEventListener("click", () => {
  if (!valid()) {
    announce("Complete the required fields before generating.");
    return;
  }
  persist(draft());
  window.location.href = "../generate/index.html";
});

document.getElementById("file-input").addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

const dropzone = document.getElementById("file-dropzone");
["dragenter", "dragover"].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("ap-create__dropzone-active");
  });
});
["dragleave", "drop"].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove("ap-create__dropzone-active");
  });
});
dropzone.addEventListener("drop", (event) => {
  if (event.dataTransfer && event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
});

linkAdd.addEventListener("click", addLink);
linkInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addLink();
  }
});

renderContext();
