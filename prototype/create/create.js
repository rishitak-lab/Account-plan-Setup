function landingHref() {
  if (typeof window.APSetupHref === "function") return window.APSetupHref();
  return "../landing/index.html";
}
const STEPS = ["describe", "blueprint", "review"];

const AGENTS = [
  "History Agent",
  "Financials Agent",
  "Market Research Agent",
  "Risk Intelligence Agent",
  "Coverage Strategy Agent",
  "Strategy Agent",
  "Objectives Agent",
  "Outreach Agent",
  "Synthesis Agent",
  "Relationship Manager"
];

const TASK_SEED = {
  g1: {
    instructions: "Review client history and cite account records and recent interactions.",
    sources: "Account documents · Recent interactions",
    tags: "client-history · evidence"
  },
  g2: {
    instructions: "Pull financial data from permitted financial sources.",
    sources: "Financial accounts",
    tags: "financials"
  },
  g3: {
    instructions: "Research market and competitor context from linked sources.",
    sources: "Linked market sources",
    tags: "market"
  },
  p1: { instructions: "Draft relationship strategy from gathered evidence.", sources: "Gather outputs", tags: "strategy" },
  p2: { instructions: "Define objectives and measures from the strategy.", sources: "Relationship strategy", tags: "objectives" },
  o1: {
    instructions: "Request input from Treasury, Credit, and Industry specialists. Named people are resolved when the workflow runs.",
    sources: "Specialist roles",
    tags: "outreach"
  },
  o2: { instructions: "Merge specialist feedback into the plan and update the account plan.", sources: "Specialist replies", tags: "synthesis" }
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 15.5;

function isTaskReady(task) {
  return Boolean(task && task.setupReady && String(task.instructions || "").trim());
}

function stepReadyCount(step) {
  const tasks = (step && step.tasks) || [];
  let ready = 0;
  tasks.forEach((task) => {
    if (isTaskReady(task)) ready += 1;
  });
  return { ready: ready, total: tasks.length };
}

function taskSeedDefaults(taskId) {
  return TASK_SEED[taskId] || {};
}

function doubleTickHtml() {
  return (
    '<span class="ap-outline__ticks" aria-hidden="true">' +
    '<svg viewBox="0 0 14 14" focusable="false">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M1.5 7.2l2.4 2.4L8.2 4.2"/>' +
    '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M5.2 7.2l2.4 2.4L12.2 4.2"/>' +
    "</svg></span>"
  );
}

function stepRingHtml(step) {
  const counts = stepReadyCount(step);
  const ratio = counts.total ? counts.ready / counts.total : 0;
  const offset = RING_CIRCUMFERENCE * (1 - ratio);
  const full = counts.total > 0 && counts.ready === counts.total;
  const empty = counts.ready === 0;
  const label = counts.ready + " of " + counts.total + " tasks ready";
  return (
    '<div class="ap-outline__ring' +
    (full ? " is-full" : "") +
    '" aria-label="' +
    escapeHtml(label) +
    '">' +
    '<svg class="ap-outline__ring-svg" viewBox="0 0 36 36" aria-hidden="true" focusable="false">' +
    '<circle class="ap-outline__ring-track" cx="18" cy="18" r="15.5"></circle>' +
    '<circle class="ap-outline__ring-prog' +
    (full ? " is-full" : empty ? " is-empty" : "") +
    '" cx="18" cy="18" r="15.5" stroke-dasharray="' +
    RING_CIRCUMFERENCE.toFixed(2) +
    '" stroke-dashoffset="' +
    offset.toFixed(2) +
    '"></circle></svg>' +
    '<span class="ap-outline__num">' +
    step.number +
    "</span></div>"
  );
}

const DEFAULT_FALLBACK = "Relationship Manager";
const DEFAULT_RETRY_MODE = "attempts";
const DEFAULT_RETRY_ATTEMPTS = "1";
const DEFAULT_RETRY_TIME = "30 minutes";
const DEFAULT_CC = "Relationship Manager";
const DEFAULT_ESCALATION = "Alex Chen";

const ORG_USERS = [
  { name: "Relationship Manager", title: "Account owner", email: "rm@example.com" },
  { name: "Alex Chen", title: "Team lead", email: "alex.chen@example.com" },
  { name: "Jordan Lee", title: "Credit specialist", email: "jordan.lee@example.com" },
  { name: "Sam Rivera", title: "Treasury", email: "sam.rivera@example.com" },
  { name: "Taylor Brooks", title: "Industry specialist", email: "taylor.brooks@example.com" },
  { name: "Casey Nguyen", title: "Risk analyst", email: "casey.nguyen@example.com" },
  { name: "Morgan Blake", title: "Coverage lead", email: "morgan.blake@example.com" },
  { name: "Riley Quinn", title: "Operations", email: "riley.quinn@example.com" },
  { name: "None", title: "No assignee", email: "" }
];

function migrateLegacyFallback(task) {
  const raw = String((task && task.fallback) || "");
  if (!raw || raw.indexOf(" · after ") === -1) return task;
  const parts = raw.split(" · after ");
  const who = (parts[0] || DEFAULT_FALLBACK).trim() || DEFAULT_FALLBACK;
  const rest = (parts[1] || "").toLowerCase();
  const match = rest.match(/(\d+)\s*retry/);
  task.fallback = who === "None" ? "None" : who;
  if (!task.retryMode) {
    task.retryMode = "attempts";
    task.retryAttempts = match ? match[1] : DEFAULT_RETRY_ATTEMPTS;
  }
  return task;
}

const FALLBACK_BLUEPRINT = [
  {
    id: "gather",
    name: "Gather Inputs",
    descriptor: "Collect account evidence before the plan is assembled",
    startKind: "workflow",
    dependsOn: "",
    parallel: true,
    tasks: [
      { id: "g1", name: "Review client history", who: "History Agent", kind: "agent", startWhen: "When the stage starts" },
      { id: "g2", name: "Pull financial data", who: "Financials Agent", kind: "agent", startWhen: "When the stage starts" },
      { id: "g3", name: "Research market context", who: "Market Research Agent", kind: "agent", startWhen: "When the stage starts" }
    ]
  },
  {
    id: "plan",
    name: "Create Plan",
    descriptor: "Draft relationship strategy and objectives from gathered evidence",
    startKind: "previous",
    dependsOn: "gather",
    parallel: false,
    tasks: [
      { id: "p1", name: "Draft relationship strategy", who: "Strategy Agent", kind: "agent", startWhen: "When the stage starts" },
      { id: "p2", name: "Define Objectives & Measures", who: "Objectives Agent", kind: "agent", startWhen: "After another task", dependsOn: "p1" }
    ]
  },
  {
    id: "outreach",
    name: "Reach out to Treasury Specialist, Credit Specialist and Industry Specialist",
    descriptor: "Request specialist input, then merge it into the plan",
    startKind: "previous",
    dependsOn: "plan",
    parallel: false,
    tasks: [
      {
        id: "o1",
        name: "Gather input from the specialists",
        who: "Outreach Agent",
        kind: "agent",
        startWhen: "When the stage starts"
      },
      {
        id: "o2",
        name: "Synthesize specialist feedback and update the account plan",
        who: "Synthesis Agent",
        kind: "agent",
        startWhen: "After another task",
        dependsOn: "o1"
      }
    ]
  },
  {
    id: "rm",
    name: "Route account plan for Relationship Manager review",
    descriptor: "Person-owned review of the assembled account plan.",
    startKind: "previous",
    dependsOn: "outreach",
    parallel: false,
    tasks: [
      {
        id: "r1",
        name: "Review account plan",
        who: "Relationship Manager",
        kind: "person",
        startWhen: "When the stage starts"
      }
    ]
  }
];

function normalizeTask(task) {
  const merged = Object.assign(
    {
      startWhen: "When the stage starts",
      dependsOn: "",
      due: "Instant",
      fallback: DEFAULT_FALLBACK,
      retryMode: DEFAULT_RETRY_MODE,
      retryAttempts: DEFAULT_RETRY_ATTEMPTS,
      retryTime: DEFAULT_RETRY_TIME,
      cc: DEFAULT_CC,
      escalation: DEFAULT_ESCALATION,
      instructions: "",
      sources: "",
      tags: "",
      setupReady: false
    },
    task || {}
  );
  if (merged.summary != null) delete merged.summary;
  const seed = TASK_SEED[merged.id] || {};
  if (!merged.setupReady) {
    if (
      seed.instructions &&
      String(merged.instructions || "").trim() === String(seed.instructions).trim()
    ) {
      merged.instructions = "";
    }
    if (seed.sources && String(merged.sources || "").trim() === String(seed.sources).trim()) {
      merged.sources = "";
    }
  }
  merged.setupReady = Boolean(merged.setupReady && String(merged.instructions || "").trim());
  migrateLegacyFallback(merged);
  if (merged.escalation === "Team lead · escalate after SLA") merged.escalation = DEFAULT_ESCALATION;
  if (!merged.retryMode) merged.retryMode = DEFAULT_RETRY_MODE;
  if (!merged.retryAttempts) merged.retryAttempts = DEFAULT_RETRY_ATTEMPTS;
  if (!merged.retryTime) merged.retryTime = DEFAULT_RETRY_TIME;
  return merged;
}

const nameInput = document.getElementById("workflow-name");
const industryInput = document.getElementById("workflow-industry");
const industryCombobox = document.getElementById("industry-combobox");
const industryListbox = document.getElementById("industry-listbox");
const processInput = document.getElementById("workflow-process");
const nameError = document.getElementById("name-error");
const processError = document.getElementById("process-error");
const statusEl = document.getElementById("create-status");
const contextList = document.getElementById("context-list");
const linkInput = document.getElementById("context-link");
const buildAgent = document.getElementById("build-agent");
const outline = document.getElementById("blueprint-outline");
const blueprintEmpty = document.getElementById("blueprint-empty");
const blueprintIntro = document.getElementById("blueprint-intro");
const genLoader = document.getElementById("blueprint-gen-loader");
const genLoaderCard = document.getElementById("blueprint-gen-loader-card");
const genLoaderMark = document.getElementById("blueprint-gen-loader-mark");
const genLoaderTitle = document.getElementById("blueprint-gen-loader-title");
const genLoaderDetail = document.getElementById("blueprint-gen-loader-detail");
const reviewSummary = document.getElementById("review-summary");
const reviewBlueprint = document.getElementById("review-blueprint");
const btnPrev = document.getElementById("wizard-prev");
const btnNext = document.getElementById("wizard-next");
const publishBtn = document.getElementById("wizard-publish");
const publishLabel = document.getElementById("wizard-publish-label");
const publishSpin = document.getElementById("wizard-publish-spin");
const wizardTitle = document.getElementById("wizard-title");
const testBtn = document.getElementById("wizard-test");
const testOk = document.getElementById("wizard-test-ok");
const testLabel = document.getElementById("wizard-test-label");
const wizardForward = document.getElementById("wizard-forward");
const wizardForwardPath = document.getElementById("wizard-forward-path");
const wizardNextWrap = document.getElementById("wizard-next-wrap");
const templateBtn = document.getElementById("wizard-template");
const templateModal = document.getElementById("template-modal");
const templateNameInput = document.getElementById("template-name");
const templateConfirm = document.getElementById("template-confirm");
const testModal = document.getElementById("test-modal");
const testList = document.getElementById("test-run-list");
const testStage = document.getElementById("test-stage");
const testClose = document.getElementById("test-close");
const backdrop = document.getElementById("modal-back");
const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const TEST_TICK = 220;
const TEST_TASK_MS = 720;

let step = "describe";
let openedId = null;
let contextItems = [];
let stages = [];
let generated = false;
let genTimer = null;
let taskTimer = null;
let revealing = false;
let testedKey = "";
let testTimer = null;
let testTaskState = {};
let testStepState = {};
let testElapsed = {};
let testRunning = false;
let publishing = false;
const GEN_STEP_MS = 420;
const GEN_TASK_MS = 280;
const GEN_LOADER_MS = 720;
let genToken = 0;

function industryValue() {
  return (industryInput && industryInput.value) || "Commercial banking";
}

function setIndustry(value) {
  if (!industryInput || !industryListbox) return;
  industryInput.value = value;
  industryListbox.querySelectorAll('[role="option"]').forEach((option) => {
    const selected = option.getAttribute("data-value") === value;
    option.classList.toggle("slds-is-selected", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
    const figure = option.querySelector(".slds-listbox__option-icon");
    if (!figure) return;
    if (selected) {
      figure.innerHTML =
        '<span class="slds-icon_container slds-icon-utility-check slds-current-color"><svg class="slds-icon slds-icon_x-small" aria-hidden="true"><use href="' +
        ICON +
        '#check"></use></svg></span>';
    } else {
      figure.innerHTML = "";
    }
  });
}

function closeIndustryMenu() {
  if (!industryCombobox || !industryListbox) return;
  industryCombobox.classList.remove("slds-is-open");
  industryCombobox.setAttribute("aria-expanded", "false");
  industryListbox.hidden = true;
}

function openIndustryMenu() {
  if (!industryCombobox || !industryListbox) return;
  industryCombobox.classList.add("slds-is-open");
  industryCombobox.setAttribute("aria-expanded", "true");
  industryListbox.hidden = false;
}

function toggleIndustryMenu() {
  if (!industryCombobox) return;
  if (industryCombobox.getAttribute("aria-expanded") === "true") closeIndustryMenu();
  else openIndustryMenu();
}

try {
  const saved = JSON.parse(sessionStorage.getItem("ap-create-draft") || "{}");
  if (saved && (saved.name || saved.fromInventory)) {
    openedId = saved.id || null;
    if (saved.name) nameInput.value = saved.name;
    if (saved.process || saved.description) processInput.value = saved.process || saved.description;
    if (saved.industry) setIndustry(saved.industry);
    if (Array.isArray(saved.files)) {
      saved.files.forEach((name, index) => {
        if (!name) return;
        contextItems.push({ id: "file-" + index, kind: "file", name: String(name) });
      });
    }
    if (Array.isArray(saved.links)) {
      saved.links.forEach((url, index) => {
        if (!url) return;
        contextItems.push({ id: "link-" + index, kind: "link", url: String(url) });
      });
    }
    if (saved.phase === "blueprint" || saved.ready || saved.fromTemplate) step = "blueprint";
    if (saved.phase === "review" || saved.phase === "publish") step = "review";
    const incoming =
      saved.stages && saved.stages.length
        ? saved.stages
        : saved.blueprint && saved.blueprint.length
          ? saved.blueprint
          : null;
    if (incoming) {
      const looksLegacy = incoming.some(
        (stage) => !stage.startKind || (stage.tasks || []).some((task) => !task.id)
      );
      stages = looksLegacy ? cloneBlueprint(FALLBACK_BLUEPRINT) : cloneBlueprint(incoming);
      generated = true;
    }
    if (saved.testedKey) testedKey = saved.testedKey;
  }
} catch (error) {
  /* empty form */
}

function announce(message) {
  statusEl.textContent = message || "";
}

function draft(extra) {
  return Object.assign(
    {
      id: openedId || "draft-" + Date.now(),
      name: nameInput.value.trim() || "Untitled workflow",
      industry: industryValue(),
      description: processInput.value.trim().split("\n")[0],
      process: processInput.value.trim(),
      files: contextItems.filter((item) => item.kind === "file").map((item) => item.name),
      links: contextItems.filter((item) => item.kind === "link").map((item) => item.url),
      stages: stages,
      stage: "Draft",
      ready: generated,
      phase: step,
      testedKey: testedKey
    },
    extra || {}
  );
}

function persist(extra) {
  const item = draft(extra);
  openedId = item.id;
  sessionStorage.setItem("ap-create-draft", JSON.stringify(item));
  return item;
}

function setError(input, help, invalid) {
  const field = input.closest(".slds-form-element");
  if (field) field.classList.toggle("slds-has-error", invalid);
  help.classList.toggle("slds-hide", !invalid);
  input.setAttribute("aria-invalid", invalid ? "true" : "false");
}

function validDescribe() {
  const nameOk = Boolean(nameInput.value.trim());
  const processOk = Boolean(processInput.value.trim());
  setError(nameInput, nameError, !nameOk);
  setError(processInput, processError, !processOk);
  if (!nameOk) nameInput.focus();
  else if (!processOk) processInput.focus();
  return nameOk && processOk;
}

function buildWithAgentOn() {
  return Boolean(buildAgent && buildAgent.checked);
}

function fileExtension(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isImageFile(item) {
  if (item.preview) return true;
  const ext = fileExtension(item.name);
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].indexOf(ext) >= 0;
}

function attachGlyph(item) {
  if (item.kind === "link") return "link";
  const ext = fileExtension(item.name);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].indexOf(ext) >= 0) return "image";
  if (["xls", "xlsx", "csv"].indexOf(ext) >= 0) return "topic2";
  if (["ppt", "pptx"].indexOf(ext) >= 0) return "display_rich_text";
  if (["doc", "docx", "txt", "pdf"].indexOf(ext) >= 0) return "file";
  return "attach";
}

