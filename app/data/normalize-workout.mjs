/**
 * Normalized workout contract for the JavaScript rewrite.
 *
 * Supported source formats:
 * 1. "sections" authoring format
 * 2. legacy "workout" + "steps" format
 *
 * Normalized output shape:
 * {
 *   schema: "normalized-workout",
 *   schemaVersion: 1,
 *   sourceFormat: "sections" | "legacy-workout",
 *   sourcePath: string | null,
 *   name: string,
 *   soundEnabled: boolean,
 *   keepScreenOn: boolean,
 *   totalRounds: number,
 *   sections: Array<{
 *     name: string,
 *     type: "sequence" | "circuit",
 *     rounds: number,
 *     restBetweenExercisesSec: number,
 *     restBetweenRoundsSec: number,
 *     exercises: Array<{
 *       name: string,
 *       mode: "time" | "reps",
 *       durationSec: number | null,
 *       repetitions: number | null,
 *       description: string,
 *       waitForUser: boolean
 *     }>
 *   }>
 * }
 */

const NORMALIZED_SCHEMA = "normalized-workout";
const NORMALIZED_SCHEMA_VERSION = 1;

export function detectWorkoutSourceFormat(rawWorkout) {
  assertPlainObject(rawWorkout, "Workout JSON must contain a top-level object.");

  if (Array.isArray(rawWorkout.sections)) {
    return "sections";
  }

  if (Array.isArray(rawWorkout.workout)) {
    return "legacy-workout";
  }

  throw new Error(
    "Unsupported workout JSON. Expected either a top-level 'sections' array or a top-level 'workout' array."
  );
}

export function normalizeWorkoutDocument(rawWorkout, options = {}) {
  const sourceFormat = detectWorkoutSourceFormat(rawWorkout);

  if (sourceFormat === "sections") {
    return normalizeSectionsWorkout(rawWorkout, options);
  }

  return normalizeLegacyWorkout(rawWorkout, options);
}

export function summarizeNormalizedWorkout(workout) {
  const sectionCount = workout.sections.length;
  const exerciseCount = workout.sections.reduce(
    (total, section) => total + section.exercises.length,
    0
  );

  return {
    name: workout.name,
    sourceFormat: workout.sourceFormat,
    totalRounds: workout.totalRounds,
    sections: sectionCount,
    exercises: exerciseCount,
  };
}

function normalizeSectionsWorkout(rawWorkout, options) {
  const name = readNonEmptyString(rawWorkout.name, "Workout 'name' is required.");
  const totalRounds = readPositiveInteger(
    rawWorkout.total_rounds ?? 1,
    "'total_rounds' must be a positive integer."
  );

  const sections = rawWorkout.sections.map((section, sectionIndex) =>
    normalizeSection(section, sectionIndex)
  );

  if (sections.length === 0) {
    throw new Error("Workout JSON must contain at least one section.");
  }

  return {
    schema: NORMALIZED_SCHEMA,
    schemaVersion: NORMALIZED_SCHEMA_VERSION,
    sourceFormat: "sections",
    sourcePath: options.sourcePath ?? null,
    name,
    soundEnabled: rawWorkout.sound !== false,
    keepScreenOn: rawWorkout.keep_screen_on !== false,
    totalRounds,
    sections,
  };
}

function normalizeLegacyWorkout(rawWorkout, options) {
  const name = readNonEmptyString(rawWorkout.name, "Workout 'name' is required.");
  const blocks = rawWorkout.workout;

  const sections = blocks.map((block, blockIndex) =>
    normalizeLegacyBlock(block, blockIndex)
  );

  if (sections.length === 0) {
    throw new Error("Legacy workout JSON must contain at least one workout block.");
  }

  return {
    schema: NORMALIZED_SCHEMA,
    schemaVersion: NORMALIZED_SCHEMA_VERSION,
    sourceFormat: "legacy-workout",
    sourcePath: options.sourcePath ?? null,
    name,
    soundEnabled: rawWorkout.sound !== false,
    keepScreenOn: rawWorkout.keep_screen_on !== false,
    totalRounds: 1,
    sections,
  };
}

function normalizeSection(section, sectionIndex) {
  assertPlainObject(
    section,
    `Section ${sectionIndex + 1} must be an object.`
  );

  const name = readNonEmptyString(
    section.name,
    `Section ${sectionIndex + 1} must have a non-empty 'name'.`
  );
  const type = readEnum(section.type, ["sequence", "circuit"], {
    errorMessage: `Section '${name}' has invalid type '${String(section.type)}'. Expected 'sequence' or 'circuit'.`,
  });
  const rounds = readPositiveInteger(
    section.rounds ?? 1,
    `Section '${name}' must have a positive 'rounds' value.`
  );
  const exercises = readArray(
    section.exercises,
    `Section '${name}' must contain an 'exercises' array.`
  ).map((exercise, exerciseIndex) =>
    normalizeExercise(exercise, { sectionName: name, exerciseIndex })
  );

  if (exercises.length === 0) {
    throw new Error(`Section '${name}' must contain at least one exercise.`);
  }

  return {
    name,
    type,
    rounds,
    restBetweenExercisesSec: readNonNegativeInteger(
      section.rest_between_exercises_sec ?? 0,
      `Section '${name}' has invalid 'rest_between_exercises_sec'.`
    ),
    restBetweenRoundsSec: readNonNegativeInteger(
      section.rest_between_rounds_sec ?? 0,
      `Section '${name}' has invalid 'rest_between_rounds_sec'.`
    ),
    exercises,
  };
}

