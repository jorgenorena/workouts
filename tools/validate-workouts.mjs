import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeWorkoutDocument,
  summarizeNormalizedWorkout,
} from "../app/data/normalize-workout.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const workoutsRoot = path.join(repoRoot, "workouts");

async function main() {
  const workoutPaths = await listJsonFiles(workoutsRoot);

  if (workoutPaths.length === 0) {
    throw new Error("No workout JSON files were found.");
  }

  const summaries = [];

  for (const workoutPath of workoutPaths) {
    const rawContent = await readFile(workoutPath, "utf8");
    const rawWorkout = JSON.parse(rawContent);
    const normalized = normalizeWorkoutDocument(rawWorkout, {
      sourcePath: path.relative(repoRoot, workoutPath),
    });

    summaries.push({
      path: path.relative(repoRoot, workoutPath),
      ...summarizeNormalizedWorkout(normalized),
    });
  }

  for (const summary of summaries) {
    console.log(
      [
        summary.path,
        `format=${summary.sourceFormat}`,
        `sections=${summary.sections}`,
        `exercises=${summary.exercises}`,
        `rounds=${summary.totalRounds}`,
      ].join(" | ")
    );
  }

  console.log(`Validated ${summaries.length} workout file(s).`);
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
