export const validateChatRequest = (req, res, next) => {
  const { message } = req.body || {};

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'A non-empty message string is required.',
    });
  }

  if (message.length > 2000) {
    return res.status(413).json({
      success: false,
      error: 'Message exceeds the maximum allowed length.',
    });
  }

  next();
};
