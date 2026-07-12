# File Upload Page — Notes

The `/dashboard` route (unchanged in `App.jsx`) now renders the Upload
Assembly Program page. The login page, routing, and Firebase config were
not touched.

## What was added

```
src/
  components/
    layout/
      PageShell.jsx        header + footer + animated background + theme
                             toggle — same visual identity as the login
                             page, reused rather than duplicated
    upload/
      UploadCard.jsx        orchestrates the whole flow, owns the file input
      UploadZone.jsx         drag & drop / click-to-browse target
      SelectedFile.jsx       name / size / modified date + replace/remove
      UploadProgress.jsx     progress bar + percentage
      UploadSuccess.jsx      success state + "Upload Another" / "Continue"
      UploadCard.smoke.test.jsx  real DOM interaction tests (see below)
  hooks/
    useAssemblyUpload.js    the idle → selected → uploading → success/error
                             state machine, validation, error auto-dismiss
  services/
    uploadService.js         uploadAssembly(file, onProgress) — currently
                             mocked; this is the one function to replace
                             with a real API call later
  pages/
    UploadPage.jsx           assembles PageShell + welcome statement + UploadCard
    Dashboard.jsx             thin re-export of UploadPage (so App.jsx's
                             import path didn't need to change)
    UploadPage.smoke.test.jsx  verifies the welcome-name rendering
```

## Welcome statement

`UploadPage.jsx` reads the signed-in user from `useAuth()` (the existing
`AuthContext` from the Firebase integration) and shows "Welcome back,
{name}" at the top of the hero section, above the upload card. Name
resolution falls back in order: Firestore `profile.fullName` → Firebase
Auth `displayName` → email → `"Student"`.

## Validation & states

Only `.asm` files are accepted (checked by extension). Anything else
triggers an animated inline error banner ("Only Assembly (.asm) files
are allowed.") that auto-dismisses after 4 seconds — the app never
crashes on a bad file, it just rejects it.

State machine (`useAssemblyUpload`): `idle → selected → uploading →
success` (or `error`, which returns to a re-triable state). A file can
be replaced or removed at any point before upload starts; both actions
are disabled while an upload is in progress.

## Simulated upload

`uploadAssembly()` in `services/uploadService.js` is a mocked
`Promise` that reports progress at 0% → 25% → 60% → 100% (450ms apart,
matching the example in the spec) and resolves with `{ ok, jobId }`.
Every place a real backend will plug in is marked `// TODO Backend`:

- `uploadService.js` — replace the simulation with a real request
  (e.g. `fetch`/`XHR` to your lab server), using `onProgress` for real
  upload progress.
- `useAssemblyUpload.js` — where auth context (e.g. a Firebase ID
  token) would be attached to the request.
- `UploadPage.jsx`'s `handleContinue()` — where navigation to the
  compilation status page will go once that page exists.

## Tests

A real DOM-interaction test suite (not just a syntax check) is
included and passes:

```bash
npm install
npm test
```

7 tests cover: rejecting non-`.asm` files without crashing, accepting a
valid file and enabling the Upload button, running the full simulated
upload through to the success screen, "Upload Another File" resetting
the flow, removing a file before upload, and the welcome statement
rendering the signed-in user's name.

## Accessibility

- The drop zone is keyboard-operable (`tabIndex`, `Enter`/`Space` opens
  the file browser) and screen-reader labeled.
- The error banner uses `role="alert"`.
- The progress bar uses `role="progressbar"` with `aria-valuenow/min/max`.
- All interactive elements have visible `:focus-visible` outlines
  matching the login page's focus ring.

## Responsive design

The upload card is centered and fluid at all widths; the drop zone,
buttons, and success actions adjust padding/stacking at the same
640px breakpoint used elsewhere in the app.
