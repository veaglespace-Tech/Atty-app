const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

let files = walk('c:/Users/ADMIN/Desktop/atty-app/mobile-app/src');
let count = 0;
files.forEach(file => {
    if (!file.endsWith('.js') && !file.endsWith('.jsx') && !file.endsWith('.tsx') && !file.endsWith('.ts')) return;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<<<<<<< HEAD')) {
        console.log('Fixing: ' + file);
        // Better regex:
        let newContent = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n?=======\r?\n([\s\S]*?)\r?\n?>>>>>>> [^\n]*\r?\n?/g, '$1');
        fs.writeFileSync(file, newContent, 'utf8');
        count++;
    }
});
console.log('Fixed ' + count + ' files.');
