export function createAppState(dependencies) {
  const state = {
    playerError: "",
    playerLoading: false,
    screen: "picker",
    session: null,
    workouts: [],
    workoutsError: "",
    workoutsLoading: false,
  };

  const listeners = new Set();
  const timerApi = dependencies.timerApi ?? {
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  let timerId = null;

  const actions = {
    completeCurrentStep,
    loadWorkouts,
    openWorkout,
    quitWorkout,
    restartWorkout,
    skipStep,
    startWorkout,
    togglePause,
  };

  return {
    actions,
    getState,
    subscribe,
  };

  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());

    return () => {
      listeners.delete(listener);
    };
  }

  function getState() {
    return {
      ...state,
      session: state.session
        ? {
            ...state.session,
          }
        : null,
      workouts: [...state.workouts],
    };
  }

  function notify() {
    const snapshot = getState();

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  async function loadWorkouts() {
    state.workoutsLoading = true;
    state.workoutsError = "";
    notify();

    try {
      state.workouts = await dependencies.fetchWorkoutList();
    } catch (error) {
      state.workoutsError = toMessage(error);
    } finally {
      state.workoutsLoading = false;
      notify();
    }
  }

  async function openWorkout(workoutMeta) {
    clearTimer();
    state.playerLoading = true;
    state.playerError = "";
    notify();

    try {
      const rawWorkout = await dependencies.fetchWorkoutDocument(workoutMeta.path);
      const normalizedWorkout = dependencies.normalizeWorkoutDocument(rawWorkout, {
        sourcePath: workoutMeta.relativePath,
      });
      const runtimeSteps = dependencies.expandWorkout(normalizedWorkout);
      const runtimeSummary = dependencies.summarizeRuntimeSteps(runtimeSteps);

      state.session = {
        currentStepIndex: 0,
        meta: workoutMeta,
        normalizedWorkout,
        remainingSeconds: null,
        runtimeSteps,
        runtimeSummary,
        status: "ready",
      };
      state.screen = "player";
    } catch (error) {
      state.session = null;
      state.playerError = toMessage(error);
      state.screen = "picker";
    } finally {
      state.playerLoading = false;
      notify();
    }
  }

  function startWorkout() {
    const session = requireSession();

    if (session.status === "complete") {
      restartWorkout();
      return;
    }

    session.status = "running";
    resetCurrentStepTimer(session);
    ensureTimer();
    notify();
  }

  function togglePause() {
    const session = requireSession();
    const currentStep = getCurrentStep(session);

    if (!currentStep || currentStep.type !== "timed" || session.status === "ready") {
      return;
    }

    session.status = session.status === "paused" ? "running" : "paused";
    ensureTimer();
    notify();
  }

  function completeCurrentStep() {
    const session = requireSession();
    const currentStep = getCurrentStep(session);

    if (!currentStep) {
      return;
    }

    if (session.status === "ready") {
      startWorkout();
      return;
    }

    if (currentStep.type === "manual") {
      advanceToNextStep();
    }
  }

  function skipStep() {
    const session = requireSession();

    if (session.status === "complete") {
      return;
    }

    if (session.status === "ready") {
      startWorkout();
      return;
    }

    advanceToNextStep();
  }

  function restartWorkout() {
    const session = requireSession();

    clearTimer();
    session.currentStepIndex = 0;
    session.remainingSeconds = null;
    session.status = "ready";
    state.screen = "player";
    notify();
  }

  function quitWorkout() {
    clearTimer();
    state.playerError = "";
    state.screen = "picker";
    state.session = null;
    notify();
  }

  function advanceToNextStep() {
    const session = requireSession();

    session.currentStepIndex += 1;

    if (session.currentStepIndex >= session.runtimeSteps.length) {
      clearTimer();
      session.remainingSeconds = null;
      session.status = "complete";
      state.screen = "complete";
      notify();
      return;
    }

    session.status = "running";
    resetCurrentStepTimer(session);
    ensureTimer();
    notify();
  }

  function resetCurrentStepTimer(session) {
    const currentStep = getCurrentStep(session);
    session.remainingSeconds = currentStep?.type === "timed" ? currentStep.seconds : null;
  }

  function tick() {
    if (!state.session || state.session.status !== "running" || state.screen !== "player") {
      clearTimer();
      return;
    }

    const currentStep = getCurrentStep(state.session);

    if (!currentStep || currentStep.type !== "timed") {
      clearTimer();
      return;
    }

    const currentValue = state.session.remainingSeconds ?? currentStep.seconds;
    state.session.remainingSeconds = Math.max(0, currentValue - 1);

    if (state.session.remainingSeconds <= 0) {
      advanceToNextStep();
      return;
    }

    notify();
  }

  function ensureTimer() {
    clearTimer();

    if (!state.session || state.session.status !== "running") {
      return;
    }

    const currentStep = getCurrentStep(state.session);
    if (!currentStep || currentStep.type !== "timed") {
      return;
    }

    timerId = timerApi.setInterval(tick, 1000);
  }

  function clearTimer() {
    if (timerId !== null) {
      timerApi.clearInterval(timerId);
      timerId = null;
    }
  }

  function requireSession() {
    if (!state.session) {
      throw new Error("No workout session is active.");
    }

    return state.session;
  }
}

function getCurrentStep(session) {
  return session.runtimeSteps[session.currentStepIndex] ?? null;
}

function toMessage(error) {
  return error instanceof Error ? error.message : "Unexpected error.";
}
