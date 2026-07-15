const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const uiStr = `
      {/* MATCH SETTINGS (TIME & ARENA) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col md:flex-row gap-4 p-2 bg-black/60 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.9)] z-[110] backdrop-blur-xl">
        
        {/* TIME SETTINGS */}
        {(!mapId || mapId === 'default') && (
          <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5">
            <div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Time</div>
            {isHost ? (
              <div className="flex gap-1 relative">
                {[60, 300, 600].map((t) => (
                  <div 
                    key={t}
                    onClick={() => socket.changeTime(t)}
                    className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 \${matchDuration === t || (!matchDuration && t === 300) ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}\`}
                  >
                    {t / 60}m
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-1">
                {[60, 300, 600].map((t) => (
                  <div 
                    key={t}
                    className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs \${matchDuration === t || (!matchDuration && t === 300) ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-transparent text-gray-500 hidden'}\`}
                  >
                    {t / 60}m
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARENA SETTINGS */}
        <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5">
          <div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Arena</div>
          {isHost ? (
            <div className="flex gap-1 relative">
              <div 
                onClick={() => socket.changeMap('default')}
                className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 \${(!mapId || mapId === 'default') ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}\`}
              >
                Default (8P)
              </div>
              <div 
                onClick={() => socket.changeMap('1v1')}
                className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 \${mapId === '1v1' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}\`}
              >
                1v1 Arena (2P)
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              <div className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs \${(!mapId || mapId === 'default') ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-transparent text-gray-500 hidden'}\`}>
                Default (8P)
              </div>
              <div className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs \${mapId === '1v1' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-transparent text-gray-500 hidden'}\`}>
                1v1 Arena (2P)
              </div>
            </div>
          )}
        </div>
        
      </div>
`;

// Extract existing time and map sections and replace with the new one
let startIndex = content.indexOf('{/* TIME SELECTION */}');
let endIndex = content.indexOf('{/* Background styling for slant effect */}');

content = content.substring(0, startIndex) + uiStr + '\n      ' + content.substring(endIndex);

fs.writeFileSync('src/App.tsx', content);
