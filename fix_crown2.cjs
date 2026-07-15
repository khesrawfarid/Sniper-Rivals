const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '                        <div className="truncate relative max-w-full inline-flex">',
  '                        <div className="relative max-w-full inline-flex">'
);

fs.writeFileSync('src/App.tsx', content);
