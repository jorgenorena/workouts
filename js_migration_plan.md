# JS migration plan

## Goal

Replace the current Python/Tkinter workout app with a pure JavaScript browser app that runs locally from Termux with Node.js, keeps the workout files simple, and is much better to use on an Android phone in bright daylight.

## Current repo summary

- `workout_timer.py` is the whole runnable app.
- The real reusable logic is small:
  - load JSON
  - validate structure
  - expand sections/circuits/rounds/rest into a flat step list
  - drive timed/manual progression
- The current UI is the weak point:
  - Tkinter
  - dark theme
  - desktop-sized fixed window
  - keyboard-first controls
- There is no real backend and no database.
- The repo currently contains **two workout JSON schemas**:
  1. newer `sections` schema
  2. older `workout -> steps` schema

## Target architecture

### Recommendation

- **Frontend:** vanilla JavaScript with native modules, plain HTML, plain CSS
- **Local server:** tiny Node.js HTTP server
- **Data storage:** keep `workouts/**/*.json` as the source of truth
- **Launch model:** run Node in Termux, then open `http://127.0.0.1:<port>` in the browser

### Why this is the right choice

- It removes Python from the runtime completely.
- It avoids framework and build-tool complexity that does not help this app.
- It keeps the system local, readable, and easy to modify.
- It solves Android browser file access problems cleanly by serving files over localhost.

### What should be thrown away

- The Tkinter UI
- The keyboard-first control model
- The fixed-window desktop layout
- The assumption that launch should mean passing a single JSON file to a script

### What should be preserved

- The workout data staying in local JSON files
- The workout expansion rules
- The simple single-user local-first philosophy

## Data and local access recommendation

- Keep the existing `workouts/` files and formats on disk unless there is a strong reason to change them later.
- Do **not** rely on `file://` browser loading.
- Serve the browser app and JSON files over localhost from a tiny Node server.
- Support both current JSON schemas through a JavaScript normalization layer.

## UI redesign direction

Build for actual workout use on a phone:

- bright background
- very dark text
- high contrast everywhere
- huge timer and step title
- large tap targets
- bottom-anchored controls
- minimal navigation depth
- one-thumb interaction
- no subtle UI

Recommended navigation:

1. workout picker
2. workout player
3. finish screen

## Wake/screen behavior recommendation

- Use the browser Screen Wake Lock API during active workouts.
- Treat it as best effort.
- Show clear UI state if wake lock is unavailable.
- Do not start with hacky wake-lock workarounds.

## Migration phases

### Phase 1: freeze the data contract

- inspect and document the existing workout JSON formats
- define one normalized JavaScript workout model
- decide which legacy fields are honored, ignored, or mapped

### Phase 2: create the local run model

- add `package.json`
- add a tiny `server.js`
- serve `app/` and `workouts/` over localhost
- add a small `/api/workouts` endpoint

### Phase 3: port the workout engine

- move workout expansion and timing logic into JavaScript modules
- keep that logic independent from the DOM

### Phase 4: build the mobile UI

- workout list screen
- player screen
- large touch controls
- bright high-contrast styling

### Phase 5: add workout-useful extras

- wake lock
- simple preferences in `localStorage`
- timer adjustment and resume helpers if useful

### Phase 6: document runtime and usage

Produce a markdown document that explains:

- the chosen architecture and tradeoffs
- how to run the app on Android with Node in Termux
- whether it also works in a desktop browser
- the workout JSON structures the app supports

The root `README.md` is the best default place for that once the JS app is runnable.

## File/folder proposal

```text
package.json
server.js
README.md
app/
  index.html
  styles.css
  main.js
  data/
    normalize-workout.mjs
    load-workouts.mjs
  state/
    app-state.mjs
    timer-engine.mjs
  ui/
    workout-list.mjs
    workout-player.mjs
    controls.mjs
  utils/
    time.mjs
    wake-lock.mjs
    audio.mjs
tools/
  validate-workouts.mjs
workouts/
  ...
```

## Risks and dead ends to avoid

