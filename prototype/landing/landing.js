const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";

const TODAY = "2026-10-19";

const workflows = [
  {
    id: "refresh",
    name: "Refresh expiring account plans",
    summary: "Recommended when a plan period is nearing its end.",
    industry: "Commercial banking",
    stage: "Live",
    next: "—",
    available: true,
    ran: true,
    deleted: false,
    created: "2026-08-03",
    published: "2026-09-01",
    generatedOn: "2026-08-20",
    lastActivity: "2026-10-12",
    lastRun: "2026-10-12",
    triggerDays: 60
  },
  {
    id: "midyear-off",
    name: "Mid-year plan update",
    summary: "Published, then turned off for relationship teams.",
    industry: "Commercial banking",
    stage: "Live",
    next: "—",
    available: false,
    ran: true,
    deleted: false,
    created: "2026-06-02",
    published: "2026-06-20",
    generatedOn: "2026-06-18",
    lastActivity: "2026-10-08",
    lastRun: "2026-09-15",
    triggerDays: 60
  },
  {
    id: "fy26",
    name: "FY26 relationship plan",
    summary: "Brief started for technology customers.",
    industry: "Technology",
    stage: "Draft",
    next: "Describe",
    available: false,
    ran: false,
    deleted: false,
    created: "2026-10-14",
    lastActivity: "2026-10-16",
    triggerDays: 60
  },
  {
    id: "mid",
    name: "Mid-market annual plan",
    summary: "Blueprint is ready and has not been published.",
    industry: "Manufacturing",
    stage: "Ready",
    next: "Review",
    available: false,
    ran: false,
    deleted: false,
    created: "2026-09-22",
    generatedOn: "2026-10-10",
    lastActivity: "2026-10-10",
    triggerDays: 90
  },
  {
    id: "regional",
    name: "Regional plan refresh",
    summary: "Agents are drafting the blueprint.",
    industry: "Healthcare",
    stage: "Generating",
    next: "Generate",
    available: false,
    ran: false,
    deleted: false,
    created: "2026-10-17",
    lastActivity: "2026-10-19",
    triggerDays: 30
  },
  {
    id: "prior",
    name: "Prior-year plan setup",
    summary: "Archived workflow.",
    industry: "Commercial banking",
    stage: "Archived",
    next: "—",
    available: false,
    ran: true,
    deleted: true,
    archivedOn: "2026-10-04",
    created: "2025-07-11",
    published: "2025-08-01",
    generatedOn: "2025-07-28",
    lastActivity: "2026-10-04",
    lastRun: "2025-12-01",
    triggerDays: 60
  }
];

let view = "current";
let openMenuId = null;
let pendingDeleteId = null;
let skipMenuDismiss = false;
let nameSort = "none";

const rows = document.getElementById("workflow-rows");
const workflowTable = document.getElementById("workflow-table");
const workflowEmpty = document.getElementById("workflow-empty");
const workflowEmptyTitle = document.getElementById("workflow-empty-title");
const workflowEmptyCopy = document.getElementById("workflow-empty-copy");
const workflowEmptyCta = document.getElementById("workflow-empty-cta");
const sortNameBtn = document.getElementById("sort-name");
const status = document.getElementById("next-flow");
const listNote = document.getElementById("list-note");
const listSubtitle = document.getElementById("list-subtitle");
const dialog = document.getElementById("delete-dialog");
const backdrop = document.getElementById("delete-backdrop");
const deleteNameInput = document.getElementById("delete-name");
const deleteConfirm = document.getElementById("delete-confirm");
const deleteWarning = document.getElementById("delete-warning");
const toast = document.getElementById("workflow-toast");
const toastTitle = document.getElementById("workflow-toast-title");
const toastBody = document.getElementById("workflow-toast-body");
let toastTimer = 0;

function isArchived(item) {
  return item.deleted || item.stage === "Archived";
}

function isAvailableLive(item) {
  return !isArchived(item) && item.stage === "Live" && item.available;
}

