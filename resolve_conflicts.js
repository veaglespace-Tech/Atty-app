const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
files.forEach(file => {
    if (!file.endsWith('.js') && !file.endsWith('.jsx') && !file.endsWith('.tsx') && !file.endsWith('.ts')) return;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<<<<<<< HEAD')) {
        console.log('Fixing: ' + file);
        // Replace conflict blocks: keeping the top (HEAD) block and removing the bottom block
        // Wait, let's keep the BOTTOM block because it says 'Update mobile UI'?
        // No, let's keep the HEAD block because we don't know if the bottom block is complete.
        // Actually, if we keep the HEAD block, it's safer.
        let newContent = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\n]*\r?\n?/g, '$1');
        fs.writeFileSync(file, newContent, 'utf8');
    }
});
