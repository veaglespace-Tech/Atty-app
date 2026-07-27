const fs = require('fs');

const paths = [
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/member/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/org/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/team-leader/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/super-admin/_layout.jsx'
];

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  
  if (!content.includes('ShieldAlert')) {
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+'lucide-react-native';/, "import { ShieldAlert, $1 } from 'lucide-react-native';");
  }

  if (!content.includes('name="her-security"')) {
    const tabCode = `
      <Tabs.Screen
        name="her-security"
        options={{
          title: 'Security',
          tabBarIcon: ({ color }) => <ShieldAlert size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"`;
    content = content.replace(/<Tabs\.Screen\s+name="settings"/, tabCode.trim());
  }
  
  fs.writeFileSync(p, content);
});

console.log("Layouts updated");
