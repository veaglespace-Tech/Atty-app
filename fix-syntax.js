const fs = require('fs');

const file = 'mobile-app/src/app/org/settings.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the bad closing tag
content = content.replace(
  /Save Details<\/Text>\}\s*<\/Pressable>/,
  'Save Details</Text>}\n        </View></Pressable>'
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error!');
