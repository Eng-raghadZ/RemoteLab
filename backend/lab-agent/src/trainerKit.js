/**
 * TrainerKitInterface — the ONLY module that should ever know how to talk
 * to the physical SK 80386 trainer kit over the interface controller.
 *
 * This is currently a STUB. It simulates a program "running" for a few
 * seconds and then completing, so the full queue -> dispatch -> running ->
 * completed loop can be exercised end-to-end before real hardware is wired
 * up. When the interface controller's serial protocol is confirmed, only
 * this file needs to change — wsClient.js and index.js don't need to know
 * anything changed.
 *
 * Expected real implementation (once confirmed): open the configured
 * SERIAL_PORT at SERIAL_BAUD_RATE (e.g. via the `serialport` package),
 * write the assembled/raw program bytes, listen for whatever the
 * controller sends back (register/memory state, execution-complete
 * signal, error codes), and translate that into the same
 * onStarted/onCompleted/onError/onAborted callbacks used below.
 */

// jobId -> simulated execution timer, so abort() can cancel it.
const activeSimulations = new Map();

// How long a simulated program "runs" before completing on its own.
// Deliberately well under the 5-minute policy cap so the happy path is
// easy to observe in dev without waiting for a real timeout.
const SIMULATED_RUN_MS = 8000;
const SIMULATED_STARTUP_MS = 500;

/**
 * Begins "executing" a job. Calls onStarted() once the (simulated)
 * hardware handshake completes, then onCompleted(resultSummary) once the
 * (simulated) program finishes — unless abort() is called first.
 */
function startExecution(jobId, fileBuffer, { onStarted, onCompleted, onError }) {
  console.log(`[trainerKit:stub] Starting job ${jobId} (${fileBuffer.length} bytes)`);

  const startupTimer = setTimeout(() => {
    console.log(`[trainerKit:stub] Job ${jobId} reports RUNNING`);
    onStarted();

    const runTimer = setTimeout(() => {
      activeSimulations.delete(jobId);
      console.log(`[trainerKit:stub] Job ${jobId} completed`);
      onCompleted({
        note: 'Simulated result — no real hardware connected yet.',
        // Placeholder shape for what a real result might look like; the
        // Lab Agent doesn't interpret this, it just relays it upstream.
        registers: { AX: '0000', BX: '0000', CX: '0000', DX: '0000' },
        executionTimeMs: SIMULATED_RUN_MS,
      });
    }, SIMULATED_RUN_MS);

    activeSimulations.set(jobId, runTimer);
  }, SIMULATED_STARTUP_MS);

  activeSimulations.set(jobId, startupTimer);

  // Surface a stub error path too, so onError has a real caller even
  // before hardware exists (e.g. malformed program, in a real
  // implementation, would land here instead of onCompleted).
  void onError;
}

/**
 * Cancels whichever simulated stage is currently pending for this job.
 * A real implementation would send a reset/halt command to the controller
 * here instead of just clearing a JS timer.
 */
function abortExecution(jobId) {
  const timer = activeSimulations.get(jobId);
  if (timer) {
    clearTimeout(timer);
    activeSimulations.delete(jobId);
  }
  console.log(`[trainerKit:stub] Job ${jobId} aborted`);
}

module.exports = { startExecution, abortExecution };
