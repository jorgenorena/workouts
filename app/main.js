import {
  fetchWorkoutDocument,
  fetchWorkoutList,
} from "/app/data/load-workouts.mjs";
import {
  normalizeWorkoutDocument,
  summarizeNormalizedWorkout,
} from "/app/data/normalize-workout.mjs";

const state = {
  selectedPath: null,
  workouts: [],
};

const elements = {
  rawJson: document.querySelector("#raw-json"),
  reloadButton: document.querySelector("#reload-button"),
  sectionList: document.querySelector("#section-list"),
  status: document.querySelector("#status"),
  summaryGrid: document.querySelector("#summary-grid"),
  summaryName: document.querySelector("#summary-name"),
  workoutList: document.querySelector("#workout-list"),
};

elements.reloadButton.addEventListener("click", () => {
  void loadWorkoutList();
});

void loadWorkoutList();

async function loadWorkoutList() {
  setStatus("Loading workouts...", "info");
  elements.reloadButton.disabled = true;

  try {
    const workouts = await fetchWorkoutList();
    state.workouts = workouts;

    if (workouts.length === 0) {
      state.selectedPath = null;
      renderWorkoutList();
      renderEmptyState("No workout files were found.");
      setStatus("No workout files found.", "warning");
      return;
    }

    const preferredPath =
      state.selectedPath && workouts.some((workout) => workout.path === state.selectedPath)
        ? state.selectedPath
        : workouts[0].path;

    state.selectedPath = preferredPath;
    renderWorkoutList();
    await loadWorkout(preferredPath);
  } catch (error) {
    renderEmptyState("Could not load the workout list.");
    setStatus(toMessage(error), "error");
  } finally {
    elements.reloadButton.disabled = false;
  }
}

async function loadWorkout(workoutPath) {
  state.selectedPath = workoutPath;
  renderWorkoutList();
  setStatus("Loading workout...", "info");

  try {
    const metadata = state.workouts.find((workout) => workout.path === workoutPath) || null;
    const rawWorkout = await fetchWorkoutDocument(workoutPath);
    const normalizedWorkout = normalizeWorkoutDocument(rawWorkout, {
      sourcePath: metadata?.relativePath ?? null,
    });
    const summary = summarizeNormalizedWorkout(normalizedWorkout);

    renderWorkoutSummary(metadata, summary, normalizedWorkout);
    setStatus(`Loaded ${normalizedWorkout.name}.`, "success");
  } catch (error) {
    renderEmptyState("Could not load this workout.");
    setStatus(toMessage(error), "error");
  }
}

function renderWorkoutList() {
  elements.workoutList.replaceChildren();

  for (const workout of state.workouts) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workout-button";

    if (workout.path === state.selectedPath) {
      button.classList.add("workout-button-active");
    }

    button.addEventListener("click", () => {
      void loadWorkout(workout.path);
    });

    const title = document.createElement("span");
    title.className = "workout-button-title";
    title.textContent = workout.name;

    const meta = document.createElement("span");
    meta.className = "workout-button-meta";
    meta.textContent = `${workout.sourceFormat} - ${workout.relativePath}`;

    button.append(title, meta);
    elements.workoutList.append(button);
  }
}

function renderWorkoutSummary(metadata, summary, normalizedWorkout) {
  elements.summaryName.textContent = normalizedWorkout.name;
  renderSummaryGrid([
    ["Source file", metadata?.relativePath ?? "Unknown"],
    ["Source format", summary.sourceFormat],
    ["Workout rounds", String(summary.totalRounds)],
    ["Sections", String(summary.sections)],
    ["Exercises", String(summary.exercises)],
    ["Sound enabled", normalizedWorkout.soundEnabled ? "Yes" : "No"],
    ["Keep screen on", normalizedWorkout.keepScreenOn ? "Yes" : "No"],
  ]);
  renderSectionList(normalizedWorkout.sections);
  elements.rawJson.textContent = JSON.stringify(normalizedWorkout, null, 2);
}

function renderSummaryGrid(entries) {
  elements.summaryGrid.replaceChildren();

  for (const [label, value] of entries) {
    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");
    description.textContent = value;

    elements.summaryGrid.append(term, description);
  }
}

function renderSectionList(sections) {
  elements.sectionList.replaceChildren();

  for (const section of sections) {
    const item = document.createElement("li");
    item.className = "section-item";

    const title = document.createElement("strong");
    title.textContent = section.name;

    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = `${section.type} - rounds ${section.rounds} - exercises ${section.exercises.length}`;

    item.append(title, meta);
    elements.sectionList.append(item);
  }
}

function renderEmptyState(message) {
  elements.summaryName.textContent = message;
  elements.summaryGrid.replaceChildren();
  elements.sectionList.replaceChildren();
  elements.rawJson.textContent = message;
}

function setStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.className = `status status-${tone}`;
}

function toMessage(error) {
  return error instanceof Error ? error.message : "Unexpected error.";
}
