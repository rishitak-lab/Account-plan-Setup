const STORE = "ap-workflow-templates";
const DRAFT = "ap-create-draft";

function createHref() {
  if (typeof window.APAppHref === "function") return window.APAppHref("create");
  const match = location.pathname.match(/^(.*?\/prototype)(?:\/|$)/);
  if (match) return match[1] + "/create/index.html";
  if (location.hostname.indexOf("github.io") !== -1) {
    return "/Account-plan-Setup/prototype/create/index.html";
  }
  return "../create/index.html";
}

const CANONICAL = [
  {
    id: "gather",
    name: "Gather Inputs",
    descriptor: "Collect account evidence before the plan is assembled",
    startKind: "workflow",
    dependsOn: "",
    customRule: "",
    parallel: true,
    tasks: [
      { id: "g1", name: "Review client history", who: "History Agent", kind: "agent" },
      { id: "g2", name: "Pull financial data", who: "Financials Agent", kind: "agent" },
      { id: "g3", name: "Research market context", who: "Market Research Agent", kind: "agent" }
    ]
  },
  {
    id: "plan",
    name: "Create Plan",
    descriptor: "Draft relationship strategy and objectives from gathered evidence",
    startKind: "previous",
    dependsOn: "gather",
    customRule: "",
    parallel: false,
    tasks: [
      { id: "p1", name: "Draft relationship strategy", who: "Strategy Agent", kind: "agent" },
      { id: "p2", name: "Define Objectives & Measures", who: "Objectives Agent", kind: "agent" }
    ]
  },
  {
    id: "outreach",
    name: "Reach out to Treasury Specialist, Credit Specialist and Industry Specialist",
    descriptor: "Request specialist input, then merge it into the plan",
    startKind: "previous",
    dependsOn: "plan",
    customRule: "",
    parallel: false,
    tasks: [
      {
        id: "o1",
        name: "Gather input from the specialists",
        who: "Outreach Agent",
        kind: "agent"
      },
      {
        id: "o2",
        name: "Synthesize specialist feedback and update the account plan",
        who: "Synthesis Agent",
        kind: "agent"
      }
    ]
  },
  {
    id: "rm",
    name: "Route account plan for Relationship Manager review",
    descriptor: "Person-owned review. No agent writes this step.",
    startKind: "previous",
    dependsOn: "outreach",
    customRule: "",
    parallel: false,
    owner: { who: "Relationship Manager", kind: "person" },
    tasks: []
  }
];

function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree));
}

function gatherStep(ids, descriptor) {
  const step = cloneTree(CANONICAL)[0];
  if (descriptor) step.descriptor = descriptor;
  step.tasks = step.tasks.filter((task) => ids.includes(task.id));
  return step;
}

function planStep(descriptor) {
  const step = cloneTree(CANONICAL)[1];
  if (descriptor) step.descriptor = descriptor;
  return step;
}

function outreachStep(name, descriptor) {
  const step = cloneTree(CANONICAL)[2];
  if (name) step.name = name;
  if (descriptor) step.descriptor = descriptor;
  return step;
}

function personStep(id, name, who, dependsOn, descriptor) {
  return {
    id: id,
    name: name,
    descriptor: descriptor || "Person-owned review. No agent writes this step.",
    startKind: "previous",
    dependsOn: dependsOn,
    customRule: "",
    parallel: false,
    owner: { who: who, kind: "person" },
    tasks: []
  };
}

function rmStep(dependsOn) {
  const step = cloneTree(CANONICAL)[3];
  step.dependsOn = dependsOn;
  return step;
}

const CURRENT_ADMIN = { name: "Priya Mehta", initials: "PM" };
const HIDDEN_STARTERS = "ap-hidden-starters";
const STARTER_OVERRIDES = "ap-starter-overrides";
const YOURS_SEEDED = "ap-yours-seeded";
const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";

function adminPerson(name, initials) {
  return { name: name, initials: initials };
}

function isPlaceholderCreator(who) {
  if (!who || !who.name) return true;
  const name = String(who.name).trim().toLowerCase();
  const initials = String(who.initials || "")
    .trim()
    .toUpperCase();
  return name === "salesforce" || name === "salesforce admin" || initials === "SF" || initials === "SA";
}