function revokePreview(item) {
  if (item && item.preview) {
    try {
      URL.revokeObjectURL(item.preview);
    } catch (error) {
      /* ignore */
    }
  }
}

function renderContext() {
  contextList.replaceChildren();
  contextList.hidden = contextItems.length === 0;
  contextItems.forEach((item) => {
    const label = item.kind === "file" ? item.name : item.url;
    const li = document.createElement("li");
    li.className = "ap-attach-thumb";
    const frame = document.createElement("div");
    frame.className = "ap-attach-thumb__frame";
    frame.title = label;

    if (item.kind === "file" && item.preview && isImageFile(item)) {
      const img = document.createElement("img");
      img.className = "ap-attach-thumb__image";
      img.src = item.preview;
      img.alt = item.name || "Attached file";
      frame.appendChild(img);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "ap-attach-thumb__glyph ap-attach-thumb__glyph_" + (item.kind === "link" ? "link" : "file");
      glyph.innerHTML =
        '<svg class="slds-icon slds-icon_small" aria-hidden="true"><use href="' +
        ICON +
        "#" +
        attachGlyph(item) +
        '"></use></svg>';
      frame.appendChild(glyph);
      if (item.kind === "file") {
        const ext = document.createElement("span");
        ext.className = "ap-attach-thumb__ext";
        ext.textContent = (fileExtension(item.name) || "file").toUpperCase();
        frame.appendChild(ext);
      }
    }

    const status = document.createElement("span");
    status.className = "ap-attach-thumb__status";
    status.title = "Attached";
    status.innerHTML =
      '<svg class="slds-icon slds-icon_xx-small" aria-hidden="true"><use href="' +
      ICON +
      '#success"></use></svg><span class="slds-assistive-text">Attached</span>';
    frame.appendChild(status);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ap-attach-thumb__remove";
    remove.title = "Remove";
    remove.setAttribute("aria-label", "Remove " + label);
    remove.innerHTML =
      '<svg class="slds-button__icon" aria-hidden="true"><use href="' +
      ICON +
      '#close"></use></svg><span class="slds-assistive-text">Remove</span>';
    remove.addEventListener("click", () => {
      revokePreview(item);
      contextItems = contextItems.filter((entry) => entry.id !== item.id);
      renderContext();
    });
    frame.appendChild(remove);

    const caption = document.createElement("span");
    caption.className = "ap-attach-thumb__name";
    caption.title = label;
    caption.textContent = label;

    li.append(frame, caption);
    contextList.appendChild(li);
  });
}

function icon(name, tone) {
  return (
    '<span class="slds-icon_container slds-icon-utility-' +
    name +
    '" aria-hidden="true"><svg class="slds-icon slds-icon_xx-small ' +
    (tone || "slds-icon-text-default") +
    '"><use href="' +
    ICON +
    "#" +
    name +
    '"></use></svg></span>'
  );
}

function agentTag(who, kind) {
  const person = kind === "person";
  return (
    '<span class="ap-agent-tag' +
    (person ? " ap-agent-tag_person" : "") +
    '">' +
    icon(person ? "user" : "einstein") +
    who +
    "</span>"
  );
}

function findStage(id) {
  return stages.find((stage) => stage.id === id);
}

function displayStart(step) {
  if (step.startKind === "workflow") return "When the workflow runs";
  if (step.startKind === "custom") {
    const custom = String(step.customRule || "").trim();
    return custom || "Custom rule";
  }
  const prior = findStage(step.dependsOn);
  if (!prior) return "After the previous stage completes";
  const name = String(prior.name || "").trim();
  if (!name) return "After the previous stage completes";
  // Keep header compact; full dependency name stays available via title.
  if (name.length > 28) return "After previous step completes";
  return "After " + name + " completes";
}

function displayStartFull(step) {
  if (step.startKind === "workflow") return "When the workflow runs";
  if (step.startKind === "custom") {
    const custom = String(step.customRule || "").trim();
    return custom || "Custom rule";
  }
  const prior = findStage(step.dependsOn);
  if (!prior) return "After the previous stage completes";
  const name = String(prior.name || "").trim();
  return name ? "After " + name + " completes" : "After the previous stage completes";
}

function displayReviewStart(step) {
  if (step.startKind === "workflow") return "When the workflow runs";
  if (step.startKind === "custom") return step.customRule || "Custom rule";
  const prior = findStage(step.dependsOn);
  return prior ? "After " + prior.name : "After the previous step";
}

function displayTaskStart(step, task) {
  if (task.startWhen === "After another task" && task.dependsOn) {
    const prior = (step.tasks || []).find((entry) => entry.id === task.dependsOn);
    return prior ? "After " + prior.name : task.start || "After another task";
  }
  return task.startWhen === "When the stage starts" && step.parallel ? "With step · parallel" : task.startWhen || task.start || "When the stage starts";
}

function renumberStages() {
  stages.forEach((step, index) => {
    step.number = String(index + 1);
    step.tasks = (step.tasks || []).map((task, taskIndex) => {
      const next = normalizeTask(task);
      next.number = step.number + "." + (taskIndex + 1);
      next.start = displayTaskStart(step, next);
      return next;
    });
    step.startRule = displayStart(step);
  });
}

function displayRetry(task) {
  const mode = task.retryMode || DEFAULT_RETRY_MODE;
  if (mode === "time") {
    return "within " + (task.retryTime || DEFAULT_RETRY_TIME);
  }
  const n = String(task.retryAttempts != null ? task.retryAttempts : DEFAULT_RETRY_ATTEMPTS);
  if (n === "0") return "no retries";
  return n + (n === "1" ? " retry" : " retries");
}

function displayFallback(task) {
  const view = migrateLegacyFallback(Object.assign({}, task || {}));
  const value = view.fallback || DEFAULT_FALLBACK;
  if (value === "None") return "None";
  const short = value === "Relationship Manager" ? "RM" : value;
  return short + " · " + displayRetry(view);
}

function renderTask(step, task) {
  const tr = document.createElement("tr");
  const ready = isTaskReady(task);
  const statusHtml = ready
    ? '<p class="ap-outline__task-status ap-outline__task-status_ready">' +
      doubleTickHtml() +
      "Ready to run</p>"
    : '<p class="ap-outline__task-status ap-outline__task-status_need">Needs setup</p>';
  tr.innerHTML =
    '<td><div class="ap-outline__task-cell">' +
    '<div class="ap-outline__task-head">' +
    '<span class="ap-outline__numcell">' +
    task.number +
    '</span><span class="ap-outline__task">' +
    escapeHtml(task.name) +
    "</span></div>" +
    statusHtml +
    "</div></td><td>" +
    agentTag(task.who, task.kind) +
    "</td><td>" +
    displayTaskStart(step, task) +
    '</td><td><span class="ap-outline__fallback">' +
    escapeHtml(displayFallback(task)) +
    '</span></td><td><button class="slds-button slds-button_neutral" type="button" data-edit-task>Edit</button></td>';
  tr.querySelector("[data-edit-task]").addEventListener("click", () => openTask(step, task));
  return tr;
}

let dragStageId = "";

function gripIconHtml() {
  return (
    '<span class="ap-outline__grip-icon" aria-hidden="true">' +
    "<i></i><i></i><i></i><i></i><i></i><i></i>" +
    "</span>"
  );
}

function clearStageDragOver() {
  if (!outline) return;
  outline.querySelectorAll(".ap-outline__stage_over").forEach((node) => {
    node.classList.remove("ap-outline__stage_over");
  });
}

