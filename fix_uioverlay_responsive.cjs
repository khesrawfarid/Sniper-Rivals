const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Top HUD wrapper
content = content.replace(
  '<div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 select-none font-sans">',
  '<div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-6 select-none font-sans overflow-hidden">'
);

// Top HUD Layout
content = content.replace(
  '<div className="flex w-full justify-between items-start text-white relative">',
  '<div className="flex w-full justify-between items-start text-white relative gap-2">'
);

content = content.replace(
  '<div className="absolute left-0 top-0 flex flex-col items-start gap-1">',
  '<div className="flex flex-col items-start gap-1 z-10 shrink-0">'
);

content = content.replace(
  '<div className="absolute right-0 top-0">',
  '<div className="z-10 shrink-0">'
);

// Top HUD Player Cards
content = content.replace(
  '<div className="flex-1 flex justify-center items-start flex-wrap gap-4 sm:gap-6 px-4">',
  '<div className="flex-1 flex justify-center items-start flex-wrap gap-2 sm:gap-6 px-1 sm:px-4 max-h-24 sm:max-h-none overflow-hidden">'
);

content = content.replace(
  'className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[80px]',
  'className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[50px] sm:max-w-[80px]'
);

content = content.replace(
  '<div className={`w-12 h-12 sm:w-14 sm:h-14 bg-black/60 backdrop-blur-md rounded-xl border flex items-center justify-center shadow-lg overflow-hidden ${id === myId ? \'border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.3)]\' : \'border-white/10\'}`}>',
  '<div className={`w-8 h-8 sm:w-14 sm:h-14 bg-black/60 backdrop-blur-md rounded-xl border flex items-center justify-center shadow-lg overflow-hidden ${id === myId ? \'border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.3)]\' : \'border-white/10\'}`}>'
);

content = content.replace(
  'className={`text-sm font-black font-mono text-white bg-black/60 px-3 py-1 rounded-lg border border-white/10 min-w-[40px] text-center shadow-lg ${id === myId ? \'border-yellow-400/50 text-yellow-100\' : \'\'}`}>',
  'className={`text-[10px] sm:text-sm font-black font-mono text-white bg-black/60 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-white/10 min-w-[30px] sm:min-w-[40px] text-center shadow-lg ${id === myId ? \'border-yellow-400/50 text-yellow-100\' : \'\'}`}>'
);

// Bottom HUD layout
content = content.replace(
  '<div className="bg-black/50 backdrop-blur-md p-6 rounded-xl border border-white/10 text-left shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[200px]">',
  '<div className="bg-black/50 backdrop-blur-md p-3 sm:p-6 rounded-xl border border-white/10 text-left shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[120px] sm:min-w-[200px]">'
);

content = content.replace(
  '<span className="text-2xl font-black text-yellow-500 animate-pulse uppercase tracking-wider">',
  '<span className="text-sm sm:text-2xl font-black text-yellow-500 animate-pulse uppercase tracking-wider">'
);

content = content.replace(
  'className={`text-5xl font-black ${ammo === 0 ? "text-red-500" : "text-white"}`}',
  'className={`text-3xl sm:text-5xl font-black ${ammo === 0 ? "text-red-500" : "text-white"}`}'
);

content = content.replace(
  '<span className="text-2xl text-gray-500 font-black">/ {WEAPONS[currentWeapon].magSize}</span>',
  '<span className="text-lg sm:text-2xl text-gray-500 font-black">/ {WEAPONS[currentWeapon].magSize}</span>'
);

content = content.replace(
  '<div className="bg-black/50 backdrop-blur-md p-6 rounded-xl border border-white/10 w-80 shadow-[0_0_20px_rgba(0,0,0,0.5)]">',
  '<div className="bg-black/50 backdrop-blur-md p-3 sm:p-6 rounded-xl border border-white/10 w-40 sm:w-80 shadow-[0_0_20px_rgba(0,0,0,0.5)]">'
);

content = content.replace(
  '<span className="text-sm font-bold text-gray-400 tracking-widest">',
  '<span className="text-[10px] sm:text-sm font-bold text-gray-400 tracking-widest">'
);

content = content.replace(
  '<span className="text-3xl font-black text-white">',
  '<span className="text-xl sm:text-3xl font-black text-white">'
);

// Kill feed
content = content.replace(
  '<div className="absolute top-24 right-6 flex flex-col gap-2 items-end">',
  '<div className="absolute top-24 right-2 sm:right-6 flex flex-col gap-1 sm:gap-2 items-end z-0">'
);

content = content.replace(
  'className="bg-gradient-to-r from-transparent to-red-600/60 pl-8 pr-4 py-1 flex items-center gap-3 animate-pulse border-r-4 border-red-500 rounded-l-full shadow-lg"',
  'className="bg-gradient-to-r from-transparent to-red-600/60 pl-4 sm:pl-8 pr-2 sm:pr-4 py-0.5 sm:py-1 flex items-center gap-1 sm:gap-3 animate-pulse border-r-2 sm:border-r-4 border-red-500 rounded-l-full shadow-lg text-[10px] sm:text-base"'
);

fs.writeFileSync('src/App.tsx', content);
