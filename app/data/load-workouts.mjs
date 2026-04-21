export async function fetchWorkoutList() {
  const response = await fetch("/api/workouts", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load workout list (${response.status}).`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error("Workout list response must be an array.");
  }

  return payload;
}

export async function fetchWorkoutDocument(workoutPath) {
  const response = await fetch(workoutPath, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load workout file (${response.status}).`);
  }

  return response.json();
}
