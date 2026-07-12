const MAX_FILE_SIZE_BYTES = 256 * 1024; // 256 KB — an Assembly source file has no business being larger.

/**
 * Server-side validation for uploaded Assembly source files. This mirrors
 * (and enforces, since the client can't be trusted) the rules from Page 2:
 * only .asm files, must be non-empty, and capped in size.
 */
function validateAsmFile(file) {
  if (!file) {
    return {
      valid: false,
      reason: 'No file was uploaded. Attach a .asm file under the "program" field.',
    };
  }

  const originalName = file.originalname || '';
  const dotIndex = originalName.lastIndexOf('.');
  const extension = dotIndex >= 0 ? originalName.slice(dotIndex).toLowerCase() : '';

  if (extension !== '.asm') {
    return { valid: false, reason: 'Only .asm files are allowed.' };
  }

  if (file.size === 0) {
    return { valid: false, reason: 'The uploaded file is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'File exceeds the maximum allowed size (256 KB).' };
  }

  return { valid: true };
}

module.exports = { validateAsmFile, MAX_FILE_SIZE_BYTES };
