const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<div className="relative z-10 p-6 bg-gradient-to-t from-[#0f1923] via-black/80 to-transparent border-t border-white/5">',
  '<div className="relative z-10 p-2 md:p-6 bg-gradient-to-t from-[#0f1923] via-black/80 to-transparent border-t border-white/5">'
);

content = content.replace(
  '<div className="flex-1 flex flex-wrap justify-center items-center gap-2 md:gap-4 p-4 md:px-12 pb-32 md:pb-12 overflow-y-auto w-full content-start md:content-center">',
  '<div className="flex-1 flex flex-wrap justify-center items-start md:items-center gap-2 md:gap-4 p-4 md:px-12 pb-32 md:pb-12 overflow-y-auto w-full content-start md:content-center">'
);

fs.writeFileSync('src/App.tsx', content);
