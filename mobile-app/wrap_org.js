const fs = require('fs');
const path = require('path');

const dir = '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') && f !== '_layout.jsx');
files.push('notifications/index.jsx');
files.push('notifications/[id].jsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('<MobileDashboardShell>')) {
    console.log(`Skipping ${file} - already wrapped.`);
    continue;
  }

  console.log(`Wrapping ${file}...`);

  // Add import if not present
  if (!content.includes('MobileDashboardShell')) {
    const importStatement = `import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";\n`;
    // Insert after last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
      content = importStatement + content;
    }
  }

  // Wrap return statement
  // We look for 'return (' or 'return <'
  // Since it's complex to parse, we can just replace the outermost tag inside the main function.
  // Actually, standard is 'return (\n    <View' or 'return (\n    <SafeAreaView' or 'return <ScrollView'
  
  const returnMatch = content.match(/return\s*\(\s*(<[A-Z][a-zA-Z0-9]+[^>]*>)/);
  if (returnMatch) {
    const startTag = returnMatch[1];
    const tagName = startTag.match(/<([A-Z][a-zA-Z0-9]+)/)[1];
    
    // Replace start
    content = content.replace(returnMatch[0], `return (\n    <MobileDashboardShell>\n    ${startTag}`);
    
    // Replace end - find the last closing tag of tagName before ')'
    const endRegex = new RegExp(`</${tagName}>\\s*\\)\\s*;?\\s*}\\s*$`);
    content = content.replace(endRegex, `</${tagName}>\n    </MobileDashboardShell>\n  );\n}`);
    
    fs.writeFileSync(filePath, content);
    console.log(`Wrapped ${file}`);
  } else {
    // try single line return
    const returnSingle = content.match(/return\s*(<[A-Z][a-zA-Z0-9]+[^>]*>)/);
    if (returnSingle) {
      console.log(`Found single line return in ${file}`);
    } else {
      console.log(`Could not auto-wrap ${file}`);
    }
  }
}
