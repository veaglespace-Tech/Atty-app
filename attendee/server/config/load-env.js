const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const DEFAULT_FILES = [".env", ".env.local"];

const loadEnv = ({ rootDir = path.resolve(__dirname, ".."), files = DEFAULT_FILES } = {}) => {
  const mergedEnv = {};

  for (const fileName of files) {
    const filePath = path.resolve(rootDir, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    Object.assign(mergedEnv, dotenv.parse(fs.readFileSync(filePath)));
  }

  for (const [key, value] of Object.entries(mergedEnv)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

module.exports = loadEnv;
