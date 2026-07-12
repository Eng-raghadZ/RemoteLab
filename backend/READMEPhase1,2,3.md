# Remote Lab — Backend (Phases 1, 2 & 3)

API server for the **Remote Lab for Microprocessors and Assembly Language**
(PTUK, Computer Engineering). This repo contains two deployable pieces:

- **`src/`** — the cloud-side API server (Phases 1–3)
- **`lab-agent/`** — the on-prem Lab Agent, a *separate* Node project that
  runs on the machine physically wired to the trainer kit and camera
  (Phases 2–3)

## Phase 1 recap

- Express server with Firebase ID token verification on protected routes
- `.asm` file upload → validated → stored in Firebase Storage
- Job creation in Firestore, execution queue read model

## Phase 2 recap

- WebSocket bridge (`/ws/agent` for the Lab Agent, `/ws/client` for
  authenticated students) on the same HTTP server
- Full Execution Queue & Camera Session Policy: dispatch → running (5-minute
  timer starts) → completed / timed out / manually terminated → rig
  released → next job auto-dispatched
- Lab Agent skeleton with a stubbed `TrainerKitInterface`
- Hardened against crashes — every Firestore/Storage call in the WebSocket
  layer fails soft instead of taking the process down

## Phase 3 — what's new: the camera relay

- **`lab-agent/src/cameraCapture.js`** — starts emitting frames the instant
  execution starts (same moment the 5-minute timer starts), stops the
  instant execution ends for *any* reason. There is no separate camera
  queue or reservation — the camera session is defined entirely by the
  execution window, exactly per the policy.
- **`lab-agent/src/pngEncoder.js`** — a dependency-free PNG encoder (just
  Node's built-in `zlib`, no canvas/native deps) used only by the stub, so
  frames are real, valid, visibly-changing images before a real camera
  exists. Swapping in a real camera later only touches `cameraCapture.js`.
- **Relay path**: Lab Agent → `camera_frame` message over `/ws/agent` → API
  server (`agentHub.js`) → relayed *only* to the owning student's socket(s)
  over `/ws/client` (`clientHub.js`). Frames are never broadcast to other
  students.
- **O(1) relay, not a Firestore read per frame**: `agentHub.js` caches the
  running job's `studentUid` the moment it starts (alongside the existing
  `currentJobId`), so relaying a frame that can arrive several times a
  second never touches the database.
- **Frames are bounded by the same lifecycle as execution** — a
  `message.jobId === state.currentJobId` check drops any straggler frame
  that arrives just after a job ends (e.g. one already in flight when a
  timeout fires), so the live view can never outlive the session.

### Verified with a real end-to-end integration test

During development this was tested by running the *actual* server code and
the *actual* Lab Agent process together (Firestore/Storage swapped for
lightweight in-memory test doubles just for the test run, then restored —
none of the shipped code is test-only), confirming:

- A seeded queued job gets picked up, dispatched, and "executed" by the
  real `trainerKit` stub
- The frontend client receives `job_status_changed: running` the moment
  execution starts
- Real, valid, sequential PNG frames (confirmed via `file` and pixel
  inspection, not just a signature check) stream to the frontend client at
  the configured interval
- On manual termination, frames received before termination: several;
  frames received after: **zero** — proving the camera session cannot
  outlive the job, verified against the live system rather than assumed
  from reading the code

## Project structure

```
src/
  config/
    firebaseAdmin.js
    constants.js              Execution timeout, dispatch-ack timeout, agent secret
  middleware/
    authMiddleware.js
    errorHandler.js
  models/
    jobModel.js
  controllers/
    jobs.controller.js
  routes/
    jobs.routes.js
  utils/
    validateAsmFile.js
    storage.js
  websocket/
    protocol.js                 + AGENT_CAMERA_FRAME / CLIENT_CAMERA_FRAME (Phase 3)
    agentHub.js                  + camera frame relay, cached studentUid (Phase 3)
    clientHub.js                 + sendCameraFrame (Phase 3)
    wsServer.js
  server.js

lab-agent/                      SEPARATE project — deploy on-prem
  src/
    protocol.js                 Duplicated from src/websocket/protocol.js — keep in sync by hand
    trainerKit.js                Hardware interface — STUBBED
    cameraCapture.js             Camera interface — STUBBED (Phase 3)
    pngEncoder.js                Dependency-free PNG encoder for stub frames (Phase 3)
    wsClient.js                  Connects out to /ws/agent, reconnect logic
    index.js                     Entry point
  package.json
  .env.example
```

## Setup

### API server (`src/`)

1. `npm install`
2. Copy `.env.example` → `.env`, fill in Firebase Admin credentials plus
   `AGENT_SHARED_SECRET`, `EXECUTION_TIMEOUT_MS`, `DISPATCH_ACK_TIMEOUT_MS`
   (see Phase 2 section above — unchanged by Phase 3)
3. `npm run dev`

### Lab Agent (`lab-agent/`)

1. `cd lab-agent && npm install`
2. Copy `.env.example` → `.env`:
   - `API_WS_URL`, `AGENT_SHARED_SECRET` — as in Phase 2
   - `SERIAL_PORT` / `SERIAL_BAUD_RATE` — still blank until hardware is confirmed
   - `CAMERA_FRAME_INTERVAL_MS` — new in Phase 3, defaults to 1000 (one frame/second)
3. `npm run dev`

## WebSocket protocol additions (Phase 3)

| Direction | Type | Payload |
|---|---|---|
| Agent → Server | `camera_frame` | `{ jobId, mimeType, data (base64), frameNumber, timestamp }` |
| Server → Client | `camera_frame` | same shape, relayed to the owning student only |

See `src/websocket/protocol.js` for the full, commented list.

## Known limitations / next steps

- `trainerKit.js` and `cameraCapture.js` are both simulations. Real serial
  I/O and real frame grabbing are each isolated to one file by design.
- Frame rate/resolution (currently 1 fps, 160×120) are placeholders — tune
  once real camera hardware and actual bandwidth constraints are known.
- No frame persistence/recording — this is a live-only view, matching the
  policy's framing of the camera as observation during execution, not a
  separate archival feature. Revisit if a "watch the replay later" feature
  is ever wanted.
- Dispatch-ack-timeout jobs are marked `error` and the queue moves on
  automatically; there's no automatic retry.

## Firestore indexes & security rules

Unchanged from Phase 1 — `getQueueSnapshot()` / `getNextQueuedJob()` need a
composite index on `status` + `submittedAt` (Firestore gives a direct
console link the first time it runs for real), and all writes to `jobs` go
exclusively through this API server's Admin SDK.


