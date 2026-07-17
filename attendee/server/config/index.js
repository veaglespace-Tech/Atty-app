let config;

try {
  config = require('./local');
} catch {
  config = require('./hostinger');
}

module.exports = config;