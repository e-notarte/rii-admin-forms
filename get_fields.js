const fs = require('fs');

const files = ['vehicle-request.html', 'driver-request.html', 'conference-request.html', 'function-request.html', 'parking-request.html', 'zoom-request.html', 'teams-request.html', 'liaison-request.html', 'supplies-dashboard.html'];

for (const file of files) {
  try {
    const html = fs.readFileSync(file, 'utf8');
    const matches = [...html.matchAll(/name=\"(.*?)\"/g)].map(m => m[1]);
    console.log(file + ": " + [...new Set(matches)].join(", "));
  } catch(e) {}
}
