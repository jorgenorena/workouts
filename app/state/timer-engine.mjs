export function expandWorkout(normalizedWorkout) {
  assertNormalizedWorkout(normalizedWorkout);

  const expandedSteps = [];

  for (
    let workoutRound = 1;
    workoutRound <= normalizedWorkout.totalRounds;
    workoutRound += 1
  ) {
    for (let sectionIndex = 0; sectionIndex < normalizedWorkout.sections.length; sectionIndex += 1) {
      const section = normalizedWorkout.sections[sectionIndex];
      const nextSection = normalizedWorkout.sections[sectionIndex + 1] ?? null;

      expandedSteps.push(
        ...expandSection(section, {
          workoutRound,
          workoutRounds: normalizedWorkout.totalRounds,
        })
      );

      const betweenSectionRest = getBetweenSectionRestSeconds(section, nextSection);
      if (betweenSectionRest > 0 && nextSection) {
        const nextExerciseName = nextSection.exercises[0]?.name ?? nextSection.name;
        expandedSteps.push(
          makeRestStep({
            title: "Rest",
            seconds: betweenSectionRest,
            detail: `Recover before the next block. Next: ${nextExerciseName}`,
            sectionName: "Between blocks",
            roundIndex: 1,
            roundTotal: 1,
            workoutRound,
            workoutRounds: normalizedWorkout.totalRounds,
          })
        );
      }
    }
  }

  return addPrepareSteps(expandedSteps).map((step, index) => ({
    ...step,
    stepIndex: index + 1,
  }));
}

export function summarizeRuntimeSteps(runtimeSteps) {
  let timedSteps = 0;
  let manualSteps = 0;
  let restSteps = 0;
  let prepareSteps = 0;
  let exerciseSteps = 0;
  let totalTimedSeconds = 0;

  for (const step of runtimeSteps) {
    if (step.type === "timed") {
      timedSteps += 1;
      totalTimedSeconds += step.seconds ?? 0;
    } else {
      manualSteps += 1;
    }

    if (step.isRest) {
      restSteps += 1;
    }

    if (step.isPrepare) {
      prepareSteps += 1;
    }

    if (step.isExercise) {
      exerciseSteps += 1;
    }
  }

  return {
    totalSteps: runtimeSteps.length,
    timedSteps,
    manualSteps,
    restSteps,
    prepareSteps,
    exerciseSteps,
    totalTimedSeconds,
  };
}

export function buildContextText(step) {
  const contextParts = [];

  if (step.sectionName) {
    if (step.roundTotal > 1) {
      contextParts.push(`${step.sectionName} - round ${step.roundIndex}/${step.roundTotal}`);
    } else {
      contextParts.push(step.sectionName);
    }
  }

  if (step.workoutRounds > 1) {
    contextParts.push(`Workout round ${step.workoutRound}/${step.workoutRounds}`);
  }

  return contextParts.join("\n");
}

export function formatClockTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getNextStepTitle(runtimeSteps, currentIndex) {
  const nextStep = runtimeSteps[currentIndex + 1];
  return nextStep ? nextStep.title : "Workout complete";
}

function expandSection(section, context) {
  const expandedSteps = [];
  const rounds = readPositiveInteger(
    section.rounds,
    `Section '${section.name}' must have at least one round.`
  );
  const restBetweenExercisesSec = readNonNegativeInteger(
    section.restBetweenExercisesSec,
    `Section '${section.name}' has invalid restBetweenExercisesSec.`
  );
  const restBetweenRoundsSec = readNonNegativeInteger(
    section.restBetweenRoundsSec,
    `Section '${section.name}' has invalid restBetweenRoundsSec.`
  );

  if (section.type !== "sequence" && section.type !== "circuit") {
    throw new Error(
      `Section '${section.name}' has invalid type '${String(section.type)}'.`
    );
  }

  if (!Array.isArray(section.exercises) || section.exercises.length === 0) {
    throw new Error(`Section '${section.name}' must contain at least one exercise.`);
  }

  for (let roundIndex = 1; roundIndex <= rounds; roundIndex += 1) {
    for (let exerciseIndex = 0; exerciseIndex < section.exercises.length; exerciseIndex += 1) {
      const exercise = section.exercises[exerciseIndex];
      const isLastExercise = exerciseIndex === section.exercises.length - 1;
      const isLastRound = roundIndex === rounds;

      expandedSteps.push(
        expandExercise(exercise, {
          sectionName: section.name,
          sectionType: section.type,
          roundIndex,
          roundTotal: rounds,
          workoutRound: context.workoutRound,
          workoutRounds: context.workoutRounds,
        })
      );

      if (section.type === "circuit" && !isLastExercise && restBetweenExercisesSec > 0) {
        const nextExercise = section.exercises[exerciseIndex + 1];
        expandedSteps.push(
          makeRestStep({
            title: "Rest",
            seconds: restBetweenExercisesSec,
            detail: `Recover briefly. Next: ${nextExercise.name}`,
            sectionName: section.name,
            roundIndex,
            roundTotal: rounds,
            workoutRound: context.workoutRound,
            workoutRounds: context.workoutRounds,
          })
        );
      }

      if (section.type === "circuit" && isLastExercise && !isLastRound && restBetweenRoundsSec > 0) {
        expandedSteps.push(
          makeRestStep({
            title: `Rest before round ${roundIndex + 1}`,
            seconds: restBetweenRoundsSec,
            detail: `Recover before the next round. Next: ${section.exercises[0].name}`,
            sectionName: section.name,
            roundIndex,
            roundTotal: rounds,
            workoutRound: context.workoutRound,
            workoutRounds: context.workoutRounds,
          })
        );
      }
    }
  }

  return expandedSteps;
}

