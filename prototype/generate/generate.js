const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const LANDING = "../landing/index.html";
const REVIEW = "../review/index.html";
const TICK = 250;
const FAIL_STAGE = "access";
const ITEM_MS = 360;
const TOOL_MS = 900;

const BLUEPRINT = [
  {
    id: "gather",
    number: "1",
    name: "Gather Inputs",
    descriptor: "Collect account evidence before the plan is assembled",
    startRule: "Starts when the workflow runs",
    parallel: true,
    tasks: [
      { id: "g1", number: "1.1", name: "Review client history", who: "History Agent", kind: "agent", start: "With step · parallel" },
      { id: "g2", number: "1.2", name: "Pull financial data", who: "Financials Agent", kind: "agent", start: "With step · parallel" },
      { id: "g3", number: "1.3", name: "Research market context", who: "Market Research Agent", kind: "agent", start: "With step · parallel" },
      { id: "g4", number: "1.4", name: "Add risk signals", who: "Risk Intelligence Agent", kind: "agent", start: "With step · parallel" },
      { id: "g5", number: "1.5", name: "Coverage and contacts", who: "Coverage Strategy Agent", kind: "agent", start: "With step · parallel" },
      { id: "g6", number: "1.6", name: "Load prior objectives and measures", who: "History Agent", kind: "agent", start: "After Review client history" }
    ]
  },
  {
    id: "plan",
    number: "2",
    name: "Create Plan",
    descriptor: "Draft relationship strategy and objectives from gathered evidence",
    startRule: "Starts after Gather Inputs completes",
    parallel: false,
    tasks: [
      { id: "p1", number: "2.1", name: "Draft relationship strategy", who: "Strategy Agent", kind: "agent", start: "After Gather Inputs" },
      { id: "p2", number: "2.2", name: "Define Objectives & Measures", who: "Objectives Agent", kind: "agent", start: "After relationship strategy" }
    ]
  },
  {
    id: "outreach",
    number: "3",
    name: "Reach out to Treasury, Credit, and Industry specialists",
    descriptor: "Request specialist input, then merge it into the plan",
    startRule: "Starts after Create Plan completes",
    parallel: false,
    tasks: [
      { id: "o1", number: "3.1", name: "Gather specialist input", who: "Outreach Agent", kind: "agent", start: "After Create Plan" },
      { id: "o2", number: "3.2", name: "Synthesize specialist feedback", who: "Synthesis Agent", kind: "agent", start: "After specialist input" }
    ]
  },
  {
    id: "rm",
    number: "4",
    name: "Route the account plan for Relationship Manager review",
    descriptor: "Person-owned review. No agent writes this step.",
    startRule: "Starts after specialist outreach completes",
    parallel: false,
    owner: { who: "Relationship Manager", kind: "person" },
    tasks: []
  }
];

const activityList = document.getElementById("activity-list");
const activityCount = document.getElementById("activity-count");
const readyBox = document.getElementById("gen-ready");
const badge = document.getElementById("gen-badge");
const status = document.getElementById("gen-status");
const stopBtn = document.getElementById("gen-stop");
const retryBtn = document.getElementById("gen-retry");
const failBtn = document.getElementById("gen-fail");
const nextBtn = document.getElementById("gen-next");

let draft = { name: "Refresh expiring account plans", industry: "Commercial banking", files: [], links: [] };
try {
  draft = Object.assign(draft, JSON.parse(sessionStorage.getItem("ap-create-draft") || "{}"));
} catch (error) {
  /* keep default */
}

const industry = draft.industry || "Commercial banking";
const contextItems = (draft.files || []).concat(draft.links || []);

