(() => {
  const healthEl = document.getElementById("health");
  const failureEl = document.getElementById("failure");
  const leadEl = document.getElementById("lead");
  const mttrEl = document.getElementById("mttr");
  const stageNoteEl = document.getElementById("stage-note");
  const feedEl = document.getElementById("feed");
  const stageEls = Array.from(document.querySelectorAll(".stage"));
  const buttons = Array.from(document.querySelectorAll(".controls button"));

  const state = {
    health: 82,
    failure: 6,
    lead: 11,
    mttr: 7,
    stage: "build",
    faulted: false,
  };

  const stageOrder = ["build", "test", "canary", "deploy", "monitor"];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const setStage = (stage, failedStage) => {
    state.stage = stage;
    stageEls.forEach((el) => {
      const thisStage = el.dataset.stage;
      el.classList.toggle("active", thisStage === stage);
      el.classList.toggle("fail", failedStage === thisStage);
    });
  };

  const log = (message, kind, tag) => {
    const li = document.createElement("li");
    li.className = kind;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `<span class="t">${t}</span><span class="msg">${message}</span><span class="tag">${tag}</span>`;
    feedEl.prepend(li);
    while (feedEl.children.length > 18) {
      feedEl.removeChild(feedEl.lastElementChild);
    }
  };

  const render = () => {
    healthEl.textContent = String(state.health);
    failureEl.textContent = `${state.failure}%`;
    leadEl.textContent = `${state.lead}m`;
    mttrEl.textContent = `${state.mttr}m`;
  };

  const moveNext = () => {
    const idx = stageOrder.indexOf(state.stage);
    if (idx < stageOrder.length - 1) {
      setStage(stageOrder[idx + 1]);
    }
  };

  const apply = (action) => {
    switch (action) {
      case "run":
        setStage("build");
        state.lead = clamp(state.lead + 1, 4, 40);
        log("New build created from latest commit.", "ok", "build");
        stageNoteEl.textContent = "Build queued. Run tests before canary.";
        break;
      case "test":
        setStage("test");
        if (state.faulted) {
          state.failure = clamp(state.failure + 2, 0, 50);
          state.health = clamp(state.health - 5, 0, 100);
          log("Test suite found regressions from injected fault.", "warn", "tests");
          stageNoteEl.textContent = "Regression detected. Fix or rollback before deploy.";
        } else {
          state.failure = clamp(state.failure - 1, 0, 50);
          state.health = clamp(state.health + 2, 0, 100);
          log("Test suite passed with stable baseline.", "ok", "tests");
          stageNoteEl.textContent = "Tests green. Canary release recommended.";
        }
        break;
      case "canary":
        setStage("canary");
        if (state.faulted) {
          state.failure = clamp(state.failure + 4, 0, 50);
          state.health = clamp(state.health - 7, 0, 100);
          log("Canary saw latency spikes and payment retries.", "warn", "canary");
          stageNoteEl.textContent = "Canary unstable. Pause rollout and investigate.";
        } else {
          state.health = clamp(state.health + 3, 0, 100);
          log("Canary stable at 10% traffic.", "ok", "canary");
          stageNoteEl.textContent = "Canary healthy. Continue to deploy when ready.";
        }
        break;
      case "deploy":
        setStage("deploy");
        if (state.faulted) {
          state.failure = clamp(state.failure + 6, 0, 50);
          state.health = clamp(state.health - 10, 0, 100);
          state.mttr = clamp(state.mttr + 3, 1, 45);
          log("Production deploy increased checkout error budget burn.", "bad", "deploy");
          stageNoteEl.textContent = "Production degraded. Rollback strongly advised.";
        } else {
          state.failure = clamp(state.failure - 1, 0, 50);
          state.lead = clamp(state.lead - 1, 4, 40);
          log("Deploy completed cleanly with no major regressions.", "ok", "deploy");
          stageNoteEl.textContent = "Deploy successful. Monitor post-release stability.";
        }
        break;
      case "monitor":
        setStage("monitor");
        if (state.faulted) {
          state.health = clamp(state.health - 4, 0, 100);
          log("Diagnostics detected rising p95 on checkout route.", "warn", "monitor");
          stageNoteEl.textContent = "Telemetry suggests latent fault. Consider rollback.";
        } else {
          state.health = clamp(state.health + 1, 0, 100);
          state.mttr = clamp(state.mttr - 1, 1, 45);
          log("Post-deploy monitoring green across core services.", "ok", "monitor");
          stageNoteEl.textContent = "Pipeline healthy. Start another build when ready.";
        }
        break;
      case "rollback":
        setStage("deploy");
        state.faulted = false;
        state.failure = clamp(state.failure - 5, 0, 50);
        state.health = clamp(state.health + 12, 0, 100);
        state.mttr = clamp(state.mttr - 2, 1, 45);
        log("Rollback executed. Error rate trending toward baseline.", "ok", "recovery");
        stageNoteEl.textContent = "System recovered. Root-cause analysis still needed.";
        break;
      case "fault":
        state.faulted = true;
        state.failure = clamp(state.failure + 5, 0, 50);
        state.health = clamp(state.health - 8, 0, 100);
        state.mttr = clamp(state.mttr + 2, 1, 45);
        log("Chaos event: dependency timeout introduced.", "bad", "fault");
        stageNoteEl.textContent = "Fault injected. Validate pipeline safeguards.";
        break;
      default:
        break;
    }

    moveNext();
    render();
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => apply(button.dataset.action));
  });

  setStage("build");
  log("Pipeline session ready. Awaiting first build.", "ok", "ready");
  render();
})();
