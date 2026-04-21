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

## Phase 3 detail: port the workout engine

This is the next implementation step.

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

### Expected result of phase 3

At the end of phase 3, the repo should have a JavaScript workout engine that can fully replace the Python app's data-processing logic. The next phase can then focus on building the real phone-first player UI on top of that engine instead of mixing business logic with rendering.

## First implementation priority from here

Build `app/state/timer-engine.mjs` and port the Python expansion rules first. That is the clean handoff point between the data layer already done in phases 1 and 2 and the real mobile player UI that should follow.