const STARTERS = [
  {
    id: "refresh",
    name: "Refresh expiring account plans",
    industry: "Commercial banking",
    origin: "starter",
    creator: adminPerson("Salesforce", "SF"),
    summary: "Full refresh when a plan period is nearing its end.",
    process:
      "Recommended when a plan period is nearing its end.\n\n1. Gather inputs: client history, financials, and market context.\n2. Create the plan: draft relationship strategy and define objectives and measures.\n3. Reach out to Treasury Specialist, Credit Specialist and Industry Specialist, then synthesize their feedback and update the account plan.\n4. Route account plan for Relationship Manager review.",
    blueprint: cloneTree(CANONICAL)
  },
  {
    id: "new-plan",
    name: "New relationship plan",
    industry: "Commercial banking",
    origin: "starter",
    creator: adminPerson("Salesforce", "SF"),
    summary: "First Account Plan after an account is assigned. No prior plan to load.",
    process:
      "First Account Plan after an account is assigned.\n\n1. Gather inputs: client history, financials, and market context. There is no prior plan to load.\n2. Create the plan: draft relationship strategy and define objectives and measures.\n3. Reach out to Treasury Specialist, Credit Specialist and Industry Specialist, then synthesize their feedback and update the account plan.\n4. Route account plan for Relationship Manager review.",
    blueprint: [
      gatherStep(["g1", "g2", "g3"], "Collect account evidence. There is no prior plan to load."),
      planStep(),
      outreachStep(),
      rmStep("outreach")
    ]
  },
  {
    id: "midyear",
    name: "Mid-year plan update",
    industry: "Commercial banking",
    origin: "starter",
    creator: adminPerson("Salesforce", "SF"),
    summary: "Light update during the period. History and financials only.",
    process:
      "Use during the plan period when the relationship does not need a full specialist round.\n\n1. Gather inputs: client history and financials.\n2. Create the plan: update relationship strategy and objectives and measures.\n3. Route account plan for Relationship Manager review.",
    blueprint: [
      gatherStep(["g1", "g2"], "Collect current history and financials."),
      planStep("Update relationship strategy and objectives from the mid-year evidence"),
      rmStep("plan")
    ]
  },
  {
    id: "credit",
    name: "Credit-intensive account plan",
    industry: "Commercial banking",
    origin: "starter",
    creator: adminPerson("Salesforce", "SF"),
    summary: "Adds a Credit Specialist gate before Relationship Manager review.",
    process:
      "For accounts where credit is the main decision.\n\n1. Gather inputs: client history and financials.\n2. Create the plan: draft relationship strategy and objectives and measures.\n3. Route the plan to a Credit Specialist. Named people are resolved when the workflow runs.\n4. Route account plan for Relationship Manager review.",
    blueprint: [
      gatherStep(["g1", "g2"], "Collect credit-relevant evidence before the plan is assembled"),
      planStep(),
      personStep("credit", "Route to Credit Specialist", "Credit Specialist", "plan", "Person-owned credit review. No agent writes this step."),
      rmStep("credit")
    ]
  }
];

const RETIRED_SEED_IDS = ["org-healthcare", "org-technology"];

