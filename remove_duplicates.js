const fs = require('fs');
const path = require('path');

const folder = 'c:/Users/ENota/OneDrive/Desktop/Admin Request Mgt/admin-forms';
const files = fs.readdirSync(folder);

for (const file of files) {
    if (!file.endsWith('.html')) continue;
    
    const filePath = path.join(folder, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the specific duplicate pattern.
    // The link might be indented with spaces and newlines.
    // We'll replace 2 consecutive instances of the driver request link with 1.
    
    const inactivePattern = /(<a class="nav-link" href="driver-request\.html"><i class="fa-solid fa-id-card"><\/i> Driver Request<\/a>\s*){2,}/g;
    const activePattern = /(<a class="nav-link active" href="driver-request\.html"><i class="fa-solid fa-id-card"><\/i> Driver Request<\/a>\s*){2,}/g;

    let modified = false;

    if (inactivePattern.test(content)) {
        content = content.replace(inactivePattern, '<a class="nav-link" href="driver-request.html"><i class="fa-solid fa-id-card"></i> Driver Request</a>\n      ');
        modified = true;
    }

    if (activePattern.test(content)) {
        content = content.replace(activePattern, '<a class="nav-link active" href="driver-request.html"><i class="fa-solid fa-id-card"></i> Driver Request</a>\n      ');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed duplicates in ' + file);
    }
}
