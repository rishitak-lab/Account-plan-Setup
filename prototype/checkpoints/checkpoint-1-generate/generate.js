const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const LANDING = "../landing/index.html";
const TICK = 200;
const FAIL_TASK = "g3";

const STEPS = [
  {
    id: "gather",
    name: "Gather Inputs",
    wait: "Starts with the workflow",
    tasks: [
      { id: "g1", name: "Review client history", who: "History Agent", kind: "agent", activity: "Reading activities and contacts", duration: 1100 },
      { id: "g2", name: "Pull financial data", who: "Financials Agent", kind: "agent", activity: "Reading financial accounts", duration: 1200 },
      { id: "g3", name: "Research market context", who: "Market Research Agent", kind: "agent", activity: "Opening linked industry research", duration: 1000, failReason: "Linked industry research did not respond." },
      { id: "g4", name: "Add risk signals", who: "Risk Intelligence Agent", kind: "agent", activity: "Checking utilisation and covenants", duration: 1100 },
      { id: "g5", name: "Coverage and contacts", who: "Coverage Strategy Agent", kind: "agent", activity: "Reading the account team", duration: 1000 },
      { id: "g6", name: "Load prior objectives and measures", who: "History Agent", kind: "agent", activity: "Reading the prior plan period", duration: 900, dependsOn: ["g1"], wait: "Waiting on Review client history" }
    ]
  },
  {
    id: "plan",
    name: "Create Plan",
    wait: "Waiting on Gather Inputs",
    dependsOn: ["gather"],
    tasks: [
      { id: "p1", name: "Draft relationship strategy", who: "Strategy Agent", kind: "agent", activity: "Drafting relationship health and calling strategy", duration: 1100 },
      { id: "p2", name: "Define Objectives & Measures", who: "Objectives Agent", kind: "agent", activity: "Drafting objectives from gathered evidence", duration: 1200 }
    ]
  },
  {
    id: "outreach",
    name: "Reach out to Treasury, Credit, and Industry specialists",
    wait: "Waiting on Create Plan",
    dependsOn: ["plan"],
    tasks: [
      { id: "o1", name: "Gather specialist input", who: "Outreach Agent", kind: "agent", activity: "Requesting Treasury, Credit, and Industry input", duration: 1100 },
      { id: "o2", name: "Synthesize specialist feedback", who: "Synthesis Agent", kind: "agent", activity: "Merging specialist updates into the plan", duration: 1000, dependsOn: ["o1"], wait: "Waiting on specialist input" }
    ]
  },
  {
    id: "rm",
    name: "Route the account plan for Relationship Manager review",
    wait: "Waiting on specialist outreach",
    dependsOn: ["outreach"],
    owner: { who: "Relationship Manager", kind: "person" },
    tasks: []
  }
];

const tree = document.getElementById("blueprint-tree");
const title = document.getElementById("gen-title");
const badge = document.getElementById("gen-badge");
const pillLabel = document.getElementById("gen-pill-label");
const spinner = document.getElementById("gen-spinner");
const nowEl = document.getElementById("gen-now");
const metaEl = document.getElementById("gen-meta");
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

const open = {};
const tasks = {};
let phase = "generating";
let failMode = false;
let clock = 0;
let timer = null;
let revealId = "";

STEPS.forEach((step) => {
  open[step.id] = true;
  step.tasks.forEach((task) => {
    tasks[task.id] = Object.assign({ status: "queued", elapsed: 0, attempts: 0, detail: "", failOnce: false }, task);
  });
});

title.textContent = draft.name || title.textContent;
document.title = draft.name || document.title;

function allTasks() {
  return Object.values(tasks);
}

function orderedTasks() {
  const list = [];
  STEPS.forEach((step) => {
    step.tasks.forEach((task) => list.push(tasks[task.id]));
  });
  return list;
}

function previousTask(task) {
  const list = orderedTasks();
  const index = list.findIndex((item) => item.id === task.id);
  return index > 0 ? list[index - 1] : null;
}

function taskStep(task) {
  return STEPS.find((step) => step.tasks.some((item) => item.id === task.id));
}

function stepTasks(step) {
  return step.tasks.map((task) => tasks[task.id]);
}

function stepDone(step) {
  if (step.owner) {
    return STEPS.filter((entry) => (step.dependsOn || []).includes(entry.id)).every(stepDone);
  }
  const list = stepTasks(step);
  return list.length > 0 && list.every((task) => task.status === "done");
}

function stepFailed(step) {
  return stepTasks(step).some((task) => task.status === "failed");
}

function stepRunning(step) {
  return stepTasks(step).some((task) => task.status === "running");
}

function stepLabel(step) {
  if (step.owner) return stepDone(step) ? "Ready" : "Waiting";
  if (stepFailed(step) && !stepRunning(step)) return "Blocked";
  if (stepDone(step)) return "Done";
  if (stepRunning(step)) return "Running";
  return "Waiting";
}

function depsMet(task) {
  return (task.dependsOn || []).every((id) => tasks[id] && tasks[id].status === "done");
}

