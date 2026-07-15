const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const { players, isHost, myId, mapId, matchDuration } = useGameStore();',
  'const { players, isHost, myId, mapId, matchDuration } = useGameStore();\n  const [showOptions, setShowOptions] = React.useState(false);'
);

const existingSettingsStr = `      {/* MATCH SETTINGS (TIME & ARENA) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col md:flex-row gap-4 p-2 bg-black/60 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.9)] z-[110] backdrop-blur-xl">`;

const newSettingsStr = `      {/* MATCH SETTINGS (TIME & ARENA) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110]">
        
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 px-6 py-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-[0.3em] transition-all duration-300"
        >
          {showOptions ? 'Hide Options' : 'Options'}
          <svg className={\`w-4 h-4 transition-transform duration-300 \${showOptions ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className={\`flex flex-col md:flex-row gap-4 p-2 bg-black/60 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-500 \${showOptions ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}\`}>`;

content = content.replace(existingSettingsStr, newSettingsStr);

const oldEndStr = `        </div>
        
      </div>

      {/* Background styling for slant effect */}`;
const newEndStr = `        </div>
        </div>
      </div>

      {/* Background styling for slant effect */}`;

content = content.replace(oldEndStr, newEndStr);

fs.writeFileSync('src/App.tsx', content);