function countByStage(items, stage) {
  return items.filter((item) => item.stage === stage).length;
}

function stageAwareSubtitle(items) {
  if (!items.length) return "No active workflows yet.";
  const drafts = countByStage(items, "Draft");
  const generating = countByStage(items, "Generating");
  const ready = countByStage(items, "Ready");
  const live = countByStage(items, "Live");
  const parts = [];
  if (drafts) parts.push(drafts + (drafts === 1 ? " draft" : " drafts"));
  if (generating) parts.push(generating + " generating");
  if (ready) parts.push(ready + " ready");
  if (live) parts.push(live + " live");
  return parts.join(" · ") || "Active workflows.";
}

function sortedVisible(items) {
  const list = items.slice();
  if (nameSort === "asc") {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  } else if (nameSort === "desc") {
    list.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
  }
  return list;
}

function syncSortButton() {
  if (!sortNameBtn) return;
  sortNameBtn.setAttribute("aria-sort", nameSort === "asc" ? "ascending" : nameSort === "desc" ? "descending" : "none");
  sortNameBtn.classList.toggle("is-asc", nameSort === "asc");
  sortNameBtn.classList.toggle("is-desc", nameSort === "desc");
}

function renderEmpty(visible) {
  if (!workflowEmpty) return;
  const empty = !visible.length;
  workflowEmpty.hidden = !empty;
  if (workflowTable) workflowTable.hidden = empty;
  if (!empty) {
    if (workflowEmptyCta) workflowEmptyCta.hidden = true;
    return;
  }
  if (view === "current") {
    workflowEmptyTitle.textContent = "No active workflows";
    workflowEmptyCopy.textContent = "Create a workflow to describe the process your relationship teams will run.";
    if (workflowEmptyCta) workflowEmptyCta.hidden = false;
  } else {
    workflowEmptyTitle.textContent = "Nothing archived";
    workflowEmptyCopy.textContent = "Archived workflows will show up here when you remove one from Active.";
    if (workflowEmptyCta) workflowEmptyCta.hidden = true;
  }
}

function render() {
  const visible = sortedVisible(
    workflows.filter((item) => (view === "deleted" ? isArchived(item) : !isArchived(item)))
  );
  rows.replaceChildren();
  visible.forEach((item) => rows.appendChild(row(item)));
  renderEmpty(visible);
  syncSortButton();
  if (view === "current") {
    listSubtitle.textContent = stageAwareSubtitle(visible);
    listNote.textContent = visible.length ? "Drafts stay private until you publish." : "";
  } else {
    listSubtitle.textContent = visible.length
      ? "Restore or permanently delete archived workflows."
      : "No archived workflows.";
    listNote.textContent = visible.length
      ? "Archived workflows are not available to Relationship Managers."
      : "";
  }
}

function row(item) {
  const tr = document.createElement("tr");
  tr.append(
    cell(nameCell(item), true),
    cell(document.createTextNode(item.industry)),
    cell(badge(item.stage)),
    cell(menu(item))
  );
  return tr;
}

function cell(content, header) {
  const el = document.createElement(header ? "th" : "td");
  if (header) el.scope = "row";
  el.setAttribute("data-label", header ? "Workflow" : "");
  if (content instanceof Node) el.append(content);
  else el.textContent = content;
  return el;
}

function destinationFor(item) {
  if (item.stage === "Draft") return "../create/index.html";
  if (item.stage === "Generating") return "../generate/index.html";
  return "../review/index.html";
}