function stepDepsMet(step) {
  return (step.dependsOn || []).every((id) => {
    const prior = STEPS.find((entry) => entry.id === id);
    return prior && stepDone(prior);
  });
}

function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

function counts() {
  const list = allTasks();
  return {
    done: list.filter((task) => task.status === "done").length,
    failed: list.filter((task) => task.status === "failed").length,
    running: list.filter((task) => task.status === "running").length,
    total: list.length
  };
}

function persist() {
  const stage = phase === "ready" ? "Ready" : phase === "generating" ? "Generating" : "Draft";
  sessionStorage.setItem("ap-create-draft", JSON.stringify(Object.assign({}, draft, { name: title.textContent, stage: stage })));
}

function announce(message) {
  status.textContent = message;
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

function isAssigned(task) {
  return task.status === "running" || task.status === "done" || task.status === "failed";
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

function marker(task) {
  if (task.status === "done") return '<span class="ap-task__marker ap-task__marker_done">' + icon("success", "slds-icon-text-success") + "</span>";
  if (task.status === "failed") return '<span class="ap-task__marker ap-task__marker_failed">' + icon("error", "slds-icon-text-error") + "</span>";
  const running = task.status === "running" ? " ap-task__marker_running" : "";
  return '<span class="ap-task__marker' + running + '" aria-hidden="true"></span>';
}

function waitCopy(task) {
  const prev = previousTask(task);
  if (prev && prev.status === "failed") return "Blocked until " + prev.name + " is retried";
  if (prev && prev.status !== "done") return "Waiting on " + prev.name;
  const step = taskStep(task);
  if (step && !stepDepsMet(step)) return step.wait;
  return task.wait || "Queued";
}

function taskState(task) {
  if (task.status === "running") return "<b>Working</b><br>" + task.activity;
  if (task.status === "done") return "<b>Drafted</b> · " + formatClock(task.elapsed);
  if (task.status === "failed") return "<b>Failed</b>";
  return waitCopy(task);
}

function upcoming() {
  const list = orderedTasks();
  const running = list.find((task) => task.status === "running");
  if (running) {
    const index = list.findIndex((task) => task.id === running.id);
    return list[index + 1] || null;
  }
  return nextRunnable();
}

function renderTask(task) {
  const li = document.createElement("li");
  li.className = "ap-task" + (task.status === "failed" ? " is-failed" : "") + (task.status === "running" ? " is-running" : "");
  li.dataset.task = task.id;
  li.innerHTML =
    marker(task) +
    '<div class="ap-task__body"><p class="ap-task__name">' +
    task.name +
    "</p>" +
    (isAssigned(task) ? agentTag(task.who, task.kind) : "") +
    (task.status === "failed"
      ? '<p class="ap-task__error">' +
        task.detail +
        '</p><button class="slds-button slds-button_neutral slds-m-top_xx-small" type="button" data-retry="' +
        task.id +
        '">Retry</button>'
      : "") +
    '</div><div class="ap-task__state">' +
    taskState(task) +
    "</div>";
  const retry = li.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", () => retryTask(task.id));
  return li;
}

function renderStep(step) {
  const li = document.createElement("li");
  const label = stepLabel(step);
  li.className = "ap-step";
  if (open[step.id]) li.classList.add("is-open");
  if (label === "Running") li.classList.add("is-running");
  if (label === "Blocked") li.classList.add("is-failed");
  const list = stepTasks(step);
  const done = list.filter((task) => task.status === "done").length;
  const count = step.owner ? "" : done + " of " + list.length;
  let body = "";
  if (step.tasks.length) {
    const ul = document.createElement("ul");
    ul.className = "ap-step__tasks";
    list.forEach((task) => ul.appendChild(renderTask(task)));
    body = ul;
  } else {
    const p = document.createElement("p");
    p.className = "ap-step__empty";
    if (stepDone(step) && step.owner) {
      p.innerHTML = agentTag(step.owner.who, step.owner.kind) + '<span class="ap-step__empty-note">No agent tasks.</span>';
    } else {
      p.textContent = step.wait;
    }
    body = p;
  }
  li.innerHTML =
    '<button class="ap-step__head" type="button" aria-expanded="' +
    (open[step.id] ? "true" : "false") +
    '">' +
    '<svg class="slds-button__icon ap-step__chevron" aria-hidden="true"><use href="' +
    ICON +
    '#chevronright"></use></svg>' +
    '<span class="ap-step__name">' +
    step.name +
    '</span><span class="ap-step__meta"><span>' +
    label +
    "</span>" +
    (count ? "<span>" + count + "</span>" : "") +
    "</span></button>";
  li.querySelector(".ap-step__head").addEventListener("click", () => {
    open[step.id] = !open[step.id];
    render();
  });
  li.append(body);
  if (!open[step.id]) li.classList.remove("is-open");
  else li.classList.add("is-open");
  return li;
}

function nowCopy() {
  const running = allTasks().filter((task) => task.status === "running")[0];
  if (running) return running.who + " · " + running.name;
  const failed = allTasks().filter((task) => task.status === "failed")[0];
  if (failed) return failed.who + " needs a retry";
  if (phase === "ready") return "Blueprint drafted. Nothing was written to Account Plan records.";
  if (phase === "stopped") return "Generation stopped. Drafted work is kept.";
  return "Waiting for the next task";
}

function metaCopy() {
  const tally = counts();
  const next = upcoming();
  let line = tally.done + " of " + tally.total + " tasks · " + formatClock(clock);
  if (phase === "generating" && next) line += " · Next: " + next.name;
  return line;
}

function render() {
  const tally = counts();
  nowEl.textContent = nowCopy();
  metaEl.textContent = metaCopy();
  tree.replaceChildren();
  STEPS.forEach((step) => tree.appendChild(renderStep(step)));
  retryBtn.classList.toggle("slds-hide", tally.failed === 0);
  failBtn.classList.toggle("slds-hide", failMode);
  if (revealId) {
    const row = tree.querySelector('[data-task="' + revealId + '"]');
    revealId = "";
    if (row) row.scrollIntoView({ block: "nearest" });
  }
}

function beginGenerating() {
  phase = "generating";
  spinner.hidden = false;
  stopBtn.classList.remove("slds-hide");
  stopBtn.hidden = false;
  badge.className = "ap-badge ap-badge_generating";
  badge.textContent = "Generating";
  pillLabel.textContent = "Generating blueprint";
  nextBtn.disabled = true;
}

function startTask(task) {
  const step = taskStep(task);
  if (step) open[step.id] = true;
  task.status = "running";
  task.elapsed = 0;
  task.attempts += 1;
  task.detail = task.activity;
  revealId = task.id;
}

function completeTask(task) {
  if (task.failOnce && task.attempts === 1) {
    task.status = "failed";
    task.detail = task.failReason;
    return;
  }
  task.status = "done";
  task.detail = "";
}

function retryTask(id) {
  const task = tasks[id];
  if (!task || task.status !== "failed") return;
  task.failOnce = false;
  startTask(task);
  if (phase !== "generating") {
    beginGenerating();
    announce("");
    run();
  }
  render();
}

function nextRunnable() {
  return orderedTasks().find((task) => {
    if (task.status !== "queued" && task.status !== "waiting") return false;
    const step = taskStep(task);
    if (!step || step.owner || !stepDepsMet(step) || !depsMet(task)) return false;
    const prev = previousTask(task);
    return !prev || prev.status === "done";
  });
}

function tick() {
  clock += TICK;
  allTasks()
    .filter((task) => task.status === "running")
    .forEach((task) => {
      task.elapsed += TICK;
      if (task.elapsed >= task.duration) completeTask(task);
    });

  if (!allTasks().some((task) => task.status === "running")) {
    const next = nextRunnable();
    if (next) startTask(next);
  }

  const tally = counts();
  if (tally.done === tally.total) {
    finish("ready");
    return;
  }
  if (tally.failed && !tally.running && !nextRunnable()) {
    finish("failed");
    return;
  }
  render();
}

function finish(kind) {
  window.clearInterval(timer);
  timer = null;
  phase = kind;
  spinner.hidden = true;
  stopBtn.hidden = true;
  stopBtn.classList.add("slds-hide");
  render();
  if (kind === "ready") {
    badge.className = "ap-badge ap-badge_ready";
    badge.textContent = "Ready";
    pillLabel.textContent = "Blueprint ready";
    nextBtn.disabled = false;
    announce("Blueprint ready. No Account Plan records were changed.");
  } else if (kind === "failed") {
    badge.className = "ap-badge ap-badge_failed";
    badge.textContent = "Blocked";
    pillLabel.textContent = "Generation blocked";
    announce("One agent failed. Successful work is kept. Retry that task to continue.");
  } else {
    badge.className = "ap-badge ap-badge_draft";
    badge.textContent = "Draft";
    pillLabel.textContent = "Generation stopped";
    announce("Generation stopped. Drafted work is kept.");
  }
  persist();
}

function run() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(tick, TICK);
}

function seed() {
  orderedTasks().forEach((task, index) => {
    task.status = index === 0 ? "queued" : "waiting";
    task.elapsed = 0;
    task.attempts = 0;
    task.detail = "";
    task.failOnce = failMode && task.id === FAIL_TASK;
  });
}

function reset(mode) {
  failMode = mode === "fail";
  window.clearInterval(timer);
  timer = null;
  clock = 0;
  seed();
  beginGenerating();
  const first = nextRunnable();
  if (first) startTask(first);
  announce(failMode ? "Simulating a failed agent. Successful work is kept." : "");
  render();
  run();
}

stopBtn.addEventListener("click", () => finish("stopped"));
retryBtn.addEventListener("click", () => {
  allTasks().filter((task) => task.status === "failed").forEach((task) => retryTask(task.id));
});
failBtn.addEventListener("click", () => reset("fail"));
document.getElementById("gen-save").addEventListener("click", () => {
  persist();
  window.location.href = LANDING + "?saved=1";
});
nextBtn.addEventListener("click", () => {
  if (nextBtn.disabled) return;
  persist();
  announce("Review is next. That flow is not built yet.");
});

reset("success");
title.focus();