function bindStageDrag(li, step) {
  const grip = li.querySelector("[data-stage-grip]");
  if (!grip) return;

  grip.addEventListener("dragstart", (event) => {
    if (revealing || stages.length < 2) {
      event.preventDefault();
      return;
    }
    dragStageId = step.id;
    li.classList.add("ap-outline__stage_dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", step.id);
    try {
      event.dataTransfer.setDragImage(li.querySelector(".ap-outline__card") || li, 24, 24);
    } catch (error) {
      /* setDragImage not required */
    }
  });

  grip.addEventListener("dragend", () => {
    dragStageId = "";
    li.classList.remove("ap-outline__stage_dragging");
    clearStageDragOver();
  });

  li.addEventListener("dragover", (event) => {
    if (!dragStageId || dragStageId === step.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearStageDragOver();
    li.classList.add("ap-outline__stage_over");
  });

  li.addEventListener("dragleave", (event) => {
    if (!li.contains(event.relatedTarget)) li.classList.remove("ap-outline__stage_over");
  });

  li.addEventListener("drop", (event) => {
    event.preventDefault();
    clearStageDragOver();
    const fromId = dragStageId || event.dataTransfer.getData("text/plain");
    if (!fromId || fromId === step.id) return;
    const from = stages.findIndex((entry) => entry.id === fromId);
    const to = stages.findIndex((entry) => entry.id === step.id);
    if (from < 0 || to < 0 || from === to) return;
    const moved = stages.splice(from, 1)[0];
    stages.splice(to, 0, moved);
    dragStageId = "";
    testedKey = "";
    renumberStages();
    renderOutline();
    persist();
    announce("Step order updated.");
  });
}

function addTaskIconHtml() {
  return (
    '<svg class="ap-outline__side-icon" aria-hidden="true" viewBox="0 0 16 16" focusable="false">' +
    '<path fill="currentColor" d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/>' +
    "</svg>"
  );
}

function renderStage(step, options) {
  options = options || {};
  const hasTasks = Boolean(step.tasks && step.tasks.length);
  const useTable = hasTasks || Boolean(options.expectTasks);
  const li = document.createElement("li");
  li.className = "ap-outline__stage";
  li.dataset.stepId = step.id;
  const counts = stepReadyCount(step);
  const readyLabel = counts.ready + " of " + counts.total + " tasks ready";
  li.innerHTML =
    '<div class="ap-outline__side">' +
    '<button class="ap-outline__side-btn ap-outline__side-btn_reorder" type="button" draggable="true" data-stage-grip title="Drag to reorder" aria-label="Reorder step">' +
    gripIconHtml() +
    '<span class="ap-outline__side-label">Reorder</span></button>' +
    '<button class="ap-outline__side-btn ap-outline__side-btn_add" type="button" data-add-task title="Add task" aria-label="Add task">' +
    addTaskIconHtml() +
    '<span class="ap-outline__side-label">Add task</span></button>' +
    '</div><article class="ap-outline__card"><header class="ap-outline__head">' +
    stepRingHtml(step) +
    '<div class="ap-outline__head-main"><div class="ap-outline__name-row"><p class="ap-outline__name">' +
    escapeHtml(step.name) +
    '</p><span class="ap-outline__frac">' +
    (counts.total ? escapeHtml(readyLabel) : "") +
    '</span></div><p class="ap-outline__desc">' +
    escapeHtml(step.descriptor || "") +
    '</p></div><div class="ap-outline__controls">' +
    '<dl class="ap-outline__start"><dt>Start rule</dt><dd title="' +
    escapeHtml(displayStartFull(step)) +
    '">' +
    escapeHtml(displayStart(step)) +
    "</dd></dl>" +
    '<button class="slds-button slds-button_neutral" type="button" data-edit-step>Edit</button></div></header>' +
    (useTable
      ? '<div class="ap-outline__table-wrap"><table class="ap-outline__table"><thead><tr><th>Task</th><th>Assigned to</th><th>Start</th><th>Fallback</th><th></th></tr></thead><tbody></tbody></table></div>'
      : '<p class="ap-step__empty"><span class="ap-step__empty-note">Add at least one task — every workflow step requires a task.</span></p>') +
    "</article>";
  li.querySelector("[data-edit-step]").addEventListener("click", () => openStep(step));
  li.querySelector("[data-add-task]").addEventListener("click", () => addTaskToStage(step.id));
  bindStageDrag(li, step);
  const body = li.querySelector("tbody");
  if (body) (step.tasks || []).forEach((task) => body.appendChild(renderTask(step, task)));
  return li;
}

function makeSkelStage() {
  const li = document.createElement("li");
  li.className = "ap-outline__stage ap-outline__stage_skel";
  li.setAttribute("aria-hidden", "true");
  li.innerHTML =
    '<div class="ap-outline__side" aria-hidden="true"></div>' +
    '<article class="ap-outline__card"><header class="ap-outline__head">' +
    '<span class="ap-skel ap-skel_circle"></span>' +
    '<div class="ap-outline__skel-head">' +
    '<span class="ap-skel ap-skel_title"></span><span class="ap-skel ap-skel_line"></span></div>' +
    '<span class="ap-skel ap-skel_chip"></span></header>' +
    '<div class="ap-outline__skel-body">' +
    '<span class="ap-skel ap-skel_row"></span><span class="ap-skel ap-skel_row"></span><span class="ap-skel ap-skel_row ap-skel_row_short"></span>' +
    "</div></article>";
  return li;
}

function makeTaskSkelRow() {
  const tr = document.createElement("tr");
  tr.className = "ap-outline__task-skel";
  tr.setAttribute("aria-hidden", "true");
  tr.innerHTML = '<td colspan="6"><span class="ap-skel ap-skel_row"></span></td>';
  return tr;
}

function renderOutline() {
  if (revealing) {
    syncPublishGate();
    return;
  }
  outline.replaceChildren();
  const empty = !stages.length;
  if (blueprintIntro) blueprintIntro.hidden = empty;
  blueprintEmpty.hidden = !empty;
  outline.hidden = empty;
  if (genLoader) genLoader.hidden = true;
  if (!empty) {
    renumberStages();
    stages.forEach((stage) => outline.appendChild(renderStage(stage)));
  }
  syncPublishGate();
}

function blueprintKey() {
  return JSON.stringify(
    stages.map((entry) => ({
      id: entry.id,
      name: entry.name,
      startKind: entry.startKind,
      dependsOn: entry.dependsOn,
      customRule: entry.customRule,
      owner: entry.owner || null,
      tasks: (entry.tasks || []).map((task) => ({
        id: task.id,
        name: task.name,
        who: task.who,
        startWhen: task.startWhen,
        dependsOn: task.dependsOn,
        due: task.due,
        fallback: task.fallback,
        retryMode: task.retryMode,
        retryAttempts: task.retryAttempts,
        retryTime: task.retryTime,
        cc: task.cc,
        escalation: task.escalation,
        instructions: task.instructions
      }))
    }))
  );
}

function isTested() {
  return Boolean(testedKey && stages.length && testedKey === blueprintKey());
}

function setGatedButton(button, enabled, gateId, title) {
  if (!button) return;
  if (enabled) {
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.removeAttribute("aria-describedby");
    button.removeAttribute("title");
  } else {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    if (gateId) button.setAttribute("aria-describedby", gateId);
    if (title) button.title = title;
  }
}

function syncPublishGate() {
  if (publishing) return;
  const passed = isTested();
  const onDescribe = step === "describe";
  const onBlueprint = step === "blueprint";
  const onReview = step === "review";
  const canAct = onReview && !revealing && stages.length > 0 && passed;
  const canContinue =
    onBlueprint && !revealing && stages.length > 0 && passed;

  if (wizardForward) {
    wizardForward.hidden = onReview;
    wizardForward.classList.toggle("is-ready", onBlueprint && passed);
  }
  if (wizardForwardPath) wizardForwardPath.hidden = !onBlueprint;

  if (testBtn) testBtn.hidden = !onBlueprint;
  if (templateBtn) templateBtn.hidden = !onReview;
  if (publishBtn) publishBtn.hidden = !onReview;
  if (btnNext) btnNext.hidden = onReview;
  if (testOk) testOk.classList.toggle("slds-hide", !(onBlueprint && passed));
  if (testLabel) testLabel.textContent = passed ? "Tested" : "Test run blueprint";
  if (testBtn) {
    testBtn.classList.toggle("slds-button_brand", onBlueprint && !passed);
    testBtn.classList.toggle("slds-button_neutral", onBlueprint && passed);
    testBtn.classList.toggle("is-passed", onBlueprint && passed);
    testBtn.disabled = Boolean(onBlueprint && revealing);
    if (onBlueprint && revealing) {
      testBtn.setAttribute("aria-disabled", "true");
      testBtn.title = "Blueprint is still generating";
    } else {
      testBtn.removeAttribute("aria-disabled");
      testBtn.removeAttribute("title");
    }
  }
  setGatedButton(
    templateBtn,
    canAct,
    "template-gate",
    canAct ? "" : stages.length ? "Test the blueprint before saving as a template" : "Add a blueprint before saving as a template"
  );
  setGatedButton(
    publishBtn,
    canAct,
    "publish-gate",
    canAct ? "" : stages.length ? "Test the blueprint before publishing" : "Add a blueprint before publishing"
  );
  if (publishLabel) publishLabel.textContent = "Publish";

  if (onDescribe) {
    setGatedButton(btnNext, true);
    if (btnNext) {
      btnNext.classList.remove("is-locked");
      btnNext.removeAttribute("title");
    }
    if (wizardNextWrap) wizardNextWrap.removeAttribute("title");
  } else if (onBlueprint) {
    const nextTitle = revealing
      ? "Wait for generation to finish, then test"
      : !stages.length
        ? "Add steps, then test the blueprint"
        : passed
          ? ""
          : "Test the blueprint to unlock Review";
    setGatedButton(btnNext, canContinue, canContinue ? null : "next-gate", nextTitle);
    if (btnNext) {
      btnNext.classList.toggle("is-locked", !canContinue);
      btnNext.removeAttribute("title");
    }
    // Title on the wrap so hover still works while the button is disabled.
    if (wizardNextWrap) {
      if (nextTitle) wizardNextWrap.title = nextTitle;
      else wizardNextWrap.removeAttribute("title");
    }
  }
}

function countBlueprintTasks() {
  return stages.reduce((n, entry) => n + ((entry.tasks && entry.tasks.length) || 0), 0);
}

function countBlueprintAgents() {
  const set = {};
  stages.forEach((entry) => {
    (entry.tasks || []).forEach((task) => {
      if (task.who) set[task.who] = true;
    });
  });
  return Object.keys(set).length;
}

function renderSummary() {
  if (!reviewSummary) return;
  const item = draft();
  const tested = isTested();
  const taskCount = countBlueprintTasks();
  const agentCount = countBlueprintAgents();
  const fileCount = (item.files && item.files.length) || 0;
  const linkCount = (item.links && item.links.length) || 0;
  const stageFlow = [];
  if (stages.length) {
    stageFlow.push(
      '<div class="ap-review-chain__node ap-review-chain__node_terminal">' +
        '<span class="ap-review-chain__rail" aria-hidden="true">' +
        '<span class="ap-review-chain__dot"></span></span>' +
        '<div class="ap-review-chain__body">' +
        '<p class="ap-review-chain__name">Start</p>' +
        '<p class="ap-review-chain__meta">Workflow begins</p>' +
        "</div></div>"
    );

    stages.forEach((entry, index) => {
      const tasks = entry.tasks || [];
      const prior =
        entry.startKind === "previous"
          ? findStage(entry.dependsOn) || stages[index - 1]
          : entry.startKind === "workflow"
            ? null
            : findStage(entry.dependsOn);
      const edgeLabel =
        entry.startKind === "workflow"
          ? "On start"
          : entry.startKind === "custom"
            ? truncateFlowLabel(entry.customRule || "Custom", 28)
            : prior
              ? "After " + truncateFlowLabel(prior.name, 24)
              : "Next";

      const assignees = [];
      const seen = {};
      tasks.forEach((task) => {
        if (!task.who || seen[task.who]) return;
        seen[task.who] = true;
        assignees.push({
          who: task.who,
          kind: task.kind || (task.who === "Relationship Manager" ? "person" : "agent")
        });
      });
      const chips = assignees.map((assignee) => agentTag(assignee.who, assignee.kind)).join("");

      stageFlow.push(
        '<div class="ap-review-chain__edge" aria-hidden="true">' +
          '<span class="ap-review-chain__edge-line"></span>' +
          '<span class="ap-review-chain__edge-label">' +
          escapeHtml(edgeLabel) +
          "</span></div>"
      );

      stageFlow.push(
        '<div class="ap-review-chain__node">' +
          '<span class="ap-review-chain__rail" aria-hidden="true">' +
          '<span class="ap-review-chain__num">' +
          escapeHtml(entry.number || String(index + 1)) +
          "</span></span>" +
          '<div class="ap-review-chain__body">' +
          '<p class="ap-review-chain__name">' +
          escapeHtml(entry.name || "Untitled step") +
          "</p>" +
          '<p class="ap-review-chain__meta">' +
          tasks.length +
          (tasks.length === 1 ? " task" : " tasks") +
          (entry.parallel ? " · parallel" : "") +
          "</p>" +
          (assignees.length
            ? '<div class="ap-review-summary__assignees">' + chips + "</div>"
            : '<p class="ap-review-chain__meta">No assignees</p>') +
          "</div></div>"
      );
    });

    stageFlow.push(
      '<div class="ap-review-chain__edge" aria-hidden="true">' +
        '<span class="ap-review-chain__edge-line"></span>' +
        '<span class="ap-review-chain__edge-label">Ready</span></div>'
    );
    stageFlow.push(
      '<div class="ap-review-chain__node ap-review-chain__node_terminal ap-review-chain__node_end">' +
        '<span class="ap-review-chain__rail" aria-hidden="true">' +
        '<span class="ap-review-chain__dot ap-review-chain__dot_end"></span></span>' +
        '<div class="ap-review-chain__body">' +
        '<p class="ap-review-chain__name">Publish</p>' +
        '<p class="ap-review-chain__meta">Available to org</p>' +
        "</div></div>"
    );
  }

  const contextBits = [];
  if (fileCount) contextBits.push(fileCount + (fileCount === 1 ? " file" : " files"));
  if (linkCount) contextBits.push(linkCount + (linkCount === 1 ? " link" : " links"));
  const contextLine = contextBits.length ? contextBits.join(" · ") : "None attached";
  const contextTotal = fileCount + linkCount;

  const countsHtml =
    '<p class="ap-review-summary__counts" aria-label="Blueprint metrics">' +
    "<strong>" +
    stages.length +
    "</strong> " +
    (stages.length === 1 ? "step" : "steps") +
    " · <strong>" +
    taskCount +
    "</strong> " +
    (taskCount === 1 ? "task" : "tasks") +
    " · <strong>" +
    agentCount +
    "</strong> " +
    (agentCount === 1 ? "assignee" : "assignees") +
    " · <strong>" +
    contextTotal +
    "</strong> context</p>";

  reviewSummary.innerHTML =
    '<dl class="ap-review-summary__facts" aria-label="Workflow details">' +
    '<div class="ap-review-summary__fact">' +
    '<dt class="ap-review-summary__fact-label">Workflow name</dt>' +
    '<dd class="ap-review-summary__fact-value">' +
    escapeHtml(item.name || "Untitled workflow") +
    "</dd></div>" +
    '<div class="ap-review-summary__fact">' +
    '<dt class="ap-review-summary__fact-label">Industry</dt>' +
    '<dd class="ap-review-summary__fact-value">' +
    escapeHtml(item.industry || "—") +
    "</dd></div>" +
    '<div class="ap-review-summary__fact">' +
    '<dt class="ap-review-summary__fact-label">Context</dt>' +
    '<dd class="ap-review-summary__fact-value">' +
    escapeHtml(contextLine) +
    "</dd></div>" +
    "</dl>" +
    '<section class="ap-review-summary__section">' +
    '<h4 class="ap-review-summary__section-title">Readiness</h4>' +
    '<ul class="ap-review-summary__readiness">' +
    readinessItem(
      Boolean(stages.length),
      "Blueprint ready",
      stages.length ? stages.length + " steps · " + taskCount + " tasks" : "Add steps on Generate Workflow blueprint"
    ) +
    readinessItem(
      tested,
      "Test run",
      tested
        ? "Passed on current blueprint"
        : "Run Test run blueprint on Generate Workflow blueprint before Save as template or Publish"
    ) +
    readinessItem(
      canPublishReady(stages.length, tested),
      "Ready to publish",
      canPublishReady(stages.length, tested)
        ? "Save as template and Publish are available in the header"
        : "Complete the items above to enable Save as template and Publish"
    ) +
    "</ul></section>";

  if (reviewBlueprint) {
    reviewBlueprint.innerHTML =
      '<h4 class="ap-review-summary__section-title">Blueprint</h4>' +
      countsHtml +
      (stages.length
        ? '<div class="ap-review-chain" role="img" aria-label="Workflow from start through ' +
          stages.length +
          ' steps to publish">' +
          stageFlow.join("") +
          "</div>"
        : '<p class="ap-review-summary__empty">No blueprint yet. Generate steps on Generate Workflow blueprint.</p>');
  }
}

function canPublishReady(hasStages, tested) {
  return Boolean(hasStages && tested);
}

function readinessItem(ok, label, detail) {
  return (
    '<li class="ap-review-summary__ready' +
    (ok ? " is-ok" : "") +
    '"><span class="ap-review-summary__ready-mark" aria-hidden="true">' +
    '<svg class="ap-review-summary__ready-tick" viewBox="0 0 12 12" focusable="false">' +
    '<path d="M2.2 6.2l2.4 2.4 5.2-5.2" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg></span><div><p class="ap-review-summary__ready-label">' +
    escapeHtml(label) +
    '</p><p class="ap-review-summary__ready-detail">' +
    escapeHtml(detail) +
    "</p></div></li>"
  );
}

function truncateFlowLabel(value, max) {
  const text = String(value || "");
  const limit = max || 28;
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

function stopProgressiveGenerate() {
  window.clearTimeout(genTimer);
  window.clearTimeout(taskTimer);
  genTimer = null;
  taskTimer = null;
  revealing = false;
  genToken += 1;
  if (genLoader) genLoader.hidden = true;
  const reviewPanel = document.querySelector(".ap-review__panel");
  if (reviewPanel) reviewPanel.classList.remove("is-generating");
}

function contextCount() {
  return contextItems.length;
}

function genLoaderSteps() {
  const industry = industryValue();
  const count = contextCount();
  return [
    {
      id: "understand",
      name: "Understand the brief",
      working: "Reading the workflow name, industry, and process description.",
      done: "Matched the brief to Gather Inputs, Create Plan, specialist outreach, and RM review.",
      reveal: false
    },
    {
      id: "access",
      name: "Check context access",
      working: "Checking files and links added in Describe.",
      done: count
        ? "Checked " + count + " context " + (count === 1 ? "item" : "items") + ". All are accessible."
        : "No extra context was added. Using the process description only.",
      reveal: false
    },
    {
      id: "compliance",
      name: "Apply industry compliance",
      working: "Selecting compliance rules from the industry.",
      done: "Applied " + industry + " compliance.",
      reveal: false
    },
    {
      id: "proposeSteps",
      name: "Propose steps",
      working: "Turning the process description into four workflow steps.",
      done: "4 steps proposed: Gather Inputs, Create Plan, specialist outreach, RM review.",
      reveal: "stages"
    },
    {
      id: "proposeTasks",
      name: "Propose tasks",
      working: "Adding gather, plan, specialist, and RM review work to each step.",
      done: "7 agent tasks · 1 person task on RM review.",
      reveal: "tasks"
    },
    {
      id: "assignAgents",
      name: "Assign agents",
      working: "Choosing which agent or person owns each task.",
      done: "7 agents · Relationship Manager",
      reveal: false
    },
    {
      id: "check",
      name: "Check the draft",
      working: "Confirming every task has an owner and the tree is complete.",
      done: "Blueprint complete. Nothing was published.",
      reveal: false
    }
  ];
}

function showGenLoaderStep(entry, mode) {
  if (!genLoader) return;
  genLoader.hidden = false;
  if (genLoaderCard) genLoaderCard.classList.toggle("ap-gen-loader__card_done", mode === "done");
  if (genLoaderMark) {
    genLoaderMark.className =
      "ap-gen-loader__mark " + (mode === "done" ? "ap-gen-loader__mark_done" : "ap-gen-loader__mark_working");
    genLoaderMark.textContent = "";
  }
  if (genLoaderTitle) genLoaderTitle.textContent = entry.name;
  if (genLoaderDetail) genLoaderDetail.textContent = mode === "done" ? entry.done : entry.working;
}

function hideGenLoader() {
  if (genLoader) genLoader.hidden = true;
}

function showSkeletonStages(count) {
  outline.replaceChildren();
  outline.hidden = false;
  for (let i = 0; i < count; i += 1) {
    outline.appendChild(makeSkelStage());
  }
}

function revealStageAt(source, index) {
  const stage = source[index];
  if (!stage) return;
  const skels = outline.querySelectorAll(".ap-outline__stage_skel");
  if (skels[0]) skels[0].remove();
  const pending = (stage.tasks || []).slice();
  const live = Object.assign({}, stage, {
    tasks: [],
    owner: stage.owner ? Object.assign({}, stage.owner) : undefined
  });
  stages.push(live);
  renumberStages();
  const li = renderStage(live, { expectTasks: pending.length > 0 });
  li.classList.add("ap-outline__stage_enter");
  const body = li.querySelector("tbody");
  if (body && pending.length) {
    pending.forEach(() => body.appendChild(makeTaskSkelRow()));
  }
  // Insert before remaining skeletons so real stages stack from the top.
  const nextSkel = outline.querySelector(".ap-outline__stage_skel");
  if (nextSkel) outline.insertBefore(li, nextSkel);
  else outline.appendChild(li);
  outline.hidden = false;
}

function buildTaskQueue(source) {
  const queue = [];
  source.forEach((stage) => {
    if (stage.tasks && stage.tasks.length) {
      stage.tasks.forEach((task) => queue.push({ stageId: stage.id, task: task }));
    } else {
      queue.push({ stageId: stage.id, owner: true });
    }
  });
  return queue;
}

function startProgressiveGenerate() {
  window.clearTimeout(genTimer);
  window.clearTimeout(taskTimer);
  genTimer = null;
  taskTimer = null;
  const token = ++genToken;
  revealing = true;
  stages = [];
  generated = false;
  testedKey = "";
  if (blueprintIntro) blueprintIntro.hidden = false;
  blueprintEmpty.hidden = true;
  outline.hidden = false;
  const reviewPanel = document.querySelector(".ap-review__panel");
  if (reviewPanel) reviewPanel.classList.add("is-generating");
  showSkeletonStages(FALLBACK_BLUEPRINT.length);
  showGenLoaderStep(
    {
      name: "Understand the brief",
      working: "Reading the workflow name, industry, and process description.",
      done: ""
    },
    "working"
  );
  announce("Agents are drafting the blueprint…");
  syncPublishGate();

  const source = cloneBlueprint(FALLBACK_BLUEPRINT);
  const loaderSteps = genLoaderSteps();
  let loaderIndex = 0;
  let stageRevealIndex = 0;
  let taskQueue = [];
  let taskIndex = 0;

  function alive() {
    return revealing && token === genToken;
  }

  function finishGenerate() {
    if (!alive()) return;
    outline.querySelectorAll(".ap-outline__stage_skel").forEach((node) => node.remove());
    outline.querySelectorAll(".ap-outline__task-skel").forEach((node) => node.remove());
    if (reviewPanel) reviewPanel.classList.remove("is-generating");
    revealing = false;
    generated = true;
    hideGenLoader();
    renumberStages();
    announce("Blueprint drafted. Review stages, then continue to Review & Publish.");
    persist();
    syncPublishGate();
  }

  function fillNextTask() {
    if (!alive()) return;
    if (taskIndex >= taskQueue.length) {
      finishGenerate();
      return;
    }
    const item = taskQueue[taskIndex++];
    if (!item.owner) {
      const live = findStage(item.stageId);
      const li = outline.querySelector('[data-step-id="' + item.stageId + '"]');
      if (live && li) {
        live.tasks.push(Object.assign({}, item.task));
        renumberStages();
        const body = li.querySelector("tbody");
        if (body) {
          const skelRow = body.querySelector(".ap-outline__task-skel");
          if (skelRow) skelRow.remove();
          const tr = renderTask(live, live.tasks[live.tasks.length - 1]);
          tr.classList.add("ap-outline__row_enter");
          body.appendChild(tr);
        }
      }
    }
    taskTimer = window.setTimeout(fillNextTask, GEN_TASK_MS);
  }

  function revealNextStage() {
    if (!alive()) return;
    if (stageRevealIndex >= source.length) {
      showGenLoaderStep(loaderSteps[loaderIndex], "done");
      loaderIndex += 1;
      genTimer = window.setTimeout(runLoader, Math.round(GEN_LOADER_MS * 0.5));
      return;
    }
    revealStageAt(source, stageRevealIndex);
    stageRevealIndex += 1;
    genTimer = window.setTimeout(revealNextStage, GEN_STEP_MS);
  }

  function runLoader() {
    if (!alive()) return;
    if (loaderIndex >= loaderSteps.length) {
      taskQueue = buildTaskQueue(source);
      taskIndex = 0;
      if (!taskQueue.length) {
        finishGenerate();
        return;
      }
      showGenLoaderStep(
        {
          name: "Writing tasks",
          working: "Filling tasks into each workflow step…",
          done: "Tasks ready."
        },
        "working"
      );
      fillNextTask();
      return;
    }

    const entry = loaderSteps[loaderIndex];
    showGenLoaderStep(entry, "working");

    genTimer = window.setTimeout(() => {
      if (!alive()) return;
      showGenLoaderStep(entry, "done");

      if (entry.reveal === "stages") {
        genTimer = window.setTimeout(revealNextStage, Math.round(GEN_LOADER_MS * 0.4));
        return;
      }

      if (entry.reveal === "tasks") {
        // Tasks fill after all loader copy steps; keep advancing the status line.
        loaderIndex += 1;
        genTimer = window.setTimeout(runLoader, Math.round(GEN_LOADER_MS * 0.55));
        return;
      }

      loaderIndex += 1;
      genTimer = window.setTimeout(runLoader, Math.round(GEN_LOADER_MS * 0.55));
    }, GEN_LOADER_MS);
  }

  genTimer = window.setTimeout(runLoader, 200);
}

function ensureBlueprint(animate) {
  // Keep an existing blueprint (e.g. from Use template) unless regenerating.
  if (stages.length && !animate) {
    generated = true;
    revealing = false;
    hideGenLoader();
    renderOutline();
    return;
  }
  if (!buildWithAgentOn()) {
    stopProgressiveGenerate();
    stages = [];
    generated = false;
    hideGenLoader();
    renderOutline();
    return;
  }
  if (animate) {
    stages = [];
    generated = false;
    startProgressiveGenerate();
    return;
  }
  stopProgressiveGenerate();
  stages = cloneBlueprint(FALLBACK_BLUEPRINT);
  generated = true;
  hideGenLoader();
  renderOutline();
}

function cloneBlueprint(source) {
  return source.map((stage) =>
    Object.assign({}, stage, {
      owner: stage.owner ? Object.assign({}, stage.owner) : undefined,
      tasks: (stage.tasks || []).map((task) => normalizeTask(Object.assign({}, task)))
    })
  );
}

function showStep(next, options) {
  options = options || {};
  if (next === "blueprint" || next === "review") {
    if (!validDescribe()) {
      next = "describe";
    }
  }
  if (next !== "blueprint" && revealing) {
    stopProgressiveGenerate();
    stages = cloneBlueprint(FALLBACK_BLUEPRINT);
    generated = true;
    hideGenLoader();
  }

  const prevStep = step;
  step = next;

  STEPS.forEach((id) => {
    const panel = document.getElementById("panel-" + id);
    if (panel) panel.hidden = id !== step;
  });

  document.querySelectorAll(".ap-wizard__step").forEach((btn) => {
    const id = btn.getAttribute("data-step");
    const index = STEPS.indexOf(id);
    const current = STEPS.indexOf(step);
    const item = btn.closest(".ap-wizard__step-item");
    const active = id === step;
    const done = index < current;
    btn.classList.toggle("ap-wizard__step_active", active);
    btn.classList.toggle("ap-wizard__step_done", done);
    if (item) {
      item.classList.toggle("ap-wizard__step-item_active", active);
      item.classList.toggle("ap-wizard__step-item_done", done);
    }
    if (active) btn.setAttribute("aria-current", "step");
    else btn.removeAttribute("aria-current");
  });

  btnPrev.hidden = false;
  syncNextLabel();

  // Entering blueprint: show the panel first, then start progressive generation.
  if (step === "blueprint" && (options.entering || prevStep !== "blueprint")) {
    const shouldAnimate = Boolean(options.animate) && buildWithAgentOn();
    ensureBlueprint(shouldAnimate);
  }
  if (step === "review") {
    if (!stages.length && buildWithAgentOn()) {
      ensureBlueprint(false);
    }
    if (!stages.length) {
      announce("Generate or add a blueprint before publishing.");
      showStep("blueprint", { entering: true, animate: buildWithAgentOn() });
      return;
    }
    renderSummary();
  }

  syncPageTitle();
  syncPublishGate();
  if (!revealing) persist({ phase: step });
}

function syncPageTitle() {
  const name = (nameInput && nameInput.value.trim()) || "";
  const title = name ? "Workflow: " + name : "New workflow";
  if (wizardTitle) wizardTitle.textContent = title;
  document.title = title;
}

function syncNextLabel() {
  if (!btnNext) return;
  if (step === "describe") {
    btnNext.textContent = buildWithAgentOn()
      ? "Next: Generate Workflow blueprint"
      : "Next: Create Workflow";
    return;
  }
  btnNext.textContent = "Next: Review & Publish";
}

function goLanding(query) {
  const base = landingHref();
  if (!query) {
    window.location.href = base;
    return;
  }
  const q = String(query).replace(/^\?/, "");
  window.location.href = base + (base.indexOf("?") >= 0 ? "&" : "?") + q;
}

function saveDraft() {
  if (step !== "describe" || validDescribe()) {
    persist({ stage: "Draft", ready: generated });
    announce("Draft saved.");
  }
}

function finishPublish() {
  const item = persist({ stage: "Live", ready: true, available: true, published: new Date().toISOString().slice(0, 10) });
  if (window.parent && window.parent !== window && window.parent.APLanding && typeof window.parent.APLanding.upsertFromDraft === "function") {
    window.parent.APLanding.upsertFromDraft(item);
  }
  // Keep ap-create-draft so Workflow Setup landing can upsert from ?published=1, then clear it.
  goLanding("?published=1");
}

function publish() {
  if (publishing) return;
  if (publishBtn && (publishBtn.disabled || publishBtn.getAttribute("aria-disabled") === "true") && !isTested()) {
    announce("Test the blueprint before publishing.");
    return;
  }
  if (!validDescribe()) {
    showStep("describe");
    return;
  }
  if (revealing) {
    announce("Wait for blueprint generation to finish before publishing.");
    return;
  }
  if (!stages.length) {
    showStep("blueprint", { entering: true, animate: false });
    announce("Generate or add a blueprint before publishing.");
    return;
  }
  if (!isTested()) {
    showStep("blueprint", { entering: true, animate: false });
    announce("Test the blueprint before publishing.");
    return;
  }
  if (step !== "review") {
    showStep("review");
    announce("Review the summary, then publish.");
    return;
  }
  publishing = true;
  if (publishBtn) {
    publishBtn.setAttribute("aria-busy", "true");
    publishBtn.classList.add("is-publishing");
  }
  if (publishSpin) publishSpin.classList.remove("slds-hide");
  if (publishLabel) publishLabel.textContent = "Publishing…";
  announce("Publishing workflow…");
  window.setTimeout(finishPublish, 1100);
}

document.querySelectorAll(".ap-wizard__step").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-step");
    if (target === step) return;
    const forward = STEPS.indexOf(target) > STEPS.indexOf(step);
    if (forward && target !== "describe" && !validDescribe()) return;
    if (forward && target === "review" && !stages.length) {
      announce("Generate or add a blueprint before continuing.");
      showStep("blueprint", { entering: true, animate: buildWithAgentOn() });
      return;
    }
    if (forward && target === "review" && !isTested()) {
      announce("Run a successful test before Review & Publish.");
      showStep("blueprint", { entering: true, animate: false });
      if (testBtn && !testBtn.hidden) testBtn.focus();
      return;
    }
    showStep(target, {
      entering: target === "blueprint",
      animate: target === "blueprint" && buildWithAgentOn() && (step === "describe" || !stages.length)
    });
  });
});

