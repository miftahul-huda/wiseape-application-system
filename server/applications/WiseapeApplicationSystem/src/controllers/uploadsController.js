const uploadsService = require('../services/uploadsService');

function upload(req, res, next) {
  try {
    const filename = uploadsService.saveUpload(req.headers['content-type'], req.body);
    res.json({ url: `${req.protocol}://${req.get('host')}/uploads/${filename}` });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { upload };