const YOURS_SEED = [
  {
    id: "org-treasury",
    name: "Treasury and cash-management plan",
    industry: "Commercial banking",
    origin: "org",
    creator: CURRENT_ADMIN,
    summary: "Cash-management focus with a Treasury Specialist gate.",
    process:
      "For relationships where cash management is the priority.\n\n1. Gather inputs: client history and financials.\n2. Create the plan: draft relationship strategy and objectives and measures.\n3. Route the plan to a Treasury Specialist. Named people are resolved when the workflow runs.\n4. Route account plan for Relationship Manager review.",
    blueprint: [
      gatherStep(["g1", "g2"], "Collect history and financials for a cash-management plan"),
      planStep(),
      personStep("treasury", "Route to Treasury Specialist", "Treasury Specialist", "plan", "Person-owned Treasury review. No agent writes this step."),
      rmStep("treasury")
    ]
  },
  {
    id: "org-at-risk",
    name: "At-risk relationship plan",
    industry: "Commercial banking",
    origin: "org",
    creator: CURRENT_ADMIN,
    summary: "Industry input, then a Credit gate, for accounts with risk signals.",
    process:
      "For accounts with risk signals that still need a relationship plan.\n\n1. Gather inputs: client history, financials, and market context.\n2. Create the plan: draft relationship strategy and objectives and measures.\n3. Reach out to Industry Specialist, then synthesize feedback and update the account plan.\n4. Route the plan to a Credit Specialist.\n5. Route account plan for Relationship Manager review.",
    blueprint: [
      gatherStep(["g1", "g2", "g3"], "Collect evidence with emphasis on market and relationship context"),
      planStep(),
      outreachStep("Reach out to Industry Specialist", "Request Industry input, then merge it into the plan"),
      personStep("credit", "Route to Credit Specialist", "Credit Specialist", "outreach", "Person-owned credit review after specialist input."),
      rmStep("credit")
    ]
  }
];

const starterGrid = document.getElementById("starter-grid");
const orgGrid = document.getElementById("org-grid");
const orgEmpty = document.getElementById("org-empty");
const starterSection = document.getElementById("starter-section");
const orgSection = document.getElementById("org-section");
const searchEmpty = document.getElementById("search-empty");
const searchInput = document.getElementById("template-search");
const status = document.getElementById("template-status");
const deleteDialog = document.getElementById("template-delete-dialog");
const deleteBackdrop = document.getElementById("template-delete-backdrop");
const deleteWarning = document.getElementById("template-delete-warning");
const deleteConfirm = document.getElementById("template-delete-confirm");
const deleteNameInput = document.getElementById("template-delete-name");
const deleteNameField = document.getElementById("template-delete-name-field");
const deleteNameHelp = document.getElementById("template-delete-name-help");
const deleteNameTarget = document.getElementById("template-delete-name-target");
const shareDialog = document.getElementById("template-share-dialog");
const shareBackdrop = document.getElementById("template-share-backdrop");
const shareLead = document.getElementById("template-share-lead");
const shareName = document.getElementById("template-share-name");
const shareMessage = document.getElementById("template-share-message");
const shareSend = document.getElementById("template-share-send");
const toast = document.getElementById("template-toast");
const toastTitle = document.getElementById("template-toast-title");
const toastBody = document.getElementById("template-toast-body");

let pendingDelete = null;
let pendingShare = null;
let toastTimer = 0;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseStore(key, fallback) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || JSON.stringify(fallback));
    return value == null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function taskCount(tree) {
  return (tree || []).reduce((n, step) => n + ((step.tasks && step.tasks.length) || 0), 0);
}

function orgTemplates() {
  const saved = parseStore(STORE, []);
  return Array.isArray(saved) ? saved : [];
}

function persistYours(list) {
  sessionStorage.setItem(STORE, JSON.stringify(list));
}

function ensureYoursSeeded() {
  let saved = orgTemplates().filter((item) => !RETIRED_SEED_IDS.includes(item.id));
  if (sessionStorage.getItem(YOURS_SEEDED) !== "1") {
    const ids = new Set(saved.map((item) => item.id));
    const names = new Set(saved.map((item) => item.name));
    YOURS_SEED.forEach((seed) => {
      if (!ids.has(seed.id) && !names.has(seed.name)) saved.push(seed);
    });
    sessionStorage.setItem(YOURS_SEEDED, "1");
  }
  persistYours(saved);
}

function loadStarters() {
  const hidden = new Set(parseStore(HIDDEN_STARTERS, []));
  const overrides = parseStore(STARTER_OVERRIDES, {});
  return STARTERS.filter((item) => !hidden.has(item.id)).map((item) => {
    const over = overrides[item.id] && typeof overrides[item.id] === "object" ? overrides[item.id] : {};
    const merged = Object.assign({}, item, over, {
      id: item.id,
      origin: "starter",
      creator: item.creator
    });
    return merged;
  });
}

