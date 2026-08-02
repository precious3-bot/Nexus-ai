export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.message || err}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.set('Cache-Control', 'no-store');
  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
