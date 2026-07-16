const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetSettings = `{/* ARENA SETTINGS */}
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
            </div>`;

const replacementSettings = `{/* ARENA SETTINGS */}
        <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5 relative">
          <div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Map</div>
          {isHost ? (
            <div className="flex gap-1 relative">
              {mapError && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  {mapError}
                </div>
              )}
              <div 
                onClick={() => socket.changeMap('default')}
                className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 \${(!mapId || mapId === 'default') ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}\`}
              >
                Default (8P)
              </div>
              <div 
                onClick={() => {
                  if (Object.keys(players).length > 2) {
                    setMapError('Too many players for this map.');
                    setTimeout(() => setMapError(''), 3000);
                  } else {
                    socket.changeMap('1v1');
                  }
                }}
                className={\`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 \${mapId === '1v1' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}\`}
              >
                1v1 Arena (2P)
              </div>
            </div>`;

content = content.replace(targetSettings, replacementSettings);

const targetReturnEnd = `      <style dangerouslySetInnerHTML={{__html: \`
        .clip-path-slant {
           clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);
        }
      \`}} />
    </div>
  );
};`;

const replacementReturnEnd = `      <style dangerouslySetInnerHTML={{__html: \`
        .clip-path-slant {
           clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);
        }
      \`}} />

      {contextMenu && (
        <div 
          className="absolute z-[200] bg-gray-900 border border-white/20 rounded shadow-xl py-2 px-4 cursor-pointer hover:bg-red-600 text-red-500 hover:text-white font-bold text-sm transition-colors"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => {
            e.stopPropagation();
            socket.kickPlayer(contextMenu.playerId);
            setContextMenu(null);
          }}
        >
          Kick Player
        </div>
      )}
    </div>
  );
};`;

content = content.replace(targetReturnEnd, replacementReturnEnd);

fs.writeFileSync('src/App.tsx', content);
