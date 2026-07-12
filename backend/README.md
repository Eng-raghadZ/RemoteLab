# Remote Lab — Backend API Server (Phase 1)

API server for the **Remote Lab for Microprocessors and Assembly Language**
(PTUK, Computer Engineering). This is the cloud-side half of the backend —
it handles authenticated job submission, file storage, and the execution
queue in Firestore. It does **not** yet talk to the physical rig; that's the
Lab Agent, built in Phase 2.

## What's in this phase

- Express server with Firebase ID token verification on every protected route
- `.asm` file upload → validated → stored in Firebase Storage
- Job creation in Firestore (`jobs` collection)
- Execution queue read model (position, running job, queue length)

## What's *not* in this phase (coming next)

- WebSocket bridge to the Lab Agent
- Actually starting/stopping execution on the 80386 trainer kit
- Camera session lifecycle (start on `running`, 5-minute cap, termination reasons)
- Result storage/retrieval

## Project structure

```
src/
  config/firebaseAdmin.js     Firebase Admin SDK init (lazy, from env vars)
  middleware/authMiddleware.js  Verifies Firebase ID tokens
  middleware/errorHandler.js    Central error + 404 handling
  models/jobModel.js            Firestore job schema + queue queries
  controllers/jobs.controller.js  Request handlers
  routes/jobs.routes.js         Route wiring + multer upload config
  server.js                     App entry point
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in real values:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` —
     from a Firebase service account key (Firebase Console → Project Settings
     → Service Accounts → Generate new private key). This is a **different**
     credential from your frontend's Firebase config — it's server-side only
     and must never be committed or shipped to the browser.
   - `FIREBASE_STORAGE_BUCKET` — your project's storage bucket
     (`<project-id>.appspot.com`)
   - `ALLOWED_ORIGIN` — your frontend's URL, so CORS allows it
3. `npm run dev` (auto-restart) or `npm start`

The server boots and serves `/health` even without valid Firebase
credentials — the Admin SDK is only initialized the first time a request
actually needs it, so you'll get a clear error on the first Firestore/Storage
call rather than a crash at startup.

## Endpoints

All `/api/jobs/*` routes require `Authorization: Bearer <Firebase ID token>`,
the same token your frontend already gets from Firebase Auth.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check, no auth required |
| POST | `/api/jobs` | Upload a `.asm` file (multipart field: `program`) → creates a queued job |
| GET | `/api/jobs/me` | Calling student's own job history |
| GET | `/api/jobs/:jobId` | Status + queue position of one job (owner only) |
| GET | `/api/jobs/queue/status` | Snapshot of the whole execution queue |

### Example: submit a job

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <idToken>" \
  -F "program=@my_program.asm"
```

Response:
```json
{
  "jobId": "abc123",
  "status": "queued",
  "queuePosition": 2,
  "totalInQueue": 2
}
```

## Firestore `jobs` schema

```
id              string
studentUid      string
studentEmail    string | null
fileName        string
storagePath     string   (path in Firebase Storage)
status          "queued" | "running" | "completed" | "timed_out" | "terminated_by_user" | "error"
submittedAt     Timestamp
startedAt       Timestamp | null
completedAt     Timestamp | null
resultRef       string | null   (populated by the Lab Agent in a later phase)
errorMessage    string | null
endReason       string | null   (mirrors the non-active status once the job ends)
```

## A note on Firestore indexes

`getQueueSnapshot()` filters by `status in [...]` and orders by
`submittedAt`. Firestore requires a composite index for this combination.
The first time this query runs against a real project, Firestore will throw
an error containing a direct link to auto-create the index in the console —
just click it.

## Firestore security rules reminder

Per the existing project setup, Firestore rules should keep client writes to
`jobs` disabled — every job is created through this API server (using the
Admin SDK, which bypasses security rules), never directly from the browser.
Only add read access for a student to their own jobs if you want the
frontend to read job status straight from Firestore instead of through this
API.

## Next phase

Phase 2: WebSocket bridge between this API server and the on-prem Lab
Agent, plus the Lab Agent skeleton itself (serial communication stubbed
until the interface controller's protocol is confirmed).