btnPrev.addEventListener("click", () => {
  const index = STEPS.indexOf(step);
  if (index > 0) showStep(STEPS[index - 1]);
  else goLanding();
});

btnNext.addEventListener("click", () => {
  if (step === "describe") {
    if (!validDescribe()) return;
    // Always replay progressive generation when Build with agent is on.
    if (buildWithAgentOn()) {
      stages = [];
      generated = false;
    }
    showStep("blueprint", { entering: true, animate: buildWithAgentOn() });
    return;
  }
  if (step === "blueprint") {
    if (revealing) {
      announce("Wait for blueprint generation to finish.");
      return;
    }
    if (!stages.length) {
      announce("Generate or add a blueprint before continuing.");
      return;
    }
    if (!isTested()) {
      announce("Run a successful test before Review & Publish.");
      if (testBtn && !testBtn.hidden) testBtn.focus();
      return;
    }
    showStep("review");
  }
});

if (publishBtn) publishBtn.addEventListener("click", publish);

document.getElementById("wizard-save").addEventListener("click", saveDraft);

if (nameInput) {
  nameInput.addEventListener("blur", () => {
    syncPageTitle();
    if (nameInput.value.trim()) persist();
  });
}

if (industryInput && industryCombobox && industryListbox) {
  industryInput.addEventListener("click", (event) => {
    event.preventDefault();
    toggleIndustryMenu();
  });
  industryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openIndustryMenu();
    } else if (event.key === "Escape") {
      closeIndustryMenu();
    }
  });
  industryListbox.querySelectorAll('[role="option"]').forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIndustry(option.getAttribute("data-value"));
      closeIndustryMenu();
      industryInput.focus();
    });
  });
  document.addEventListener("click", (event) => {
    if (!industryCombobox.contains(event.target)) closeIndustryMenu();
  });
}

