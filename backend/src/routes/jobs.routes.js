const express = require('express');
const multer = require('multer');

const { verifyAuthToken } = require('../middleware/authMiddleware');
const { MAX_FILE_SIZE_BYTES } = require('../utils/validateAsmFile');
const controller = require('../controllers/jobs.controller');

const router = express.Router();

// Files are validated and streamed straight to Firebase Storage — no need
// to touch disk on the API server itself.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// NOTE: order matters — literal routes ("/me", "/queue/status") must be
// registered before the "/:jobId" wildcard, or Express will try to treat
// "me"/"queue" as a job id.
router.post('/', verifyAuthToken, upload.single('program'), controller.submitJob);
router.get('/me', verifyAuthToken, controller.getMyJobs);
router.get('/queue/status', verifyAuthToken, controller.getQueueStatus);
router.post('/:jobId/terminate', verifyAuthToken, controller.terminateJob);
router.get('/:jobId', verifyAuthToken, controller.getJobStatus);

module.exports = router;