- assuming there is only one JSON schema
- trying to load workout files directly with `file://`
- keeping Tkinter-era UI decisions for sentimental reasons
- adding React/Preact/Svelte before the plain version proves insufficient
- adding a database
- building an editor before the player is solid
- spending time on heavy PWA work before the localhost app works well

## Phase 1 status: achieved

Phase 1 is now implemented in the repo.

### What was achieved

1. Added `app/data/normalize-workout.mjs`.
2. Defined one normalized runtime workout contract for the future JS app.
3. Implemented normalization for both current source schemas:
   - `sections`
   - `workout -> steps`
4. Made the contract decisions explicit:
   - keep source JSON files unchanged
   - preserve `sound` as `soundEnabled`
   - preserve `keep_screen_on` as `keepScreenOn`
   - preserve `wait_for_user` when present, default it to `true` for rep-based exercises
   - map legacy blocks to normalized `sequence` sections
   - reject unsupported legacy manual steps that lack explicit repetition counts
5. Added `tools/validate-workouts.mjs` so the repo can validate all workout JSON files against the new JS contract.
6. Validated all current workout files successfully:
   - `workouts/core/core-workout-2.json`
   - `workouts/core/core-workout.json`
   - `workouts/runnig/easy_run.json`
   - `workouts/strength/calisthenics_focus_workout.json`
   - `workouts/stretching/universal_stretch.json`

### Normalized workout contract

```js
{
  schema: "normalized-workout",
  schemaVersion: 1,
  sourceFormat: "sections" | "legacy-workout",
  sourcePath: string | null,
  name: string,
  soundEnabled: boolean,
  keepScreenOn: boolean,
  totalRounds: number,
  sections: [
    {
      name: string,
      type: "sequence" | "circuit",
      rounds: number,
      restBetweenExercisesSec: number,
      restBetweenRoundsSec: number,
      exercises: [
        {
          name: string,
          mode: "time" | "reps",
          durationSec: number | null,
          repetitions: number | null,
          description: string,
          waitForUser: boolean
        }
      ]
    }
  ]
}
```

### Why this contract is the right freeze point

- It is simple enough to power the next browser app without a framework.
- It is close to the newer `sections` schema, which should be treated as the preferred authoring format.
- It can still read the older files without rewriting them now.
- It keeps future engine code independent from source-file quirks.

## Phase 2 status: achieved

### Scope

1. Add `package.json` with a minimal start script.
2. Add `server.js` using only Node built-ins.
3. Serve the browser app from `app/`.
4. Expose `workouts/` over localhost.
5. Add `GET /api/workouts` returning workout file paths and names.
6. Add a tiny starter `app/index.html` that proves the browser can fetch the list and load one normalized workout.

### Suggested phase 2 route contract

- `GET /` -> serve `app/index.html`
- `GET /assets/...` or direct `app/...` -> serve browser assets
- `GET /workouts/...` -> serve workout JSON files
- `GET /api/workouts` -> return a JSON array of available workout files with relative paths and display names

### Non-goals for phase 2

- no full workout UI yet
- no service worker
- no install/PWA work
- no data editing
- no app state complexity

### What was achieved

1. Added `package.json` with:
   - `npm start`
   - `npm run validate`
2. Added `server.js` as a tiny Node-only localhost server.
3. Implemented the route contract:
   - `GET /`
   - `GET /app/...`
   - `GET /workouts/...`
   - `GET /api/workouts`
4. The server now lists workout files with:
   - relative path
   - display name
   - detected source format
5. Added a minimal browser proof in:
   - `app/index.html`
   - `app/main.js`
   - `app/styles.css`
   - `app/data/load-workouts.mjs`
6. The browser proof can:
   - fetch the workout list
   - fetch a selected workout JSON file
   - normalize it in browser JavaScript
   - show a summary and the normalized JSON payload
7. Added supporting repo docs:
   - `workout_json_format.md`
   - `usage.md`
8. Verified the end-to-end localhost flow:
   - validation script still passes for all current workout files
   - `/api/workouts` returns the expected list
   - `/` serves the phase 2 browser page
   - a workout file can be fetched over HTTP and parsed successfully

