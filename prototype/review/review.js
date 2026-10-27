const ICON = "../../../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const LANDING = "../landing/index.html";
const AGENTS = [
  "History Agent",
  "Financials Agent",
  "Market Research Agent",
  "Risk Intelligence Agent",
  "Coverage Strategy Agent",
  "Strategy Agent",
  "Objectives Agent",
  "Outreach Agent",
  "Synthesis Agent"
];
const TASK_SEED = {
  g1: { instructions: "Review client history and cite account records and recent interactions.", sources: "Account documents · Recent interactions", tags: "client-history · evidence", startWhen: "When the stage starts", dueHelp: "Starts in parallel with the other evidence-gathering tasks." },
  g2: { instructions: "Pull financial data from permitted financial sources.", sources: "Financial accounts", tags: "financials", startWhen: "When the stage starts", dueHelp: "Starts in parallel with the other evidence-gathering tasks." },
  g3: { instructions: "Research market and competitor context from linked sources.", sources: "Linked market sources", tags: "market", startWhen: "When the stage starts", dueHelp: "Starts in parallel with the other evidence-gathering tasks." },
  p1: { instructions: "Draft relationship strategy from gathered evidence.", sources: "Gather outputs", tags: "strategy", startWhen: "When the stage starts" },
  p2: { instructions: "Define objectives and measures from the strategy.", sources: "Relationship strategy", tags: "objectives", startWhen: "After another task", dependsOn: "p1" },
  o1: {
    instructions: "Request input from Treasury, Credit, and Industry specialists. Named people are resolved when the workflow runs.",
    sources: "Specialist roles",
    tags: "outreach",
    startWhen: "When the stage starts"
  },
  o2: {
    instructions: "Merge specialist feedback into the plan and update the account plan.",
    sources: "Specialist replies",
    tags: "synthesis",
    startWhen: "After another task",
    dependsOn: "o1"
  }
};

const FALLBACK = [
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

let draft = { name: "Refresh expiring account plans" };
try {
  draft = Object.assign(draft, JSON.parse(sessionStorage.getItem("ap-create-draft") || "{}"));
} catch (error) {
  /* keep default */
}

let blueprint = Array.isArray(draft.blueprint)
  ? draft.blueprint.map(normalizeStep)
  : draft.buildWithAgent === false
    ? []
    : FALLBACK.map(normalizeStep);
const countEl = document.getElementById("review-count");
const outline = document.getElementById("outline");
const status = document.getElementById("review-status");
const backdrop = document.getElementById("modal-back");
const stepModal = document.getElementById("step-modal");
const taskModal = document.getElementById("task-modal");
const testModal = document.getElementById("test-modal");
const testList = document.getElementById("test-run-list");
const testStage = document.getElementById("test-stage");
const testClose = document.getElementById("test-close");
const testBtn = document.getElementById("review-test");
const testOk = document.getElementById("review-test-ok");
const publishBtn = document.getElementById("review-publish");
const publishLabel = document.getElementById("review-publish-label");
const publishSpin = document.getElementById("review-publish-spin");
const templateBtn = document.getElementById("review-template");
const reorderBtn = document.getElementById("review-reorder");
const reorderModal = document.getElementById("reorder-modal");
const reorderList = document.getElementById("reorder-list");
const toast = document.getElementById("review-toast");
const toastTitle = document.getElementById("review-toast-title");
const toastBody = document.getElementById("review-toast-body");
let publishing = false;
let toastTimer = 0;
let reorderDraft = [];
let dragReorderId = "";
const TEST_TICK = 220;
const TEST_TASK_MS = 720;

let stepDraft = null;
let taskDraft = null;
let taskParent = null;
let dragTaskId = "";
let testTimer = null;
let testTaskState = {};
let testStepState = {};
let testElapsed = {};
let testRunning = false;

function normalizeStep(step, index, list) {
  const next = Object.assign({ tasks: [], startKind: "", dependsOn: "", customRule: "", parallel: false }, step);
  if (!next.startKind) {
    if (index === 0 || /workflow runs/i.test(next.startRule || "")) next.startKind = "workflow";
    else next.startKind = "previous";
  }
  if (!next.dependsOn && next.startKind === "previous" && index > 0) next.dependsOn = list[index - 1].id;
  next.tasks = (next.tasks || []).map((task) => normalizeTask(task));
  return next;
}

function normalizeTask(task) {
  const seed = TASK_SEED[task.id] || {};
  return Object.assign(
    {
      startWhen: "When the stage starts",
      dependsOn: "",
      due: "Instant",
      fallback: "Relationship Manager · after 1 retry is exhausted",
      cc: "Relationship Manager",
      escalation: "Team lead · escalate after SLA",
      instructions: "",
      sources: "",
      tags: "",
      dueHelp: ""
    },
    seed,
    task
  );
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

function announce(message) {
  status.textContent = message;
}

function persist() {
  sessionStorage.setItem(
    "ap-create-draft",
    JSON.stringify(Object.assign({}, draft, { blueprint: blueprint, stage: draft.stage === "Live" ? "Live" : "Ready" }))
  );
}

function blueprintKey() {
  return JSON.stringify(
    blueprint.map((step) => ({
      id: step.id,
      name: step.name,
      startKind: step.startKind,
      dependsOn: step.dependsOn,
      customRule: step.customRule,
      owner: step.owner || null,
      tasks: step.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        who: task.who,
        startWhen: task.startWhen,
        dependsOn: task.dependsOn,
        due: task.due,
        instructions: task.instructions
      }))
    }))
  );
}