function addFiles(fileList) {
  Array.from(fileList || []).forEach((file, index) => {
    if (!file || !file.name) return;
    const entry = {
      id: "upload-" + Date.now() + "-" + index,
      kind: "file",
      name: file.name,
      type: file.type || ""
    };
    if (file.type && file.type.indexOf("image/") === 0) {
      entry.preview = URL.createObjectURL(file);
    }
    contextItems.push(entry);
  });
  renderContext();
}

const fileInput = document.getElementById("file-input");
const fileDropzone = document.getElementById("file-dropzone");
fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});
["dragenter", "dragover"].forEach((type) => {
  fileDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileDropzone.classList.add("slds-has-drag-over");
  });
});
["dragleave", "drop"].forEach((type) => {
  fileDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileDropzone.classList.remove("slds-has-drag-over");
  });
});
fileDropzone.addEventListener("drop", (event) => {
  addFiles(event.dataTransfer && event.dataTransfer.files);
});

document.getElementById("context-link-add").addEventListener("click", () => {
  const url = (linkInput.value || "").trim();
  if (!url) {
    linkInput.focus();
    return;
  }
  contextItems.push({ id: "link-" + Date.now(), kind: "link", url: url });
  linkInput.value = "";
  renderContext();
});

function createTaskDraft(step) {
  const prior = (step.tasks || [])[(step.tasks || []).length - 1];
  return normalizeTask({
    id: "t-" + Date.now(),
    name: "",
    who: "History Agent",
    kind: "agent",
    startWhen: prior ? "After another task" : "When the stage starts",
    dependsOn: prior ? prior.id : "",
    instructions: "",
    sources: "",
    tags: ""
  });
}

function addWorkflowStep() {
  if (revealing) {
    announce("Wait for blueprint generation to finish before adding a step.");
    return;
  }
  const prior = stages[stages.length - 1];
  const step = {
    id: "custom-" + Date.now(),
    name: "New workflow step",
    descriptor: "Describe what happens in this step.",
    startKind: prior ? "previous" : "workflow",
    dependsOn: prior ? prior.id : "",
    parallel: false,
    tasks: []
  };
  stages.push(step);
  generated = true;
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  const live = findStage(step.id);
  openStep(live || step, { isNew: true });
  announce("Add at least one task, then save this workflow step.");
}

function addTaskToStage(stageId) {
  if (revealing) {
    announce("Wait for blueprint generation to finish before adding a task.");
    return;
  }
  const live = findStage(stageId);
  if (!live) return;
  // After add, land back on the step modal so more tasks can be added without reopening.
  returnToStepId = live.id;
  stepDraft = JSON.parse(JSON.stringify(live));
  openAddTask(live, { stacked: true });
}

function addContainedTask() {
  if (!stepDraft) return;
  const live = findStage(stepDraft.id) || stepDraft;
  returnToStepId = stepDraft.id;
  openAddTask(live, { stacked: true });
}

document.querySelectorAll("#add-step, #blueprint-add-step").forEach((button) => {
  button.addEventListener("click", addWorkflowStep);
});
const stepAddTask = document.getElementById("step-add-task");
if (stepAddTask) stepAddTask.addEventListener("click", addContainedTask);
const reorderSave = document.getElementById("reorder-save");
if (reorderSave) reorderSave.addEventListener("click", saveReorder);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let testOutcome = "idle";
let testIssues = [];
let testStallTicks = 0;
let testLastFingerprint = "";
const TEST_STALL_TICKS = 8;

const testBanner = document.getElementById("test-banner");
const testBannerLabel = document.getElementById("test-banner-label");
const testBannerDetail = document.getElementById("test-banner-detail");
const testResolve = document.getElementById("test-resolve");
const testResolveList = document.getElementById("test-resolve-list");
const testRerun = document.getElementById("test-rerun");
const testFixFirst = document.getElementById("test-fix-first");

function isPersonStep(entry) {
  return Boolean(entry.owner) && !(entry.tasks && entry.tasks.length);
}

function canStartTask(entry, task) {
  if (testStepState[entry.id] !== "running") return false;
  if (testTaskState[task.id] === "failed") return false;
  if (task.startWhen === "After another task" && task.dependsOn) {
    const depState = testTaskState[task.dependsOn];
    if (depState === "failed") return false;
    return depState === "done";
  }
  return true;
}

function collectTestIssues() {
  const issues = [];
  stages.forEach((step) => {
    if (!(step.name || "").trim()) {
      issues.push({
        id: "step-name-" + step.id,
        stepId: step.id,
        severity: "error",
        title: "Step is missing a name",
        detail: "Every workflow step needs a name so agents and people know what to run.",
        action: "Edit step",
        fix: { type: "step", stepId: step.id }
      });
    }
    const tasks = step.tasks || [];
    if (!tasks.length) {
      issues.push({
        id: "empty-" + step.id,
        stepId: step.id,
        severity: "error",
        title: "Step “" + (step.name || "Untitled") + "” needs a task",
        detail: "Every workflow step must include at least one task before you can test or publish.",
        action: "Add task",
        fix: { type: "add-task", stepId: step.id }
      });
    }
    const byId = {};
    tasks.forEach((task) => {
      byId[task.id] = task;
    });
    tasks.forEach((task) => {
      if (!(task.name || "").trim()) {
        issues.push({
          id: "task-name-" + task.id,
          stepId: step.id,
          taskId: task.id,
          severity: "error",
          title: "A task in “" + (step.name || "Untitled") + "” is missing a name",
          detail: "Name the task so the test run and agents can identify it.",
          action: "Edit task",
          fix: { type: "task", stepId: step.id, taskId: task.id }
        });
      }
      if (!(task.who || "").trim()) {
        issues.push({
          id: "task-who-" + task.id,
          stepId: step.id,
          taskId: task.id,
          severity: "error",
          title: "Task “" + (task.name || "Untitled") + "” has no assignee",
          detail: "Assign an agent or person so the task can run.",
          action: "Edit task",
          fix: { type: "task", stepId: step.id, taskId: task.id }
        });
      }
      if (task.startWhen === "After another task") {
        if (!task.dependsOn) {
          issues.push({
            id: "task-dep-missing-" + task.id,
            stepId: step.id,
            taskId: task.id,
            severity: "error",
            title: "Task “" + (task.name || "Untitled") + "” waits on another task, but none is selected",
            detail: "Choose a dependency task, or change Start to “When the stage starts”.",
            action: "Edit task",
            fix: { type: "task", stepId: step.id, taskId: task.id }
          });
        } else if (!byId[task.dependsOn]) {
          issues.push({
            id: "task-dep-bad-" + task.id,
            stepId: step.id,
            taskId: task.id,
            severity: "error",
            title: "Task “" + (task.name || "Untitled") + "” depends on a task that is not in this step",
            detail: "Pick a dependency from the same step, or remove the dependency.",
            action: "Edit task",
            fix: { type: "task", stepId: step.id, taskId: task.id }
          });
        }
      }
    });
    // Cycle detection within the step
    tasks.forEach((task) => {
      const seen = {};
      let cursor = task;
      while (cursor && cursor.startWhen === "After another task" && cursor.dependsOn) {
        if (seen[cursor.id]) {
          issues.push({
            id: "task-cycle-" + task.id,
            stepId: step.id,
            taskId: task.id,
            severity: "error",
            title: "Circular dependency involving “" + (task.name || "Untitled") + "”",
            detail: "Break the loop by changing one task’s Start / dependency.",
            action: "Edit task",
            fix: { type: "task", stepId: step.id, taskId: task.id }
          });
          break;
        }
        seen[cursor.id] = true;
        cursor = byId[cursor.dependsOn];
      }
    });
  });
  // Dedupe by id
  const unique = [];
  const seenIds = {};
  issues.forEach((issue) => {
    if (seenIds[issue.id]) return;
    seenIds[issue.id] = true;
    unique.push(issue);
  });
  return unique;
}

function setTestBanner(outcome, label, detail) {
  testOutcome = outcome;
  if (!testBanner) return;
  testBanner.className = "ap-test-banner ap-test-banner_" + outcome;
  if (testBannerLabel) testBannerLabel.textContent = label;
  if (testBannerDetail) testBannerDetail.textContent = detail || "";
}

function syncTestFooter() {
  const failed = testOutcome === "failed";
  const passed = testOutcome === "passed";
  const running = testOutcome === "running";
  const finished = passed || failed;
  if (testClose) {
    testClose.textContent = finished ? "Close" : "Cancel";
    testClose.classList.toggle("slds-button_brand", true);
    testClose.classList.toggle("slds-button_neutral", false);
  }
  if (testRerun) testRerun.classList.toggle("slds-hide", !finished);
  if (testFixFirst) testFixFirst.classList.toggle("slds-hide", !failed || !testIssues.length);
}

function renderTestIssues() {
  if (!testResolve || !testResolveList) return;
  const show = testOutcome === "failed" && testIssues.length > 0;
  testResolve.classList.toggle("slds-hide", !show);
  testResolveList.replaceChildren();
  if (!show) return;
  testIssues.forEach((issue, index) => {
    const li = document.createElement("li");
    li.className = "ap-test-resolve__item";
    li.innerHTML =
      '<div class="ap-test-resolve__body"><p class="ap-test-resolve__name">' +
      (index + 1) +
      ". " +
      escapeHtml(issue.title) +
      '</p><p class="ap-test-resolve__detail">' +
      escapeHtml(issue.detail) +
      '</p></div><button class="slds-button slds-button_neutral" type="button" data-fix-issue="' +
      escapeHtml(issue.id) +
      '">' +
      escapeHtml(issue.action || "Fix") +
      "</button>";
    li.querySelector("[data-fix-issue]").addEventListener("click", () => applyTestFix(issue));
    testResolveList.appendChild(li);
  });
}

function applyTestFix(issue) {
  if (!issue || !issue.fix) return;
  const step = findStage(issue.fix.stepId);
  if (!step) return;
  closeModals();
  if (issue.fix.type === "step") {
    openStep(step);
    announce("Update the step, save, then run the test again.");
    return;
  }
  if (issue.fix.type === "add-task") {
    returnToStepId = step.id;
    stepDraft = JSON.parse(JSON.stringify(step));
    openAddTask(step, { stacked: true });
    announce("Add a task (or make the step person-owned), then run the test again.");
    return;
  }
  if (issue.fix.type === "task") {
    const task = (step.tasks || []).find((entry) => entry.id === issue.fix.taskId);
    if (!task) {
      openStep(step);
      return;
    }
    returnToStepId = step.id;
    stepDraft = JSON.parse(JSON.stringify(step));
    openTask(step, task, { stacked: true });
    announce("Update the task, save, then run the test again.");
  }
}

function startStepWork(entry) {
  if (!entry) return;
  if (!(entry.tasks && entry.tasks.length)) {
    testStepState[entry.id] = "failed";
    return;
  }
  testStepState[entry.id] = "running";
  (entry.tasks || []).forEach((task) => {
    if (testTaskState[task.id] === "failed") return;
    if (canStartTask(entry, task) && testTaskState[task.id] === "hold") {
      testTaskState[task.id] = "running";
      testElapsed[task.id] = 0;
    }
  });
}

function resetTestState() {
  testTaskState = {};
  testStepState = {};
  testElapsed = {};
  testStallTicks = 0;
  testLastFingerprint = "";
  stages.forEach((entry, index) => {
    testStepState[entry.id] = index === 0 ? "running" : "hold";
    (entry.tasks || []).forEach((task) => {
      testTaskState[task.id] = "hold";
      testElapsed[task.id] = 0;
    });
  });
  if (stages[0]) startStepWork(stages[0]);
}

function workingStars() {
  return '<span class="ap-teststars" aria-hidden="true"><span></span><span></span><span></span></span>';
}

function renderTestTask(entry, task) {
  const state = testTaskState[task.id] || "hold";
  const who = task.who || "Agent";
  const tag =
    state === "hold" || state === "failed"
      ? ""
      : agentTag(state === "running" ? who + " is working" : who, task.kind);
  const hold = state === "hold" ? '<span class="ap-testtask__hold">On hold</span>' : "";
  const failed = state === "failed" ? '<span class="ap-testtask__fail">Failed</span>' : "";
  const stars = state === "running" ? workingStars() : "";
  return (
    '<li class="ap-testtask is-' +
    state +
    '"><span class="ap-testtask__id">' +
    escapeHtml(task.number || "") +
    '</span><span class="ap-testtask__name">' +
    escapeHtml(task.name) +
    "</span>" +
    tag +
    stars +
    hold +
    failed +
    "</li>"
  );
}