const stages = [
  {
    id: "understand",
    name: "Understand the brief",
    duration: 0,
    working: "Reading the workflow name, industry, and process description.",
    done: "Matched the brief to gather, create the plan, specialist outreach, and RM review.",
    meta: function () {
      return (draft.name || "Refresh expiring account plans") + " · " + industry;
    },
    tools: [
      { id: "read_brief", name: "read_workflow_brief", working: "Opening the workflow name, industry, and process description.", done: "Brief loaded." },
      { id: "extract_shape", name: "extract_process_shape", working: "Mapping the process description to an Account Plan tree.", done: "Four-step shape identified." }
    ]
  },
  {
    id: "access",
    name: "Check context access",
    duration: 0,
    failReason: "A linked context source did not respond.",
    working: "Checking files and links added in Describe.",
    done: function () {
      if (!contextItems.length) return "No extra context was added. Using the process description only.";
      return "Checked " + contextItems.length + " context " + (contextItems.length === 1 ? "item" : "items") + ". All are accessible.";
    },
    meta: function () {
      return contextItems.length ? contextItems.slice(0, 3).join(", ") : "Process description only";
    },
    tools: [
      { id: "list_context", name: "list_context_sources", working: "Listing files and links from Describe.", done: contextItems.length ? contextItems.length + " sources listed." : "No extra sources." },
      { id: "check_access", name: "check_source_access", working: "Verifying the Admin can open each source.", done: "Access confirmed." }
    ]
  },
  {
    id: "compliance",
    name: "Apply industry compliance",
    duration: 0,
    working: "Selecting compliance rules from the industry.",
    done: "Applied " + industry + " compliance.",
    meta: function () {
      return industry;
    },
    tools: [
      { id: "get_policy", name: "get_industry_policy", working: "Fetching compliance rules for " + industry + ".", done: industry + " policy loaded." },
      { id: "apply_policy", name: "apply_compliance_rules", working: "Attaching those rules to the draft recipe.", done: "Compliance attached." }
    ]
  },
  {
    id: "proposeSteps",
    name: "Propose steps",
    duration: 0,
    working: "Turning the process description into four workflow steps.",
    done: "4 steps proposed.",
    meta: function () {
      return "4 steps";
    },
    tools: [{ id: "propose_steps", name: "propose_workflow_steps", working: "Drafting Gather Inputs, Create Plan, outreach, and RM review.", done: "4 steps written." }]
  },
  {
    id: "proposeTasks",
    name: "Propose tasks",
    duration: 0,
    working: "Adding the work that belongs in each step.",
    done: "10 agent tasks added. RM review has none.",
    meta: function () {
      return "10 tasks";
    },
    tools: [{ id: "propose_tasks", name: "propose_step_tasks", working: "Adding agent work under each step.", done: "10 tasks written." }]
  },
  {
    id: "assignAgents",
    name: "Assign agents",
    duration: 0,
    working: "Choosing which agent or person owns each task.",
    done: "9 agents · 1 person",
    meta: function () {
      return "Per task";
    },
    tools: [{ id: "assign_agents", name: "assign_task_agents", working: "Matching each task to an agent or the Relationship Manager.", done: "Owners assigned." }]
  },
  {
    id: "check",
    name: "Check the draft",
    duration: 0,
    working: "Confirming every task has an owner and the tree is complete.",
    done: "Blueprint complete. Nothing was published.",
    meta: function () {
      return "Completeness check";
    },
    tools: [
      { id: "validate_owners", name: "validate_task_owners", working: "Confirming every task has an owner.", done: "Owners complete." },
      { id: "validate_tree", name: "validate_blueprint", working: "Checking step order and dependencies.", done: "Blueprint is complete. Nothing was published." }
    ]
  }
];

const items = [];
const stageState = {};
let phase = "generating";
let failMode = false;
let clock = 0;
let timer = null;
let revealId = "";

BLUEPRINT.forEach((step) => {
  items.push({ kind: "step", id: step.id, step: step, status: "hidden", elapsed: 0 });
  step.tasks.forEach((task) => {
    items.push({ kind: "task", id: task.id, step: step, task: task, status: "hidden", elapsed: 0 });
  });
  if (step.owner) {
    items.push({ kind: "owner", id: step.id + "-owner", step: step, status: "hidden", elapsed: 0 });
  }
});

document.title = draft.name ? draft.name + " · Generate blueprint" : "Generate blueprint";

function stageCopy(stage, key) {
  const value = stage[key];
  return typeof value === "function" ? value() : value || "";
}