function isTested() {
  return Boolean(draft.testedKey && draft.testedKey === blueprintKey());
}

function syncPublishGate() {
  if (publishing) return;
  const passed = isTested();
  const live = draft.stage === "Live" && passed;
  testOk.classList.toggle("slds-hide", !passed);
  testBtn.classList.toggle("slds-button_brand", !passed);
  testBtn.classList.toggle("slds-button_neutral", passed);
  publishLabel.textContent = live ? "Published" : "Publish";
  if (live) {
    publishBtn.disabled = true;
    publishBtn.setAttribute("aria-disabled", "true");
    publishBtn.removeAttribute("aria-describedby");
    publishBtn.title = "This workflow is published";
  } else if (passed) {
    publishBtn.disabled = false;
    publishBtn.removeAttribute("aria-disabled");
    publishBtn.removeAttribute("aria-describedby");
    publishBtn.removeAttribute("title");
  } else {
    publishBtn.disabled = true;
    publishBtn.setAttribute("aria-disabled", "true");
    publishBtn.setAttribute("aria-describedby", "publish-gate");
    publishBtn.title = "Test the blueprint before publishing";
  }
  if (passed) {
    templateBtn.disabled = false;
    templateBtn.removeAttribute("aria-disabled");
    templateBtn.removeAttribute("aria-describedby");
    templateBtn.removeAttribute("title");
  } else {
    templateBtn.disabled = true;
    templateBtn.setAttribute("aria-disabled", "true");
    templateBtn.setAttribute("aria-describedby", "template-gate");
    templateBtn.title = "Test the blueprint before saving as a template";
  }
}

function taskCount() {
  return blueprint.reduce((sum, step) => sum + step.tasks.length, 0);
}

function findStep(id) {
  return blueprint.find((step) => step.id === id);
}

function displayStart(step) {
  if (step.startKind === "workflow") return "Starts when the workflow runs";
  if (step.startKind === "custom") return step.customRule || "Custom rule";
  const prior = findStep(step.dependsOn);
  return prior ? "Starts after " + prior.name + " completes" : "Starts after the previous stage completes";
}

function displayTaskStart(step, task) {
  if (task.startWhen === "After another task" && task.dependsOn) {
    const prior = step.tasks.find((entry) => entry.id === task.dependsOn);
    return prior ? "After " + prior.name : task.start;
  }
  return task.startWhen === "When the stage starts" && step.parallel ? "With step · parallel" : task.startWhen || task.start;
}