function renderTestStep(entry, index) {
  const state = testStepState[entry.id] || "hold";
  const hold = state === "hold" ? '<span class="ap-testcard__hold">On hold</span>' : "";
  const failed = state === "failed" ? '<span class="ap-testcard__fail">Failed</span>' : "";
  let body = "";
  if (isPersonStep(entry)) {
    const who = (entry.owner && entry.owner.who) || "Relationship Manager";
    const tag = state === "hold" || state === "failed" ? "" : agentTag(who, "person");
    const stars = state === "running" ? workingStars() : "";
    body = '<div class="ap-testtask is-' + state + '">' + tag + stars + "</div>";
  } else if (!(entry.tasks && entry.tasks.length)) {
    body = '<p class="ap-testcard__empty">This step needs at least one task.</p>';
  } else {
    body = '<ul class="ap-testtasks">' + (entry.tasks || []).map((task) => renderTestTask(entry, task)).join("") + "</ul>";
  }
  const li = document.createElement("li");
  li.className = "ap-testcard is-" + state;
  li.innerHTML =
    '<header class="ap-testcard__head"><span class="ap-testcard__num">' +
    escapeHtml(entry.number || String(index + 1)) +
    '</span><h4 class="ap-testcard__name">' +
    escapeHtml(entry.name) +
    "</h4>" +
    hold +
    failed +
    "</header>" +
    body;
  return li;
}

function testFingerprint() {
  return JSON.stringify({ steps: testStepState, tasks: testTaskState });
}

function renderTestRun() {
  if (!testStage || !testList) return;
  const current = stages.findIndex((entry) => testStepState[entry.id] === "running");
  const doneCount = stages.filter((entry) => testStepState[entry.id] === "done").length;
  const failedCount = stages.filter((entry) => testStepState[entry.id] === "failed").length;
  const stageIndex = current >= 0 ? current + 1 : Math.min(doneCount + failedCount + 1, stages.length || 1);
  if (testOutcome === "running") {
    testStage.textContent =
      "Stage " + stageIndex + " of " + stages.length + " · " + doneCount + " complete" + (failedCount ? " · " + failedCount + " failed" : "");
  } else if (testOutcome === "passed") {
    testStage.textContent = "All " + stages.length + " stages completed";
  } else if (testOutcome === "failed") {
    testStage.textContent = failedCount + " of " + stages.length + " stages failed · " + doneCount + " completed";
  } else {
    testStage.textContent = "Stage " + stageIndex + " of " + stages.length;
  }
  testList.replaceChildren();
  stages.forEach((entry, index) => testList.appendChild(renderTestStep(entry, index)));
  renderTestIssues();
  syncTestFooter();
}

const reorderModal = document.getElementById("reorder-modal");
const reorderList = document.getElementById("reorder-list");
const stepModal = document.getElementById("step-modal");
const taskModal = document.getElementById("task-modal");
const taskModalTitle = document.getElementById("task-modal-title");
const taskSaveBtn = document.getElementById("task-save");
const taskDeleteBtn = document.getElementById("task-delete");
let reorderDraft = [];
let stepDraft = null;
let stepDraftIsNew = false;
let taskDraft = null;
let taskParent = null;
let taskMode = "edit";
let returnToStepId = "";
let dragTaskId = "";

function stepHasTasks(step) {
  return Boolean(step && step.tasks && step.tasks.length);
}

function syncStepSaveGate(options) {
  options = options || {};
  const saveBtn = document.getElementById("step-save");
  const error = document.getElementById("step-task-error");
  const hasTasks = stepHasTasks(stepDraft);
  if (saveBtn) {
    saveBtn.disabled = !hasTasks;
    saveBtn.setAttribute("aria-disabled", hasTasks ? "false" : "true");
    if (hasTasks) {
      saveBtn.removeAttribute("title");
      saveBtn.removeAttribute("aria-describedby");
    } else {
      saveBtn.title = "Add at least one task before saving";
      if (error) saveBtn.setAttribute("aria-describedby", "step-task-error");
    }
  }
  if (error) {
    if (hasTasks) error.classList.add("slds-hide");
    else if (options.showError) error.classList.remove("slds-hide");
  }
}

function fillSelect(select, options, value) {
  if (!select) return;
  select.innerHTML = options
    .map((entry) => {
      const id = typeof entry === "string" ? entry : entry.id;
      const label = typeof entry === "string" ? entry : entry.name;
      return '<option value="' + id + '"' + (String(id) === String(value || "") ? " selected" : "") + ">" + label + "</option>";
    })
    .join("");
}

function syncStepStartUi() {
  const checked = document.querySelector('input[name="step-start"]:checked');
  if (!checked) return;
  const kind = checked.value;
  const customWrap = document.getElementById("step-custom-wrap");
  const depends = document.getElementById("step-depends");
  if (customWrap) customWrap.classList.toggle("slds-hide", kind !== "custom");
  if (depends) {
    depends.disabled = kind === "workflow";
    if (kind === "workflow") depends.value = "";
  }
}

function removeContainedTask(taskId) {
  if (!stepDraft) return;
  if ((stepDraft.tasks || []).length <= 1) {
    announce("Every workflow step needs at least one task. Add another task before removing this one.");
    syncStepSaveGate();
    return;
  }
  stepDraft.tasks = stepDraft.tasks.filter((entry) => entry.id !== taskId);
  renderContainedTasks();
}

function openContainedTask(taskId) {
  if (!stepDraft) return;
  const task = stepDraft.tasks.find((entry) => entry.id === taskId);
  const live = findStage(stepDraft.id);
  if (task && live) {
    returnToStepId = stepDraft.id;
    openTask(live, live.tasks.find((entry) => entry.id === task.id) || task, { stacked: true });
  }
}

function renderContainedTasks() {
  const body = document.getElementById("step-task-body");
  const empty = document.getElementById("step-task-empty");
  const wrap = document.getElementById("step-task-wrap");
  if (!body || !stepDraft) return;
  if (!stepDraft.tasks) stepDraft.tasks = [];
  document.getElementById("step-task-count").textContent = "Contained tasks · " + stepDraft.tasks.length;
  body.replaceChildren();
  if (empty) empty.classList.toggle("slds-hide", stepDraft.tasks.length > 0);
  if (wrap) wrap.classList.toggle("slds-hide", stepDraft.tasks.length === 0);
  syncStepSaveGate();
  stepDraft.tasks.forEach((task, index) => {
    const tr = document.createElement("tr");
    tr.draggable = true;
    tr.dataset.taskId = task.id;
    tr.innerHTML =
      '<td class="ap-drag"><span class="ap-drag__handle" title="Drag to reorder">' +
      icon("rows") +
      '</span></td><td><span class="ap-outline__numcell">' +
      (stepDraft.number || "") +
      "." +
      (index + 1) +
      '</span><button class="ap-linkish" type="button" data-open-contained="' +
      task.id +
      '">' +
      escapeHtml(task.name) +
      "</button></td><td><span class=\"ap-type ap-type_agent\">Agent</span></td><td>" +
      escapeHtml(displayTaskStart(stepDraft, task)) +
      "</td><td>" +
      escapeHtml(task.due || "Instant") +
      '</td><td><button class="slds-button slds-button_neutral" type="button" data-remove-contained="' +
      task.id +
      '">Remove</button></td>';
    tr.querySelector("[data-remove-contained]").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeContainedTask(task.id);
    });
    tr.querySelector("[data-open-contained]").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openContainedTask(task.id);
    });
    tr.addEventListener("dragstart", () => {
      dragTaskId = task.id;
    });
    tr.addEventListener("dragover", (event) => event.preventDefault());
    tr.addEventListener("drop", (event) => {
      event.preventDefault();
      const from = stepDraft.tasks.findIndex((entry) => entry.id === dragTaskId);
      const to = stepDraft.tasks.findIndex((entry) => entry.id === task.id);
      if (from < 0 || to < 0 || from === to) return;
      const moved = stepDraft.tasks.splice(from, 1)[0];
      stepDraft.tasks.splice(to, 0, moved);
      renderContainedTasks();
    });
    body.appendChild(tr);
  });
}

function openStep(step, options) {
  options = options || {};
  returnToStepId = "";
  stepDraftIsNew = Boolean(options.isNew);
  stepDraft = JSON.parse(JSON.stringify(step));
  if (!stepDraft.tasks) stepDraft.tasks = [];
  document.getElementById("step-modal-context").textContent =
    ((nameInput && nameInput.value.trim()) || "Account Plan Blueprint") + " / Stage " + step.number + " · " + step.name;
  document.getElementById("step-name").value = stepDraft.name;
  document.getElementById("step-desc").value = stepDraft.descriptor || "";
  document.getElementById("step-custom").value = stepDraft.customRule || "";
  document.querySelectorAll('input[name="step-start"]').forEach((input) => {
    input.checked = input.value === (stepDraft.startKind || "workflow");
  });
  const others = [{ id: "", name: "No dependency" }].concat(
    stages.filter((entry) => entry.id !== step.id).map((entry) => ({ id: entry.id, name: entry.name }))
  );
  fillSelect(document.getElementById("step-depends"), others, stepDraft.dependsOn || "");
  syncStepStartUi();
  renderContainedTasks();
  syncStepDeleteGate();
  openModal(stepModal);
  if (!stepHasTasks(stepDraft)) {
    const addBtn = document.getElementById("step-add-task");
    if (addBtn) addBtn.focus();
    else document.getElementById("step-name").focus();
  } else {
    document.getElementById("step-name").focus();
  }
}

function syncStepDeleteGate() {
  const btn = document.getElementById("step-delete");
  if (!btn) return;
  const onlyStep = stages.length <= 1;
  btn.disabled = onlyStep;
  btn.setAttribute("aria-disabled", onlyStep ? "true" : "false");
  btn.title = onlyStep ? "A workflow needs at least one step" : "";
  btn.classList.toggle("slds-hide", false);
}

function syncTaskModalChrome() {
  const adding = taskMode === "add";
  const onlyTask = !adding && taskParent && (taskParent.tasks || []).length <= 1;
  if (taskModalTitle) taskModalTitle.textContent = adding ? "Add task" : "Edit task";
  if (taskSaveBtn) taskSaveBtn.textContent = adding ? "Add task" : "Save changes";
  if (taskDeleteBtn) {
    taskDeleteBtn.classList.toggle("slds-hide", adding);
    taskDeleteBtn.disabled = onlyTask;
    taskDeleteBtn.setAttribute("aria-disabled", onlyTask ? "true" : "false");
    taskDeleteBtn.title = onlyTask
      ? "Every workflow step needs at least one task"
      : "";
  }
}

function syncRetryFields() {
  const modeEl = document.getElementById("task-retry-mode");
  const attemptsWrap = document.getElementById("task-retry-attempts-wrap");
  const timeWrap = document.getElementById("task-retry-time-wrap");
  const help = document.getElementById("task-retry-help");
  if (!modeEl) return;
  const mode = modeEl.value === "time" ? "time" : "attempts";
  if (attemptsWrap) attemptsWrap.classList.toggle("slds-hide", mode !== "attempts");
  if (timeWrap) timeWrap.classList.toggle("slds-hide", mode !== "time");
  if (help) {
    help.textContent =
      mode === "time"
        ? "Best case: succeed within the time window before fallback."
        : "Best case: succeed within the attempt count before fallback.";
  }
}

function filterOrgUsers(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return ORG_USERS.slice();
  return ORG_USERS.filter((user) => {
    return (
      user.name.toLowerCase().indexOf(q) !== -1 ||
      (user.title && user.title.toLowerCase().indexOf(q) !== -1) ||
      (user.email && user.email.toLowerCase().indexOf(q) !== -1)
    );
  });
}

function closeUserPick(root) {
  if (!root) return;
  const combo = root.querySelector(".ap-userpick__combo");
  const list = root.querySelector(".ap-userpick__list");
  if (combo) {
    combo.classList.remove("slds-is-open");
    combo.setAttribute("aria-expanded", "false");
  }
  if (list) list.hidden = true;
}

function closeAllUserPicks(except) {
  document.querySelectorAll(".ap-userpick").forEach((root) => {
    if (except && root === except) return;
    closeUserPick(root);
  });
}

function renderUserPickList(root, query, selectedName) {
  const list = root.querySelector(".ap-userpick__list");
  if (!list) return;
  const matches = filterOrgUsers(query);
  const typed = String(query || "").trim();
  const exact = matches.some((user) => user.name.toLowerCase() === typed.toLowerCase());
  list.replaceChildren();
  if (typed && !exact) {
    const manual = document.createElement("div");
    manual.className = "slds-listbox__option slds-listbox__option_plain slds-media slds-media_small ap-userpick__option";
    manual.setAttribute("role", "option");
    manual.setAttribute("data-value", typed);
    manual.innerHTML =
      '<span class="slds-media__body"><span class="slds-truncate" title="' +
      escapeHtml(typed) +
      '">Use “' +
      escapeHtml(typed) +
      '”</span><span class="ap-userpick__meta">Assign manually</span></span>';
    list.appendChild(manual);
  }
  if (!matches.length && !typed) {
    const empty = document.createElement("div");
    empty.className = "ap-userpick__empty";
    empty.textContent = "No people found";
    list.appendChild(empty);
  }
  matches.forEach((user) => {
    const option = document.createElement("div");
    const selected = user.name === selectedName;
    option.className =
      "slds-listbox__option slds-listbox__option_plain slds-media slds-media_small ap-userpick__option" +
      (selected ? " slds-is-selected" : "");
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", selected ? "true" : "false");
    option.setAttribute("data-value", user.name);
    option.innerHTML =
      '<span class="slds-media__body"><span class="slds-truncate" title="' +
      escapeHtml(user.name) +
      '">' +
      escapeHtml(user.name) +
      '</span><span class="ap-userpick__meta">' +
      escapeHtml(user.title || "") +
      (user.email ? " · " + escapeHtml(user.email) : "") +
      "</span></span>";
    list.appendChild(option);
  });
}

function openUserPick(root) {
  if (!root) return;
  const combo = root.querySelector(".ap-userpick__combo");
  const list = root.querySelector(".ap-userpick__list");
  const input = root.querySelector(".ap-userpick__input");
  if (!combo || !list || !input) return;
  closeAllUserPicks(root);
  renderUserPickList(root, input.value, input.value);
  combo.classList.add("slds-is-open");
  combo.setAttribute("aria-expanded", "true");
  list.hidden = false;
}

