module.exports = (error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'This request is too large. Your latest changes could not be saved.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'The request contains invalid JSON.' });
  }
  return next(error);
};