function renumber() {
  blueprint.forEach((step, index) => {
    step.number = String(index + 1);
    step.tasks.forEach((task, taskIndex) => {
      task.number = step.number + "." + (taskIndex + 1);
      task.start = displayTaskStart(step, task);
    });
    step.startRule = displayStart(step);
  });
}

function moveItem(list, index, offset) {
  const next = index + offset;
  if (next < 0 || next >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
}

function updateHeader() {
  const tasks = taskCount();
  countEl.textContent = blueprint.length
    ? blueprint.length +
      " stages · " +
      tasks +
      " " +
      (tasks === 1 ? "task" : "tasks") +
      " · dependencies and human gates are inspectable"
    : "Blank blueprint · add workflow steps to begin";
  document.title = "Review blueprint";
  const statusEl = document.querySelector(".ap-blueprint-status");
  if (statusEl) {
    statusEl.innerHTML =
      '<span class="ap-blueprint-status__dot" aria-hidden="true"></span> Blueprint status: ' +
      (blueprint.length ? (draft.stage === "Live" ? "Live" : "Ready") : "Draft");
  }
  const emptyEl = document.getElementById("review-empty");
  const introEl = document.querySelector(".ap-review__intro");
  if (emptyEl) emptyEl.hidden = blueprint.length > 0;
  if (introEl) introEl.hidden = blueprint.length === 0;
  if (reorderBtn) reorderBtn.hidden = blueprint.length < 2;
  syncPublishGate();
}

function newStep() {
  const id = "step-" + Date.now();
  const step = {
    id: id,
    name: "New workflow step",
    descriptor: "",
    startKind: blueprint.length ? "previous" : "workflow",
    dependsOn: blueprint.length ? blueprint[blueprint.length - 1].id : "",
    customRule: "",
    parallel: false,
    tasks: []
  };
  blueprint.push(step);
  return step;
}

function hideModals() {
  [stepModal, taskModal, testModal, reorderModal].forEach((node) => {
    node.classList.add("slds-hide");
    node.classList.remove("slds-fade-in-open");
  });
  backdrop.classList.add("slds-hide");
  backdrop.classList.remove("slds-backdrop_open");
}

function closeModals() {
  stopTestRun(false);
  hideModals();
  stepDraft = null;
  taskDraft = null;
  taskParent = null;
  reorderDraft = [];
  dragReorderId = "";
}

function openModal(node) {
  hideModals();
  backdrop.classList.remove("slds-hide");
  backdrop.classList.add("slds-backdrop_open");
  node.classList.remove("slds-hide");
  node.classList.add("slds-fade-in-open");
}

function fillSelect(select, options, value) {
  select.innerHTML = options
    .map((option) => {
      const id = typeof option === "object" ? option.id : option;
      const label = typeof option === "object" ? option.name : option;
      return '<option value="' + id + '"' + (id === value ? " selected" : "") + ">" + label + "</option>";
    })
    .join("");
}

function renderContainedTasks() {
  const body = document.getElementById("step-task-body");
  const empty = document.getElementById("step-task-empty");
  const wrap = document.getElementById("step-task-wrap");
  document.getElementById("step-task-count").textContent = "Contained tasks · " + stepDraft.tasks.length;
  body.replaceChildren();
  empty.classList.toggle("slds-hide", stepDraft.tasks.length > 0);
  wrap.classList.toggle("slds-hide", stepDraft.tasks.length === 0);
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
      task.name +
      "</button></td><td><span class=\"ap-type ap-type_agent\">Agent</span></td><td>" +
      displayTaskStart(stepDraft, task) +
      "</td><td>" +
      (task.due || "Instant") +
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
      const [item] = stepDraft.tasks.splice(from, 1);
      stepDraft.tasks.splice(to, 0, item);
      renderContainedTasks();
    });
    body.appendChild(tr);
  });
}