### Result at the end of phase 2

After phase 2, you can now:

1. run a single Node command in Termux
2. open the app in the Android browser
3. fetch the workout list over localhost
4. fetch a workout JSON file
5. normalize it in JavaScript without touching Python

## Phase 3 status: achieved

### Goal

Port the useful workout execution logic from `workout_timer.py` into JavaScript modules that are independent from the DOM.

### Scope

1. Add `app/state/timer-engine.mjs`.
2. Make it accept the normalized workout contract from `normalize-workout.mjs`.
3. Port the Python step-expansion rules into JS:
   - full workout rounds
   - section rounds
   - circuit rest between exercises
   - circuit rest between rounds
   - between-section rest
   - prepare steps before eligible exercises
4. Produce one flat sequence of runtime steps for the future player UI.
5. Preserve the useful step metadata needed by the UI:
   - title
   - detail
   - timed vs manual
   - duration
   - rest/exercise flags
   - section name
   - round context
   - workout-round context
6. Keep timer-engine output pure and deterministic:
   - no DOM access
   - no browser APIs
   - no timing side effects
7. Add a small developer tool or script that proves expansion works on the current workout files.

### Recommended runtime step contract

Each expanded step should look roughly like this:

```js
{
  title: "Bodyweight squats",
  detail: "Controlled descent.",
  type: "timed" | "manual",
  seconds: 30,
  isExercise: true,
  isRest: false,
  sectionName: "Main circuit",
  sectionType: "circuit",
  roundIndex: 1,
  roundTotal: 3,
  workoutRound: 1,
  workoutRounds: 1
}
```

Manual steps should omit `seconds` or set it to `null`.

### Non-goals for phase 3

- no full touch UI yet
- no wake lock yet
- no audio/vibration polish yet
- no PWA work

### What was achieved

1. Added `app/state/timer-engine.mjs`.
2. Ported the core Python workout expansion behavior into pure JavaScript:
   - full workout rounds
   - section rounds
   - circuit rest between exercises
   - circuit rest between rounds
   - between-section rest
   - prepare steps before eligible exercises
3. Kept the engine DOM-free and deterministic:
   - no browser APIs
   - no timers
   - no rendering logic
4. Added useful engine exports for the next UI phase:
   - `expandWorkout(...)`
   - `summarizeRuntimeSteps(...)`
   - `buildContextText(...)`
   - `formatClockTime(...)`
5. Added `tools/expand-workouts.mjs`.
6. Added `npm run expand` to inspect all current workout files through the new engine.
7. Updated the phase proof page so it now shows:
   - runtime step counts
   - timed/manual/rest/prepare counts
   - total timed duration
   - expanded runtime step list
   - expanded runtime JSON
8. Verified the engine against all current workout files successfully.

### Result at the end of phase 3

At the end of phase 3, the repo now has a JavaScript workout engine that replaces the Python app's data-processing layer. The next phase can focus on building the real phone-first workout UI on top of this engine instead of mixing expansion logic with rendering.

## Phase 4 status: achieved

### Goal

Turn the current inspection page into the first real workout player UI for Android phone use.

### Scope

1. Replace the current developer-focused proof layout with a simple mobile flow:
   - workout picker
   - workout player
   - completion state
2. Add `app/state/app-state.mjs` to track:
   - selected workout
   - expanded runtime steps
   - current step index
   - paused/running state
   - remaining seconds for timed steps
3. Use `expandWorkout(...)` from `app/state/timer-engine.mjs` as the only source of workout steps.
4. Build a real player screen with:
   - workout name
   - progress
   - current step title
   - detail/context text
   - large timer or large manual-complete prompt
   - up-next preview
5. Add the minimum useful controls:
   - start
   - pause/resume
   - next/skip
   - complete manual step
   - quit back to picker
6. Apply the intended visual direction:
   - bright background
   - large dark text
   - high contrast
   - large tap targets
   - bottom-anchored actions where helpful
7. Keep the UI framework-free and local-first.

