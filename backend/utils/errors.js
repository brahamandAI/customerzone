class AppError extends Error {
  constructor(errorCode, message, status = 400, details) {
    super(message || 'Error');
    this.name = 'AppError';
    this.errorCode = errorCode || 'APP_ERROR';
    this.status = Number.isInteger(status) ? status : 400;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

function errorResponder(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Default values
  let status = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';

  // Known AppError
  if (err instanceof AppError) {
    status = err.status || 400;
    errorCode = err.errorCode || 'APP_ERROR';
    message = err.message || 'Unexpected error';
  } else if (err.name === 'ValidationError') {
    status = 400;
    errorCode = 'VALIDATION_ERROR';
    message = Object.values(err.errors || {}).map(e => e.message).join(', ') || 'Invalid input';
  } else if (err.name === 'CastError') {
    status = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid identifier provided';
  } else if (err.code === 11000) {
    status = 409;
    errorCode = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || {})[0];
    message = `${field ? `${field} ` : ''}already exists`;
  } else if (err.status === 401) {
    status = 401;
    errorCode = 'AUTH_REQUIRED';
    message = 'Authentication required';
  } else if (err.status === 403) {
    status = 403;
    errorCode = 'PERMISSION_DENIED';
    message = 'You do not have permission to perform this action';
  } else if (err.status === 404) {
    status = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  }

  // Log technical details for developers
  const logPayload = {
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id,
    status,
    errorCode,
    message: err.message,
    stack: err.stack
  };
  // Prefer winston if available
  try {
    const logger = req.app?.get('logger');
    if (logger?.error) {
      logger.error('API Error', logPayload);
    } else {
      // Fallback to console
      // eslint-disable-next-line no-console
      console.error('API Error', logPayload);
    }
  } catch {}

  res.status(status).json({ success: false, errorCode, message });
}

module.exports = { AppError, errorResponder };


