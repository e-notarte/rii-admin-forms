const fs = require('fs');
const path = require('path');

const folder = 'c:/Users/ENota/OneDrive/Desktop/Admin Request Mgt/admin-forms';
const files = fs.readdirSync(folder);

for (const file of files) {
    if (!file.endsWith('.html') || file === 'index.html' || file === 'admin-dashboard.html' || file === 'driver-request.html') continue;
    
    const filePath = path.join(folder, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the Vehicle Request link to add Driver Request right after it
    // Wait, the active class might be on the Vehicle Request link for vehicle-request.html
    const driverLink = '<a class="nav-link" href="driver-request.html"><i class="fa-solid fa-id-card"></i> Driver Request</a>';
    
    // For vehicle-request.html
    content = content.replace(
        '<a class="nav-link active" href="vehicle-request.html"><i class="fa-solid fa-car"></i> Vehicle Request</a>',
        `<a class="nav-link active" href="vehicle-request.html"><i class="fa-solid fa-car"></i> Vehicle Request</a>\n      ${driverLink}`
    );

    // For other files where it's not active
    content = content.replace(
        '<a class="nav-link" href="vehicle-request.html"><i class="fa-solid fa-car"></i> Vehicle Request</a>',
        `<a class="nav-link" href="vehicle-request.html"><i class="fa-solid fa-car"></i> Vehicle Request</a>\n      ${driverLink}`
    );

    fs.writeFileSync(filePath, content, 'utf8');
}
