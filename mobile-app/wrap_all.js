const fs = require('fs');
const path = require('path');

const dirs = [
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/team-leader'
];

for (const dir of dirs) {
  let files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') && f !== '_layout.jsx');
  
  // check for notifications/index.jsx
  if (fs.existsSync(path.join(dir, 'notifications', 'index.jsx'))) {
    files.push('notifications/index.jsx');
  }
  if (fs.existsSync(path.join(dir, 'notifications', '[id].jsx'))) {
    files.push('notifications/[id].jsx');
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('<MobileDashboardShell>')) {
      console.log(`Skipping ${dir}/${file} - already wrapped.`);
      continue;
    }

    console.log(`Wrapping ${dir}/${file}...`);

    if (!content.includes('MobileDashboardShell')) {
      const importStatement = `import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";\n`;
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
      } else {
        content = importStatement + content;
      }
    }

    const returnMatch = content.match(/return\s*\(\s*(<[A-Z][a-zA-Z0-9]+[^>]*>)/);
    if (returnMatch) {
      const startTag = returnMatch[1];
      const tagName = startTag.match(/<([A-Z][a-zA-Z0-9]+)/)[1];
      
      content = content.replace(returnMatch[0], `return (\n    <MobileDashboardShell>\n    ${startTag}`);
      
      const endRegex = new RegExp(`</${tagName}>\\s*\\)\\s*;?\\s*}\\s*$`);
      content = content.replace(endRegex, `</${tagName}>\n    </MobileDashboardShell>\n  );\n}`);
      
      fs.writeFileSync(filePath, content);
      console.log(`Wrapped ${file}`);
    } else {
      console.log(`Could not auto-wrap ${file}`);
    }
  }
}
