const fs = require('fs');

let content = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');

// Remove Desktop Log In / Sign Up
content = content.replace(
  /<div className="hidden lg:flex items-center gap-4 text-\[12px\] font-medium mr-2">[\s\S]*?<\/div>\s*<button/m,
  '<button'
);

// Remove Mobile Log In / Sign Up section
content = content.replace(
  /<div className="pt-8 mt-8 border-t border-border\/50 w-full flex flex-col space-y-8">[\s\S]*?<\/div>/m,
  ''
);

fs.writeFileSync('src/components/layout/Header.tsx', content, 'utf8');
