(() => {
  const scoreEl = document.getElementById("incident-score");
  const criticalsEl = document.getElementById("open-criticals");
  const responseEl = document.getElementById("avg-response");
  const pressureEl = document.getElementById("alert-pressure");
  const feedEl = document.getElementById("feed");
  const actionButtons = Array.from(document.querySelectorAll(".controls button"));

  const state = {
    risk: 42,
    criticals: 3,
    avgResponseSec: 48,
    pressure: 72,
  };

  const pressureLabel = (value) => {
    if (value >= 76) return "High";
    if (value >= 46) return "Moderate";
    return "Low";
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const addFeed = (message, severity, impact) => {
    const li = document.createElement("li");
    li.className = severity;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `<span class="t">${t}</span><span class="msg">${message}</span><span class="impact">${impact}</span>`;
    feedEl.prepend(li);

    while (feedEl.children.length > 18) {
      feedEl.removeChild(feedEl.lastElementChild);
    }
  };

  const render = () => {
    scoreEl.textContent = String(state.risk);
    criticalsEl.textContent = String(state.criticals);
    responseEl.textContent = `${state.avgResponseSec}s`;
    pressureEl.textContent = pressureLabel(state.pressure);
  };

  const applyAction = (action) => {
    switch (action) {
      case "ack":
        state.pressure = clamp(state.pressure - 9, 0, 100);
        state.avgResponseSec = clamp(state.avgResponseSec - 3, 15, 180);
        addFeed("Alert acknowledged and timeline updated.", "ok", "-noise");
        break;
      case "assign":
        state.avgResponseSec = clamp(state.avgResponseSec - 6, 15, 180);
        state.risk = clamp(state.risk - 3, 0, 100);
        addFeed("Issue assigned to on-call backend engineer.", "ok", "-mttr");
        break;
      case "rollback":
        state.criticals = clamp(state.criticals - 1, 0, 20);
        state.risk = clamp(state.risk - 12, 0, 100);
        state.pressure = clamp(state.pressure - 8, 0, 100);
        addFeed("Rollback completed. Error rate trending down.", "ok", "-errors");
        break;
      case "scale":
        state.risk = clamp(state.risk - 7, 0, 100);
        state.avgResponseSec = clamp(state.avgResponseSec - 4, 15, 180);
        addFeed("Autoscaling policy expanded checkout workers.", "ok", "-latency");
        break;
      case "mute":
        state.pressure = clamp(state.pressure - 15, 0, 100);
        state.risk = clamp(state.risk + 4, 0, 100);
        addFeed("Notifications muted for 15 minutes.", "warning", "+blind spot");
        break;
      case "drill":
        state.avgResponseSec = clamp(state.avgResponseSec - 5, 15, 180);
        state.risk = clamp(state.risk - 2, 0, 100);
        addFeed("Runbook drill completed. Team readiness improved.", "ok", "-reaction time");
        break;
      case "chaos":
        state.criticals = clamp(state.criticals + 1, 0, 20);
        state.risk = clamp(state.risk + 14, 0, 100);
        state.pressure = clamp(state.pressure + 16, 0, 100);
        addFeed("New fault injected: payment timeout cascade.", "critical", "+incident load");
        break;
      default:
        break;
    }

    render();
  };

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => applyAction(button.dataset.action));
  });

  addFeed("Incident opened: checkout error rate exceeded SLO.", "critical", "P1");
  addFeed("Automated detector linked issue to latest deploy.", "warning", "+context");
  render();
})();
