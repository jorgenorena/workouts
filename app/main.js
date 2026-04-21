import { fetchWorkoutDocument, fetchWorkoutList } from "/app/data/load-workouts.mjs";
import { normalizeWorkoutDocument } from "/app/data/normalize-workout.mjs";
import { createAppState } from "/app/state/app-state.mjs";
import { expandWorkout, summarizeRuntimeSteps } from "/app/state/timer-engine.mjs";
import { renderWorkoutPlayerScreen } from "/app/ui/workout-player.mjs";
import { renderWorkoutListScreen } from "/app/ui/workout-list.mjs";

const appRoot = document.querySelector("#app");

const appState = createAppState({
  expandWorkout,
  fetchWorkoutDocument,
  fetchWorkoutList,
  normalizeWorkoutDocument,
  summarizeRuntimeSteps,
  timerApi: {
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  },
});

appState.subscribe((state) => {
  document.title = state.session?.normalizedWorkout?.name
    ? `${state.session.normalizedWorkout.name} - Workout app`
    : "Workout app";

  const screen =
    state.screen === "picker"
      ? renderWorkoutListScreen({ actions: appState.actions, state })
      : renderWorkoutPlayerScreen({ actions: appState.actions, state });

  appRoot.replaceChildren(screen);
});

void appState.actions.loadWorkouts();
