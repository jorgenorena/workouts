import {
  buildContextText,
  formatClockTime,
  getNextStepTitle,
} from "/app/state/timer-engine.mjs";
import { renderActionBar } from "/app/ui/controls.mjs";
import {
  createButton,
  createElement,
  createMetricGrid,
  createStatusBanner,
} from "/app/ui/dom-helpers.mjs";

export function renderWorkoutPlayerScreen({ actions, state }) {
  const screen = createElement("main", { className: "screen" });
  const session = state.session;

  if (!session) {
    const empty = createElement("section", { className: "panel empty-state" });
    empty.append(
      createElement("h1", {
        className: "completion-title",
        text: "No workout selected",
      }),
      createElement("p", {
        className: "completion-copy",
        text: "Go back to the workout list and choose one to start.",
      }),
      createButton("Back to workouts", {
        className: "button button-primary",
        onClick: actions.quitWorkout,
      })
    );
    screen.append(empty);
    return screen;
  }

  if (state.screen === "complete" || session.status === "complete") {
    return renderCompletionScreen({ actions, screen, session });
  }

  const header = createElement("header", {
    className: "screen-header panel hero-panel",
  });
  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: session.meta.relativePath,
  });
  const title = createElement("h1", {
    className: "screen-title",
    text: session.normalizedWorkout.name,
  });
  const subtitle = createElement("p", {
    className: "screen-subtitle",
    text:
      session.status === "ready"
        ? "Ready screen before the workout begins."
        : session.status === "paused"
          ? "Workout paused."
          : "Workout in progress.",
  });

  header.append(eyebrow, title, subtitle);
  screen.append(header);

  if (state.playerError) {
    screen.append(createStatusBanner(state.playerError, "error"));
  }

  const layout = createElement("div", { className: "player-layout" });
  const mainColumn = createElement("div", { className: "player-main" });
  const sideColumn = createElement("aside", { className: "player-side" });

  if (session.status === "ready") {
    mainColumn.append(renderReadyCard(session));
  } else {
    mainColumn.append(renderActivePlayerCard(session));
  }

  mainColumn.append(renderActionBar({ actions, session }));

  sideColumn.append(
    renderSummaryCard(session),
    renderUpcomingCard(session)
  );

  layout.append(mainColumn, sideColumn);
  screen.append(layout);
  return screen;
}

function renderReadyCard(session) {
  const card = createElement("section", { className: "panel player-card" });
  const firstStep = session.runtimeSteps[0] ?? null;

  card.append(
    createElement("span", {
      className: "step-badge step-badge-prepare",
      text: "Ready",
    }),
    createElement("h2", {
      className: "step-title",
      text: "Ready to start",
    }),
    createElement("p", {
      className: "step-detail",
      text: `This workout has ${session.runtimeSummary.totalSteps} steps and ${formatClockTime(
        session.runtimeSummary.totalTimedSeconds
      )} of timed work.`,
    })
  );

  if (firstStep) {
    const nextPanel = createElement("div", {
      className: "panel up-next-card",
    });
    nextPanel.append(
      createElement("h3", { text: "First step" }),
      createElement("p", {
        className: "step-detail",
        text: firstStep.title,
      }),
      createElement("p", {
        className: "step-note",
        text: getStepMeta(firstStep),
      })
    );
    card.append(nextPanel);
  }

  return card;
}

function renderActivePlayerCard(session) {
  const step = session.runtimeSteps[session.currentStepIndex];
  const nextStep = session.runtimeSteps[session.currentStepIndex + 1] ?? null;
  const card = createElement("section", { className: "panel player-card" });

  const progressText = createElement("p", {
    className: "progress-text",
    text: `Step ${session.currentStepIndex + 1} of ${session.runtimeSummary.totalSteps}`,
  });
  const track = createElement("div", { className: "progress-track" });
  const fill = createElement("div", { className: "progress-fill" });
  fill.style.width = `${Math.max(
    4,
    Math.round(((session.currentStepIndex + 1) / session.runtimeSummary.totalSteps) * 100)
  )}%`;
  track.append(fill);

  const badge = createElement("span", {
    className: `step-badge ${getStepBadgeClass(step)}`,
    text: getStepBadgeLabel(step),
  });
  const title = createElement("h2", {
    className: "step-title",
    text: step.title,
  });

  const detailLines = [];
  if (step.detail) {
    detailLines.push(step.detail);
  }
  const contextText = buildContextText(step);
  if (contextText) {
    detailLines.push(contextText.replaceAll("\n", " • "));
  }

  const detail = createElement("p", {
    className: "step-detail",
    text: detailLines.join(" • "),
  });

  const display = createElement("div", { className: "display-value" });
  display.append(
    createElement("p", {
      className: "display-main",
      text:
        step.type === "timed"
          ? formatClockTime(session.remainingSeconds ?? step.seconds)
          : "Tap Done",
    }),
    createElement("p", {
      className: "display-caption",
      text:
        step.type === "timed"
          ? session.status === "paused"
            ? "Paused timer"
            : "Time remaining"
          : "Manual step",
    })
  );

  const nextUp = createElement("section", { className: "panel up-next-card" });
  nextUp.append(
    createElement("h3", { text: "Up next" }),
    createElement("p", {
      className: "step-detail",
      text: getNextStepTitle(session.runtimeSteps, session.currentStepIndex),
    }),
    createElement("p", {
      className: "step-note",
      text: nextStep ? getStepMeta(nextStep) : "Final step coming up.",
    })
  );

  card.append(progressText, track, badge, title);
  if (detail.textContent) {
    card.append(detail);
  }
  card.append(display, nextUp);
  return card;
}

