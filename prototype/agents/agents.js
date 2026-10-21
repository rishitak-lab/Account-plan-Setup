const STORAGE = "ap-workflow-agents";
const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
const FAIL_LABEL = {
  retry: "Retry, then stop",
  person: "Hand to RM",
  skip: "Skip"
};

const DEFAULTS = [
  {
    id: "coordinator",
    name: "Account Planning Agent",
    does: "Coordinates the Account Plan run. Does not write a plan section.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "tree", label: "Workflow tree and task status", on: true },
      { id: "outputs", label: "Outputs from other agents", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "Coordinate the run" }]
  },
  {
    id: "compliance",
    name: "Compliance Check Agent",
    does: "Applies the industry compliance checks for the run.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "industry", label: "Industry compliance pack", on: true },
      { id: "policy", label: "Internal policy library", on: true }
    ],
    uses: [
      { workflow: "Account plan", task: "Apply industry compliance" },
      { workflow: "KYC renewal", task: "Apply KYC compliance checks" },
      { workflow: "New client onboarding", task: "Apply onboarding compliance" }
    ]
  },
  {
    id: "coverage",
    name: "Coverage Strategy Agent",
    does: "Collects coverage contacts and the calling narrative.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "team", label: "Account team", on: true },
      { id: "cadence", label: "Historical cadence", on: true },
      { id: "pipeline", label: "Pipeline", on: true }
    ],
    uses: [
      { workflow: "Account plan", task: "1.5 Coverage and contacts" },
      { workflow: "Account plan", task: "2.1 Draft relationship strategy" }
    ]
  },
  {
    id: "covenant",
    name: "Covenant Monitor Agent",
    does: "Watches covenants and flags breaches for credit review.",
    available: true,
    instructions: "",
    onFail: "person",
    sources: [
      { id: "covenants", label: "Covenant terms", on: true },
      { id: "utilisation", label: "Utilisation", on: true }
    ],
    uses: [
      { workflow: "Credit review", task: "Monitor covenants" },
      { workflow: "Credit application", task: "Check existing covenants" }
    ]
  },
  {
    id: "credit-memo",
    name: "Credit Memo Agent",
    does: "Drafts the credit recommendation from gathered evidence.",
    available: true,
    instructions: "",
    onFail: "person",
    sources: [
      { id: "financialAccounts", label: "Financial accounts", on: true },
      { id: "internalRisk", label: "Internal risk rating", on: true },
      { id: "plan", label: "Draft plan sections", on: false }
    ],
    uses: [{ workflow: "Credit application", task: "Draft credit recommendation" }]
  },
  {
    id: "financials",
    name: "Financials Agent",
    does: "Pulls financial performance into the run.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "financialAccounts", label: "Financial accounts", on: true },
      { id: "coreBanking", label: "Core banking figures", on: true },
      { id: "opportunities", label: "Opportunity amounts", on: false }
    ],
    uses: [
      { workflow: "Account plan", task: "1.2 Pull financial data" },
      { workflow: "KYC renewal", task: "Confirm source of funds" },
      { workflow: "Credit application", task: "Pull latest financials" }
    ]
  },
  {
    id: "history",
    name: "History Agent",
    does: "Reads prior client history as evidence.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "activities", label: "Activities and meetings", on: true },
      { id: "contacts", label: "Contacts and account team", on: true },
      { id: "opportunities", label: "Opportunity history", on: true },
      { id: "priorPlan", label: "Prior account plan", on: true }
    ],
    uses: [
      { workflow: "Account plan", task: "1.1 Review client history" },
      { workflow: "Account plan", task: "1.6 Load prior objectives and measures" },
      { workflow: "KYC renewal", task: "Review prior KYC file" }
    ]
  },
  {
    id: "identity",
    name: "Identity Verification Agent",
    does: "Verifies identity evidence for KYC and onboarding.",
    available: true,
    instructions: "",
    onFail: "person",
    sources: [
      { id: "idDocs", label: "Identity documents", on: true },
      { id: "internalId", label: "Internal identity records", on: true }
    ],
    uses: [
      { workflow: "KYC renewal", task: "Verify identity evidence" },
      { workflow: "New client onboarding", task: "Verify identity" }
    ]
  },
  {
    id: "kyc-docs",
    name: "KYC Document Agent",
    does: "Collects KYC documents and checks expiry.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "kycFiles", label: "KYC document store", on: true },
      { id: "expiry", label: "Document expiry dates", on: true }
    ],
    uses: [
      { workflow: "KYC renewal", task: "Collect KYC documents" },
      { workflow: "KYC renewal", task: "Check document expiry" },
      { workflow: "New client onboarding", task: "Collect onboarding documents" }
    ]
  },
  {
    id: "market",
    name: "Market Research Agent",
    does: "Gathers industry, vision, and competitive context.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "industry", label: "Industry research", on: true },
      { id: "competitors", label: "Competitor sources", on: true },
      { id: "context", label: "Describe context files and links", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "1.3 Research market context" }]
  },
  {
    id: "objectives",
    name: "Objectives Agent",
    does: "Writes new objectives and measures. Does not invent them during gather.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "gather", label: "Finished gather outputs", on: true },
      { id: "priorObjectives", label: "Prior objectives", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "2.2 Define Objectives & Measures" }]
  },
  {
    id: "onboarding",
    name: "Onboarding Agent",
    does: "Assembles the first-relationship pack for a new client.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "account", label: "New account record", on: true },
      { id: "team", label: "Account team", on: true }
    ],
    uses: [{ workflow: "New client onboarding", task: "Assemble onboarding pack" }]
  },
  {
    id: "outreach",
    name: "Outreach Agent",
    does: "Requests specialist input. Does not write the specialist’s section.",
    available: true,
    instructions: "",
    onFail: "person",
    sources: [
      { id: "roles", label: "Treasury, Credit, and Industry roles", on: true },
      { id: "plan", label: "Draft plan sections", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "3.1 Gather specialist input" }]
  },
  {
    id: "risk",
    name: "Risk Intelligence Agent",
    does: "Adds risk rating and supporting evidence.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "utilisation", label: "Utilisation and covenants", on: true },
      { id: "media", label: "Adverse media", on: true },
      { id: "internalRisk", label: "Internal risk rating", on: true }
    ],
    uses: [
      { workflow: "Account plan", task: "1.4 Add risk signals" },
      { workflow: "KYC renewal", task: "Screen risk flags" },
      { workflow: "Credit application", task: "Assess credit risk" }
    ]
  },
  {
    id: "strategy",
    name: "Strategy Agent",
    does: "Drafts relationship health from gathered evidence.",
    available: true,
    instructions: "",
    onFail: "retry",
    sources: [
      { id: "gather", label: "Finished gather outputs", on: true },
      { id: "priorPlan", label: "Prior relationship strategy", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "2.1 Draft relationship strategy" }]
  },
  {
    id: "synthesis",
    name: "Synthesis Agent",
    does: "Merges specialist changes into the plan.",
    available: true,
    instructions: "",
    onFail: "person",
    sources: [
      { id: "replies", label: "Specialist replies", on: true },
      { id: "plan", label: "Draft plan sections", on: true }
    ],
    uses: [{ workflow: "Account plan", task: "3.2 Synthesize specialist feedback" }]
  }
];

