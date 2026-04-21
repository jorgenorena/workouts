# Usage

This file explains how to run and test the app at the current **phase 4** stage.

## What exists right now

At this stage, the app is a first usable browser-based workout runner.

What it does already:

- starts a tiny local Node server
- serves the app over localhost
- reads workout JSON files from `workouts/`
- supports both current JSON schemas through the JS normalizer
- shows a workout picker screen
- opens a real workout player screen
- runs timed steps automatically
- supports manual step completion
- shows progress, current step, and up-next information
- shows a completion screen at the end

What it does **not** do yet:

- keep the screen awake during workouts
- play polished audio/vibration cues
- provide final install/PWA polish

## Prerequisite

You need Node.js available in Termux.

No external packages are required and there is no install step.

## Start the app in Termux

From the repo root:

```sh
cd /data/shared/Dropbox/Codes/workout
npm start
```

You can also use:

```sh
node server.js
```

The server listens on:

```text
http://127.0.0.1:3000
```

## Open it on Android

1. Start the server in Termux.
2. Open your Android browser.
3. Visit `http://127.0.0.1:3000`.

If your browser does not load that address, try:

```text
http://localhost:3000
```

## Open it on desktop

From the same machine running the server, open:

```text
http://127.0.0.1:3000
```

The UI is built mobile-first, but it should still work decently in a desktop browser.

## How to test phase 4 in the browser

1. Open the app in the browser.
2. Confirm the workout picker shows the available workout files as large cards.
3. Open a workout.
4. Confirm the ready screen shows:
   - workout name
   - total step count
   - total timed duration
   - first step preview
5. Press **Start workout**.
6. Confirm the player screen shows:
   - current step title
   - large timer for timed steps or large manual prompt
   - progress bar
   - upcoming step preview
   - large bottom controls
7. For a timed step, test:
   - **Pause**
   - **Resume**
   - **Skip**
8. For a manual step, test:
   - **Done**
   - **Skip**
9. Finish a workout and confirm the completion screen appears.
10. Test:
   - **Run again**
   - **Back to workouts**

## Good workouts to test

- `workouts/core/core-workout-2.json`
- `workouts/core/core-workout.json`
- `workouts/runnig/easy_run.json`
- `workouts/stretching/universal_stretch.json`

These give you a mix of:

- newer `sections` workouts
- older legacy workouts
- timed-heavy routines
- workouts with manual rep steps

## Inspect the engine from the terminal

You can inspect the expanded runtime steps without opening the browser:

```sh
npm run expand
```

That prints one line per workout file, including:

- source format
- total runtime step count
- exercise step count
- rest step count
- prepare step count
- timed/manual counts
- total timed duration

## Validate the workout files directly

You can also run:

```sh
npm run validate
```

That checks every JSON file in `workouts/` against the JavaScript normalization contract.

## Stop the server

In the Termux session running the server, press:

```text
Ctrl+C
```

## Optional custom port

If you want a different port:

```sh
PORT=3001 npm start
```

Then open:

```text
http://127.0.0.1:3001
```