function openWorkflow(item) {
  openMenuId = null;
  const ready = item.stage === "Ready" || item.stage === "Live" || item.stage === "Generating";
  const payload = {
    id: item.id,
    name: item.name,
    industry: item.industry || "Commercial banking",
    description: item.summary || "",
    process: item.summary || "",
    files: [],
    links: [],
    stage: item.stage === "Live" ? "Live" : ready ? "Ready" : "Draft",
    ready: ready,
    fromInventory: item.id,
    phase: ready ? "blueprint" : "describe",
    animate: item.stage === "Generating"
  };
  sessionStorage.setItem("ap-create-draft", JSON.stringify(payload));
  window.location.href = "../create/index.html";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function nameCell(item) {
  const wrap = document.createElement("div");
  let name;
  if (isArchived(item)) {
    name = document.createElement("div");
    name.className = "slds-truncate ap-name";
    name.textContent = item.name;
  } else {
    name = document.createElement("a");
    name.className = "slds-truncate ap-name";
    name.href = destinationFor(item);
    name.textContent = item.name;
    name.addEventListener("click", (event) => {
      event.preventDefault();
      openWorkflow(item);
    });
  }
  const summary = document.createElement("div");
  summary.className = "slds-truncate ap-summary";
  summary.textContent = item.summary;
  const meta = document.createElement("div");
  meta.className = "ap-row-meta";
  meta.textContent = definitionMeta(item);
  wrap.append(name, summary, meta);
  return wrap;
}

function definitionMeta(item) {
  if (item.lastActivity && item.lastActivity !== item.created) {
    return "Updated " + formatDate(item.lastActivity);
  }
  return "Created " + formatDate(item.created);
}

function badge(stage) {
  const span = document.createElement("span");
  span.className = "ap-badge ap-badge_" + stage.toLowerCase();
  span.textContent = stage;
  return span;
}

function toggle(item, options) {
  options = options || {};
  const enabled = item.stage === "Live";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ap-switch";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", item.available && enabled ? "true" : "false");
  button.setAttribute("aria-label", "Available to Relationship Managers, " + item.name);
  button.disabled = !enabled;
  if (!enabled) button.title = "Publish before a Relationship Manager can run this.";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    item.available = !item.available;
    button.setAttribute("aria-checked", item.available ? "true" : "false");
    if (options.keepMenu) {
      openMenuId = item.id;
      skipMenuDismiss = true;
    } else {
      openMenuId = null;
    }
    render();
    if (item.available) {
      showToast("Workflow activated", item.name + " is available to Relationship Managers.");
    } else {
      showToast("Workflow deactivated", item.name + " is not available to Relationship Managers.");
    }
  });
  return button;
}

function availableMenuRow(item) {
  const row = document.createElement("div");
  row.className = "ap-menu-available";
  const label = document.createElement("span");
  label.className = "ap-menu-available__label";
  label.textContent = "Available";
  row.append(label, toggle(item, { keepMenu: true }));
  row.addEventListener("click", (event) => event.stopPropagation());
  return row;
}

function menu(item) {
  const wrap = document.createElement("div");
  wrap.className = "ap-menu slds-dropdown-trigger slds-dropdown-trigger_click" + (openMenuId === item.id ? " slds-is-open" : "");
  const button = document.createElement("button");
  button.className = "slds-button slds-button_icon slds-button_icon-border ap-menu__trigger";
  button.type = "button";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", openMenuId === item.id ? "true" : "false");
  button.setAttribute("aria-label", "Actions for " + item.name);
  button.innerHTML =
    '<svg class="slds-button__icon" aria-hidden="true"><use href="' +
    ICON +
    '#down"></use></svg><span class="slds-assistive-text">Show more</span>';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    skipMenuDismiss = true;
    const opening = openMenuId !== item.id;
    closeAllMenus();
    if (opening) {
      openMenuId = item.id;
      wrap.classList.add("slds-is-open");
      button.setAttribute("aria-expanded", "true");
      wrap.append(menuList(item));
    }
  });
  wrap.append(button);
  if (openMenuId === item.id) wrap.append(menuList(item));
  return wrap;
}

function closeAllMenus() {
  openMenuId = null;
  rows.querySelectorAll(".ap-menu").forEach((el) => {
    el.classList.remove("slds-is-open");
    const trigger = el.querySelector("button");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    const drop = el.querySelector(".slds-dropdown");
    if (drop) drop.remove();
  });
}

