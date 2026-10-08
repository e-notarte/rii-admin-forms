const fs = require('fs');

const files = fs.readdirSync('.');
const htmlFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');

const authGuard = `
  <script>
    if (sessionStorage.getItem('isAuthenticated') !== 'true') {
      window.location.href = 'index.html';
    }
  </script>`;

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // check if it already has the auth guard
  if (!content.includes("sessionStorage.getItem('isAuthenticated') !== 'true'")) {
    content = content.replace('</head>', authGuard + '\n</head>');
    fs.writeFileSync(file, content);
    console.log('Added auth guard to ' + file);
  } else {
    console.log('Auth guard already exists in ' + file);
  }
});
