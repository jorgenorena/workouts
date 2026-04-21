import { createButton, createElement } from "/app/ui/dom-helpers.mjs";

export function renderActionBar({ actions, session }) {
  const actionBar = createElement("footer", { className: "action-bar" });
  const grid = createElement("div", { className: "action-bar-grid" });
  const currentStep = session.runtimeSteps[session.currentStepIndex] ?? null;

  if (session.status === "complete") {
    grid.append(
      createButton("Back to workouts", {
        className: "button button-secondary",
        onClick: actions.quitWorkout,
      }),
      createButton("Run again", {
        className: "button button-primary",
        onClick: actions.restartWorkout,
      })
    );
    actionBar.append(grid);
    return actionBar;
  }

  if (session.status === "ready") {
    grid.append(
      createButton("Back to workouts", {
        className: "button button-secondary",
        onClick: actions.quitWorkout,
      }),
      createButton("Start workout", {
        className: "button button-primary",
        onClick: actions.startWorkout,
      })
    );
    actionBar.append(grid);
    return actionBar;
  }

  if (currentStep?.type === "manual") {
    grid.append(
      createButton("Quit", {
        className: "button button-secondary",
        onClick: actions.quitWorkout,
      }),
      createButton("Skip", {
        className: "button button-secondary",
        onClick: actions.skipStep,
      }),
      createButton("Done", {
        className: "button button-primary",
        onClick: actions.completeCurrentStep,
      })
    );
    actionBar.append(grid);
    return actionBar;
  }

  grid.append(
    createButton("Quit", {
      className: "button button-secondary",
      onClick: actions.quitWorkout,
    }),
    createButton(session.status === "paused" ? "Resume" : "Pause", {
      className:
        session.status === "paused"
          ? "button button-primary"
          : "button button-secondary",
      onClick: actions.togglePause,
    }),
    createButton("Skip", {
      className: "button button-primary",
      onClick: actions.skipStep,
    })
  );

  actionBar.append(grid);
  return actionBar;
}
