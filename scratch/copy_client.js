const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\ADMIN\\Desktop\\attendee\\client';
const destDir = 'c:\\Users\\ADMIN\\Desktop\\atty-app\\client';

const ignoreList = ['node_modules', '.git', '.next', '.env', '.env.local'];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      if (!ignoreList.includes(childItemName)) {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      }
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(srcDir, destDir);
console.log('Client copy complete');
