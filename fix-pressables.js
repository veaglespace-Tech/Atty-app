const fs = require('fs');

const file = 'mobile-app/src/app/org/settings.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix handleUndo
content = content.replace(
  /<Pressable onPress=\{handleUndo\} className=\"(.*?)\">([\s\S]*?)<\/Pressable>/,
  '<Pressable onPress={handleUndo}>\n            <View className="$1">$2</View>\n          </Pressable>'
);

// 2. Fix pickImage
content = content.replace(
  /<Pressable onPress=\{pickImage\} className=\"(.*?)\">([\s\S]*?)<\/Pressable>/,
  '<Pressable onPress={pickImage}>\n            <View className="$1">$2</View>\n          </Pressable>'
);

fs.writeFileSync(file, content);
console.log('Fixed missing Pressables!');
