const fs = require('fs');

const paths = [
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/member/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/org/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/team-leader/_layout.jsx',
  'c:/Users/ADMIN/Desktop/atty-app/mobile-app/src/app/super-admin/_layout.jsx'
];

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/title:\s*'Security'/g, "title: 'तिची सुरक्षा'");
  fs.writeFileSync(p, content);
});

console.log("Layouts updated");
