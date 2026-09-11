const fs = require('fs');
const files = [
  'src/app/admin/orders/page.tsx',
  'src/app/admin/customers/page.tsx',
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('force-dynamic')) {
    const lines = content.split('\n');
    let lastImportIdx = 0;
    lines.forEach((line, i) => { if (line.startsWith('import ')) lastImportIdx = i; });
    lines.splice(lastImportIdx + 1, 0, '', 'export const dynamic = "force-dynamic";');
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Updated:', file);
  } else {
    console.log('Already dynamic:', file);
  }
});