### Recommended file additions for phase 4

- `app/state/app-state.mjs`
- `app/ui/workout-list.mjs`
- `app/ui/workout-player.mjs`
- `app/ui/controls.mjs`

### Non-goals for phase 4

- no wake lock yet
- no audio/vibration polish yet
- no install/PWA work yet
- no workout editing UI

### What was achieved

1. Replaced the developer inspection page with a real application flow:
   - workout picker
   - ready screen
   - workout player
   - completion screen
2. Added `app/state/app-state.mjs` to manage:
   - workout selection
   - runtime step session state
   - current step index
   - running/paused/ready/complete state
   - timed-step countdown state
3. Added UI modules:
   - `app/ui/dom-helpers.mjs`
   - `app/ui/workout-list.mjs`
   - `app/ui/workout-player.mjs`
   - `app/ui/controls.mjs`
4. Reworked `app/main.js` so the UI is now driven by app state instead of a static inspection layout.
5. Reworked `app/index.html` and `app/styles.css` for a mobile-first responsive layout:
   - bright background
   - large dark text
   - large tap targets
   - sticky bottom action bar
   - simple responsive behavior for desktop browsers
6. Added usable player controls:
   - start workout
   - pause/resume timed steps
   - skip step
   - complete manual step
   - quit back to workout picker
   - run again after completion
7. Kept the player behavior grounded in the JS engine from phase 3.
8. Updated `usage.md` for the current player stage.

### Result at the end of phase 4

At the end of phase 4, the app is now a usable local browser-based workout runner. It is still missing some workout-specific polish, but the core interaction loop exists: pick a workout, start it, move through steps, and finish it on the phone with touch-friendly controls.

## Phase 5 detail: add workout-useful polish

This is the next implementation step.

### Goal

Add the practical features that make the player more reliable during real workouts without turning the app into a heavier system.

### Scope

1. Add wake-lock support in a small browser utility such as `app/utils/wake-lock.mjs`.
2. Request wake lock only during active workouts.
3. Release wake lock when the workout ends or the user exits.
4. Re-request wake lock after visibility changes when possible.
5. Add simple feedback cues:
   - browser audio alerts where supported
   - optional vibration cues where supported
6. Add small local preferences using `localStorage`, for example:
   - last opened workout
   - sound enabled/disabled
   - maybe a simple resume preference if it stays lightweight
7. Consider one or two practical timer controls only if they clearly help real usage:
   - optional skip remains
   - optional `+15s` / `-15s` can be considered, but only if it improves actual workout handling

### Non-goals for phase 5

- no cloud sync
- no accounts
- no database
- no workout editor
- no heavy settings UI

### Expected result of phase 5

At the end of phase 5, the app should feel more trustworthy during an actual workout session: harder to let the screen sleep, clearer about state changes, and slightly more forgiving in real-world use.

## Phase 6 detail: document runtime and retire Python as the default app

This is the final implementation/documentation step.

### Goal

Make the JavaScript app the clearly documented default way to run the project and explain the important design choices.

### Scope

1. Update the main human-facing markdown documentation, most likely `README.md`.
2. Explain:
   - why the app moved from Python to JavaScript
   - how to run it from Termux with Node.js on Android
   - whether and how it works in a desktop browser
   - what the preferred workout JSON schema is
   - what legacy JSON compatibility still exists
3. Point to:
   - `workout_json_format.md`
   - `usage.md`
4. Make it explicit that Python is no longer the preferred runtime.
5. Decide whether `workout_timer.py` should remain only as legacy reference or be clearly marked as superseded.

### Non-goals for phase 6

- no enterprise deployment documentation
- no cloud hosting guidance
- no multi-user setup

### Expected result of phase 6

At the end of phase 6, a single person should be able to clone the repo, run the JS app locally from Termux, understand the workout JSON authoring format, and ignore the old Python runtime unless they intentionally want it for reference.

## First implementation priority from here

Add wake lock and lightweight feedback next. The player loop now exists, so the next meaningful jump is making it more reliable during real workout use rather than making it architecturally fancier.
