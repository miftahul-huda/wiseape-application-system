const crypto = require('crypto');

function hash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function verify(password, salt, expectedHash) {
  const actual = Buffer.from(hash(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hash, generateSalt, verify, generateToken };