function creatorOf(template) {
  if (template.origin === "starter") {
    return template.creator && template.creator.initials
      ? template.creator
      : adminPerson("Salesforce", "SF");
  }
  if (template.creator && template.creator.initials && !isPlaceholderCreator(template.creator)) {
    return template.creator;
  }
  if (template.origin === "org") return CURRENT_ADMIN;
  return template.creator && template.creator.initials ? template.creator : CURRENT_ADMIN;
}

function matches(template, query) {
  if (!query) return true;
  const who = creatorOf(template);
  const hay = [template.name, template.industry, template.summary, who.name].join(" ").toLowerCase();
  return hay.includes(query);
}

function closeAllMenus() {
  document.querySelectorAll(".ap-template__kebab").forEach((el) => {
    el.classList.remove("slds-is-open");
    const trigger = el.querySelector("button");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    const drop = el.querySelector(".slds-dropdown");
    if (drop) drop.remove();
  });
}

function menuList(template) {
  const list = document.createElement("div");
  list.className = "slds-dropdown slds-dropdown_right slds-dropdown_actions";
  const ul = document.createElement("ul");
  ul.className = "slds-dropdown__list";
  ul.setAttribute("role", "menu");
  [
    { label: "Modify", run: () => modifyTemplate(template) },
    { label: "Share", run: () => askShare(template) },
    { label: "Delete", destructive: true, run: () => askDelete(template) }
  ].forEach((action) => {
    const li = document.createElement("li");
    li.className = "slds-dropdown__item";
    li.setAttribute("role", "presentation");
    const link = document.createElement("a");
    link.href = "#";
    link.setAttribute("role", "menuitem");
    link.tabIndex = 0;
    const label = document.createElement("span");
    label.className = "slds-truncate";
    label.textContent = action.label;
    if (action.destructive) label.classList.add("slds-text-color_error");
    link.append(label);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeAllMenus();
      action.run();
    });
    li.append(link);
    ul.append(li);
  });
  list.append(ul);
  return list;
}

function kebab(template) {
  const wrap = document.createElement("div");
  wrap.className = "ap-menu ap-template__kebab slds-dropdown-trigger slds-dropdown-trigger_click";
  const button = document.createElement("button");
  button.className = "slds-button slds-button_icon slds-button_icon-x-small";
  button.type = "button";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Actions for " + template.name);
  button.innerHTML =
    '<svg class="slds-button__icon" aria-hidden="true"><use href="' +
    ICON +
    '#threedots_vertical"></use></svg><span class="slds-assistive-text">Show more</span>';
  function toggleMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const wasOpen = wrap.classList.contains("slds-is-open");
    closeAllMenus();
    if (!wasOpen) {
      wrap.classList.add("slds-is-open");
      button.setAttribute("aria-expanded", "true");
      wrap.append(menuList(template));
    }
  }
  button.addEventListener("pointerdown", toggleMenu);
  button.addEventListener("click", (event) => {
    if (event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    toggleMenu(event);
  });
  wrap.append(button);
  return wrap;
}

function renderCard(template) {
  const stages = (template.blueprint && template.blueprint.length) || template.stages || 0;
  const tasks = template.tasks != null ? template.tasks : taskCount(template.blueprint);
  const who = creatorOf(template);
  const item = document.createElement("li");
  const article = document.createElement("article");
  article.className = "ap-template";
  const body = document.createElement("div");
  body.className = "ap-template__body";
  body.innerHTML =
    '<h3 class="ap-template__title">' +
    escapeHtml(template.name) +
    "</h3>" +
    '<p class="ap-template__summary">' +
    escapeHtml(template.summary || "Reviewed Account Plan blueprint.") +
    "</p>" +
    '<p class="ap-template__meta">' +
    escapeHtml(template.industry) +
    " · " +
    stages +
    " stages · " +
    tasks +
    " tasks</p>" +
    '<div class="ap-template__foot">' +
    '<p class="ap-template__creator" title="' +
    escapeHtml(who.name) +
    '">' +
    '<span class="slds-avatar slds-avatar_circle slds-avatar_x-small" aria-hidden="true"><abbr class="slds-avatar__initials slds-icon-standard-user">' +
    escapeHtml(who.initials) +
    "</abbr></span>" +
    '<span class="ap-template__who">' +
    escapeHtml(who.name) +
    "</span></p>" +
    '<button class="slds-button slds-button_neutral ap-template__use" type="button" data-use="' +
    escapeHtml(template.id) +
    '">Use template<span class="slds-assistive-text">: ' +
    escapeHtml(template.name) +
    "</span></button>" +
    "</div>";
  article.append(kebab(template), body);
  item.append(article);
  item.querySelector("[data-use]").addEventListener("click", () => useTemplate(template));
  return item;
}

