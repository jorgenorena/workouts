import { createButton, createElement, createStatusBanner } from "/app/ui/dom-helpers.mjs";

export function renderWorkoutListScreen({ actions, state }) {
  const screen = createElement("main", { className: "screen" });
  const header = createElement("header", { className: "screen-header" });
  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: "Workout app",
  });
  const title = createElement("h1", {
    className: "screen-title",
    text: "Pick a workout and start moving",
  });
  const subtitle = createElement("p", {
    className: "screen-subtitle",
    text: "Mobile-first browser player, served locally from Node.js and built for bright high-contrast use.",
  });
  const headerRow = createElement("div", { className: "header-row" });
  const reloadButton = createButton("Reload workouts", {
    className: "button button-secondary",
    disabled: state.workoutsLoading || state.playerLoading,
    onClick: () => {
      void actions.loadWorkouts();
    },
  });

  headerRow.append(reloadButton);
  header.append(eyebrow, title, subtitle, headerRow);
  screen.append(header);

  if (state.workoutsError) {
    screen.append(createStatusBanner(state.workoutsError, "error"));
  } else if (state.playerError) {
    screen.append(createStatusBanner(state.playerError, "error"));
  } else if (state.workoutsLoading) {
    screen.append(createStatusBanner("Loading workout list...", "info"));
  } else if (state.playerLoading) {
    screen.append(createStatusBanner("Loading selected workout...", "info"));
  }

  if (!state.workoutsLoading && state.workouts.length === 0) {
    const emptyPanel = createElement("section", {
      className: "panel empty-state",
    });
    emptyPanel.append(
      createElement("h2", { text: "No workouts found" }),
      createElement("p", {
        className: "muted-text",
        text: "Add JSON files inside the workouts directory, then reload the list.",
      }),
      createButton("Reload workouts", {
        className: "button button-primary",
        onClick: () => {
          void actions.loadWorkouts();
        },
      })
    );
    screen.append(emptyPanel);
    return screen;
  }

  const grid = createElement("section", { className: "workout-grid" });

  for (const workout of state.workouts) {
    const card = createElement("article", {
      className: "panel workout-card",
    });
    const cardTitle = createElement("h2", {
      className: "workout-card-title",
      text: workout.name,
    });
    const meta = createElement("p", {
      className: "workout-card-meta",
      text: workout.relativePath,
    });
    const pillRow = createElement("div", { className: "pill-row" });
    pillRow.append(
      createElement("span", {
        className: "pill",
        text: workout.sourceFormat === "sections" ? "Preferred format" : "Legacy format",
      }),
      createElement("span", {
        className: "pill",
        text: "Local JSON file",
      })
    );
    const openButton = createButton("Open workout", {
      className: "button button-primary button-full",
      disabled: state.playerLoading,
      onClick: () => {
        void actions.openWorkout(workout);
      },
    });

    card.append(cardTitle, meta, pillRow, openButton);
    grid.append(card);
  }

  screen.append(grid);
  return screen;
}