function setUserPickValue(root, value) {
  const input = root && root.querySelector(".ap-userpick__input");
  if (input) input.value = value || "";
  closeUserPick(root);
}

let userPickOutsideBound = false;

function bindUserPicks() {
  document.querySelectorAll(".ap-userpick").forEach((root) => {
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    const input = root.querySelector(".ap-userpick__input");
    const list = root.querySelector(".ap-userpick__list");
    if (!input || !list) return;

    input.addEventListener("focus", () => openUserPick(root));
    input.addEventListener("click", () => openUserPick(root));
    input.addEventListener("input", () => {
      openUserPick(root);
      renderUserPickList(root, input.value, input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUserPick(root);
        return;
      }
      if (event.key === "Enter") {
        const first = list.querySelector("[data-value]");
        if (first) {
          event.preventDefault();
          setUserPickValue(root, first.getAttribute("data-value"));
        } else {
          closeUserPick(root);
        }
      }
    });
    list.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) return;
      event.preventDefault();
      setUserPickValue(root, option.getAttribute("data-value"));
    });
  });

  if (!userPickOutsideBound) {
    userPickOutsideBound = true;
    document.addEventListener("mousedown", (event) => {
      if (event.target.closest(".ap-userpick")) return;
      closeAllUserPicks();
    });
  }
}

function populateTaskFields(step) {
  document.getElementById("task-name").value = taskDraft.name || "";
  document.getElementById("task-name").placeholder = taskMode === "add" ? "Enter task name" : "";
  fillSelect(document.getElementById("task-start"), ["When the stage starts", "After another task"], taskDraft.startWhen);
  const deps = [{ id: "", name: "No dependency" }].concat(
    (step.tasks || []).filter((entry) => entry.id !== taskDraft.id).map((entry) => ({ id: entry.id, name: entry.name }))
  );
  fillSelect(document.getElementById("task-depends"), deps, taskDraft.dependsOn || "");
  document.getElementById("task-due").value = taskDraft.due || "Instant";
  fillSelect(document.getElementById("task-who"), AGENTS, taskDraft.who);
  setUserPickValue(document.querySelector('[data-userpick="fallback"]'), taskDraft.fallback || DEFAULT_FALLBACK);
  setUserPickValue(document.querySelector('[data-userpick="cc"]'), taskDraft.cc || DEFAULT_CC);
  setUserPickValue(document.querySelector('[data-userpick="esc"]'), taskDraft.escalation || DEFAULT_ESCALATION);
  const retryMode = document.getElementById("task-retry-mode");
  const retryAttempts = document.getElementById("task-retry-attempts");
  const retryTime = document.getElementById("task-retry-time");
  if (retryMode) retryMode.value = taskDraft.retryMode || DEFAULT_RETRY_MODE;
  if (retryAttempts) retryAttempts.value = String(taskDraft.retryAttempts != null ? taskDraft.retryAttempts : DEFAULT_RETRY_ATTEMPTS);
  if (retryTime) retryTime.value = taskDraft.retryTime || DEFAULT_RETRY_TIME;
  syncRetryFields();
  const seed = taskSeedDefaults(taskDraft.id);
  const instructions = String(taskDraft.instructions || "").trim();
  const sources = String(taskDraft.sources || "").trim();
  const tags = String(taskDraft.tags || "").trim();
  document.getElementById("task-instructions").value = instructions || seed.instructions || "";
  document.getElementById("task-sources").textContent =
    sources || seed.sources || "No files attached";
  document.getElementById("task-tags").value = tags || seed.tags || "";
}

function openAddTask(step, options) {
  options = options || {};
  taskMode = "add";
  taskParent = step;
  taskDraft = createTaskDraft(step);
  const workflow = (nameInput && nameInput.value.trim()) || "Account Plan Blueprint";
  document.getElementById("task-modal-context").textContent =
    workflow + " / " + step.name + " / New task · Agent";
  syncTaskModalChrome();
  populateTaskFields(step);
  if (options.stacked) openTaskOverStep(taskModal);
  else {
    returnToStepId = "";
    openModal(taskModal);
  }
  document.getElementById("task-name").focus();
}

function openTask(step, task, options) {
  options = options || {};
  taskMode = "edit";
  taskParent = step;
  taskDraft = JSON.parse(JSON.stringify(normalizeTask(task)));
  const workflow = (nameInput && nameInput.value.trim()) || "Account Plan Blueprint";
  document.getElementById("task-modal-context").textContent =
    workflow +
    " / " +
    step.name +
    " / " +
    (task.number || "") +
    " · " +
    (task.kind === "person" ? "Person" : "Agent");
  syncTaskModalChrome();
  populateTaskFields(step);
  if (options.stacked) openTaskOverStep(taskModal);
  else {
    returnToStepId = "";
    openModal(taskModal);
  }
  document.getElementById("task-name").focus();
}

function saveStep() {
  const live = findStage(stepDraft.id);
  if (!live) return;
  if (!stepHasTasks(stepDraft)) {
    syncStepSaveGate({ showError: true });
    const addBtn = document.getElementById("step-add-task");
    if (addBtn) addBtn.focus();
    announce("Add at least one task before saving this workflow step.");
    return;
  }
  live.name = document.getElementById("step-name").value.trim() || live.name;
  live.descriptor = document.getElementById("step-desc").value.trim();
  live.startKind = document.querySelector('input[name="step-start"]:checked').value;
  live.customRule = document.getElementById("step-custom").value.trim();
  live.dependsOn = document.getElementById("step-depends").value;
  live.tasks = stepDraft.tasks.map((task) => normalizeTask(task));
  if (live.owner && live.tasks.length) delete live.owner;
  stepDraftIsNew = false;
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  closeModals();
  announce("Step updated.");
}

function readTaskForm(target) {
  const name = document.getElementById("task-name").value.trim();
  target.name = name || (taskMode === "add" ? "New task" : target.name || "New task");
  target.startWhen = document.getElementById("task-start").value;
  target.dependsOn = document.getElementById("task-depends").value;
  target.due = document.getElementById("task-due").value;
  target.who = document.getElementById("task-who").value;
  target.kind = target.who === "Relationship Manager" ? "person" : "agent";
  target.fallback = (document.getElementById("task-fallback").value || "").trim() || DEFAULT_FALLBACK;
  target.retryMode = document.getElementById("task-retry-mode").value === "time" ? "time" : "attempts";
  target.retryAttempts = document.getElementById("task-retry-attempts").value || DEFAULT_RETRY_ATTEMPTS;
  target.retryTime = document.getElementById("task-retry-time").value || DEFAULT_RETRY_TIME;
  target.cc = (document.getElementById("task-cc").value || "").trim() || "None";
  target.escalation = (document.getElementById("task-esc").value || "").trim() || "None";
  target.instructions = document.getElementById("task-instructions").value.trim();
  target.tags = document.getElementById("task-tags").value.trim();
  target.setupReady = Boolean(target.instructions);
  return target;
}

function saveTask() {
  if (!taskParent || !taskDraft) return;
  const liveStep = findStage(taskParent.id);
  if (!liveStep) return;
  if (!liveStep.tasks) liveStep.tasks = [];
  const shouldReturn = Boolean(returnToStepId);

  if (taskMode === "add") {
    const created = readTaskForm(normalizeTask(taskDraft));
    liveStep.tasks.push(created);
    if (liveStep.owner) delete liveStep.owner;
    testedKey = "";
    renumberStages();
    renderOutline();
    persist();
    announce("Task added.");
    if (shouldReturn) returnToStepModal();
    else closeModals();
    return;
  }

  const live = liveStep.tasks.find((task) => task.id === taskDraft.id);
  if (!live) return;
  readTaskForm(live);
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  announce("Task updated.");
  if (shouldReturn) returnToStepModal();
  else closeModals();
}

function deleteStep() {
  if (!stepDraft) return;
  const live = findStage(stepDraft.id);
  if (!live) return;
  if (stages.length <= 1) {
    announce("A workflow needs at least one step. You cannot delete the last step.");
    return;
  }
  stages = stages.filter((entry) => entry.id !== live.id);
  stepDraftIsNew = false;
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  closeModals();
  announce("Workflow step deleted.");
}

function deleteTask() {
  if (taskMode === "add") {
    if (returnToStepId) returnToStepModal();
    else closeModals();
    return;
  }
  const liveStep = findStage(taskParent.id);
  if (!liveStep) return;
  if ((liveStep.tasks || []).length <= 1) {
    announce("Every workflow step needs at least one task. You cannot remove the last task.");
    return;
  }
  liveStep.tasks = liveStep.tasks.filter((task) => task.id !== taskDraft.id);
  if (stepDraft && stepDraft.id === liveStep.id) {
    stepDraft.tasks = liveStep.tasks.map((task) => normalizeTask(Object.assign({}, task)));
  }
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  announce("Task deleted.");
  if (returnToStepId) returnToStepModal();
  else closeModals();
}

let ignoreBackdropClick = false;

function hideModals() {
  closeAllUserPicks();
  [stepModal, taskModal, testModal, reorderModal, templateModal].forEach((node) => {
    if (!node) return;
    node.classList.add("slds-hide");
    node.classList.remove("slds-fade-in-open");
  });
  if (backdrop) {
    backdrop.classList.add("slds-hide");
    backdrop.classList.remove("slds-backdrop_open");
  }
  document.body.classList.remove("slds-modal-open");
}

function openModal(node) {
  if (!node || !backdrop) return;
  hideModals();
  ignoreBackdropClick = true;
  backdrop.classList.remove("slds-hide");
  backdrop.classList.add("slds-backdrop_open");
  node.classList.remove("slds-hide");
  node.classList.add("slds-fade-in-open");
  document.body.classList.add("slds-modal-open");
  window.setTimeout(() => {
    ignoreBackdropClick = false;
  }, 0);
}

function openTaskOverStep(node) {
  if (!node || !backdrop) return;
  // Hide step modal visually but keep stepDraft so we can return after task save/cancel.
  if (stepModal) {
    stepModal.classList.add("slds-hide");
    stepModal.classList.remove("slds-fade-in-open");
  }
  if (testModal) {
    testModal.classList.add("slds-hide");
    testModal.classList.remove("slds-fade-in-open");
  }
  if (reorderModal) {
    reorderModal.classList.add("slds-hide");
    reorderModal.classList.remove("slds-fade-in-open");
  }
  ignoreBackdropClick = true;
  backdrop.classList.remove("slds-hide");
  backdrop.classList.add("slds-backdrop_open");
  node.classList.remove("slds-hide");
  node.classList.add("slds-fade-in-open");
  document.body.classList.add("slds-modal-open");
  window.setTimeout(() => {
    ignoreBackdropClick = false;
  }, 0);
}

function returnToStepModal() {
  const stepId = returnToStepId || (stepDraft && stepDraft.id) || (taskParent && taskParent.id);
  taskMode = "edit";
  taskDraft = null;
  taskParent = null;
  if (taskModal) {
    taskModal.classList.add("slds-hide");
    taskModal.classList.remove("slds-fade-in-open");
  }
  if (!stepId) {
    returnToStepId = "";
    closeModals();
    return;
  }
  const live = findStage(stepId);
  if (!live) {
    returnToStepId = "";
    closeModals();
    return;
  }
  stepDraft = JSON.parse(JSON.stringify(live));
  document.getElementById("step-modal-context").textContent =
    ((nameInput && nameInput.value.trim()) || "Account Plan Blueprint") +
    " / Stage " +
    live.number +
    " · " +
    live.name;
  document.getElementById("step-name").value = stepDraft.name;
  document.getElementById("step-desc").value = stepDraft.descriptor || "";
  document.getElementById("step-custom").value = stepDraft.customRule || "";
  document.querySelectorAll('input[name="step-start"]').forEach((input) => {
    input.checked = input.value === (stepDraft.startKind || "workflow");
  });
  const others = [{ id: "", name: "No dependency" }].concat(
    stages.filter((entry) => entry.id !== live.id).map((entry) => ({ id: entry.id, name: entry.name }))
  );
  fillSelect(document.getElementById("step-depends"), others, stepDraft.dependsOn || "");
  syncStepStartUi();
  renderContainedTasks();
  syncStepDeleteGate();
  ignoreBackdropClick = true;
  if (backdrop) {
    backdrop.classList.remove("slds-hide");
    backdrop.classList.add("slds-backdrop_open");
  }
  if (stepModal) {
    stepModal.classList.remove("slds-hide");
    stepModal.classList.add("slds-fade-in-open");
  }
  document.body.classList.add("slds-modal-open");
  window.setTimeout(() => {
    ignoreBackdropClick = false;
  }, 0);
  const addBtn = document.getElementById("step-add-task");
  if (addBtn) addBtn.focus();
  else document.getElementById("step-name").focus();
}

function discardEmptyNewStepIfNeeded() {
  if (!stepDraftIsNew || !stepDraft) return;
  const live = findStage(stepDraft.id);
  if (!live || stepHasTasks(live)) return;
  stages = stages.filter((entry) => entry.id !== live.id);
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  announce("Step discarded. Every workflow step needs at least one task.");
}

function closeModals() {
  if (
    returnToStepId &&
    taskModal &&
    !taskModal.classList.contains("slds-hide") &&
    taskModal.classList.contains("slds-fade-in-open")
  ) {
    returnToStepModal();
    return;
  }
  if (testRunning) stopTestRun(false);
  discardEmptyNewStepIfNeeded();
  hideModals();
  stepDraft = null;
  stepDraftIsNew = false;
  taskDraft = null;
  taskParent = null;
  taskMode = "edit";
  returnToStepId = "";
  reorderDraft = [];
  dragStageId = "";
}