function renderSummaryCard(session) {
  const summaryCard = createElement("section", { className: "panel player-card summary-card" });
  summaryCard.append(
    createElement("h2", { text: "Workout summary" }),
    createMetricGrid([
      ["Steps", String(session.runtimeSummary.totalSteps)],
      ["Timed work", formatClockTime(session.runtimeSummary.totalTimedSeconds)],
      ["Manual steps", String(session.runtimeSummary.manualSteps)],
      ["Rest steps", String(session.runtimeSummary.restSteps)],
    ])
  );
  return summaryCard;
}

function renderUpcomingCard(session) {
  const card = createElement("section", { className: "panel player-card" });
  const list = createElement("ol", { className: "upcoming-list" });
  const upcomingSteps = session.runtimeSteps.slice(
    Math.min(session.currentStepIndex + 1, session.runtimeSteps.length),
    Math.min(session.currentStepIndex + 4, session.runtimeSteps.length)
  );

  card.append(createElement("h2", { text: "Upcoming steps" }));

  if (upcomingSteps.length === 0) {
    card.append(
      createElement("p", {
        className: "muted-text",
        text: "No more steps after the current one.",
      })
    );
    return card;
  }

  for (const step of upcomingSteps) {
    const item = createElement("li", { className: "upcoming-item" });
    item.append(
      createElement("p", {
        className: "upcoming-item-title",
        text: step.title,
      }),
      createElement("p", {
        className: "upcoming-item-meta",
        text: getStepMeta(step),
      })
    );
    list.append(item);
  }

  card.append(list);
  return card;
}

function renderCompletionScreen({ actions, screen, session }) {
  const card = createElement("section", {
    className: "panel hero-panel completion-card",
  });

  card.append(
    createElement("p", {
      className: "eyebrow",
      text: session.normalizedWorkout.name,
    }),
    createElement("h1", {
      className: "completion-title",
      text: "Workout complete",
    }),
    createElement("p", {
      className: "completion-copy",
      text: `Completed ${session.runtimeSummary.totalSteps} steps with ${formatClockTime(
        session.runtimeSummary.totalTimedSeconds
      )} of timed work.`,
    }),
    createMetricGrid([
      ["Exercise steps", String(session.runtimeSummary.exerciseSteps)],
      ["Rest steps", String(session.runtimeSummary.restSteps)],
      ["Prepare steps", String(session.runtimeSummary.prepareSteps)],
      ["Manual steps", String(session.runtimeSummary.manualSteps)],
    ]),
    renderActionBar({ actions, session })
  );

  screen.append(card);
  return screen;
}

function getStepBadgeClass(step) {
  if (step.isPrepare) {
    return "step-badge-prepare";
  }

  if (step.isRest) {
    return "step-badge-rest";
  }

  return "step-badge-exercise";
}

function getStepBadgeLabel(step) {
  if (step.isPrepare) {
    return "Prepare";
  }

  if (step.isRest) {
    return "Rest";
  }

  return step.type === "manual" ? "Exercise - manual" : "Exercise - timed";
}

function getStepMeta(step) {
  const parts = [];

  if (step.type === "timed" && step.seconds != null) {
    parts.push(formatClockTime(step.seconds));
  } else {
    parts.push("Manual");
  }

  if (step.sectionName) {
    parts.push(step.sectionName);
  }

  if (step.roundTotal > 1) {
    parts.push(`Round ${step.roundIndex}/${step.roundTotal}`);
  }

  return parts.join(" • ");
}
