import {
  formatClockTime,
} from "/app/state/timer-engine.mjs";
import { renderActionBar } from "/app/ui/controls.mjs";
import {
  createButton,
  createElement,
  createStatusBanner,
} from "/app/ui/dom-helpers.mjs";

export function renderWorkoutPlayerScreen({ actions, state }) {
  const isActiveSession =
    state.screen === "player" &&
    state.session &&
    state.session.status !== "ready" &&
    state.session.status !== "complete";
  const screen = createElement("main", {
    className: isActiveSession ? "screen screen-live" : "screen",
  });
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

  if (session.status === "ready") {
    const header = createElement("header", {
      className: "screen-header",
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
      text: "Ready screen before the workout begins.",
    });

    header.append(eyebrow, title, subtitle);
    screen.append(header);
  }

  if (state.playerError) {
    screen.append(createStatusBanner(state.playerError, "error"));
  }

  const layout = createElement("div", { className: "player-layout" });

  if (session.status === "ready") {
    layout.append(renderReadyCard(session));
  } else {
    layout.append(renderActivePlayerCard(session));
  }

  layout.append(renderActionBar({ actions, session }));
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
    card.append(
      createElement("p", {
        className: "step-note",
        text: "First step",
      }),
      createElement("p", {
        className: "step-detail",
        text: firstStep.title,
      }),
      createElement("p", {
        className: "step-note",
        text: getStepMeta(firstStep),
      })
    );
  }

  return card;
}

function renderActivePlayerCard(session) {
  const step = session.runtimeSteps[session.currentStepIndex];
  const card = createElement("section", { className: "player-live-card" });
  const title = createElement("h2", {
    className: "step-title step-title-live",
    text: step.title,
  });
  const display = createElement("p", {
    className: "display-main display-main-live",
    text:
      step.type === "timed"
        ? formatClockTime(session.remainingSeconds ?? step.seconds)
        : `${step.repetitions ?? ""} reps`,
  });

  card.prepend(title, display);
  return card;
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

function renderCompletionScreen({ actions, screen, session }) {
  const card = createElement("section", {
    className: "completion-card",
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
    renderActionBar({ actions, session })
  );

  screen.append(card);
  return screen;
}
