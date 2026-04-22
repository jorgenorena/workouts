import { fetchWorkoutDocument, fetchWorkoutList } from "/app/data/load-workouts.mjs";
import { normalizeWorkoutDocument } from "/app/data/normalize-workout.mjs";
import { createAppState } from "/app/state/app-state.mjs";
import { expandWorkout, summarizeRuntimeSteps } from "/app/state/timer-engine.mjs";
import { renderWorkoutPlayerScreen } from "/app/ui/workout-player.mjs";
import { renderWorkoutListScreen } from "/app/ui/workout-list.mjs";
import {
  createFeedbackController,
  getTransitionFeedbackPattern,
} from "/app/utils/feedback.mjs";
import { createWakeLockController } from "/app/utils/wake-lock.mjs";

const appRoot = document.querySelector("#app");
const wakeLockController = createWakeLockController();
const feedbackController = createFeedbackController();
let previousState = null;

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
  syncDeviceEffects(previousState, state);

  document.title = state.session?.normalizedWorkout?.name
    ? `${state.session.normalizedWorkout.name} - Workout app`
    : "Workout app";

  const screen =
    state.screen === "picker"
      ? renderWorkoutListScreen({ actions: appState.actions, state })
      : renderWorkoutPlayerScreen({ actions: appState.actions, state });

  appRoot.replaceChildren(screen);
  previousState = state;
});

void appState.actions.loadWorkouts();

function syncDeviceEffects(previousSnapshot, currentSnapshot) {
  const shouldHoldWakeLock =
    currentSnapshot.screen === "player" &&
    currentSnapshot.session?.normalizedWorkout?.keepScreenOn !== false;

  void wakeLockController.sync(shouldHoldWakeLock);

  const feedbackPattern = getTransitionFeedbackPattern(
    previousSnapshot,
    currentSnapshot
  );

  if (feedbackPattern) {
    feedbackController.vibrate(feedbackPattern);
  }
}
