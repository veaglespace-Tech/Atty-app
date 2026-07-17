const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin', function(filePath) {
  if (filePath.endsWith('.jsx') && !filePath.includes('.orig')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace `router.back()` with `router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')`
    // ONLY IF it's not already inside a canGoBack check.
    // Use regex to avoid replacing `router.back()` if the line already contains `canGoBack`.
    
    const lines = content.split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('router.back()') && !lines[i].includes('canGoBack')) {
        lines[i] = lines[i].replace(/router\.back\(\)/g, "router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')");
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`Updated ${filePath}`);
    }
  }
});
