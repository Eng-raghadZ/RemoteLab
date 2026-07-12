function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[remote-lab-api] error:', err);

  // Multer's file-size guard throws an error with this code.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File exceeds the maximum allowed size (256 KB).' });
  }

  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error.';

  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
