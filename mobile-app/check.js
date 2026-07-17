const fs = require('fs');

const filesToCheck = [
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org/attendance.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org/dashboard.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org/settings.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/org/users.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin/dashboard.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin/organizations.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin/payments.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin/settings.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/super-admin/users.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/attendance.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/dashboard.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/notifications/index.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/posts.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/settings.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/member/teams.jsx',
  '/home/akshay/Desktop/mobile-app/mobile-app/src/app/team-leader/dashboard.jsx',
];

for (const file of filesToCheck) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // If the file has `return (\n    \n      {` or similar, it's broken.
  // We can just replace `return (\n\s*{` with `return (<>{` and `}\n\s*);` with `}</>);`
  // A safer regex:
  if (/return\s*\(\s*\{/.test(content)) {
    console.log("Fixing", file);
    content = content.replace(/return\s*\(\s*\{/g, 'return (<>{');
    content = content.replace(/\}\s*\);(?![^]*\}\s*\);)/, '}</>);'); // Replace the LAST instance of }); with }</>);
    // Actually replacing the last instance might be tricky. Let's just fix it properly by substituting the exact match.
    // Let's just do an automated search and we will manual replace.
  }
}