function menuList(item) {
  const list = document.createElement("div");
  list.className = "slds-dropdown slds-dropdown_right slds-dropdown_actions";
  if (!isArchived(item) && item.stage === "Live") {
    list.append(availableMenuRow(item));
  }
  const ul = document.createElement("ul");
  ul.className = "slds-dropdown__list";
  ul.setAttribute("role", "menu");
  const actions = actionsFor(item);
  actions.forEach((action) => {
    const li = document.createElement("li");
    li.className = "slds-dropdown__item";
    li.setAttribute("role", "presentation");
    const link = document.createElement("a");
    link.href = "#";
    link.setAttribute("role", "menuitem");
    const label = document.createElement("span");
    label.className = "slds-truncate";
    label.textContent = action.label;
    if (action.destructive) label.classList.add("slds-text-color_error");
    link.append(label);
    if (action.disabled) {
      const tipId = "action-tip-" + item.id + "-" + action.label.toLowerCase();
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("aria-describedby", tipId);
      link.tabIndex = -1;
      const tip = document.createElement("span");
      tip.className = "ap-action-tip";
      tip.id = tipId;
      tip.setAttribute("role", "tooltip");
      tip.textContent = action.disabledReason;
      li.append(link, tip);
      li.addEventListener("mouseenter", () => li.classList.add("ap-tip-open"));
      li.addEventListener("mouseleave", () => li.classList.remove("ap-tip-open"));
      link.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    } else {
      link.tabIndex = 0;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        action.run();
      });
      li.append(link);
    }
    ul.append(li);
  });
  list.append(ul);
  list.addEventListener("click", (event) => event.stopPropagation());
  return list;
}

function actionsFor(item) {
  if (isArchived(item)) {
    return [
      { label: "Restore", run: () => restore(item) },
      { label: "Delete", destructive: true, run: () => askDelete(item) }
    ];
  }
  const locked = isAvailableLive(item);
  const continueLabel = item.stage === "Draft" || item.stage === "Generating" ? "Continue setup" : "Edit";
  return [
    { label: continueLabel, run: () => openWorkflow(item) },
    {
      label: "Archive",
      disabled: locked,
      disabledReason: "Deactivate this workflow before you archive or delete it.",
      run: () => archive(item)
    },
    {
      label: "Delete",
      destructive: true,
      disabled: locked,
      disabledReason: "Deactivate this workflow before you archive or delete it.",
      run: () => askDelete(item)
    }
  ];
}

function restore(item) {
  openMenuId = null;
  item.deleted = false;
  item.stage = "Ready";
  item.available = false;
  item.next = "Review";
  item.lastActivity = TODAY;
  view = "current";
  setViewPressed();
  announce(item.name + " is restored. Publish it again before Relationship Managers can run it.");
  render();
}

function archive(item) {
  openMenuId = null;
  item.deleted = true;
  item.stage = "Archived";
  item.available = false;
  item.archivedOn = TODAY;
  item.lastActivity = TODAY;
  item.next = "—";
  announce(item.name + " is archived. Restore or delete it anytime from Archived.");
  render();
}

function pendingDeleteItem() {
  return workflows.find((item) => item.id === pendingDeleteId);
}

function namesMatch(typed, expected) {
  return typed.trim() === expected;
}

function syncDeleteConfirm() {
  const item = pendingDeleteItem();
  const ok = Boolean(item && namesMatch(deleteNameInput.value, item.name));
  deleteConfirm.disabled = !ok;
}

function askDelete(item) {
  openMenuId = null;
  pendingDeleteId = item.id;
  deleteWarning.innerHTML =
    "Permanently delete <strong></strong>. This can't be undone.";
  deleteWarning.querySelector("strong").textContent = item.name;
  deleteNameInput.value = "";
  deleteConfirm.disabled = true;
  dialog.hidden = false;
  backdrop.hidden = false;
  dialog.classList.add("slds-fade-in-open");
  backdrop.classList.add("slds-backdrop_open");
  render();
  deleteNameInput.focus();
}

