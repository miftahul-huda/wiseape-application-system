const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
const ALLOWED_IMAGE_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function saveUpload(contentType, buffer) {
  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) {
    const error = new Error('Only PNG, JPEG, GIF, or WEBP images are allowed');
    error.status = 400;
    throw error;
  }

  const filename = `bg-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

module.exports = { saveUpload, UPLOAD_DIR };
