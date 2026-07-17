const fs = require('fs');
const path = require('path');

const dirs = [
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/team-leader'
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') && !fullPath.endsWith('_layout.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('MobileDashboardShell')) {
        console.log('Unwrapping', fullPath);
        
        // Remove import
        content = content.replace(/import\s+MobileDashboardShell\s+from\s+["']@\/components\/dashboard\/MobileDashboardShell["'];?\s*/g, '');
        
        // Remove open tag and close tag
        content = content.replace(/<MobileDashboardShell>/g, '');
        content = content.replace(/<\/MobileDashboardShell>/g, '');
        
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

for (const dir of dirs) {
  processDir(dir);
}