const rows = document.getElementById("agent-rows");
const status = document.getElementById("agent-status");
const backdrop = document.getElementById("modal-back");
const modal = document.getElementById("agent-modal");
const contextEl = document.getElementById("agent-modal-context");
const instructionsEl = document.getElementById("agent-instructions");
const sourcesEl = document.getElementById("agent-sources");
const failEl = document.getElementById("agent-fail");
const usageModal = document.getElementById("usage-modal");
const usageTitle = document.getElementById("usage-title");
const usageLead = document.getElementById("usage-lead");
const usageBody = document.getElementById("usage-body");

let agents = loadAgents();
let editing = null;
let usageAgent = null;
let usageTrigger = null;

function loadAgents() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE) || "[]");
    if (!Array.isArray(saved) || !saved.length) return DEFAULTS.map(cloneAgent);
    return DEFAULTS.map((base) => {
      const match = saved.find((item) => item.id === base.id);
      if (!match) return cloneAgent(base);
      return Object.assign(cloneAgent(base), {
        available: match.available,
        instructions: match.instructions,
        onFail: match.onFail,
        sources: mergeSources(base.sources, match.sources)
      });
    });
  } catch (error) {
    return DEFAULTS.map(cloneAgent);
  }
}

function cloneAgent(agent) {
  return Object.assign({}, agent, {
    sources: agent.sources.map((source) => Object.assign({}, source)),
    uses: (agent.uses || []).map((use) => Object.assign({}, use))
  });
}

function mergeSources(base, saved) {
  if (!saved || !saved.length) return base.map((source) => Object.assign({}, source));
  return base.map((source) => {
    const match = saved.find((item) => item.id === source.id);
    return Object.assign({}, source, match ? { on: match.on } : {});
  });
}

