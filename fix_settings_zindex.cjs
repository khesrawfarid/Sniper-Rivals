const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">',
  '<div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md">'
);

fs.writeFileSync('src/App.tsx', content);