function closeDelete() {
  pendingDeleteId = null;
  deleteNameInput.value = "";
  deleteConfirm.disabled = true;
  dialog.hidden = true;
  backdrop.hidden = true;
  dialog.classList.remove("slds-fade-in-open");
  backdrop.classList.remove("slds-backdrop_open");
}

function confirmDelete() {
  const item = pendingDeleteItem();
  if (!item || namesMatch(deleteNameInput.value, item.name) === false) {
    syncDeleteConfirm();
    deleteNameInput.focus();
    return;
  }
  const name = item.name;
  const index = workflows.findIndex((entry) => entry.id === item.id);
  if (index >= 0) workflows.splice(index, 1);
  closeDelete();
  announce(name + " was deleted. This can't be undone.");
  render();
}

function announce(message) {
  status.textContent = message;
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

function cssEscape(value) {
  return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

function setViewPressed() {
  const active = document.getElementById("tab-active");
  const archived = document.getElementById("tab-archived");
  const activeItem = active.parentElement;
  const archivedItem = archived.parentElement;
  const isActive = view === "current";
  active.setAttribute("aria-selected", isActive ? "true" : "false");
  archived.setAttribute("aria-selected", isActive ? "false" : "true");
  active.tabIndex = isActive ? 0 : -1;
  archived.tabIndex = isActive ? -1 : 0;
  activeItem.classList.toggle("slds-is-active", isActive);
  archivedItem.classList.toggle("slds-is-active", !isActive);
  document.getElementById("workflow-panel").setAttribute("aria-labelledby", isActive ? "tab-active" : "tab-archived");
}

const savedDraft = sessionStorage.getItem("ap-create-draft");
if (savedDraft) {
  try {
    const draft = JSON.parse(savedDraft);
    if (draft && draft.name) {
      const live = draft.stage === "Live";
      const match = workflows.findIndex((item) => (draft.id && item.id === draft.id) || item.name === draft.name);
      if (live) {
        const row = {
          id: draft.id || (match >= 0 ? workflows[match].id : "live-new"),
          name: draft.name,
          summary: draft.description || (draft.process || "").split("\n")[0] || "Published Account Plan workflow.",
          industry: draft.industry || "Commercial banking",
          stage: "Live",
          next: "—",
          available: true,
          ran: match >= 0 ? workflows[match].ran : false,
          deleted: false,
          created: (match >= 0 && workflows[match].created) || TODAY,
          published: draft.published || TODAY,
          lastActivity: TODAY
        };
        if (match >= 0) workflows[match] = Object.assign({}, workflows[match], row);
        else workflows.unshift(row);
      } else if (match < 0) {
        workflows.unshift({
          id: draft.id || "draft-new",
          name: draft.name,
          summary: draft.description || (draft.process || "").split("\n")[0] || "Brief started.",
          industry: draft.industry || "Commercial banking",
          stage: "Draft",
          next: "Describe",
          available: false,
          ran: false,
          deleted: false,
          created: TODAY,
          lastActivity: TODAY
        });
      }
    }
  } catch (error) {
    /* ignore a bad draft */
  }
}

const returnParams = new URLSearchParams(window.location.search);
if (returnParams.get("saved")) {
  announce("Draft saved. It is not available until you publish.");
}
if (returnParams.get("published")) {
  try {
    const draft = JSON.parse(sessionStorage.getItem("ap-create-draft") || "null");
    if (draft && draft.name) {
      draft.stage = "Live";
      draft.available = true;
      upsertFromDraft(draft);
      showToast("Workflow published", draft.name + " is available to Relationship Managers.");
    }
  } catch (error) {
    announce("Workflow published.");
  }
}

function lockListHeight() {
  const panel = document.getElementById("workflow-panel");
  const height = panel.getBoundingClientRect().height;
  const locked = Math.max(height, Number(panel.dataset.lockH || 0));
  panel.dataset.lockH = String(locked);
  panel.style.minHeight = locked + "px";
}

function restoreScroll(main, top) {
  main.scrollTop = top;
  requestAnimationFrame(() => {
    main.scrollTop = top;
  });
}

function switchView(next, tab, focusTab) {
  const main = document.getElementById("main");
  const top = main.scrollTop;
  lockListHeight();
  view = next;
  openMenuId = null;
  announce("");
  setViewPressed();
  render();
  lockListHeight();
  if (focusTab && tab) tab.focus({ preventScroll: true });
  restoreScroll(main, top);
}

document.getElementById("tab-active").addEventListener("click", (event) => {
  event.preventDefault();
  switchView("current", event.currentTarget, false);
});

document.getElementById("tab-archived").addEventListener("click", (event) => {
  event.preventDefault();
  switchView("deleted", event.currentTarget, false);
});

document.querySelector('[role="tablist"]').addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  const next = event.key === "ArrowLeft" || event.key === "Home" ? "current" : "deleted";
  switchView(next, document.getElementById(next === "current" ? "tab-active" : "tab-archived"), true);
});

