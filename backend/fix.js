const fs = require('fs');
let content = fs.readFileSync('routes/communication.js', 'utf8');
content = content.replace(/\\`ann-\\\$\{Date\.now\(\)\}\\`/g, '`ann-${Date.now()}`');
content = content.replace(/\\`reac-\\\$\{Date\.now\(\)\}\\`/g, '`reac-${Date.now()}`');
content = content.replace(/\\`chan-\\\$\{Date\.now\(\)\}\\`/g, '`chan-${Date.now()}`');
fs.writeFileSync('routes/communication.js', content);