function openDraft(template, editing) {
  const tree = cloneTree(template.blueprint || CANONICAL);
  const process = template.process || template.summary || "";
  // V3 create wizard expects stages + phase; keep blueprint for older readers.
  sessionStorage.setItem(
    DRAFT,
    JSON.stringify({
      id: "draft-" + Date.now(),
      name: template.name,
      industry: template.industry,
      description: process.split("\n")[0],
      process: process,
      files: [],
      links: [],
      blueprint: tree,
      stages: tree,
      stage: "Ready",
      ready: true,
      phase: "blueprint",
      fromTemplate: template.id,
      editingTemplate: editing ? template.id : null,
      templateOrigin: editing ? (template.origin === "org" ? "org" : "starter") : null
    })
  );
  window.location.href = createHref();
}

function useTemplate(template) {
  openDraft(template, false);
}

function modifyTemplate(template) {
  openDraft(template, true);
}

function namesMatch(typed, expected) {
  return typed.trim() === expected;
}

const DELETE_NAME_HELP = "Type the exact template name to Delete.";

function setDeleteNameState(state, message) {
  if (!deleteNameField || !deleteNameHelp || !deleteNameInput) return;
  deleteNameField.classList.toggle("slds-has-error", state === "error");
  deleteNameHelp.classList.remove("ap-delete-help_ok");
  deleteNameHelp.textContent = message;
  deleteNameInput.setAttribute("aria-invalid", state === "error" ? "true" : "false");
}

function resetDeleteNameHelp() {
  setDeleteNameState("empty", DELETE_NAME_HELP);
}

function askDelete(template) {
  closeShare();
  pendingDelete = template;
  const deleteTitle = document.getElementById("template-delete-title");
  if (deleteTitle) deleteTitle.textContent = "Delete “" + template.name + "”?";
  deleteWarning.textContent = "Permanently delete this template. This can't be undone.";
  if (deleteNameTarget) deleteNameTarget.textContent = template.name;
  if (deleteNameInput) {
    deleteNameInput.value = "";
    deleteNameInput.placeholder = template.name;
  }
  deleteConfirm.disabled = false;
  resetDeleteNameHelp();
  deleteDialog.hidden = false;
  deleteBackdrop.hidden = false;
  deleteDialog.classList.add("slds-fade-in-open");
  deleteBackdrop.classList.add("slds-backdrop_open");
  if (deleteNameInput) deleteNameInput.focus();
  else deleteConfirm.focus();
}

function closeDelete() {
  pendingDelete = null;
  if (deleteNameInput) {
    deleteNameInput.value = "";
    deleteNameInput.placeholder = "";
  }
  deleteConfirm.disabled = false;
  resetDeleteNameHelp();
  deleteDialog.hidden = true;
  deleteBackdrop.hidden = true;
  deleteDialog.classList.remove("slds-fade-in-open");
  deleteBackdrop.classList.remove("slds-backdrop_open");
}

function confirmDelete() {
  if (!pendingDelete) return;
  const typed = deleteNameInput ? deleteNameInput.value : "";
  if (!typed.trim()) {
    setDeleteNameState("error", "Enter the template name to confirm delete.");
    if (deleteNameInput) deleteNameInput.focus();
    return;
  }
  if (!namesMatch(typed, pendingDelete.name)) {
    setDeleteNameState("error", "Name doesn’t match. Check spelling and capitalization.");
    if (deleteNameInput) deleteNameInput.focus();
    return;
  }
  const template = pendingDelete;
  if (template.origin === "org") {
    persistYours(orgTemplates().filter((item) => item.id !== template.id));
  } else {
    const hidden = parseStore(HIDDEN_STARTERS, []);
    const ids = Array.isArray(hidden) ? hidden : [];
    if (!ids.includes(template.id)) ids.push(template.id);
    sessionStorage.setItem(HIDDEN_STARTERS, JSON.stringify(ids));
  }
  const name = template.name;
  closeDelete();
  status.textContent = name + " was deleted.";
  render();
}

