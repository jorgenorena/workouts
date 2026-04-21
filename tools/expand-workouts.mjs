import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeWorkoutDocument } from "../app/data/normalize-workout.mjs";
import {
  expandWorkout,
  formatClockTime,
  summarizeRuntimeSteps,
} from "../app/state/timer-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const workoutsRoot = path.join(repoRoot, "workouts");

async function main() {
  const workoutPaths = await listJsonFiles(workoutsRoot);

  if (workoutPaths.length === 0) {
    throw new Error("No workout JSON files were found.");
  }

  for (const workoutPath of workoutPaths) {
    const relativePath = path.relative(repoRoot, workoutPath);
    const rawWorkout = JSON.parse(await readFile(workoutPath, "utf8"));
    const normalizedWorkout = normalizeWorkoutDocument(rawWorkout, {
      sourcePath: relativePath,
    });
    const runtimeSteps = expandWorkout(normalizedWorkout);
    const summary = summarizeRuntimeSteps(runtimeSteps);

    console.log(
      [
        relativePath,
        `source=${normalizedWorkout.sourceFormat}`,
        `steps=${summary.totalSteps}`,
        `exerciseSteps=${summary.exerciseSteps}`,
        `restSteps=${summary.restSteps}`,
        `prepareSteps=${summary.prepareSteps}`,
        `timed=${summary.timedSteps}`,
        `manual=${summary.manualSteps}`,
        `timedDuration=${formatClockTime(summary.totalTimedSeconds)}`,
      ].join(" | ")
    );
  }
}

async function listJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  files.sort();
  return files;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
