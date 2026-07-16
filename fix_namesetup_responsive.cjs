const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<div className="bg-gray-900 border border-white/10 p-10 rounded-2xl w-full max-w-md shadow-2xl">',
  '<div className="bg-gray-900 border border-white/10 p-6 md:p-10 rounded-2xl w-full max-w-md shadow-2xl">'
);

// Loading screen
content = content.replace(
  '<h1 className="text-6xl font-black mb-8 tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600 drop-shadow-sm z-10 transition-all hover:scale-105">',
  '<h1 className="text-4xl md:text-6xl text-center font-black mb-8 tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600 drop-shadow-sm z-10 transition-all hover:scale-105">'
);

fs.writeFileSync('src/App.tsx', content);
