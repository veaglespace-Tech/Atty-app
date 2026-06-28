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
    const regex = /className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row[^"]*"/g;
    if (regex.test(content)) {
        const newContent = content.replace(regex, 'className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end"');
        fs.writeFileSync(file, newContent, 'utf8');
        count++;
    }
});
console.log('Replaced in ' + count + ' files.');