function syncStepStartUi() {
  const kind = document.querySelector('input[name="step-start"]:checked').value;
  const customWrap = document.getElementById("step-custom-wrap");
  const depends = document.getElementById("step-depends");
  customWrap.classList.toggle("slds-hide", kind !== "custom");
  depends.disabled = kind === "workflow";
  if (kind === "workflow") depends.value = "";
}

function openStep(step) {
  stepDraft = JSON.parse(JSON.stringify(step));
  document.getElementById("step-modal-context").textContent =
    (draft.name || "Account Plan Blueprint") + " / Stage " + step.number + " · " + step.name;
  document.getElementById("step-name").value = stepDraft.name;
  document.getElementById("step-desc").value = stepDraft.descriptor || "";
  document.getElementById("step-custom").value = stepDraft.customRule || "";
  document.querySelectorAll('input[name="step-start"]').forEach((input) => {
    input.checked = input.value === (stepDraft.startKind || "workflow");
  });
  const others = [{ id: "", name: "No dependency" }].concat(
    blueprint.filter((entry) => entry.id !== step.id).map((entry) => ({ id: entry.id, name: entry.name }))
  );
  fillSelect(document.getElementById("step-depends"), others, stepDraft.dependsOn || "");
  syncStepStartUi();
  renderContainedTasks();
  openModal(stepModal);
  document.getElementById("step-name").focus();
}

function openTask(step, task) {
  taskParent = step;
  taskDraft = JSON.parse(JSON.stringify(task));
  document.getElementById("task-modal-context").textContent =
    (draft.name || "Account Plan Blueprint") + " / " + step.name + " / " + task.number + " · Agent";
  document.getElementById("task-name").value = taskDraft.name;
  fillSelect(document.getElementById("task-start"), ["When the stage starts", "After another task"], taskDraft.startWhen);
  const deps = [{ id: "", name: "No dependency" }].concat(
    step.tasks.filter((entry) => entry.id !== task.id).map((entry) => ({ id: entry.id, name: entry.name }))
  );
  fillSelect(document.getElementById("task-depends"), deps, taskDraft.dependsOn || "");
  document.getElementById("task-due").value = taskDraft.due || "Instant";
  fillSelect(document.getElementById("task-who"), AGENTS, taskDraft.who);
  document.getElementById("task-fallback").value = taskDraft.fallback;
  document.getElementById("task-cc").value = taskDraft.cc;
  document.getElementById("task-esc").value = taskDraft.escalation;
  document.getElementById("task-instructions").value = taskDraft.instructions || "";
  document.getElementById("task-sources").textContent = taskDraft.sources || "No files attached";
  document.getElementById("task-tags").value = taskDraft.tags || "";
  openModal(taskModal);
  document.getElementById("task-name").focus();
}

function saveStep() {
  const live = findStep(stepDraft.id);
  if (!live) return;
  live.name = document.getElementById("step-name").value.trim() || live.name;
  live.descriptor = document.getElementById("step-desc").value.trim();
  live.startKind = document.querySelector('input[name="step-start"]:checked').value;
  live.customRule = document.getElementById("step-custom").value.trim();
  live.dependsOn = document.getElementById("step-depends").value;
  live.tasks = stepDraft.tasks;
  persist();
  render();
  closeModals();
  announce("Step updated.");
}

function saveTask() {
  const liveStep = findStep(taskParent.id);
  const live = liveStep && liveStep.tasks.find((task) => task.id === taskDraft.id);
  if (!live) return;
  live.name = document.getElementById("task-name").value.trim() || live.name;
  live.startWhen = document.getElementById("task-start").value;
  live.dependsOn = document.getElementById("task-depends").value;
  live.due = document.getElementById("task-due").value;
  live.who = document.getElementById("task-who").value;
  live.kind = "agent";
  live.fallback = document.getElementById("task-fallback").value;
  live.cc = document.getElementById("task-cc").value;
  live.escalation = document.getElementById("task-esc").value;
  live.instructions = document.getElementById("task-instructions").value.trim();
  live.tags = document.getElementById("task-tags").value.trim();
  persist();
  render();
  closeModals();
  announce("Task updated.");
}

