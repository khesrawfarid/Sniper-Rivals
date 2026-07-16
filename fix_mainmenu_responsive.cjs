const fs = require('fs');
let content = fs.readFileSync('src/components/MainMenu.tsx', 'utf8');

// Top Right Profile
content = content.replace(
  'className="absolute top-10 right-16 z-50 flex items-center gap-4 bg-black/40 border border-white/5 box-border px-6 py-3 rounded-xl backdrop-blur-md hover:bg-black/60 hover:border-white/10 transition-all cursor-pointer"',
  'className="absolute top-4 md:top-10 right-4 md:right-16 z-50 flex items-center gap-2 md:gap-4 bg-black/40 border border-white/5 box-border px-4 md:px-6 py-2 md:py-3 rounded-xl backdrop-blur-md hover:bg-black/60 hover:border-white/10 transition-all cursor-pointer"'
);

// Profile Name
content = content.replace(
  '<span className="text-lg font-black text-white uppercase tracking-wider leading-none shadow-black drop-shadow-md">{playerName || \'UNKNOWN\'}</span>',
  '<span className="text-sm md:text-lg font-black text-white uppercase tracking-wider leading-none shadow-black drop-shadow-md">{playerName || \'UNKNOWN\'}</span>'
);

// Profile Avatar Size
content = content.replace(
  '<div className="w-12 h-12 rounded-lg bg-blue-900/40 border-2 border-blue-500/30 flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(59,130,246,0.2)] overflow-hidden">',
  '<div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-900/40 border-2 border-blue-500/30 flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(59,130,246,0.2)] overflow-hidden">'
);

// Main Layout
content = content.replace(
  '<div className="absolute inset-0 z-20 flex pt-32 px-16 pb-16">',
  '<div className="absolute inset-0 z-20 flex flex-col md:flex-row pt-20 md:pt-32 px-6 md:px-16 pb-6 md:pb-16 overflow-y-auto overflow-x-hidden md:overflow-hidden gap-8 md:gap-0">'
);

// Left Nav Col
content = content.replace(
  '<div className="w-[30%] flex flex-col justify-between">',
  '<div className="w-full md:w-[30%] flex flex-col justify-start md:justify-between shrink-0">'
);

// Logo Size
content = content.replace(
  'className="h-16 w-auto rounded-2xl drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] object-contain overflow-hidden"',
  'className="h-12 md:h-16 w-auto rounded-2xl drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] object-contain overflow-hidden"'
);

// Title Size
content = content.replace(
  '<h1 className="text-4xl font-black italic tracking-widest uppercase leading-tight">',
  '<h1 className="text-3xl md:text-4xl font-black italic tracking-widest uppercase leading-tight">'
);

// Right Content Col
content = content.replace(
  '<div className="w-[70%] pl-24 flex flex-col justify-center">',
  '<div className="w-full md:w-[70%] md:pl-24 flex flex-col justify-start md:justify-center">'
);

// Custom Match Popup Wrapper
content = content.replace(
  'className="bg-gray-900 border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-2xl relative"',
  'className="bg-gray-900 border border-white/10 rounded-3xl p-6 md:p-10 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"'
);

// Settings Popup
content = content.replace(
  'className="bg-gray-900 border border-white/10 p-8 rounded-2xl w-[800px] max-w-[90vw] shadow-2xl relative flex gap-8"',
  'className="bg-gray-900 border border-white/10 p-4 md:p-8 rounded-2xl w-[800px] max-w-[95vw] shadow-2xl relative flex flex-col md:flex-row gap-4 md:gap-8 max-h-[95vh] overflow-y-auto"'
);

// Settings Canvas
content = content.replace(
  '<div className="flex-1 bg-black/50 rounded-xl overflow-hidden relative border border-white/5 min-h-[400px]">',
  '<div className="w-full md:flex-1 bg-black/50 rounded-xl overflow-hidden relative border border-white/5 min-h-[250px] md:min-h-[400px]">'
);

fs.writeFileSync('src/components/MainMenu.tsx', content);