function persist() {
  sessionStorage.setItem(STORAGE, JSON.stringify(agents));
}

function announce(message) {
  status.textContent = message;
}

function usesOf(agent) {
  return agent.uses || [];
}

function workflowNames(agent) {
  return [...new Set(usesOf(agent).map((use) => use.workflow))];
}

function primaryWorkflow(agent) {
  const names = workflowNames(agent);
  if (names.includes("Account plan")) return "Account plan";
  return names.slice().sort((a, b) => a.localeCompare(b, "en"))[0] || "—";
}

function usedLabel(agent) {
  const names = workflowNames(agent);
  if (!names.length) return "—";
  const more = names.length - 1;
  return more > 0 ? primaryWorkflow(agent) + " + " + more + " more" : names[0];
}

function usageSummary(agent) {
  const workflows = workflowNames(agent).length;
  if (!workflows) return "Not used on any workflow.";
  return workflows === 1 ? "Used in 1 workflow." : "Used in " + workflows + " workflows.";
}

function groupedUses(agent) {
  const groups = [];
  const map = {};
  usesOf(agent).forEach((use) => {
    if (!map[use.workflow]) {
      map[use.workflow] = { workflow: use.workflow, tasks: [] };
      groups.push(map[use.workflow]);
    }
    map[use.workflow].tasks.push(use.task);
  });
  groups.sort((a, b) => {
    if (a.workflow === "Account plan") return -1;
    if (b.workflow === "Account plan") return 1;
    return a.workflow.localeCompare(b.workflow, "en");
  });
  return groups;
}

function workflowHref(workflowName) {
  if (workflowName === "Account plan") return "../review/index.html";
  return "../landing/index.html";
}

function openWorkflowForRemoval(workflowName) {
  if (workflowName === "Account plan") {
    sessionStorage.setItem(
      "ap-create-draft",
      JSON.stringify({
        id: "refresh",
        name: "Refresh expiring account plans",
        industry: "Commercial banking",
        description: "Recommended when a plan period is nearing its end.",
        process: "Recommended when a plan period is nearing its end.",
        files: [],
        links: [],
        stage: "Ready",
        ready: true,
        fromInventory: "refresh"
      })
    );
  }
  window.location.href = workflowHref(workflowName);
}

function switchControl(agent) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ap-switch";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", agent.available ? "true" : "false");
  button.setAttribute("aria-label", "Available, " + agent.name);
  button.addEventListener("click", () => {
    if (agent.available && usesOf(agent).length) {
      openUsage(agent, button, { blockTurnOff: true });
      announce("Can't turn off " + agent.name + " until you remove it from its workflows.");
      return;
    }
    agent.available = !agent.available;
    persist();
    render();
    announce(
      agent.available
        ? agent.name + " is available."
        : agent.name + " is unavailable."
    );
  });
  return button;
}

function agentTag(name) {
  const tag = document.createElement("span");
  tag.className = "ap-agent-tag";
  tag.innerHTML =
    '<span class="slds-icon_container slds-icon-utility-einstein" aria-hidden="true"><svg class="slds-icon slds-icon_xx-small slds-icon-text-default"><use href="' +
    ICON +
    '#einstein"></use></svg></span>';
  tag.append(document.createTextNode(name));
  return tag;
}

function usedOnControl(agent) {
  const uses = usesOf(agent);
  if (!uses.length) return document.createTextNode("—");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slds-button slds-button_reset ap-used-link";
  button.textContent = usedLabel(agent);
  button.setAttribute("aria-label", usedLabel(agent) + ". Show where " + agent.name + " is used.");
  button.addEventListener("click", () => openUsage(agent, button));
  return button;
}

function render() {
  rows.replaceChildren();
  agents
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .forEach((agent) => {
      const tr = document.createElement("tr");
      if (!agent.available) tr.classList.add("ap-agent-row_off");
      const name = document.createElement("th");
      name.scope = "row";
      name.title = agent.name;
      name.append(agentTag(agent.name));
      const does = document.createElement("td");
      does.textContent = agent.does;
      const used = document.createElement("td");
      used.append(usedOnControl(agent));
      const available = document.createElement("td");
      available.append(switchControl(agent));
      tr.append(name, does, used, available);
      rows.append(tr);
    });
}

function fillSources(agent) {
  sourcesEl.replaceChildren();
  agent.sources.forEach((source) => {
    const label = document.createElement("label");
    label.className = "ap-source";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "agent-source";
    input.value = source.id;
    input.checked = source.on;
    const text = document.createElement("span");
    text.textContent = source.label;
    label.append(input, text);
    sourcesEl.append(label);
  });
}