function icon(name, extra) {
  return (
    '<span class="slds-icon_container slds-icon-utility-' +
    name +
    '" aria-hidden="true"><svg class="slds-icon slds-icon_xx-small ' +
    (extra || "slds-icon-text-default") +
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

function currentStage() {
  return stages.find((stage) => stageState[stage.id].status === "running");
}

function failedStage() {
  return stages.find((stage) => stageState[stage.id].status === "failed");
}

function nextQueuedStage() {
  return stages.find((stage) => stageState[stage.id].status === "queued");
}

function activeTool(stage) {
  const entry = stageState[stage.id];
  if (!stage.tools || !entry || entry.toolIndex >= stage.tools.length) return null;
  return stage.tools[entry.toolIndex];
}

function toolsFinished(stage, entry) {
  return !stage.tools || !stage.tools.length || entry.toolIndex >= stage.tools.length;
}

function toolRowState(entry, index) {
  if (entry.status === "done") return "done";
  if (entry.status === "failed") {
    if (index < entry.toolIndex) return "done";
    if (index === entry.toolIndex) return "failed";
    return "queued";
  }
  if (entry.status === "running") {
    if (index < entry.toolIndex) return "done";
    if (index === entry.toolIndex) return "running";
  }
  return "queued";
}

function persist(extra) {
  const stage = phase === "ready" ? "Ready" : phase === "generating" ? "Generating" : "Draft";
  const payload = Object.assign({}, draft, { name: draft.name, stage: stage, blueprint: BLUEPRINT }, extra || {});
  if (phase !== "ready") payload.ready = false;
  sessionStorage.setItem("ap-create-draft", JSON.stringify(payload));
}

function announce(message) {
  status.textContent = message;
}

function nextWork(kinds, fromStatus) {
  return items.find((item) => kinds.indexOf(item.kind) !== -1 && fromStatus.indexOf(item.status) !== -1);
}

function stageStatusLabel(entry) {
  if (entry.status === "running") return "In progress";
  if (entry.status === "failed") return "Failed";
  return "";
}

function statusMarkup(className, label, assistive) {
  if (!label) {
    return assistive ? '<span class="slds-assistive-text">' + assistive + "</span>" : "";
  }
  return '<span class="' + className + '">' + label + "</span>";
}

const SHORT = {
  gather: "Gather Inputs",
  plan: "Create Plan",
  outreach: "Outreach",
  rm: "RM review"
};

function uniqueAssignees() {
  const seen = [];
  items.forEach((item) => {
    let who = "";
    let kind = "agent";
    if (item.kind === "task" && (item.status === "assigning" || item.status === "assigned")) {
      who = item.task.who;
      kind = item.task.kind;
    } else if (item.kind === "owner" && item.status !== "hidden") {
      who = item.step.owner.who;
      kind = item.step.owner.kind;
    } else {
      return;
    }
    if (!seen.some((entry) => entry.who === who)) seen.push({ who: who, kind: kind });
  });
  return seen;
}

function renderSummary(stage) {
  if (stage.id === "proposeSteps") {
    const shown = items.filter((item) => item.kind === "step" && item.status !== "hidden");
    if (!shown.length) return "";
    return '<p class="ap-stage__summary">' + shown.map((item) => SHORT[item.step.id] || item.step.name).join(" · ") + "</p>";
  }
  if (stage.id === "proposeTasks") {
    const shown = items.filter((item) => item.kind === "task" && item.status !== "hidden");
    if (!shown.length) return "";
    const parts = BLUEPRINT.map((step) => {
      const count = shown.filter((item) => item.step.id === step.id).length;
      return count ? SHORT[step.id] + " " + count : "";
    }).filter(Boolean);
    return '<p class="ap-stage__summary">' + shown.length + " tasks · " + parts.join(" · ") + "</p>";
  }
  if (stage.id === "assignAgents") {
    const assignees = uniqueAssignees();
    if (!assignees.length) return "";
    const current = items.find((item) => item.status === "assigning");
    const line = current
      ? (current.kind === "owner" ? current.step.owner.who : current.task.who) +
        " · " +
        (current.kind === "owner" ? SHORT[current.step.id] : current.task.name)
      : "";
    return (
      (line ? '<p class="ap-stage__summary">' + line + "</p>" : "") +
      '<div class="ap-stage__chips">' +
      assignees.map((entry) => agentTag(entry.who, entry.kind)).join("") +
      "</div>"
    );
  }
  return "";
}

function renderTools(stage, entry) {
  if (!stage.tools || !stage.tools.length || entry.status === "queued") return "";
  return (
    '<ul class="ap-tools">' +
    stage.tools
      .map((tool, index) => {
        const state = toolRowState(entry, index);
        if (state === "queued") return "";
        const copy = state === "done" ? tool.done : state === "queued" ? "" : tool.working;
        const label = state === "running" ? "Running" : state === "failed" ? "Failed" : "";
        return (
          '<li class="ap-tool is-' +
          state +
          '"><span class="ap-tool__glyph">' +
          icon(state === "done" ? "success" : state === "failed" ? "error" : "settings") +
          '</span><div><p class="ap-tool__name">' +
          tool.name +
          "</p>" +
          (copy ? '<p class="ap-tool__copy">' + copy + "</p>" : "") +
          "</div>" +
          statusMarkup("ap-tool__state", label, state === "done" ? "Done" : "") +
          "</li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

function renderStage(stage) {
  const entry = stageState[stage.id];
  if (entry.status === "queued") return null;
  const li = document.createElement("li");
  li.className = "ap-stage is-" + entry.status;
  li.dataset.stage = stage.id;
  let mark = '<span class="ap-stage__mark" aria-hidden="true"></span>';
  if (entry.status === "done") mark = '<span class="ap-stage__mark ap-stage__mark_done">' + icon("success", "slds-icon-text-success") + "</span>";
  if (entry.status === "failed") mark = '<span class="ap-stage__mark ap-stage__mark_failed">' + icon("error", "slds-icon-text-error") + "</span>";
  if (entry.status === "running") mark = '<span class="ap-stage__mark ap-stage__mark_run" aria-hidden="true"></span>';
  const summary = entry.status === "queued" ? "" : renderSummary(stage);
  const compactDone = entry.status === "done" && (stage.id === "proposeSteps" || stage.id === "proposeTasks");
  const tool = entry.status === "running" ? activeTool(stage) : null;
  const action =
    entry.status === "failed"
      ? entry.detail
      : entry.status === "running"
        ? tool
          ? tool.working
          : stageCopy(stage, "working")
        : entry.status === "done" && !compactDone
          ? stageCopy(stage, "done")
          : "";
  li.innerHTML =
    '<div class="ap-stage__row">' +
    mark +
    '<div class="ap-stage__body"><p class="ap-stage__name">' +
    stage.name +
    "</p>" +
    (action ? '<p class="ap-stage__action">' + action + "</p>" : "") +
    renderTools(stage, entry) +
    summary +
    (entry.status === "failed"
      ? '<button class="slds-button slds-button_neutral slds-m-top_xx-small" type="button" data-retry-stage="' +
        stage.id +
        '">Retry</button>'
      : "") +
    "</div>" +
    statusMarkup("ap-stage__status", stageStatusLabel(entry), entry.status === "done" ? "Complete" : "") +
    "</div>";
  const retry = li.querySelector("[data-retry-stage]");
  if (retry) retry.addEventListener("click", () => retryStage(stage.id));
  return li;
}

function render() {
  const doneStages = stages.filter((stage) => stageState[stage.id].status === "done").length;
  activityCount.textContent = doneStages + " of " + stages.length + " complete";
  activityCount.className = phase === "ready" ? "ap-badge ap-badge_ready" : "ap-badge ap-badge_generating";
  activityList.replaceChildren();
  stages.forEach((stage) => {
    const row = renderStage(stage);
    if (row) activityList.appendChild(row);
  });
  readyBox.classList.toggle("slds-hide", phase !== "ready");

  retryBtn.classList.toggle("slds-hide", !failedStage());
  failBtn.classList.toggle("slds-hide", failMode);
  if (revealId) {
    const row = document.querySelector('[data-item="' + revealId + '"], [data-stage="' + revealId + '"]');
    revealId = "";
    if (row) row.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function beginGenerating() {
  phase = "generating";
  stopBtn.classList.remove("slds-hide");
  stopBtn.hidden = false;
  badge.className = "ap-badge ap-badge_generating";
  badge.textContent = "Generating";
  nextBtn.setAttribute("aria-disabled", "true");
}

function startStage(stage) {
  const entry = stageState[stage.id];
  entry.status = "running";
  entry.elapsed = 0;
  entry.toolIndex = 0;
  entry.toolElapsed = 0;
  entry.attempts += 1;
  entry.detail = stageCopy(stage, "working");
  revealId = stage.id;
}

function completeStage(stage) {
  const entry = stageState[stage.id];
  if (stage.id === FAIL_STAGE && entry.failOnce && entry.attempts === 1) {
    entry.status = "failed";
    entry.detail = stage.failReason;
    return;
  }
  entry.status = "done";
  entry.detail = "";
}

function startItem(item, status) {
  item.status = status;
  item.elapsed = 0;
  revealId = item.id;
}

function finishItem(item, status) {
  item.status = status;
}

function retryStage(id) {
  const stage = stages.find((entry) => entry.id === id);
  if (!stage || stageState[id].status !== "failed") return;
  stageState[id].failOnce = false;
  startStage(stage);
  if (phase !== "generating") {
    beginGenerating();
    announce("");
    run();
  }
  render();
}

function advanceBuild(running) {
  const adding = items.find((item) => item.status === "adding" || item.status === "naming" || item.status === "assigning");
  if (adding) {
    adding.elapsed += TICK;
    if (adding.elapsed < ITEM_MS) return;
    if (adding.status === "adding") finishItem(adding, "shown");
    else if (adding.status === "naming") finishItem(adding, "named");
    else if (adding.status === "assigning") finishItem(adding, "assigned");
  }
  if (items.some((item) => item.status === "adding" || item.status === "naming" || item.status === "assigning")) return;

  let next = null;
  let nextStatus = "";
  if (running.id === "proposeSteps") {
    next = nextWork(["step"], ["hidden"]);
    nextStatus = "adding";
  } else if (running.id === "proposeTasks") {
    next = nextWork(["task"], ["hidden"]);
    nextStatus = "naming";
  } else if (running.id === "assignAgents") {
    next = nextWork(["task"], ["named"]) || nextWork(["owner"], ["hidden"]);
    nextStatus = "assigning";
  }
  if (next) {
    startItem(next, nextStatus);
    return;
  }
  completeStage(running);
}

function advanceTool(stage) {
  const entry = stageState[stage.id];
  const tool = stage.tools[entry.toolIndex];
  if (!tool) return true;
  entry.toolElapsed += TICK;
  if (entry.toolElapsed < (tool.duration || TOOL_MS)) return false;
  if (stage.id === FAIL_STAGE && entry.failOnce && entry.attempts === 1 && tool.id === "check_access") {
    entry.status = "failed";
    entry.detail = stage.failReason;
    return false;
  }
  entry.toolIndex += 1;
  entry.toolElapsed = 0;
  return toolsFinished(stage, entry);
}

function tick() {
  clock += TICK;
  const running = currentStage();
  if (running) {
    const entry = stageState[running.id];
    if (!toolsFinished(running, entry)) {
      advanceTool(running);
    } else if (running.id === "proposeSteps" || running.id === "proposeTasks" || running.id === "assignAgents") {
      advanceBuild(running);
    } else {
      completeStage(running);
    }
  }

  if (!currentStage() && !failedStage()) {
    const next = nextQueuedStage();
    if (next) startStage(next);
  }

  if (stages.every((stage) => stageState[stage.id].status === "done")) {
    finish("ready");
    return;
  }
  if (failedStage() && !currentStage()) {
    finish("failed");
    return;
  }
  render();
}

function finish(kind) {
  window.clearInterval(timer);
  timer = null;
  phase = kind;
  stopBtn.hidden = true;
  stopBtn.classList.add("slds-hide");
  render();
  if (kind === "ready") {
    badge.className = "ap-badge ap-badge_ready";
    badge.textContent = "Ready";
    nextBtn.removeAttribute("aria-disabled");
    announce("Blueprint ready. Review is next.");
    persist({ ready: true });
  } else if (kind === "failed") {
    badge.className = "ap-badge ap-badge_failed";
    badge.textContent = "Blocked";
    announce("Context access failed. Successful work is kept. Retry to continue.");
    persist();
  } else {
    badge.className = "ap-badge ap-badge_draft";
    badge.textContent = "Draft";
    announce("Generation stopped. Proposed work is kept.");
    persist();
  }
}

function run() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(tick, TICK);
}

function seed() {
  stages.forEach((stage) => {
    stageState[stage.id] = {
      status: "queued",
      elapsed: 0,
      toolIndex: 0,
      toolElapsed: 0,
      attempts: 0,
      detail: "",
      failOnce: failMode && stage.id === FAIL_STAGE
    };
  });
  items.forEach((item) => {
    item.status = "hidden";
    item.elapsed = 0;
  });
}

function reset(mode) {
  failMode = mode === "fail";
  draft.ready = false;
  window.clearInterval(timer);
  timer = null;
  clock = 0;
  seed();
  beginGenerating();
  startStage(stages[0]);
  announce(failMode ? "Simulating a failed context check. Successful work is kept." : "");
  render();
  run();
}

stopBtn.addEventListener("click", () => finish("stopped"));
retryBtn.addEventListener("click", () => {
  const failed = failedStage();
  if (failed) retryStage(failed.id);
});
failBtn.addEventListener("click", () => reset("fail"));
document.getElementById("gen-save").addEventListener("click", () => {
  persist();
  window.location.href = LANDING + "?saved=1";
});
nextBtn.addEventListener("click", (event) => {
  if (nextBtn.getAttribute("aria-disabled") === "true") {
    event.preventDefault();
    return;
  }
  persist({ ready: true });
});

if (draft.ready) {
  stages.forEach((stage) => {
    stageState[stage.id] = {
      status: "done",
      elapsed: 0,
      toolIndex: (stage.tools || []).length,
      toolElapsed: 0,
      attempts: 1,
      detail: "",
      failOnce: false
    };
  });
  items.forEach((item) => {
    item.status = item.kind === "step" ? "shown" : "assigned";
    item.elapsed = 0;
  });
  finish("ready");
} else {
  reset("success");
}
