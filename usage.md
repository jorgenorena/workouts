# Usage

This file explains how to run and test the app at the current **phase 2** stage.

## What exists right now

At this stage, the app is not the final workout player yet.

What it does already:

- starts a tiny local Node server
- serves the browser app over localhost
- lists the workout JSON files in `workouts/`
- loads a workout JSON file in the browser
- normalizes it in JavaScript
- shows the normalized result on screen

What it does **not** do yet:

- run the workout timer flow
- provide the final mobile workout UI
- keep the screen awake during workouts

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

## How to test phase 2

1. Open the app in the browser.
2. Confirm the left panel shows the available workout files.
3. Tap or click different workouts.
4. Confirm the right panel updates with:
   - workout name
   - source file path
   - source format
   - section count
   - exercise count
   - normalized JSON output
5. Confirm older files and newer files both load successfully.

Good test cases:

- `workouts/core/core-workout-2.json`
- `workouts/runnig/easy_run.json`
- `workouts/stretching/universal_stretch.json`

That verifies the app is serving files correctly and the browser-side normalizer handles both current schemas.

## Validate the workout files directly

You can also run the validation script:

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
