const fs = require('fs');
const path = require('path');

['member', 'org', 'team-leader', 'super-admin'].forEach(r => {
  const d = path.join('src/app', r);
  const files = fs.readdirSync(d);
  const dirs = files.filter(f => fs.statSync(path.join(d, f)).isDirectory());
  const jsxFiles = files.filter(f => f.endsWith('.jsx') && f !== '_layout.jsx').map(f => f.replace('.jsx', ''));
  
  console.log(r + ':');
  console.log('  JSX screens:', jsxFiles.join(', '));
  console.log('  Dirs:', dirs.join(', '));
  
  const layout = fs.readFileSync(path.join(d, '_layout.jsx'), 'utf8');
  const hiddenMatches = [...layout.matchAll(/name=["']([^"']+)["']\s+options=\{\{\s*href:\s*null/g)];
  const visibleMatches = [...layout.matchAll(/name=["']([^"']+)["']\s*\n\s*options=\{\{[^}]*title:/g)];
  
  console.log('  Hidden tabs:', hiddenMatches.map(m => m[1]).join(', '));
  
  // Find screens that are NOT in the layout at all
  const allRouteNames = [...hiddenMatches.map(m => m[1])];
  // also grab visible tab names
  const allLines = layout.split('\n');
  allLines.forEach(line => {
    const m = line.match(/name=["']([^"']+)["']/);
    if (m) allRouteNames.push(m[1]);
  });
  
  // Check for JSX files that don't have a matching route name
  const missing = jsxFiles.filter(f => !allRouteNames.includes(f));
  if (missing.length > 0) {
    console.log('  ⚠️ MISSING from layout:', missing.join(', '));
  }
  
  // Check for dirs that might need entries
  dirs.forEach(dir => {
    const dirFiles = fs.readdirSync(path.join(d, dir));
    dirFiles.forEach(df => {
      const routeName = dir + '/' + df.replace('.jsx', '');
      if (!allRouteNames.includes(routeName)) {
        console.log('  ⚠️ MISSING from layout:', routeName);
      }
    });
  });
  
  console.log();
});