document.getElementById("delete-cancel").addEventListener("click", closeDelete);
document.getElementById("delete-close").addEventListener("click", closeDelete);
backdrop.addEventListener("click", closeDelete);
deleteConfirm.addEventListener("click", confirmDelete);
deleteNameInput.addEventListener("input", syncDeleteConfirm);
document.getElementById("delete-form").addEventListener("submit", (event) => {
  event.preventDefault();
  confirmDelete();
});

document.addEventListener("click", () => {
  if (skipMenuDismiss) {
    skipMenuDismiss = false;
    return;
  }
  if (!openMenuId) return;
  closeAllMenus();
});

function startNewWorkflow(event) {
  event.preventDefault();
  event.stopPropagation();
  sessionStorage.removeItem("ap-create-draft");
  window.location.href = "../create/index.html";
}

document.querySelectorAll("[data-new-workflow]").forEach((el) => {
  el.addEventListener("click", startNewWorkflow);
});

if (sortNameBtn) {
  sortNameBtn.addEventListener("click", () => {
    nameSort = nameSort === "asc" ? "desc" : "asc";
    render();
  });
}

document.getElementById("workflow-toast-close").addEventListener("click", hideToast);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const wfModal = document.getElementById("workflow-modal");
    if (wfModal && !wfModal.hidden) return;
    if (!dialog.hidden) closeDelete();
    hideToast();
    openMenuId = null;
    render();
  }
});

function upsertFromDraft(draft) {
  if (!draft || !draft.name) return;
  const live = draft.stage === "Live";
  const ready = draft.stage === "Ready" || live;
  const match = workflows.findIndex((item) => (draft.id && item.id === draft.id) || item.name === draft.name);
  const row = {
    id: draft.id || (match >= 0 ? workflows[match].id : "draft-" + Date.now()),
    name: draft.name,
    summary: draft.description || (draft.process || "").split("\n")[0] || "Brief started.",
    industry: draft.industry || "Commercial banking",
    stage: live ? "Live" : ready ? "Ready" : "Draft",
    next: live ? "—" : ready ? "Review" : "Describe",
    available: live ? Boolean(draft.available !== false) : false,
    ran: match >= 0 ? workflows[match].ran : false,
    deleted: false,
    created: (match >= 0 && workflows[match].created) || TODAY,
    published: draft.published || (match >= 0 ? workflows[match].published : undefined),
    lastActivity: TODAY
  };
  if (match >= 0) workflows[match] = Object.assign({}, workflows[match], row);
  else workflows.unshift(row);
  render();
}

window.APLanding = {
  upsertFromDraft: upsertFromDraft,
  showToast: showToast,
  announce: announce
};

render();
