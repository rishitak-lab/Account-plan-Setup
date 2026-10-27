(function () {
  const ICON = "../node_modules/@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg";
  const ASSIGNEES = [
    { who: "History Agent", kind: "agent" },
    { who: "Financials Agent", kind: "agent" },
    { who: "Market Research Agent", kind: "agent" },
    { who: "Risk Intelligence Agent", kind: "agent" },
    { who: "Coverage Strategy Agent", kind: "agent" },
    { who: "Strategy Agent", kind: "agent" },
    { who: "Objectives Agent", kind: "agent" },
    { who: "Outreach Agent", kind: "agent" },
    { who: "Synthesis Agent", kind: "agent" },
    { who: "Relationship Manager", kind: "person" },
    { who: "Treasury Specialist", kind: "person" },
    { who: "Credit Specialist", kind: "person" },
    { who: "Industry Specialist", kind: "person" }
  ];
  const FALLBACK = [
    {
      id: "gather",
      name: "Gather Inputs",
      descriptor: "Collect account evidence before the plan is assembled",
      startKind: "workflow",
      dependsOn: "",
      tasks: [
        { id: "g1", name: "Review client history", who: "History Agent", kind: "agent", startWhen: "When the stage starts", fallback: "RM delegate after 1 retry", instructions: "" },
        { id: "g2", name: "Pull financial data", who: "Financials Agent", kind: "agent", startWhen: "When the stage starts", fallback: "Data Operations queue", instructions: "" },
        { id: "g3", name: "Research market context", who: "Market Research Agent", kind: "agent", startWhen: "When the stage starts", fallback: "Research support queue", instructions: "" }
      ]
    },
    {
      id: "plan",
      name: "Create Plan",
      descriptor: "Draft relationship strategy and objectives from gathered evidence",
      startKind: "previous",
      dependsOn: "gather",
      tasks: [
        { id: "p1", name: "Draft relationship strategy", who: "Strategy Agent", kind: "agent", startWhen: "When the stage starts", fallback: "RM manual entry", instructions: "" },
        { id: "p2", name: "Define Objectives & Measures", who: "Objectives Agent", kind: "agent", startWhen: "After another task", dependsOn: "p1", fallback: "RM define objectives", instructions: "" }
      ]
    },
    {
      id: "outreach",
      name: "Reach out to Treasury Specialist, Credit Specialist and Industry Specialist",
      descriptor: "Request specialist input, then merge it into the plan",
      startKind: "previous",
      dependsOn: "plan",
      tasks: [
        {
          id: "o1",
          name: "Gather input from the specialists",
          who: "Outreach Agent",
          kind: "agent",
          startWhen: "When the stage starts",
          fallback: "RM chase specialists",
          instructions: ""
        },
        {
          id: "o2",
          name: "Synthesize specialist feedback and update the account plan",
          who: "Synthesis Agent",
          kind: "agent",
          startWhen: "After another task",
          dependsOn: "o1",
          fallback: "RM merge feedback",
          instructions: ""
        }
      ]
    },
    {
      id: "rm",
      name: "Route account plan for Relationship Manager review",
      descriptor: "Person-owned review. No agent writes this step.",
      startKind: "previous",
      dependsOn: "outreach",
      owner: { who: "Relationship Manager", kind: "person" },
      tasks: []
    }
  ];
  const FALLBACK_OPTIONS = [
    "RM delegate after 1 retry",
    "Data Operations queue",
    "Research support queue",
    "Credit Risk desk",
    "RM manual entry",
    "Skip if no prior plan",
    "RM define objectives",
    "RM chase specialists",
    "RM merge feedback",
    "None"
  ];
  const TEST_TICK = 220;
  const TEST_TASK_MS = 720;

  const modal = document.getElementById("workflow-modal");
  const backdrop = document.getElementById("workflow-modal-backdrop");
  if (!modal || !backdrop) return;

  const titleEl = document.getElementById("wf-modal-title");
  const describePane = document.getElementById("wf-pane-describe");
  const blueprintPane = document.getElementById("wf-pane-blueprint");
  const stepDescribe = document.getElementById("wf-step-describe");
  const stepBlueprint = document.getElementById("wf-step-blueprint");
  const outline = document.getElementById("wf-outline");
  const emptyEl = document.getElementById("wf-empty");
  const blueprintHead = document.getElementById("wf-blueprint-head");
  const genBanner = document.getElementById("wf-gen-banner");
  const statusEl = document.getElementById("wf-status");
  const btnBack = document.getElementById("wf-back");
  const btnPrimary = document.getElementById("wf-primary");
  const btnSecondary = document.getElementById("wf-secondary");
  const btnTest = document.getElementById("wf-test");
  const btnTestOk = document.getElementById("wf-test-ok");
  const btnTemplate = document.getElementById("wf-template");
  const blueprintCount = document.getElementById("wf-blueprint-count");
  const blueprintStatus = document.getElementById("wf-blueprint-status");
  const testModal = document.getElementById("wf-test-modal");
  const testList = document.getElementById("wf-test-run-list");
  const testStage = document.getElementById("wf-test-stage");
  const testDone = document.getElementById("wf-test-done");
  const nameInput = document.getElementById("wf-name");
  const industryInput = document.getElementById("wf-industry");
  const processInput = document.getElementById("wf-process");
  const buildAgent = document.getElementById("wf-build-agent");
  const fileInput = document.getElementById("wf-file-input");
  const dropzone = document.getElementById("wf-file-dropzone");
  const contextList = document.getElementById("wf-context-list");
  const linkInput = document.getElementById("wf-context-link");
  const nameError = document.getElementById("wf-name-error");
  const processError = document.getElementById("wf-process-error");

  const stepEdit = document.getElementById("wf-step-edit");
  const taskEdit = document.getElementById("wf-task-edit");
  const reorderModal = document.getElementById("wf-reorder-modal");
  const reorderList = document.getElementById("wf-reorder-list");
  const editBack = document.getElementById("wf-edit-backdrop");
  const stepName = document.getElementById("wf-step-name");
  const stepDesc = document.getElementById("wf-step-desc");
  const stepCustom = document.getElementById("wf-step-custom");
  const stepCustomWrap = document.getElementById("wf-step-custom-wrap");
  const stepDepends = document.getElementById("wf-step-depends");
  const stepTaskBody = document.getElementById("wf-step-task-body");
  const stepTaskWrap = document.getElementById("wf-step-task-wrap");
  const stepTaskEmpty = document.getElementById("wf-step-task-empty");
  const taskName = document.getElementById("wf-task-name");
  const taskWho = document.getElementById("wf-task-who");
  const taskStart = document.getElementById("wf-task-start");
  const taskDepends = document.getElementById("wf-task-depends");
  const taskDue = document.getElementById("wf-task-due");
  const taskFallback = document.getElementById("wf-task-fallback");
  const taskCc = document.getElementById("wf-task-cc");
  const taskEsc = document.getElementById("wf-task-esc");
  const taskInstructions = document.getElementById("wf-task-instructions");
  const taskSources = document.getElementById("wf-task-sources");
  const taskTags = document.getElementById("wf-task-tags");

  let phase = "describe";
  let blueprint = [];
  let contextItems = [];
  let genTimer = 0;
  let editingId = null;
  let lastFocused = null;
  let buildWithAgent = false;
  let stepDraft = null;
  let taskDraft = null;
  let taskParent = null;
  let reorderDraft = [];
  let dragReorderId = "";
  let dragTaskId = "";
  let testedKey = "";
  let draftStage = "Draft";
  let publishing = false;
  let testTimer = null;
  let testTaskState = {};
  let testStepState = {};
  let testElapsed = {};
  let testRunning = false;

  function icon(name) {
    return '<svg aria-hidden="true"><use href="' + ICON + "#" + name + '"></use></svg>';
  }

  function agentTag(who, kind) {
    const person = kind === "person";
    return (
      '<span class="ap-agent-tag' +
      (person ? " ap-agent-tag_person" : "") +
      '">' +
      icon(person ? "user" : "einstein") +
      escapeHtml(who) +
      "</span>"
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(message) {
    statusEl.textContent = message || "";
  }

  function isAgentic() {
    return buildAgent.getAttribute("aria-checked") === "true";
  }

  function setBuildWithAgent(on) {
    buildWithAgent = Boolean(on);
    buildAgent.setAttribute("aria-checked", buildWithAgent ? "true" : "false");
    buildAgent.classList.toggle("ap-switch_on", buildWithAgent);
    if (phase === "describe") {
      btnPrimary.textContent = buildWithAgent ? "Generate blueprint" : "Continue to blueprint";
    }
  }

  function syncBuildSwitch() {
    setBuildWithAgent(isAgentic());
  }

  function toggleBuildWithAgent(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setBuildWithAgent(!isAgentic());
  }

  function setPhase(next) {
    phase = next;
    const onDescribe = next === "describe";
    describePane.hidden = !onDescribe;
    blueprintPane.hidden = onDescribe;
    stepDescribe.classList.toggle("ap-wf-steps__item_active", onDescribe);
    stepDescribe.classList.toggle("ap-wf-steps__item_done", !onDescribe);
    stepDescribe.toggleAttribute("aria-current", onDescribe);
    stepBlueprint.classList.toggle("ap-wf-steps__item_active", !onDescribe);
    stepBlueprint.toggleAttribute("aria-current", !onDescribe);
    btnBack.hidden = onDescribe;
    btnTest.hidden = onDescribe;
    btnTemplate.hidden = onDescribe;
    btnSecondary.textContent = "Save draft";
    if (onDescribe) {
      btnPrimary.textContent = buildWithAgent ? "Generate blueprint" : "Continue to blueprint";
      btnPrimary.disabled = false;
      btnPrimary.removeAttribute("aria-disabled");
      btnPrimary.removeAttribute("aria-describedby");
      btnPrimary.removeAttribute("title");
    } else {
      btnPrimary.textContent = "Publish";
      syncPublishGate();
    }
    titleEl.textContent = onDescribe ? "Describe the workflow" : "Workflow blueprint";
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
        tasks: (step.tasks || []).map((task) => ({
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
    return Boolean(testedKey && testedKey === blueprintKey());
  }

  function syncPublishGate() {
    if (publishing || phase !== "blueprint") return;
    const passed = isTested();
    const live = draftStage === "Live" && passed;
    btnTestOk.classList.toggle("slds-hide", !passed);
    btnTest.classList.toggle("slds-button_brand", !passed);
    btnTest.classList.toggle("slds-button_neutral", passed);
    btnPrimary.textContent = live ? "Published" : "Publish";
    if (live) {
      btnPrimary.disabled = true;
      btnPrimary.setAttribute("aria-disabled", "true");
      btnPrimary.removeAttribute("aria-describedby");
      btnPrimary.title = "This workflow is published";
    } else if (passed) {
      btnPrimary.disabled = false;
      btnPrimary.removeAttribute("aria-disabled");
      btnPrimary.removeAttribute("aria-describedby");
      btnPrimary.removeAttribute("title");
    } else {
      btnPrimary.disabled = true;
      btnPrimary.setAttribute("aria-disabled", "true");
      btnPrimary.setAttribute("aria-describedby", "wf-publish-gate");
      btnPrimary.title = "Test the blueprint before publishing";
    }
    if (passed) {
      btnTemplate.disabled = false;
      btnTemplate.removeAttribute("aria-disabled");
      btnTemplate.removeAttribute("aria-describedby");
      btnTemplate.removeAttribute("title");
    } else {
      btnTemplate.disabled = true;
      btnTemplate.setAttribute("aria-disabled", "true");
      btnTemplate.setAttribute("aria-describedby", "wf-template-gate");
      btnTemplate.title = "Test the blueprint before saving as a template";
    }
    if (blueprintStatus) {
      blueprintStatus.innerHTML =
        '<span class="ap-blueprint-status__dot" aria-hidden="true"></span> Blueprint status: ' +
        (live ? "Live" : blueprint.length ? "Ready" : "Draft");
    }
  }

  function updateBlueprintMeta() {
    if (!blueprintCount) return;
    const tasks = blueprint.reduce((sum, step) => sum + (step.tasks || []).length, 0);
    blueprintCount.textContent = blueprint.length
      ? blueprint.length +
        " stages · " +
        tasks +
        " " +
        (tasks === 1 ? "task" : "tasks") +
        " · dependencies and human gates are inspectable"
      : "";
  }

  function validateDescribe() {
    const nameOk = Boolean(nameInput.value.trim());
    const processOk = Boolean(processInput.value.trim());
    nameError.classList.toggle("slds-hide", nameOk);
    processError.classList.toggle("slds-hide", processOk);
    return nameOk && processOk;
  }

  function draftPayload(stage) {
    if (stage) draftStage = stage;
    return {
      id: editingId || "draft-" + Date.now(),
      name: nameInput.value.trim(),
      industry: industryInput.value,
      process: processInput.value.trim(),
      description: processInput.value.trim().split("\n")[0] || "",
      files: contextItems.filter((item) => item.type === "file").map((item) => item.name),
      links: contextItems.filter((item) => item.type === "link").map((item) => item.name),
      blueprint: blueprint,
      buildWithAgent: isAgentic(),
      stage: draftStage,
      testedKey: testedKey,
      ready: draftStage === "Ready" || draftStage === "Live",
      fromInventory: editingId
    };
  }

  function persistDraft(stage) {
    const payload = draftPayload(stage);
    sessionStorage.setItem("ap-create-draft", JSON.stringify(payload));
    syncPublishGate();
    return payload;
  }

  function upsert(payload) {
    if (typeof window.APLanding !== "undefined" && window.APLanding.upsertFromDraft) {
      window.APLanding.upsertFromDraft(payload);
    }
  }

  function renderContext() {
    contextList.replaceChildren();
    contextList.hidden = contextItems.length === 0;
    contextItems.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "ap-wf-thumb";
      li.innerHTML =
        '<span class="slds-truncate">' +
        escapeHtml(item.name) +
        '</span><button class="slds-button slds-button_icon slds-button_icon-border-filled" type="button" title="Remove" aria-label="Remove ' +
        escapeHtml(item.name) +
        '">' +
        icon("close") +
        "</button>";
      li.querySelector("button").addEventListener("click", () => {
        contextItems.splice(index, 1);
        renderContext();
      });
      contextList.append(li);
    });
  }

  function addFiles(fileList) {
    Array.from(fileList || []).forEach((file) => {
      contextItems.push({ type: "file", name: file.name });
    });
    renderContext();
  }

  function findStep(id) {
    return blueprint.find((entry) => entry.id === id);
  }

  function numberBlueprint() {
    blueprint.forEach((step, index) => {
      step.number = String(index + 1);
      step.tasks.forEach((task, taskIndex) => {
        task.number = step.number + "." + (taskIndex + 1);
      });
    });
  }

  function displayStart(step) {
    if (step.startKind === "workflow") return "Starts when the workflow runs";
    if (step.startKind === "custom") return step.customRule || "Custom rule";
    const prior = findStep(step.dependsOn) || blueprint[Math.max(0, blueprint.indexOf(step) - 1)];
    return prior ? "After " + prior.name : "After previous stage";
  }

  function displayTaskStart(step, task) {
    if (task.startWhen === "After another task") {
      const prior = step.tasks.find((entry) => entry.id === task.dependsOn);
      return prior ? "After " + prior.name : "After another task";
    }
    return task.startWhen || "When the stage starts";
  }

  function fillSelect(select, options, selected) {
    select.replaceChildren();
    options.forEach((entry) => {
      const option = document.createElement("option");
      if (typeof entry === "string") {
        option.value = entry;
        option.textContent = entry;
        if (entry === selected) option.selected = true;
      } else {
        option.value = entry.id;
        option.textContent = entry.name;
        if (entry.kind) option.dataset.kind = entry.kind;
        if (entry.id === selected || entry.name === selected) option.selected = true;
      }
      select.append(option);
    });
  }

  function newStep(afterId) {
    const id = "step-" + Date.now();
    const step = {
      id: id,
      name: "New workflow step",
      descriptor: "",
      startKind: blueprint.length ? "previous" : "workflow",
      dependsOn: afterId || "",
      customRule: "",
      tasks: []
    };
    if (afterId) {
      const index = blueprint.findIndex((entry) => entry.id === afterId);
      blueprint.splice(index + 1, 0, step);
    } else {
      blueprint.push(step);
    }
    return step;
  }

  function insertRow(stepId) {
    const wrap = document.createElement("div");
    wrap.className = "ap-insert";
    wrap.innerHTML =
      '<div class="ap-insert__rail" aria-hidden="true"></div><div class="ap-insert__actions">' +
      '<button type="button" class="ap-insert__btn" data-insert="task">' +
      icon("task") +
      "+ Task</button>" +
      '<button type="button" class="ap-insert__btn" data-insert="approval">' +
      icon("approval") +
      "+ Approval</button>" +
      '<button type="button" class="ap-insert__btn" data-insert="automation">' +
      icon("einstein") +
      "+ Automation</button>" +
      '<button type="button" class="ap-insert__btn" data-insert="workflow">' +
      icon("flow") +
      "+ Workflow</button></div>";
    wrap.querySelectorAll("[data-insert]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.getAttribute("data-insert");
        const step = findStep(stepId);
        if (!step) return;
        if (kind === "task" || kind === "automation") {
          const task = {
            id: stepId + "-t" + (step.tasks.length + 1),
            name: kind === "automation" ? "New automation" : "New task",
            who: kind === "automation" ? "Outreach Agent" : "History Agent",
            kind: "agent",
            startWhen: "When the stage starts",
            fallback: "RM delegate after 1 retry",
            instructions: ""
          };
          step.tasks.push(task);
          persistDraft("Ready");
          renderBlueprint(false);
          openTaskEdit(step, task);
          return;
        }
        if (kind === "approval") {
          const task = {
            id: stepId + "-a" + (step.tasks.length + 1),
            name: "Approval gate",
            who: "Relationship Manager",
            kind: "person",
            startWhen: "When the stage starts",
            fallback: "None",
            instructions: ""
          };
          step.tasks.push(task);
          persistDraft("Ready");
          renderBlueprint(false);
          openTaskEdit(step, task);
          return;
        }
        if (kind === "workflow") {
          const stepNew = newStep(stepId);
          persistDraft("Ready");
          renderBlueprint(false);
          openStepEdit(stepNew);
        }
      });
    });
    return wrap;
  }

  function renderStage(step, index) {
    const li = document.createElement("li");
    li.className = "ap-wf-stage";
    li.dataset.stepId = step.id;
    const tasksHtml = step.tasks.length
      ? '<table class="ap-wf-tasks"><thead><tr><th>Task</th><th>Assigned to</th><th>Start</th><th>Fallback</th><th></th></tr></thead><tbody>' +
        step.tasks
          .map(
            (task, taskIndex) =>
              "<tr><td><span class=\"ap-wf-numcell\">" +
              escapeHtml(String(index + 1) + "." + (taskIndex + 1)) +
              "</span> " +
              escapeHtml(task.name) +
              "</td><td>" +
              agentTag(task.who, task.kind) +
              "</td><td>" +
              escapeHtml(displayTaskStart(step, task)) +
              '</td><td class="ap-wf-fallback">' +
              escapeHtml(task.fallback || "—") +
              '</td><td><button class="slds-button slds-button_neutral" type="button" data-edit-task="' +
              escapeHtml(task.id) +
              '">Edit</button></td></tr>'
          )
          .join("") +
        "</tbody></table>"
      : '<p class="ap-wf-stage__desc slds-m-top_small">Assigned to ' +
        agentTag((step.owner && step.owner.who) || "Relationship Manager", (step.owner && step.owner.kind) || "person") +
        ' <span class="ap-wf-stage__note">No agent tasks.</span></p>';
    li.innerHTML =
      '<span class="ap-wf-stage__num">' +
      (index + 1) +
      '</span><article class="ap-wf-stage__card"><div class="ap-wf-stage__head"><div class="ap-wf-stage__head-main"><p class="ap-wf-stage__name">' +
      escapeHtml(step.name) +
      '</p><p class="ap-wf-stage__desc">' +
      escapeHtml(step.descriptor || "") +
      '</p></div><div class="ap-wf-stage__controls"><dl class="ap-wf-start"><dt>Start rule</dt><dd>' +
      escapeHtml(displayStart(step)) +
      '</dd></dl><button class="slds-button slds-button_neutral" type="button" data-edit-step>Edit</button></div></div>' +
      tasksHtml +
      "</article>";
    li.querySelector("[data-edit-step]").addEventListener("click", () => openStepEdit(step));
    li.querySelectorAll("[data-edit-task]").forEach((button) => {
      button.addEventListener("click", () => {
        const task = step.tasks.find((entry) => entry.id === button.getAttribute("data-edit-task"));
        if (task) openTaskEdit(step, task);
      });
    });
    return li;
  }

  function renderBlueprint(animate) {
    window.clearTimeout(genTimer);
    numberBlueprint();
    outline.replaceChildren();
    const empty = blueprint.length === 0;
    emptyEl.hidden = !empty;
    if (blueprintHead) blueprintHead.hidden = empty;
    updateBlueprintMeta();
    syncPublishGate();
    if (empty) {
      genBanner.hidden = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    const nodes = [];
    blueprint.forEach((step, index) => {
      const stage = renderStage(step, index);
      fragment.append(stage);
      fragment.append(insertRow(step.id));
      nodes.push(stage);
    });
    outline.append(fragment);
    if (!animate) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      genBanner.hidden = true;
      return;
    }
    genBanner.hidden = false;
    let i = 0;
    function reveal() {
      if (i >= nodes.length) {
        genBanner.hidden = true;
        setStatus("Blueprint ready. Add a task or workflow step below any stage.");
        return;
      }
      nodes[i].classList.add("is-visible");
      i += 1;
      genTimer = window.setTimeout(reveal, 420);
    }
    reveal();
  }

  function syncStepStartUi() {
    const selected = document.querySelector('input[name="wf-step-start"]:checked');
    const value = selected ? selected.value : "previous";
    stepCustomWrap.hidden = value !== "custom";
    stepDepends.disabled = value === "workflow";
    if (value === "workflow") stepDepends.value = "";
  }

  function openNested(dialog) {
    if (editBack) {
      editBack.hidden = false;
      editBack.classList.add("slds-backdrop_open");
    }
    modal.classList.add("ap-wf-modal_covered");
    dialog.hidden = false;
    dialog.classList.add("slds-fade-in-open");
    dialog.focus({ preventScroll: true });
  }

  function closeNested() {
    stopTestRun(false);
    [stepEdit, taskEdit, reorderModal, testModal].forEach((dialog) => {
      if (!dialog) return;
      dialog.hidden = true;
      dialog.classList.remove("slds-fade-in-open");
    });
    if (editBack) {
      editBack.hidden = true;
      editBack.classList.remove("slds-backdrop_open");
    }
    modal.classList.remove("ap-wf-modal_covered");
    stepDraft = null;
    taskDraft = null;
    taskParent = null;
    reorderDraft = [];
    dragReorderId = "";
    dragTaskId = "";
  }

  function renderContainedTasks() {
    if (!stepDraft) return;
    document.getElementById("wf-step-task-count").textContent = "Contained tasks · " + stepDraft.tasks.length;
    stepTaskBody.replaceChildren();
    stepTaskEmpty.classList.toggle("slds-hide", stepDraft.tasks.length > 0);
    stepTaskWrap.classList.toggle("slds-hide", stepDraft.tasks.length === 0);
    stepDraft.tasks.forEach((task, index) => {
      const tr = document.createElement("tr");
      tr.draggable = true;
      tr.dataset.taskId = task.id;
      tr.innerHTML =
        '<td class="ap-wf-drag">' +
        icon("rows") +
        '</td><td><span class="ap-wf-numcell">' +
        escapeHtml((stepDraft.number || "") + "." + (index + 1)) +
        '</span> <button class="ap-wf-linkish" type="button" data-open-contained="' +
        escapeHtml(task.id) +
        '">' +
        escapeHtml(task.name) +
        "</button></td><td><span class=\"ap-type ap-type_" +
        (task.kind === "person" ? "person" : "agent") +
        '">' +
        (task.kind === "person" ? "Person" : "Agent") +
        "</span></td><td>" +
        escapeHtml(displayTaskStart(stepDraft, task)) +
        "</td><td>" +
        escapeHtml(task.due || "Instant") +
        '</td><td><button class="slds-button slds-button_neutral" type="button" data-remove-contained="' +
        escapeHtml(task.id) +
        '">Remove</button></td>';
      tr.querySelector("[data-remove-contained]").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        stepDraft.tasks = stepDraft.tasks.filter((entry) => entry.id !== task.id);
        renderContainedTasks();
      });
      tr.querySelector("[data-open-contained]").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        flushStepForm();
        const live = findStep(stepDraft.id);
        const liveTask = live && live.tasks.find((entry) => entry.id === task.id);
        openTaskEdit(live || stepDraft, liveTask || task);
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
      stepTaskBody.append(tr);
    });
  }

  function flushStepForm() {
    if (!stepDraft) return;
    stepDraft.name = stepName.value.trim() || stepDraft.name;
    stepDraft.descriptor = stepDesc.value.trim();
    const selected = document.querySelector('input[name="wf-step-start"]:checked');
    stepDraft.startKind = selected ? selected.value : stepDraft.startKind;
    stepDraft.customRule = stepCustom.value.trim();
    stepDraft.dependsOn = stepDepends.value;
    const live = findStep(stepDraft.id);
    if (live) {
      live.name = stepDraft.name;
      live.descriptor = stepDraft.descriptor;
      live.startKind = stepDraft.startKind;
      live.customRule = stepDraft.customRule;
      live.dependsOn = stepDraft.dependsOn;
      live.tasks = stepDraft.tasks;
    }
  }

  function openStepEdit(step) {
    numberBlueprint();
    stepDraft = JSON.parse(JSON.stringify(step));
    document.getElementById("wf-step-edit-title").textContent =
      step.name === "New workflow step" ? "Add workflow step" : "Edit workflow step";
    document.getElementById("wf-step-edit-context").textContent =
      (nameInput.value.trim() || "New workflow") + " / Stage " + (step.number || "") + " · " + step.name;
    stepName.value = stepDraft.name || "";
    stepDesc.value = stepDraft.descriptor || "";
    stepCustom.value = stepDraft.customRule || "";
    const start = stepDraft.startKind || (blueprint[0] && blueprint[0].id === step.id ? "workflow" : "previous");
    document.querySelectorAll('input[name="wf-step-start"]').forEach((input) => {
      input.checked = input.value === start;
    });
    const others = [{ id: "", name: "No dependency" }].concat(
      blueprint.filter((entry) => entry.id !== step.id).map((entry) => ({ id: entry.id, name: entry.name }))
    );
    fillSelect(stepDepends, others, stepDraft.dependsOn || "");
    syncStepStartUi();
    renderContainedTasks();
    openNested(stepEdit);
    stepName.focus();
  }

  function saveStepEdit() {
    if (!stepDraft) return;
    const name = stepName.value.trim();
    if (!name) {
      stepName.focus();
      return;
    }
    const live = findStep(stepDraft.id);
    if (!live) return;
    live.name = name;
    live.descriptor = stepDesc.value.trim();
    const selected = document.querySelector('input[name="wf-step-start"]:checked');
    live.startKind = selected ? selected.value : "previous";
    live.customRule = stepCustom.value.trim();
    live.dependsOn = stepDepends.value;
    live.tasks = stepDraft.tasks;
    persistDraft("Ready");
    closeNested();
    renderBlueprint(false);
    setStatus("Step updated.");
  }

  function openTaskEdit(step, task) {
    numberBlueprint();
    const returnToStep = !stepEdit.hidden && stepDraft;
    taskParent = step;
    taskDraft = JSON.parse(JSON.stringify(task));
    taskDraft._returnToStepId = returnToStep ? stepDraft.id : "";
    document.getElementById("wf-task-edit-title").textContent = /^(New task|New automation|Approval gate)$/.test(task.name)
      ? "Add task"
      : "Edit task";
    document.getElementById("wf-task-edit-context").textContent =
      (nameInput.value.trim() || "New workflow") + " / " + step.name + " / " + (task.number || "") + " · " + (task.kind === "person" ? "Person" : "Agent");
    taskName.value = taskDraft.name || "";
    fillSelect(taskStart, ["When the stage starts", "After another task"], taskDraft.startWhen || "When the stage starts");
    const deps = [{ id: "", name: "No dependency" }].concat(
      step.tasks.filter((entry) => entry.id !== task.id).map((entry) => ({ id: entry.id, name: entry.name }))
    );
    fillSelect(taskDepends, deps, taskDraft.dependsOn || "");
    taskDue.value = taskDraft.due || "Instant";
    fillSelect(
      taskWho,
      ASSIGNEES.map((entry) => ({ id: entry.who, name: entry.who + (entry.kind === "person" ? " (person)" : " (agent)"), kind: entry.kind })),
      taskDraft.who || "History Agent"
    );
    {
      const current = taskDraft.fallback || "RM delegate after 1 retry";
      const options = FALLBACK_OPTIONS.slice();
      if (current && options.indexOf(current) < 0) options.unshift(current);
      fillSelect(taskFallback, options, current);
    }
    taskCc.value = taskDraft.cc || "Relationship Manager";
    taskEsc.value = taskDraft.escalation || "Team lead · escalate after SLA";
    taskInstructions.value = taskDraft.instructions || "";
    taskSources.textContent = taskDraft.sources || "No files attached";
    taskTags.value = taskDraft.tags || "";
    if (returnToStep) {
      stepEdit.hidden = true;
      stepEdit.classList.remove("slds-fade-in-open");
    }
    openNested(taskEdit);
    taskName.focus();
  }

  function finishTaskEditor(message) {
    const returnToStepId = taskDraft && taskDraft._returnToStepId;
    persistDraft("Ready");
    closeNested();
    if (returnToStepId) {
      const live = findStep(returnToStepId);
      if (live) openStepEdit(live);
      else renderBlueprint(false);
    } else {
      renderBlueprint(false);
    }
    setStatus(message);
  }

  function saveTaskEdit() {
    if (!taskDraft || !taskParent) return;
    const name = taskName.value.trim();
    if (!name) {
      taskName.focus();
      return;
    }
    const liveStep = findStep(taskParent.id);
    const live = liveStep && liveStep.tasks.find((task) => task.id === taskDraft.id);
    if (!live) return;
    const who = taskWho.value;
    const kind = (taskWho.selectedOptions[0] && taskWho.selectedOptions[0].dataset.kind) || "agent";
    live.name = name;
    live.who = who;
    live.kind = kind;
    live.startWhen = taskStart.value;
    live.dependsOn = taskDepends.value;
    live.due = taskDue.value;
    live.fallback = taskFallback.value;
    live.cc = taskCc.value;
    live.escalation = taskEsc.value;
    live.instructions = taskInstructions.value.trim();
    live.tags = taskTags.value.trim();
    live.sources = taskSources.textContent === "No files attached" ? "" : taskSources.textContent;
    finishTaskEditor("Task updated.");
  }

  function deleteTaskEdit() {
    if (!taskDraft || !taskParent) return;
    const liveStep = findStep(taskParent.id);
    if (liveStep) liveStep.tasks = liveStep.tasks.filter((task) => task.id !== taskDraft.id);
    finishTaskEditor("Task removed.");
  }

  function renderReorderList() {
    reorderList.replaceChildren();
    reorderDraft.forEach((step, index) => {
      const li = document.createElement("li");
      li.className = "ap-wf-reorder-list__item";
      li.draggable = true;
      li.dataset.stepId = step.id;
      li.innerHTML =
        '<span class="ap-wf-drag">' +
        icon("rows") +
        '</span><span class="ap-wf-reorder-list__num">' +
        (index + 1) +
        '</span><span class="ap-wf-reorder-list__name">' +
        escapeHtml(step.name) +
        '</span><div class="ap-wf-reorder-arrows"><button class="slds-button slds-button_icon" type="button" data-reorder-up title="Move up"' +
        (index === 0 ? " disabled" : "") +
        ">" +
        icon("up") +
        '</button><button class="slds-button slds-button_icon" type="button" data-reorder-down title="Move down"' +
        (index === reorderDraft.length - 1 ? " disabled" : "") +
        ">" +
        icon("down") +
        "</button></div>";
      li.querySelector("[data-reorder-up]").addEventListener("click", () => {
        if (index === 0) return;
        const [item] = reorderDraft.splice(index, 1);
        reorderDraft.splice(index - 1, 0, item);
        renderReorderList();
      });
      li.querySelector("[data-reorder-down]").addEventListener("click", () => {
        if (index >= reorderDraft.length - 1) return;
        const [item] = reorderDraft.splice(index, 1);
        reorderDraft.splice(index + 1, 0, item);
        renderReorderList();
      });
      li.addEventListener("dragstart", () => {
        dragReorderId = step.id;
      });
      li.addEventListener("dragover", (event) => event.preventDefault());
      li.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!dragReorderId || dragReorderId === step.id) return;
        const from = reorderDraft.findIndex((entry) => entry.id === dragReorderId);
        const to = reorderDraft.findIndex((entry) => entry.id === step.id);
        if (from < 0 || to < 0) return;
        const [item] = reorderDraft.splice(from, 1);
        reorderDraft.splice(to, 0, item);
        dragReorderId = "";
        renderReorderList();
      });
      reorderList.append(li);
    });
  }

  function openReorderModal() {
    reorderDraft = blueprint.map((step) => Object.assign({}, step));
    renderReorderList();
    openNested(reorderModal);
  }

  function saveReorder() {
    const byId = {};
    blueprint.forEach((step) => {
      byId[step.id] = step;
    });
    blueprint = reorderDraft.map((entry) => byId[entry.id]).filter(Boolean);
    persistDraft("Ready");
    closeNested();
    renderBlueprint(false);
    setStatus("Step order updated.");
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
    if (testDone) testDone.hidden = !finished;
  }

  function finishTestRun() {
    const passed = blueprint.every((step) => testStepState[step.id] === "done");
    renderTestRun();
    if (!passed) {
      stopTestRun(false);
      setStatus("Test run finished. One or more steps did not complete.");
      return;
    }
    stopTestRun(true);
    testedKey = blueprintKey();
    persistDraft(draftStage === "Live" ? "Live" : "Ready");
    syncPublishGate();
    setStatus("Test run passed. Agents and steps completed successfully. Publish and Save as template are available.");
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
    if (blueprint.length && blueprint.every((step) => testStepState[step.id] === "done")) finishTestRun();
  }

  function startTestRun() {
    if (!blueprint.length) {
      setStatus("Add at least one workflow step before testing.");
      return;
    }
    stopTestRun(false);
    numberBlueprint();
    resetTestState();
    testRunning = true;
    if (testDone) testDone.hidden = true;
    renderTestRun();
    openNested(testModal);
    testTimer = window.setInterval(tickTest, TEST_TICK);
  }

  function saveAsTemplate() {
    if (!isTested()) {
      setStatus("Test the blueprint before saving as a template.");
      return;
    }
    const store = "ap-workflow-templates";
    const name = nameInput.value.trim() || "Untitled workflow";
    const process = processInput.value.trim();
    const payload = {
      id: "org-" + Date.now(),
      origin: "org",
      name: name,
      industry: industryInput.value || "Commercial banking",
      summary: process.split("\n")[0] || "Reviewed Account Plan blueprint.",
      process: process,
      stages: blueprint.length,
      tasks: blueprint.reduce((n, step) => n + step.tasks.length, 0),
      blueprint: JSON.parse(JSON.stringify(blueprint)),
      creator: { name: "Salesforce Admin", initials: "SA" }
    };
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem(store) || "[]");
    } catch (error) {
      saved = [];
    }
    if (!Array.isArray(saved)) saved = [];
    saved.unshift(payload);
    sessionStorage.setItem(store, JSON.stringify(saved));
    setStatus("Saved as template. Open Workflow Templates to use it.");
    if (typeof window.APLanding !== "undefined" && window.APLanding.showToast) {
      window.APLanding.showToast("Template saved", name + " is available under Created by you.");
    }
  }

  function continueToBlueprint() {
    if (!validateDescribe()) {
      setStatus("Complete the required fields before continuing.");
      return;
    }
    if (isAgentic()) {
      blueprint = JSON.parse(JSON.stringify(FALLBACK));
      persistDraft("Ready");
      setPhase("blueprint");
      setStatus("Agents are drafting the blueprint…");
      renderBlueprint(true);
      upsert(draftPayload("Ready"));
      return;
    }
    blueprint = [];
    persistDraft("Draft");
    setPhase("blueprint");
    setStatus("Blank blueprint. Add a workflow step to begin.");
    renderBlueprint(false);
    upsert(draftPayload("Draft"));
  }

  function saveDraft() {
    if (phase === "describe" && !validateDescribe()) {
      setStatus("Enter a name and process description to save.");
      return;
    }
    const payload = persistDraft(phase === "blueprint" && blueprint.length ? "Ready" : "Draft");
    upsert(payload);
    setStatus("Draft saved. It is not available until you publish.");
  }

  function publish() {
    if (phase !== "blueprint") {
      continueToBlueprint();
      return;
    }
    if (publishing) return;
    if (!blueprint.length) {
      setStatus("Add at least one workflow step before publishing.");
      return;
    }
    if (!isTested()) {
      setStatus("Test the blueprint before publishing.");
      return;
    }
    if (draftStage === "Live") return;
    publishing = true;
    btnPrimary.setAttribute("aria-busy", "true");
    btnPrimary.setAttribute("aria-disabled", "true");
    btnPrimary.textContent = "Publishing";
    window.setTimeout(() => {
      const payload = persistDraft("Live");
      payload.published = new Date().toISOString().slice(0, 10);
      payload.available = true;
      sessionStorage.setItem("ap-create-draft", JSON.stringify(payload));
      upsert(payload);
      publishing = false;
      btnPrimary.removeAttribute("aria-busy");
      syncPublishGate();
      setStatus("Workflow published.");
      close();
      if (typeof window.APLanding !== "undefined" && window.APLanding.showToast) {
        window.APLanding.showToast(payload.name + " is published.", "Relationship Managers can run it.");
      }
    }, 900);
  }

  function open(options) {
    options = options || {};
    lastFocused = document.activeElement;
    editingId = options.id || null;
    testedKey = options.testedKey || "";
    draftStage = options.stage || (options.ready ? "Ready" : "Draft");
    publishing = false;
    nameInput.value = options.name || "Refresh expiring account plans";
    industryInput.value = options.industry || "Commercial banking";
    processInput.value =
      options.process ||
      "Recommended when a plan period is nearing its end.\n\n1. Gather inputs: client history, financials, and market context.\n2. Create the plan: draft relationship strategy and define objectives and measures.\n3. Reach out to Treasury Specialist, Credit Specialist and Industry Specialist, then synthesize their feedback and update the account plan.\n4. Route account plan for Relationship Manager review.";
    contextItems = [];
    (options.files || []).forEach((name) => contextItems.push({ type: "file", name: name }));
    (options.links || []).forEach((name) => contextItems.push({ type: "link", name: name }));
    renderContext();
    nameError.classList.add("slds-hide");
    processError.classList.add("slds-hide");
    setBuildWithAgent(options.buildWithAgent === true);
    blueprint = Array.isArray(options.blueprint) && options.blueprint.length ? JSON.parse(JSON.stringify(options.blueprint)) : [];
    modal.hidden = false;
    backdrop.hidden = false;
    modal.classList.add("slds-fade-in-open");
    backdrop.classList.add("slds-backdrop_open");
    modal.focus({ preventScroll: true });
    if (options.phase === "blueprint" || options.ready) {
      if (!blueprint.length && options.animate) {
        blueprint = JSON.parse(JSON.stringify(FALLBACK));
      }
      setPhase("blueprint");
      renderBlueprint(Boolean(options.animate));
      setStatus(
        options.animate
          ? "Agents are drafting the blueprint…"
          : blueprint.length
            ? isTested()
              ? "Tested. Publish when ready."
              : "Review steps, then run a test before publishing."
            : "Blank blueprint. Add a workflow step to begin."
      );
    } else {
      setPhase("describe");
      setStatus("");
      nameInput.focus();
    }
  }

  function close() {
    window.clearTimeout(genTimer);
    closeNested();
    modal.hidden = true;
    backdrop.hidden = true;
    modal.classList.remove("slds-fade-in-open");
    backdrop.classList.remove("slds-backdrop_open");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  buildAgent.addEventListener("click", toggleBuildWithAgent);
  buildAgent.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") toggleBuildWithAgent(event);
  });
  const agenticCard = document.getElementById("wf-agentic");
  if (agenticCard) {
    agenticCard.addEventListener("click", (event) => {
      if (event.target === buildAgent || buildAgent.contains(event.target)) return;
      toggleBuildWithAgent(event);
    });
  }
  document.getElementById("wf-close").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  btnBack.addEventListener("click", () => {
    setPhase("describe");
    setStatus("");
    syncBuildSwitch();
  });
  btnSecondary.addEventListener("click", saveDraft);
  btnPrimary.addEventListener("click", () => {
    if (phase === "describe") continueToBlueprint();
    else publish();
  });
  btnTest.addEventListener("click", startTestRun);
  btnTemplate.addEventListener("click", () => {
    if (btnTemplate.disabled || !isTested()) {
      setStatus("Test the blueprint before saving as a template.");
      return;
    }
    saveAsTemplate();
  });
  document.getElementById("wf-test-close").addEventListener("click", closeNested);
  document.getElementById("wf-test-done").addEventListener("click", closeNested);
  document.getElementById("wf-add-step").addEventListener("click", () => {
    const step = newStep();
    persistDraft("Draft");
    renderBlueprint(false);
    openStepEdit(step);
  });
  document.getElementById("wf-reorder").addEventListener("click", openReorderModal);
  document.getElementById("wf-reorder-close").addEventListener("click", closeNested);
  document.getElementById("wf-reorder-save").addEventListener("click", saveReorder);
  document.querySelectorAll('input[name="wf-step-start"]').forEach((input) => {
    input.addEventListener("change", syncStepStartUi);
  });
  document.getElementById("wf-step-edit-close").addEventListener("click", closeNested);
  document.getElementById("wf-step-edit-save").addEventListener("click", saveStepEdit);
  document.getElementById("wf-task-edit-close").addEventListener("click", () => {
    const returnToStepId = taskDraft && taskDraft._returnToStepId;
    closeNested();
    if (returnToStepId) {
      const live = findStep(returnToStepId);
      if (live) openStepEdit(live);
    }
  });
  document.getElementById("wf-task-edit-save").addEventListener("click", saveTaskEdit);
  document.getElementById("wf-task-delete").addEventListener("click", deleteTaskEdit);
  document.getElementById("wf-task-attach").addEventListener("click", () => {
    taskSources.textContent = "Attached context from Describe (prototype)";
  });
  document.getElementById("wf-task-add-esc").addEventListener("click", () => {
    setStatus("Additional escalation added (prototype).");
  });
  editBack.addEventListener("click", closeNested);
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("slds-has-drag-over");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("slds-has-drag-over");
    });
  });
  dropzone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
  document.getElementById("wf-link-add").addEventListener("click", () => {
    const value = linkInput.value.trim();
    if (!value) return;
    contextItems.push({ type: "link", name: value });
    linkInput.value = "";
    renderContext();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!taskEdit.hidden) {
      event.stopPropagation();
      document.getElementById("wf-task-edit-close").click();
      return;
    }
    if (!stepEdit.hidden || (reorderModal && !reorderModal.hidden) || (testModal && !testModal.hidden)) {
      event.stopPropagation();
      closeNested();
      return;
    }
    if (!modal.hidden) {
      event.stopPropagation();
      close();
    }
  });

  syncBuildSwitch();
  window.APWorkflowModal = { open: open, close: close };
})();
