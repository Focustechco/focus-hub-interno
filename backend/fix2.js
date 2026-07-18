const fs = require('fs');
let content = fs.readFileSync('sockets/chat.js', 'utf8');
content = content.replace(/\\`msg-\\\$\{Date\.now\(\)\}\\`/g, '`msg-${Date.now()}`');
fs.writeFileSync('sockets/chat.js', content);