function deleteTask() {
  const liveStep = findStep(taskParent.id);
  if (!liveStep) return;
  liveStep.tasks = liveStep.tasks.filter((task) => task.id !== taskDraft.id);
  persist();
  render();
  closeModals();
  announce("Task removed.");
}

function renderTask(step, task) {
  const tr = document.createElement("tr");
  tr.innerHTML =
    '<td><span class="ap-outline__numcell">' +
    task.number +
    '</span><span class="ap-outline__task">' +
    task.name +
    "</span></td><td>" +
    agentTag(task.who, task.kind) +
    "</td><td>" +
    displayTaskStart(step, task) +
    '</td><td><button class="slds-button slds-button_neutral" type="button" data-edit-task>Edit</button></td>';
  tr.querySelector("[data-edit-task]").addEventListener("click", () => openTask(step, task));
  return tr;
}

function renderStage(step) {
  const li = document.createElement("li");
  li.className = "ap-outline__stage";
  li.dataset.stepId = step.id;
  li.innerHTML =
    '<div class="ap-outline__rail"><span class="ap-outline__num">' +
    step.number +
    '</span></div><article class="ap-outline__card"><header class="ap-outline__head"><div><p class="ap-outline__name">' +
    step.name +
    '</p><p class="ap-outline__desc">' +
    (step.descriptor || "") +
    '</p></div><div class="ap-outline__controls">' +
    '<dl class="ap-outline__start"><dt>Start rule</dt><dd>' +
    displayStart(step) +
    "</dd></dl>" +
    '<button class="slds-button slds-button_neutral" type="button" data-edit-step>Edit</button></div></header>' +
    (step.tasks.length
      ? '<div class="ap-outline__table-wrap"><table class="ap-outline__table"><thead><tr><th>Task</th><th>Assigned to</th><th>Start</th><th></th></tr></thead><tbody></tbody></table></div>'
      : '<p class="ap-step__empty">Assigned to ' +
        agentTag((step.owner && step.owner.who) || "Relationship Manager", (step.owner && step.owner.kind) || "person") +
        '<span class="ap-step__empty-note">No agent tasks.</span></p>') +
    "</article>";
  li.querySelector("[data-edit-step]").addEventListener("click", () => openStep(step));
  const body = li.querySelector("tbody");
  if (body) step.tasks.forEach((task) => body.appendChild(renderTask(step, task)));
  return li;
}

function renderReorderList() {
  reorderList.replaceChildren();
  reorderDraft.forEach((step, index) => {
    const li = document.createElement("li");
    li.className = "ap-reorder-list__item";
    li.draggable = true;
    li.dataset.stepId = step.id;
    li.innerHTML =
      '<span class="ap-drag"><span class="ap-drag__handle" title="Drag to reorder">' +
      icon("rows") +
      '</span></span><span class="ap-reorder-list__num">' +
      (index + 1) +
      '</span><span class="ap-reorder-list__name">' +
      escapeHtml(step.name) +
      '</span><div class="ap-reorder">' +
      '<button class="slds-button slds-button_icon" type="button" data-reorder-up title="Move up"' +
      (index === 0 ? " disabled" : "") +
      ">" +
      icon("up") +
      '</button><button class="slds-button slds-button_icon" type="button" data-reorder-down title="Move down"' +
      (index === reorderDraft.length - 1 ? " disabled" : "") +
      ">" +
      icon("down") +
      "</button></div>";
    li.querySelector("[data-reorder-up]").addEventListener("click", () => {
      moveItem(reorderDraft, index, -1);
      renderReorderList();
    });
    li.querySelector("[data-reorder-down]").addEventListener("click", () => {
      moveItem(reorderDraft, index, 1);
      renderReorderList();
    });
    li.addEventListener("dragstart", (event) => {
      dragReorderId = step.id;
      li.classList.add("ap-reorder-list__item_dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", step.id);
      }
    });
    li.addEventListener("dragend", () => {
      dragReorderId = "";
      li.classList.remove("ap-reorder-list__item_dragging");
      reorderList.querySelectorAll(".ap-reorder-list__item_over").forEach((node) => {
        node.classList.remove("ap-reorder-list__item_over");
      });
    });
    li.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!dragReorderId || dragReorderId === step.id) return;
      li.classList.add("ap-reorder-list__item_over");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("ap-reorder-list__item_over");
    });
    li.addEventListener("drop", (event) => {
      event.preventDefault();
      li.classList.remove("ap-reorder-list__item_over");
      if (!dragReorderId || dragReorderId === step.id) return;
      const from = reorderDraft.findIndex((entry) => entry.id === dragReorderId);
      const to = reorderDraft.findIndex((entry) => entry.id === step.id);
      if (from < 0 || to < 0) return;
      const [item] = reorderDraft.splice(from, 1);
      reorderDraft.splice(to, 0, item);
      dragReorderId = "";
      renderReorderList();
    });
    reorderList.appendChild(li);
  });
}

