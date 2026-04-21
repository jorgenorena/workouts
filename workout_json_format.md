# Workout JSON format

This document defines the **preferred JSON format** that agents should generate for this repo.

## Hard rule

Agents should generate the **`sections` format only**.

The app can still read an older legacy format for backward compatibility, but new workout plans should **not** use it.

## General rules

1. The file must contain a single top-level JSON object.
2. Use valid JSON only:
   - double-quoted keys and strings
   - no comments
   - no trailing commas
3. All counts and durations must be positive integers.
4. Use seconds for timed exercises.
5. Keep names and descriptions short and readable on a phone.
6. Do not mix `duration_sec` and `repetitions` in the same exercise.

## Preferred top-level structure

```json
{
  "name": "Workout name",
  "total_rounds": 1,
  "sound": true,
  "keep_screen_on": true,
  "sections": []
}
```

## Top-level fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `name` | Yes | string | Human-readable workout name. |
| `total_rounds` | No | integer | Positive integer. Default is `1`. Repeats the full workout. |
| `sound` | No | boolean | Whether the app should use workout alerts when supported. |
| `keep_screen_on` | No | boolean | Hint that the app should try to keep the screen awake during the workout. |
| `sections` | Yes | array | Non-empty array of workout sections. |

## Section structure

Each entry in `sections` must be an object like this:

```json
{
  "name": "Warmup",
  "type": "sequence",
  "rounds": 1,
  "rest_between_exercises_sec": 0,
  "rest_between_rounds_sec": 0,
  "exercises": []
}
```

## Section fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `name` | Yes | string | Section label shown to the user. |
| `type` | Yes | string | Must be `"sequence"` or `"circuit"`. |
| `rounds` | No | integer | Positive integer. Default is `1`. For circuits, set this explicitly. |
| `rest_between_exercises_sec` | No | integer | Non-negative integer. Mainly useful for circuits. |
| `rest_between_rounds_sec` | No | integer | Non-negative integer. Mainly useful for circuits. |
| `exercises` | Yes | array | Non-empty array of exercise objects. |

## Exercise structure

Each exercise must be either a timed exercise or a repetition exercise.

### Timed exercise

```json
{
  "name": "Side plank",
  "mode": "time",
  "duration_sec": 40,
  "description": "Keep a straight line.",
  "wait_for_user": false
}
```

### Repetition exercise

```json
{
  "name": "Bodyweight squats",
  "mode": "reps",
  "repetitions": 15,
  "description": "Controlled descent.",
  "wait_for_user": true
}
```

## Exercise fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `name` | Yes | string | Exercise name shown in the UI. |
| `mode` | Yes | string | Must be `"time"` or `"reps"`. |
| `duration_sec` | Timed only | integer | Positive integer. Only use when `mode` is `"time"`. |
| `repetitions` | Reps only | integer | Positive integer. Only use when `mode` is `"reps"`. |
| `description` | No | string | Short guidance text. |
| `wait_for_user` | No | boolean | Optional. For reps, `true` is the normal choice. |

## Authoring guidance for agents

### Preferred style

- Use a small number of clear sections.
- Use `sequence` for warmups, cooldowns, and stretches.
- Use `circuit` for repeated training blocks.
- Use short descriptions that fit on a phone screen.
- Prefer explicit values over omitted values when it improves clarity.

### Avoid

- Do not use the legacy `workout` and `steps` schema.
- Do not invent new field names.
- Do not use fractional values.
- Do not leave empty `sections` or empty `exercises`.
- Do not put long essays into `description`.

## Example file

```json
{
  "name": "Short full-body session",
  "total_rounds": 1,
  "sound": true,
  "keep_screen_on": true,
  "sections": [
    {
      "name": "Warmup",
      "type": "sequence",
      "exercises": [
        {
          "name": "March in place",
          "mode": "time",
          "duration_sec": 60,
          "description": "Increase rhythm gradually."
        },
        {
          "name": "Bodyweight squats",
          "mode": "reps",
          "repetitions": 12,
          "wait_for_user": true,
          "description": "Comfortable depth."
        }
      ]
    },
    {
      "name": "Main circuit",
      "type": "circuit",
      "rounds": 3,
      "rest_between_exercises_sec": 25,
      "rest_between_rounds_sec": 75,
      "exercises": [
        {
          "name": "Split squat left",
          "mode": "reps",
          "repetitions": 10,
          "wait_for_user": true,
          "description": "Control the descent."
        },
        {
          "name": "Split squat right",
          "mode": "reps",
          "repetitions": 10,
          "wait_for_user": true,
          "description": "Stay upright."
        },
        {
          "name": "Plank",
          "mode": "time",
          "duration_sec": 35,
          "description": "Brace the abdomen."
        }
      ]
    },
    {
      "name": "Cooldown",
      "type": "sequence",
      "exercises": [
        {
          "name": "Hip flexor stretch left",
          "mode": "time",
          "duration_sec": 30,
          "description": "Posterior pelvic tilt."
        },
        {
          "name": "Hip flexor stretch right",
          "mode": "time",
          "duration_sec": 30,
          "description": "Relax shoulders."
        }
      ]
    }
  ]
}
```

## Compatibility note

The repo still contains older workout files that use a legacy `workout -> steps` shape. The app keeps reading them for compatibility, but agents should treat that schema as deprecated and should not use it for new workout generation.
