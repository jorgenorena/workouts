export function createFeedbackController() {
  return {
    vibrate(pattern) {
      if (
        typeof navigator === "undefined" ||
        typeof navigator.vibrate !== "function"
      ) {
        return false;
      }

      return navigator.vibrate(pattern);
    },
  };
}

export function getTransitionFeedbackPattern(previousState, currentState) {
  if (!previousState || !currentState) {
    return null;
  }

  const previousSession = previousState.session;
  const currentSession = currentState.session;

  if (!previousSession || !currentSession) {
    return null;
  }

  const sameWorkout = previousSession.meta?.path === currentSession.meta?.path;
  if (!sameWorkout) {
    return null;
  }

  if (
    previousSession.currentStepIndex !== currentSession.currentStepIndex &&
    currentState.screen === "player"
  ) {
    return [110];
  }

  if (
    previousState.screen !== "complete" &&
    currentState.screen === "complete"
  ) {
    return [140, 60, 140];
  }

  return null;
}
