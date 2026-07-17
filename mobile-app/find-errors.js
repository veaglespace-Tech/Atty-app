const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walkDir('/home/akshay/Desktop/mobile-app/mobile-app/src/app');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  try {
    babel.parseSync(content, {
      filename: file,
      presets: ['babel-preset-expo'],
      sourceType: 'module'
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.log(`\nSyntax Error in ${file}:`);
      console.log(err.message);
    }
  }
});
