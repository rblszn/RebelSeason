const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace(/[^\x00-\x7F]/g, ""); // Remove ALL non-ASCII characters
fs.writeFileSync('prisma/schema.prisma', content, 'utf8');