function showBackdrop() {
  backdrop.classList.remove("slds-hide");
  backdrop.classList.add("slds-backdrop_open");
}

function hideBackdrop() {
  if (editing || usageAgent) return;
  backdrop.classList.add("slds-hide");
  backdrop.classList.remove("slds-backdrop_open");
}

function openCustomize(id) {
  closeUsage();
  editing = agents.find((agent) => agent.id === id);
  if (!editing) return;
  document.getElementById("agent-modal-title").textContent = "Customize " + editing.name;
  contextEl.textContent = usageSummary(editing);
  instructionsEl.value = editing.instructions || "";
  failEl.value = editing.onFail || "retry";
  fillSources(editing);
  showBackdrop();
  modal.classList.remove("slds-hide");
  modal.classList.add("slds-fade-in-open");
  instructionsEl.focus();
}

function closeCustomize() {
  editing = null;
  modal.classList.add("slds-hide");
  modal.classList.remove("slds-fade-in-open");
  hideBackdrop();
}

function saveCustomize() {
  if (!editing) return;
  editing.instructions = instructionsEl.value.trim();
  editing.onFail = failEl.value;
  const checked = new Set(Array.from(sourcesEl.querySelectorAll("input:checked")).map((input) => input.value));
  editing.sources.forEach((source) => {
    source.on = checked.has(source.id);
  });
  persist();
  const name = editing.name;
  const fail = FAIL_LABEL[editing.onFail] || "";
  closeCustomize();
  render();
  announce(name + " updated" + (fail ? ". " + fail + "." : "."));
}

function openUsage(agent, trigger, options) {
  options = options || {};
  const blockTurnOff = Boolean(options.blockTurnOff);
  closeCustomize();
  usageAgent = agent;
  usageTrigger = trigger || null;
  usageModal.classList.toggle("ap-usage-modal_warn", blockTurnOff);
  if (blockTurnOff) {
    usageTitle.textContent = "Can't turn off " + agent.name;
    usageLead.textContent =
      "This agent is still assigned in the workflows below. Open a workflow, remove the agent from its tasks, then turn it off here.";
  } else {
    usageTitle.textContent = "Where " + agent.name + " is used";
    usageLead.textContent = usageSummary(agent);
  }
  usageBody.replaceChildren();
  if (blockTurnOff) {
    const warn = document.createElement("div");
    warn.className = "ap-usage-warn";
    warn.setAttribute("role", "status");
    warn.textContent = "Turn off is blocked until this agent is removed from every workflow.";
    usageBody.append(warn);
  }
  const list = document.createElement("ul");
  list.className = "ap-usage-list";
  groupedUses(agent).forEach((group) => {
    const item = document.createElement("li");
    item.className = "ap-usage-item";
    const head = document.createElement("div");
    head.className = "ap-usage-item__head";
    const heading = document.createElement("h3");
    heading.className = "ap-usage-item__workflow";
    heading.textContent = group.workflow;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "slds-button slds-button_neutral ap-usage-open";
    open.textContent = "Edit Workflow";
    open.addEventListener("click", () => openWorkflowForRemoval(group.workflow));
    head.append(heading, open);
    const tasks = document.createElement("ul");
    tasks.className = "ap-usage-item__tasks";
    group.tasks.forEach((task) => {
      const li = document.createElement("li");
      li.textContent = task;
      tasks.append(li);
    });
    item.append(head, tasks);
    list.append(item);
  });
  usageBody.append(list);
  showBackdrop();
  usageModal.classList.remove("slds-hide");
  usageModal.classList.add("slds-fade-in-open");
  usageModal.focus({ preventScroll: true });
}

function closeUsage() {
  if (!usageAgent) return;
  usageAgent = null;
  usageModal.classList.add("slds-hide");
  usageModal.classList.remove("slds-fade-in-open");
  usageModal.classList.remove("ap-usage-modal_warn");
  hideBackdrop();
  if (usageTrigger) usageTrigger.focus();
  usageTrigger = null;
}

function closeOpenModal() {
  if (usageAgent) closeUsage();
  else if (editing) closeCustomize();
}

document.getElementById("agent-close").addEventListener("click", closeCustomize);
document.getElementById("agent-cancel").addEventListener("click", closeCustomize);
document.getElementById("agent-save").addEventListener("click", saveCustomize);
document.getElementById("usage-close").addEventListener("click", closeUsage);
document.getElementById("usage-done").addEventListener("click", closeUsage);
backdrop.addEventListener("click", closeOpenModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOpenModal();
});

render();
