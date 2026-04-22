# Workout app

Local-first workout runner built for **Android phone use from Termux with Node.js**.

The app now runs as a pure JavaScript browser app. The old Python runtime has been removed from the repo.

## What this project is

- tiny local Node server
- browser UI optimized for phone use first
- workout data stored in local JSON files under `workouts/`
- no database
- no accounts
- no cloud dependency

## Current runtime

The default and supported runtime is:

- **Node.js** for the local server
- **browser** for the UI

## Runtime behavior

- the app serves the browser UI over localhost
- it reads workout JSON files from `workouts/`
- it tries to keep the screen awake during active workout sessions on supported browsers
- it vibrates at workout step transitions on supported devices
- the active workout screen is intentionally minimal and phone-first

## Run on Android with Termux

From the repo root:

```sh
cd /data/shared/Dropbox/Codes/workout
npm start
```

Then open in the Android browser:

```text
http://127.0.0.1:3000
```

If needed, try:

```text
http://localhost:3000
```

## Run on desktop

From the same machine that is running the server, open:

```text
http://127.0.0.1:3000
```

The UI is mobile-first, but it also works in a desktop browser.

## Supported workout JSON

The preferred authoring format is the newer **`sections` schema**.

For detailed authoring rules, examples, and guidance for agents, see:

- `workout_json_format.md`

The app still supports older legacy workout files in the repo for compatibility, but new workout generation should use the preferred schema documented there.

## How to use and test the app

See:

- `usage.md`

That file explains how to launch the app and test the current workout picker and player flow.

## Project structure

```text
app/        Browser UI, state, and utilities
tools/      Validation and expansion scripts
workouts/   Workout JSON files
server.js   Tiny local HTTP server
```

## Useful commands

Start the app:

```sh
npm start
```

Validate workout files:

```sh
npm run validate
```

Inspect expanded runtime steps:

```sh
npm run expand
```
