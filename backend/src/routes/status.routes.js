const express = require('express');
const controller = require('../controllers/status.controller');

const router = express.Router();

// No verifyAuthToken here on purpose — this route is public. See
// status.controller.js for exactly what it does (and doesn't) expose.
router.get('/', controller.getPublicStatus);

module.exports = router;
