const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<div className="absolute inset-0 z-[100] bg-[#0f1923] text-white flex flex-col pt-16">',
  '<div className="absolute inset-0 z-[100] bg-[#0f1923] text-white flex flex-col overflow-hidden">'
);

content = content.replace(
  '<div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">',
  '<div className="w-full p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-black/80 to-transparent shrink-0 z-20">'
);

content = content.replace(
  '<div className="flex flex-col">\n           <h1 className="text-4xl font-black tracking-widest uppercase text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">Lobby</h1>\n           <span className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Party Code: <span className="text-white select-all">{roomCode}</span></span>\n        </div>',
  '<div className="flex flex-col items-center md:items-start text-center md:text-left">\n           <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">Lobby</h1>\n           <span className="text-xs md:text-sm font-bold text-gray-400 mt-1 md:mt-2 uppercase tracking-widest">Party Code: <span className="text-white select-all">{roomCode}</span></span>\n        </div>'
);

content = content.replace(
  '<div className="flex gap-4">',
  '<div className="flex gap-2 md:gap-4 flex-wrap justify-center">'
);

content = content.replace(
  'className="bg-red-500 hover:bg-red-400 text-white font-black px-12 py-4 rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all uppercase tracking-widest"',
  'className="bg-red-500 hover:bg-red-400 text-white font-black px-6 md:px-12 py-3 md:py-4 rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all uppercase tracking-widest text-sm md:text-base"'
);

content = content.replace(
  '<div className="text-gray-400 font-bold uppercase tracking-widest px-8 py-4 bg-black/50 rounded border border-white/10">Waiting for Host...</div>',
  '<div className="text-gray-400 font-bold uppercase tracking-widest px-4 md:px-8 py-3 md:py-4 bg-black/50 rounded border border-white/10 text-xs md:text-base">Waiting for Host...</div>'
);

content = content.replace(
  'className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded transition-all uppercase tracking-widest flex items-center gap-2"',
  'className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 md:px-8 py-3 md:py-4 rounded transition-all uppercase tracking-widest flex items-center gap-2 text-sm md:text-base"'
);

content = content.replace(
  '<div className="flex-1 flex justify-center items-center gap-4 px-12 pb-12">',
  '<div className="flex-1 flex flex-wrap justify-center items-center gap-2 md:gap-4 p-4 md:px-12 pb-32 md:pb-12 overflow-y-auto w-full content-start md:content-center">'
);

content = content.replace(
  'className={`relative flex-1 max-w-[260px] min-w-[120px] h-[60vh] min-h-[400px] max-h-[700px]',
  'className={`relative flex-[1_1_45%] md:flex-1 max-w-[260px] min-w-[100px] md:min-w-[120px] h-[25vh] md:h-[60vh] min-h-[150px] md:min-h-[400px] max-h-[700px]'
);

content = content.replace(
  'className="text-green-400 text-xs font-black tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]"',
  'className="text-green-400 text-[10px] md:text-xs font-black tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]"'
);

content = content.replace(
  'className={`text-xl font-bold w-full flex justify-center ${p.id === myId ? \'text-yellow-400\' : \'text-white\'}`}',
  'className={`text-sm md:text-xl font-bold w-full flex justify-center ${p.id === myId ? \'text-yellow-400\' : \'text-white\'}`}'
);

content = content.replace(
  'className="text-gray-600 text-[10px] font-black tracking-[0.3em] uppercase mb-1"',
  'className="text-gray-600 text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase mb-1"'
);

content = content.replace(
  'className="text-gray-500 text-xs font-bold uppercase tracking-widest opacity-50"',
  'className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50"'
);

fs.writeFileSync('src/App.tsx', content);