function expandExercise(exercise, context) {
  if (exercise.mode === "time") {
    const seconds = readPositiveInteger(
      exercise.durationSec,
      `Timed exercise '${exercise.name}' in section '${context.sectionName}' must have a positive duration.`
    );

    return {
      title: exercise.name,
      detail: joinDetailLines(exercise.description, `Duration: ${formatClockTime(seconds)}`),
      type: "timed",
      seconds,
      isExercise: true,
      isRest: false,
      isPrepare: false,
      waitForUser: false,
      sectionName: context.sectionName,
      sectionType: context.sectionType,
      roundIndex: context.roundIndex,
      roundTotal: context.roundTotal,
      workoutRound: context.workoutRound,
      workoutRounds: context.workoutRounds,
    };
  }

  if (exercise.mode === "reps") {
    const repetitions = readPositiveInteger(
      exercise.repetitions,
      `Rep exercise '${exercise.name}' in section '${context.sectionName}' must have a positive repetitions value.`
    );

    return {
      title: exercise.name,
      detail: joinDetailLines(exercise.description, `Repetitions: ${repetitions}`),
      type: "manual",
      seconds: null,
      repetitions,
      isExercise: true,
      isRest: false,
      isPrepare: false,
      waitForUser: exercise.waitForUser,
      sectionName: context.sectionName,
      sectionType: context.sectionType,
      roundIndex: context.roundIndex,
      roundTotal: context.roundTotal,
      workoutRound: context.workoutRound,
      workoutRounds: context.workoutRounds,
    };
  }

  throw new Error(
    `Exercise '${exercise.name}' in section '${context.sectionName}' has invalid mode '${String(exercise.mode)}'.`
  );
}

function addPrepareSteps(runtimeSteps) {
  const expandedSteps = [];

  for (const step of runtimeSteps) {
    const previousStep = expandedSteps[expandedSteps.length - 1] ?? null;

    if (needsPrepareStep(previousStep, step)) {
      expandedSteps.push(
        makeRestStep({
          title: "Prepare",
          seconds: 2,
          detail: `Get ready for: ${step.title}`,
          sectionName: step.sectionName,
          roundIndex: step.roundIndex,
          roundTotal: step.roundTotal,
          workoutRound: step.workoutRound,
          workoutRounds: step.workoutRounds,
          isPrepare: true,
        })
      );
    }

    expandedSteps.push(step);
  }

  return expandedSteps;
}

function needsPrepareStep(previousStep, step) {
  if (!previousStep || !step.isExercise) {
    return false;
  }

  return !previousStep.isRest;
}

function getBetweenSectionRestSeconds(previousSection, nextSection) {
  if (!previousSection || !nextSection) {
    return 0;
  }

  const previousRest = readNonNegativeInteger(
    previousSection.restBetweenRoundsSec ?? 0,
    "Invalid previous section restBetweenRoundsSec."
  );
  const nextRest = readNonNegativeInteger(
    nextSection.restBetweenRoundsSec ?? 0,
    "Invalid next section restBetweenRoundsSec."
  );

  return Math.min(previousRest, nextRest);
}

function makeRestStep(options) {
  return {
    title: options.title ?? "Rest",
    detail: options.detail,
    type: "timed",
    seconds: readPositiveInteger(options.seconds, "Rest steps must have a positive duration."),
    isExercise: false,
    isRest: true,
    isPrepare: options.isPrepare === true,
    waitForUser: false,
    sectionName: options.sectionName ?? "",
    sectionType: "rest",
    roundIndex: options.roundIndex ?? 1,
    roundTotal: options.roundTotal ?? 1,
    workoutRound: options.workoutRound ?? 1,
    workoutRounds: options.workoutRounds ?? 1,
  };
}

function joinDetailLines(...parts) {
  return parts.filter(Boolean).join("\n");
}

function assertNormalizedWorkout(workout) {
  if (!workout || typeof workout !== "object" || Array.isArray(workout)) {
    throw new Error("Normalized workout must be an object.");
  }

  if (!Array.isArray(workout.sections) || workout.sections.length === 0) {
    throw new Error("Normalized workout must contain at least one section.");
  }

  readPositiveInteger(
    workout.totalRounds,
    "Normalized workout must have a positive totalRounds value."
  );
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
