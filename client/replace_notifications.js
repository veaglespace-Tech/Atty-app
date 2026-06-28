const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Users/ADMIN/Desktop/attendee/client/app');
let count = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"/g;
    if (regex.test(content)) {
        const newContent = content.replace(regex, 'className="brand-btn brand-btn-primary brand-btn-md"');
        fs.writeFileSync(file, newContent, 'utf8');
        count++;
    }
});
console.log('Replaced in ' + count + ' notification files.');