function renderReorderList() {
  if (!reorderList) return;
  reorderList.replaceChildren();
  reorderDraft.forEach((entry, index) => {
    const li = document.createElement("li");
    li.className = "ap-reorder-list__item";
    li.innerHTML =
      '<span class="ap-reorder-list__num">' +
      (index + 1) +
      '</span><span class="ap-reorder-list__name">' +
      escapeHtml(entry.name) +
      '</span><span class="ap-reorder-list__actions">' +
      '<button class="slds-button slds-button_icon slds-button_icon-border" type="button" data-move="-1" title="Move up" ' +
      (index === 0 ? "disabled" : "") +
      '><svg class="slds-button__icon" aria-hidden="true"><use href="' +
      ICON +
      '#up"></use></svg><span class="slds-assistive-text">Move up</span></button>' +
      '<button class="slds-button slds-button_icon slds-button_icon-border" type="button" data-move="1" title="Move down" ' +
      (index === reorderDraft.length - 1 ? "disabled" : "") +
      '><svg class="slds-button__icon" aria-hidden="true"><use href="' +
      ICON +
      '#down"></use></svg><span class="slds-assistive-text">Move down</span></button></span>';
    li.querySelectorAll("[data-move]").forEach((button) => {
      button.addEventListener("click", () => {
        const delta = Number(button.getAttribute("data-move"));
        const next = index + delta;
        if (next < 0 || next >= reorderDraft.length) return;
        const copy = reorderDraft.slice();
        const item = copy.splice(index, 1)[0];
        copy.splice(next, 0, item);
        reorderDraft = copy;
        renderReorderList();
      });
    });
    reorderList.appendChild(li);
  });
}

function openReorderModal() {
  if (revealing) {
    announce("Wait for blueprint generation to finish before reordering.");
    return;
  }
  if (stages.length < 2) {
    announce("Add at least two steps before reordering.");
    return;
  }
  reorderDraft = stages.map((entry) => Object.assign({}, entry, { tasks: (entry.tasks || []).slice() }));
  renderReorderList();
  openModal(reorderModal);
}

function saveReorder() {
  stages = reorderDraft.map((entry) =>
    Object.assign({}, entry, {
      owner: entry.owner ? Object.assign({}, entry.owner) : undefined,
      tasks: (entry.tasks || []).map((task) => Object.assign({}, task))
    })
  );
  testedKey = "";
  renumberStages();
  renderOutline();
  persist();
  closeModals();
  announce("Step order updated.");
}

function stopTestRun(finished) {
  window.clearInterval(testTimer);
  testTimer = null;
  testRunning = false;
  syncTestFooter();
}

function markBlockedTasks(entry) {
  const tasks = entry.tasks || [];
  const byId = {};
  tasks.forEach((task) => {
    byId[task.id] = task;
  });
  let changed = false;
  tasks.forEach((task) => {
    if (testTaskState[task.id] !== "hold") return;
    if (task.startWhen !== "After another task") return;
    if (!task.dependsOn || !byId[task.dependsOn]) {
      testTaskState[task.id] = "failed";
      changed = true;
      return;
    }
    if (testTaskState[task.dependsOn] === "failed") {
      testTaskState[task.id] = "failed";
      changed = true;
    }
  });
  const anyRunning = tasks.some((task) => testTaskState[task.id] === "running");
  const anyHold = tasks.some((task) => testTaskState[task.id] === "hold");
  const anyFailed = tasks.some((task) => testTaskState[task.id] === "failed");
  if (!anyRunning && anyHold) {
    // Remaining holds that cannot start → fail them
    tasks.forEach((task) => {
      if (testTaskState[task.id] === "hold" && !canStartTask(entry, task)) {
        testTaskState[task.id] = "failed";
        changed = true;
      }
    });
  }
  if (!anyRunning && tasks.length && tasks.every((task) => testTaskState[task.id] === "done" || testTaskState[task.id] === "failed")) {
    testStepState[entry.id] = anyFailed || tasks.some((task) => testTaskState[task.id] === "failed") ? "failed" : "done";
    changed = true;
  }
  return changed;
}

function failTestRun(extraIssues) {
  stopTestRun(false);
  testIssues = (extraIssues || []).concat(testIssues);
  // Dedupe
  const seen = {};
  testIssues = testIssues.filter((issue) => {
    if (seen[issue.id]) return false;
    seen[issue.id] = true;
    return true;
  });
  const failedSteps = stages.filter((entry) => testStepState[entry.id] === "failed").length;
  setTestBanner(
    "failed",
    "Test run failed",
    failedSteps
      ? failedSteps + " stage" + (failedSteps === 1 ? "" : "s") + " could not complete. Fix the issues below, then run again."
      : "The blueprint could not finish. Fix the issues below, then run again."
  );
  renderTestRun();
  announce("Test run failed. Review the resolution steps in the test dialog.");
}

function finishTestRun() {
  const passed = stages.every((entry) => testStepState[entry.id] === "done");
  const anyFailed = stages.some((entry) => testStepState[entry.id] === "failed");
  if (!passed || anyFailed) {
    // Attach runtime issues for failed stages without a preflight match
    stages.forEach((entry) => {
      if (testStepState[entry.id] !== "failed") return;
      const already = testIssues.some((issue) => issue.stepId === entry.id);
      if (already) return;
      if (!(entry.tasks && entry.tasks.length)) {
        testIssues.push({
          id: "runtime-empty-" + entry.id,
          stepId: entry.id,
          severity: "error",
          title: "Step “" + (entry.name || "Untitled") + "” failed — needs a task",
          detail: "Every workflow step must include at least one task. Add a task, then run the test again.",
          action: "Edit step",
          fix: { type: "step", stepId: entry.id }
        });
        return;
      }
      (entry.tasks || []).forEach((task) => {
        if (testTaskState[task.id] !== "failed") return;
        testIssues.push({
          id: "runtime-task-" + task.id,
          stepId: entry.id,
          taskId: task.id,
          severity: "error",
          title: "Task “" + (task.name || "Untitled") + "” could not start",
          detail: "Check its Start rule and dependency, then run the test again.",
          action: "Edit task",
          fix: { type: "task", stepId: entry.id, taskId: task.id }
        });
      });
    });
    failTestRun([]);
    return;
  }
  stopTestRun(true);
  testIssues = [];
  setTestBanner(
    "passed",
    "Test run passed",
    "All agents and steps completed successfully. Continue to Review & Publish to save as a template or publish."
  );
  testedKey = blueprintKey();
  persist();
  syncPublishGate();
  renderTestRun();
  announce("Test run passed. Next: Review & Publish is unlocked.");
  if (btnNext && step === "blueprint" && !btnNext.hidden) btnNext.focus();
}

function tickTest() {
  stages.forEach((entry) => {
    if (testStepState[entry.id] !== "running") return;
    if (isPersonStep(entry)) {
      testElapsed[entry.id] = (testElapsed[entry.id] || 0) + TEST_TICK;
      if (testElapsed[entry.id] >= TEST_TASK_MS) testStepState[entry.id] = "done";
      return;
    }
    if (!(entry.tasks && entry.tasks.length)) {
      testStepState[entry.id] = "failed";
      return;
    }
    (entry.tasks || []).forEach((task) => {
      if (testTaskState[task.id] === "running") {
        testElapsed[task.id] = (testElapsed[task.id] || 0) + TEST_TICK;
        if (testElapsed[task.id] >= TEST_TASK_MS) testTaskState[task.id] = "done";
      }
    });
    (entry.tasks || []).forEach((task) => {
      if (testTaskState[task.id] === "hold" && canStartTask(entry, task)) {
        testTaskState[task.id] = "running";
        testElapsed[task.id] = 0;
      }
    });
    markBlockedTasks(entry);
    if ((entry.tasks || []).length && (entry.tasks || []).every((task) => testTaskState[task.id] === "done")) {
      testStepState[entry.id] = "done";
    } else if (
      (entry.tasks || []).length &&
      (entry.tasks || []).every((task) => testTaskState[task.id] === "done" || testTaskState[task.id] === "failed") &&
      (entry.tasks || []).some((task) => testTaskState[task.id] === "failed")
    ) {
      testStepState[entry.id] = "failed";
    }
  });

  // Advance only when prior stage succeeded
  const next = stages.find((entry, index) => {
    if (testStepState[entry.id] !== "hold") return false;
    if (index === 0) return true;
    return testStepState[stages[index - 1].id] === "done";
  });
  if (next) startStepWork(next);

  const fingerprint = testFingerprint();
  if (fingerprint === testLastFingerprint) testStallTicks += 1;
  else {
    testStallTicks = 0;
    testLastFingerprint = fingerprint;
  }

  renderTestRun();

  if (stages.some((entry) => testStepState[entry.id] === "failed")) {
    // Mark remaining hold stages as blocked once a failure stops the chain
    stages.forEach((entry) => {
      if (testStepState[entry.id] === "hold") testStepState[entry.id] = "failed";
    });
    finishTestRun();
    return;
  }

  if (stages.every((entry) => testStepState[entry.id] === "done")) {
    finishTestRun();
    return;
  }

  if (testStallTicks >= TEST_STALL_TICKS) {
    stages.forEach((entry) => {
      if (testStepState[entry.id] === "running") {
        markBlockedTasks(entry);
        if (testStepState[entry.id] === "running") testStepState[entry.id] = "failed";
      }
      if (testStepState[entry.id] === "hold") testStepState[entry.id] = "failed";
    });
    finishTestRun();
  }
}

function startTestRun() {
  if (revealing) {
    announce("Wait for blueprint generation to finish before testing.");
    return;
  }
  if (!stages.length) {
    if (step !== "blueprint") showStep("blueprint", { entering: true, animate: false });
    announce("Add at least one workflow step before testing.");
    return;
  }
  if (step !== "blueprint") {
    showStep("blueprint", { entering: true, animate: false });
  }
  stopTestRun(false);
  renumberStages();
  testIssues = collectTestIssues();
  resetTestState();
  testRunning = true;
  setTestBanner("running", "Test run in progress", "Simulating agents and steps. No account data is used.");
  if (testResolve) testResolve.classList.add("slds-hide");
  renderTestRun();
  openModal(document.getElementById("test-modal") || testModal);

  // Fail fast on configuration errors after a short in-progress moment
  if (testIssues.length) {
    testIssues.forEach((issue) => {
      if (issue.stepId) testStepState[issue.stepId] = "failed";
      if (issue.taskId) testTaskState[issue.taskId] = "failed";
    });
    window.setTimeout(() => {
      if (testOutcome !== "running") return;
      failTestRun([]);
    }, 420);
    return;
  }

  testTimer = window.setInterval(tickTest, TEST_TICK);
}

function openTemplateModal() {
  if (!stages.length) {
    showStep("blueprint", { entering: true, animate: false });
    announce("Generate or add a blueprint before saving as a template.");
    return;
  }
  if (!isTested()) {
    showStep("blueprint", { entering: true, animate: false });
    announce("Test the blueprint before saving as a template.");
    return;
  }
  if (step !== "review") {
    showStep("review");
    announce("Save as template is available on Review & Publish.");
    return;
  }
  if (!templateBtn || templateBtn.disabled) {
    announce("Test the blueprint before saving as a template.");
    return;
  }
  const item = draft();
  if (templateNameInput) {
    templateNameInput.value = item.name || "Untitled workflow";
  }
  openModal(templateModal);
  window.setTimeout(() => {
    if (!templateNameInput) return;
    templateNameInput.focus();
    templateNameInput.select();
  }, 0);
}

function confirmSaveTemplate() {
  const name = ((templateNameInput && templateNameInput.value) || "").trim();
  if (!name) {
    announce("Enter a template name.");
    if (templateNameInput) templateNameInput.focus();
    return;
  }
  const store = "ap-workflow-templates";
  const item = draft();
  const process = item.process || item.description || "";
  const payload = {
    name: name,
    industry: item.industry || "Commercial banking",
    summary: process.split("\n")[0] || "Reviewed Account Plan blueprint.",
    process: process,
    stages: stages.length,
    tasks: stages.reduce((n, entry) => n + (entry.tasks || []).length, 0),
    blueprint: JSON.parse(JSON.stringify(stages))
  };
  let saved = [];
  try {
    saved = JSON.parse(sessionStorage.getItem(store) || "[]");
  } catch (error) {
    saved = [];
  }
  if (!Array.isArray(saved)) saved = [];
  const creator = { name: "Salesforce Admin", initials: "SA" };
  const entry = Object.assign(
    {
      id: "org-" + Date.now(),
      origin: "org",
      creator: creator,
      savedOn: new Date().toISOString().slice(0, 10)
    },
    payload
  );
  const existing = saved.findIndex((row) => row.name === name && row.origin === "org");
  if (existing >= 0) {
    entry.id = saved[existing].id;
    entry.creator = saved[existing].creator || creator;
    saved[existing] = entry;
    announce("Template updated under Created by you.");
  } else {
    saved.unshift(entry);
    announce("Saved under Created by you.");
  }
  sessionStorage.setItem(store, JSON.stringify(saved));
  closeModals();
}

if (testBtn) {
  testBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startTestRun();
  });
}
if (testRerun) testRerun.addEventListener("click", startTestRun);
if (testFixFirst) {
  testFixFirst.addEventListener("click", () => {
    if (testIssues[0]) applyTestFix(testIssues[0]);
  });
}
if (templateBtn) templateBtn.addEventListener("click", openTemplateModal);
if (templateConfirm) templateConfirm.addEventListener("click", confirmSaveTemplate);
if (templateNameInput) {
  templateNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmSaveTemplate();
    }
  });
}
document.querySelectorAll("[data-close-modals]").forEach((button) => button.addEventListener("click", closeModals));
if (backdrop) {
  backdrop.addEventListener("click", () => {
    if (ignoreBackdropClick) return;
    closeModals();
  });
}
window.apStartTestRun = startTestRun;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});
document.querySelectorAll('input[name="step-start"]').forEach((input) => input.addEventListener("change", syncStepStartUi));
const stepSave = document.getElementById("step-save");
if (stepSave) stepSave.addEventListener("click", saveStep);
const taskSave = document.getElementById("task-save");
if (taskSave) taskSave.addEventListener("click", saveTask);
const stepDelete = document.getElementById("step-delete");
if (stepDelete) stepDelete.addEventListener("click", deleteStep);
const taskDelete = document.getElementById("task-delete");
if (taskDelete) taskDelete.addEventListener("click", deleteTask);
const taskAttach = document.getElementById("task-attach");
if (taskAttach) {
  taskAttach.addEventListener("click", () => announce("Attach checks access when a file or link is added. That flow is not built yet."));
}
const taskRetryMode = document.getElementById("task-retry-mode");
if (taskRetryMode) taskRetryMode.addEventListener("change", syncRetryFields);
if (buildAgent) buildAgent.addEventListener("change", syncNextLabel);
bindUserPicks();

renderContext();
if (stages.length) renderOutline();
showStep(step, { entering: step === "blueprint" });