function askShare(template) {
  closeDelete();
  pendingShare = template;
  shareLead.textContent = 'Share "' + template.name + '" with another Admin on your team.';
  shareName.value = "";
  shareMessage.value = "";
  shareDialog.hidden = false;
  shareBackdrop.hidden = false;
  shareDialog.classList.add("slds-fade-in-open");
  shareBackdrop.classList.add("slds-backdrop_open");
  shareName.focus();
}

function closeShare() {
  pendingShare = null;
  shareDialog.hidden = true;
  shareBackdrop.hidden = true;
  shareDialog.classList.remove("slds-fade-in-open");
  shareBackdrop.classList.remove("slds-backdrop_open");
}

function hideToast() {
  window.clearTimeout(toastTimer);
  toast.classList.add("slds-hide");
}

function showToast(title, body) {
  toastTitle.textContent = title;
  toastBody.textContent = body;
  toast.classList.remove("slds-hide");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, 5000);
}

function sendShare() {
  if (!pendingShare) return;
  const name = (shareName.value || "").trim();
  if (!name) {
    shareName.focus();
    return;
  }
  const templateName = pendingShare.name;
  closeShare();
  showToast("Template shared", '"' + templateName + '" was shared with ' + name + ".");
}

function render() {
  const query = (searchInput.value || "").trim().toLowerCase();
  const org = orgTemplates().map((item) =>
    Object.assign({}, item, {
      origin: "org",
      creator: isPlaceholderCreator(item.creator) ? CURRENT_ADMIN : item.creator || CURRENT_ADMIN
    })
  );
  const starters = loadStarters().filter((item) => matches(item, query));
  const yours = org.filter((item) => matches(item, query));

  starterGrid.replaceChildren();
  starters.forEach((item) => starterGrid.appendChild(renderCard(item)));

  orgGrid.replaceChildren();
  yours.forEach((item) => orgGrid.appendChild(renderCard(item)));

  const searching = Boolean(query);
  orgEmpty.classList.toggle("slds-hide", searching || org.length > 0);
  orgGrid.classList.toggle("slds-hide", yours.length === 0);
  starterSection.classList.toggle("slds-hide", starters.length === 0);
  orgSection.classList.toggle("slds-hide", searching ? yours.length === 0 : false);
  searchEmpty.classList.toggle("slds-hide", starters.length + yours.length > 0);
}

searchInput.addEventListener("input", render);
deleteConfirm.addEventListener("click", confirmDelete);
if (deleteNameInput) {
  deleteNameInput.addEventListener("input", () => {
    if (deleteNameField && deleteNameField.classList.contains("slds-has-error")) {
      resetDeleteNameHelp();
    }
  });
}
const deleteForm = document.getElementById("template-delete-form");
if (deleteForm) {
  deleteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmDelete();
  });
}
document.getElementById("template-delete-cancel").addEventListener("click", closeDelete);
document.getElementById("template-delete-close").addEventListener("click", closeDelete);
deleteBackdrop.addEventListener("click", closeDelete);
shareSend.addEventListener("click", sendShare);
document.getElementById("template-share-cancel").addEventListener("click", closeShare);
document.getElementById("template-share-close").addEventListener("click", closeShare);
shareBackdrop.addEventListener("click", closeShare);
document.getElementById("template-toast-close").addEventListener("click", hideToast);
document.addEventListener("click", (event) => {
  if (event.target.closest(".ap-template__kebab")) return;
  closeAllMenus();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!shareDialog.hidden) {
    closeShare();
    return;
  }
  if (!deleteDialog.hidden) {
    closeDelete();
    return;
  }
  hideToast();
  closeAllMenus();
});

ensureYoursSeeded();

const params = new URLSearchParams(window.location.search);
if (params.get("saved") === "1") {
  status.textContent = "Template saved. It appears under Created by you.";
}

render();