function normalizeExercise(exercise, context) {
  assertPlainObject(
    exercise,
    `Exercise ${context.exerciseIndex + 1} in section '${context.sectionName}' must be an object.`
  );

  const name = readNonEmptyString(
    exercise.name,
    `Exercise ${context.exerciseIndex + 1} in section '${context.sectionName}' must have a non-empty 'name'.`
  );
  const mode = readEnum(exercise.mode, ["time", "reps"], {
    errorMessage: `Exercise '${name}' in section '${context.sectionName}' has invalid mode '${String(exercise.mode)}'. Expected 'time' or 'reps'.`,
  });

  const normalized = {
    name,
    mode,
    durationSec: null,
    repetitions: null,
    description: readOptionalString(exercise.description),
    waitForUser:
      typeof exercise.wait_for_user === "boolean"
        ? exercise.wait_for_user
        : mode === "reps",
  };

  if (mode === "time") {
    normalized.durationSec = readPositiveInteger(
      exercise.duration_sec,
      `Timed exercise '${name}' in section '${context.sectionName}' must have a positive 'duration_sec'.`
    );
    return normalized;
  }

  normalized.repetitions = readPositiveInteger(
    exercise.repetitions,
    `Rep exercise '${name}' in section '${context.sectionName}' must have a positive 'repetitions'.`
  );
  return normalized;
}

function normalizeLegacyBlock(block, blockIndex) {
  assertPlainObject(
    block,
    `Legacy workout block ${blockIndex + 1} must be an object.`
  );

  const name = readNonEmptyString(
    block.name,
    `Legacy workout block ${blockIndex + 1} must have a non-empty 'name'.`
  );
  const steps = readArray(
    block.steps,
    `Legacy workout block '${name}' must contain a 'steps' array.`
  ).map((step, stepIndex) => normalizeLegacyStep(step, { blockName: name, stepIndex }));

  if (steps.length === 0) {
    throw new Error(`Legacy workout block '${name}' must contain at least one step.`);
  }

  return {
    name,
    type: "sequence",
    rounds: readPositiveInteger(
      block.rounds ?? 1,
      `Legacy workout block '${name}' must have a positive 'rounds' value.`
    ),
    restBetweenExercisesSec: 0,
    restBetweenRoundsSec: 0,
    exercises: steps,
  };
}

function normalizeLegacyStep(step, context) {
  assertPlainObject(
    step,
    `Legacy step ${context.stepIndex + 1} in block '${context.blockName}' must be an object.`
  );

  const stepType = readEnum(step.type, ["timed", "manual"], {
    errorMessage: `Legacy step ${context.stepIndex + 1} in block '${context.blockName}' has invalid type '${String(step.type)}'. Expected 'timed' or 'manual'.`,
  });
  const name = readNonEmptyString(
    step.title ?? step.name,
    `Legacy step ${context.stepIndex + 1} in block '${context.blockName}' must have a non-empty 'title'.`
  );

  if (stepType === "timed") {
    const durationSec = readPositiveInteger(
      step.duration_sec ?? toDurationSeconds(step, {
        errorMessage: `Timed legacy step '${name}' in block '${context.blockName}' must define a positive duration with 'duration_sec' or hour/minute/second fields.`,
      }),
      `Timed legacy step '${name}' in block '${context.blockName}' must define a positive duration with 'duration_sec' or hour/minute/second fields.`
    );

    return {
      name,
      mode: "time",
      durationSec,
      repetitions: null,
      description: readOptionalString(step.detail),
      waitForUser: false,
    };
  }

  if (step.repetitions == null) {
    throw new Error(
      `Legacy manual step '${name}' in block '${context.blockName}' is not supported without an explicit 'repetitions' field.`
    );
  }

  return {
    name,
    mode: "reps",
    durationSec: null,
    repetitions: readPositiveInteger(
      step.repetitions,
      `Legacy manual step '${name}' in block '${context.blockName}' must define a positive 'repetitions' value.`
    ),
    description: readOptionalString(step.detail),
    waitForUser: true,
  };
}

function toDurationSeconds(step, options) {
  const hours = readNonNegativeInteger(step.hours ?? 0, options.errorMessage);
  const minutes = readNonNegativeInteger(step.minutes ?? 0, options.errorMessage);
  const seconds = readNonNegativeInteger(step.seconds ?? 0, options.errorMessage);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds <= 0) {
    throw new Error(options.errorMessage);
  }

  return totalSeconds;
}

function readArray(value, errorMessage) {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return value;
}

function readEnum(value, allowedValues, options) {
  if (!allowedValues.includes(value)) {
    throw new Error(options.errorMessage);
  }

  return value;
}

function readNonEmptyString(value, errorMessage) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(errorMessage);
  }

  return value.trim();
}

function readOptionalString(value) {
  if (value == null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Optional string fields must be strings when present.");
  }

  return value.trim();
}

function readPositiveInteger(value, errorMessage) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new Error(errorMessage);
  }

  return numericValue;
}

function readNonNegativeInteger(value, errorMessage) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error(errorMessage);
  }

  return numericValue;
}

function assertPlainObject(value, errorMessage) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorMessage);
  }
}