function openReorderModal() {
  reorderDraft = blueprint.map((step) => ({ id: step.id, name: step.name }));
  renderReorderList();
  openModal(reorderModal);
}

function saveReorder() {
  const byId = {};
  blueprint.forEach((step) => {
    byId[step.id] = step;
  });
  blueprint = reorderDraft.map((entry) => byId[entry.id]).filter(Boolean);
  reorderDraft = [];
  persist();
  render();
  closeModals();
  announce("Workflow step order updated.");
}

function render() {
  renumber();
  updateHeader();
  outline.replaceChildren();
  blueprint.forEach((step) => outline.appendChild(renderStage(step)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isPersonStep(step) {
  return Boolean(step.owner) && !(step.tasks && step.tasks.length);
}

function canStartTask(step, task) {
  if (testStepState[step.id] !== "running") return false;
  if (task.startWhen === "After another task" && task.dependsOn) {
    return testTaskState[task.dependsOn] === "done";
  }
  return true;
}

function startStepWork(step) {
  if (!step) return;
  testStepState[step.id] = "running";
  if (isPersonStep(step)) {
    testElapsed[step.id] = 0;
    return;
  }
  (step.tasks || []).forEach((task) => {
    if (canStartTask(step, task) && testTaskState[task.id] === "hold") {
      testTaskState[task.id] = "running";
      testElapsed[task.id] = 0;
    }
  });
}

function resetTestState() {
  testTaskState = {};
  testStepState = {};
  testElapsed = {};
  blueprint.forEach((step, index) => {
    testStepState[step.id] = index === 0 ? "running" : "hold";
    (step.tasks || []).forEach((task) => {
      testTaskState[task.id] = "hold";
      testElapsed[task.id] = 0;
    });
  });
  if (blueprint[0]) startStepWork(blueprint[0]);
}

function workingStars() {
  return '<span class="ap-teststars" aria-hidden="true"><span></span><span></span><span></span></span>';
}

function renderTestTask(step, task) {
  const state = testTaskState[task.id] || "hold";
  const who = task.who || "Agent";
  const tag = state === "hold" ? "" : agentTag(state === "running" ? who + " is working" : who, task.kind);
  const hold = state === "hold" ? '<span class="ap-testtask__hold">On hold</span>' : "";
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
    "</li>"
  );
}

function renderTestStep(step, index) {
  const state = testStepState[step.id] || "hold";
  const hold = state === "hold" ? '<span class="ap-testcard__hold">On hold</span>' : "";
  let body = "";
  if (isPersonStep(step)) {
    const who = (step.owner && step.owner.who) || "Relationship Manager";
    const tag = state === "hold" ? "" : agentTag(who, "person");
    const stars = state === "running" ? workingStars() : "";
    body = '<div class="ap-testtask is-' + state + '">' + tag + stars + "</div>";
  } else {
    body = '<ul class="ap-testtasks">' + (step.tasks || []).map((task) => renderTestTask(step, task)).join("") + "</ul>";
  }
  const li = document.createElement("li");
  li.className = "ap-testcard is-" + state;
  li.innerHTML =
    '<header class="ap-testcard__head"><span class="ap-testcard__num">' +
    escapeHtml(step.number || String(index + 1)) +
    '</span><h4 class="ap-testcard__name">' +
    escapeHtml(step.name) +
    "</h4>" +
    hold +
    "</header>" +
    body;
  return li;
}

function renderTestRun() {
  const current = blueprint.findIndex((step) => testStepState[step.id] === "running");
  const doneCount = blueprint.filter((step) => testStepState[step.id] === "done").length;
  const stageIndex = current >= 0 ? current + 1 : Math.min(doneCount + 1, blueprint.length || 1);
  testStage.textContent = "Stage " + stageIndex + " of " + blueprint.length;
  testList.replaceChildren();
  blueprint.forEach((step, index) => testList.appendChild(renderTestStep(step, index)));
}

function stopTestRun(finished) {
  window.clearInterval(testTimer);
  testTimer = null;
  testRunning = false;
  testClose.textContent = finished ? "Done" : "Close";
}

function finishTestRun() {
  const passed = blueprint.every((step) => testStepState[step.id] === "done");
  renderTestRun();
  if (!passed) {
    stopTestRun(false);
    announce("Test run finished. One or more steps did not complete.");
    return;
  }
  stopTestRun(true);
  draft.testedKey = blueprintKey();
  persist();
  syncPublishGate();
  announce("Test run passed. Agents and steps completed successfully. Save as template and Publish are available.");
}

function tickTest() {
  blueprint.forEach((step) => {
    if (testStepState[step.id] !== "running") return;
    if (isPersonStep(step)) {
      testElapsed[step.id] = (testElapsed[step.id] || 0) + TEST_TICK;
      if (testElapsed[step.id] >= TEST_TASK_MS) testStepState[step.id] = "done";
      return;
    }
    (step.tasks || []).forEach((task) => {
      if (testTaskState[task.id] === "running") {
        testElapsed[task.id] = (testElapsed[task.id] || 0) + TEST_TICK;
        if (testElapsed[task.id] >= TEST_TASK_MS) testTaskState[task.id] = "done";
      }
    });
    (step.tasks || []).forEach((task) => {
      if (testTaskState[task.id] === "hold" && canStartTask(step, task)) {
        testTaskState[task.id] = "running";
        testElapsed[task.id] = 0;
      }
    });
    if ((step.tasks || []).length && (step.tasks || []).every((task) => testTaskState[task.id] === "done")) {
      testStepState[step.id] = "done";
    }
  });
  const next = blueprint.find((step, index) => {
    if (testStepState[step.id] !== "hold") return false;
    if (index === 0) return true;
    return testStepState[blueprint[index - 1].id] === "done";
  });
  if (next) startStepWork(next);
  renderTestRun();
  if (blueprint.every((step) => testStepState[step.id] === "done")) finishTestRun();
}

function startTestRun() {
  if (!blueprint.length) {
    announce("Add at least one workflow step before testing.");
    return;
  }
  stopTestRun(false);
  renumber();
  resetTestState();
  testRunning = true;
  testClose.textContent = "Close";
  renderTestRun();
  openModal(testModal);
  testTimer = window.setInterval(tickTest, TEST_TICK);
}

document.getElementById("review-save").addEventListener("click", () => {
  persist();
  window.location.href = LANDING + "?saved=1";
});
function hideToast() {
  window.clearTimeout(toastTimer);
  toast.classList.add("slds-hide");
}

function showToast(title, body) {
  toastTitle.textContent = title;
  toastBody.textContent = body;
  toast.classList.remove("slds-hide");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, 8000);
}

function finishPublish() {
  draft.stage = "Live";
  draft.available = true;
  draft.published = "2026-10-19";
  persist();
  publishing = false;
  publishBtn.removeAttribute("aria-busy");
  publishSpin.classList.add("slds-hide");
  syncPublishGate();
  const name = draft.name || "Workflow";
  showToast(name + " is published.", "Relationship Managers can run it.");
}

publishBtn.addEventListener("click", () => {
  if (publishing || publishBtn.disabled) return;
  if (draft.stage === "Live") return;
  if (!isTested()) {
    announce("Test the blueprint before publishing.");
    return;
  }
  publishing = true;
  publishBtn.setAttribute("aria-busy", "true");
  publishBtn.setAttribute("aria-disabled", "true");
  publishSpin.classList.remove("slds-hide");
  publishLabel.textContent = "Publishing";
  window.setTimeout(finishPublish, 1100);
});
document.getElementById("review-toast-close").addEventListener("click", hideToast);
testBtn.addEventListener("click", startTestRun);
reorderBtn.addEventListener("click", openReorderModal);
document.getElementById("reorder-save").addEventListener("click", saveReorder);
templateBtn.addEventListener("click", () => {
  if (templateBtn.disabled || !isTested()) {
    announce("Test the blueprint before saving as a template.");
    return;
  }
  const store = "ap-workflow-templates";
  const starterStore = "ap-starter-overrides";
  const name = draft.name || "Untitled workflow";
  const process = draft.process || draft.description || "";
  const payload = {
    name: name,
    industry: draft.industry || "Commercial banking",
    summary: process.split("\n")[0] || "Reviewed Account Plan blueprint.",
    process: process,
    stages: blueprint.length,
    tasks: blueprint.reduce((n, step) => n + step.tasks.length, 0),
    blueprint: JSON.parse(JSON.stringify(blueprint))
  };
  if (draft.templateOrigin === "starter" && draft.editingTemplate) {
    let overrides = {};
    try {
      overrides = JSON.parse(sessionStorage.getItem(starterStore) || "{}");
    } catch (error) {
      overrides = {};
    }
    if (!overrides || typeof overrides !== "object") overrides = {};
    overrides[draft.editingTemplate] = payload;
    sessionStorage.setItem(starterStore, JSON.stringify(overrides));
    announce("Starter template updated.");
    return;
  }
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
      id: draft.templateOrigin === "org" && draft.editingTemplate ? draft.editingTemplate : "org-" + Date.now(),
      origin: "org",
      creator: creator,
      savedOn: "2026-10-19"
    },
    payload
  );
  const existing = saved.findIndex(
    (item) => item.id === entry.id || (item.name === name && item.origin === "org")
  );
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
});
document.querySelectorAll("[data-close-modals]").forEach((button) => button.addEventListener("click", closeModals));
backdrop.addEventListener("click", closeModals);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});
document.querySelectorAll('input[name="step-start"]').forEach((input) => input.addEventListener("change", syncStepStartUi));
document.getElementById("step-save").addEventListener("click", saveStep);
document.getElementById("task-save").addEventListener("click", saveTask);
document.getElementById("task-delete").addEventListener("click", deleteTask);
document.getElementById("task-add-esc").addEventListener("click", () => announce("Additional escalations are next. That flow is not built yet."));
document.getElementById("task-attach").addEventListener("click", () => announce("Attach checks access when a file or link is added. That flow is not built yet."));
function removeContainedTask(taskId) {
  if (!stepDraft) return;
  stepDraft.tasks = stepDraft.tasks.filter((entry) => entry.id !== taskId);
  renderContainedTasks();
}

function openContainedTask(taskId) {
  if (!stepDraft) return;
  const task = stepDraft.tasks.find((entry) => entry.id === taskId);
  const live = findStep(stepDraft.id);
  if (task && live) openTask(live, live.tasks.find((entry) => entry.id === task.id) || task);
}

document.getElementById("review-add-step").addEventListener("click", () => {
  const step = newStep();
  draft.stage = "Ready";
  persist();
  render();
  openStep(step);
});

render();
