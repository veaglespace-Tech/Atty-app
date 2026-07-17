const fs = require('fs');

const files = [
  'src/app/org/attendance.jsx',
  'src/components/dashboard/MobileDashboardShell.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove shadows
  content = content.replace(/\bshadow-(sm|md|lg|xl|2xl|inner|none)\b/g, '');
  content = content.replace(/\bdark:shadow-(sm|md|lg|xl|2xl|inner|none)\b/g, '');
  content = content.replace(/\bshadow-[a-z]+-[0-9]+(\/[0-9]+)?\b/g, '');
  
  // Replace fraction colors (e.g. bg-slate-900/80 -> bg-slate-900)
  content = content.replace(/\/([1-9]0|15|25|35|45|75|95)\b/g, '');
  
  // Remove transitions and transforms
  content = content.replace(/\btransition-transform\b/g, '');
  content = content.replace(/\btransition-colors\b/g, '');
  content = content.replace(/\bactive:scale-\[[^\]]+\]\b/g, '');
  content = content.replace(/\bactive:scale-[0-9]+\b/g, '');
  
  // Clean up double spaces created by removal
  content = content.replace(/ +/g, ' ');

  fs.writeFileSync(file, content);
  console.log(`Fixed ${file}`);
});
