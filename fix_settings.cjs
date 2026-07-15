const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'import { LogOut, Play, Crown } from "lucide-react";',
  'import { LogOut, Play, Crown, Settings } from "lucide-react";'
);

content = content.replace(
  'const { players, isHost, myId, mapId, matchDuration } = useGameStore();',
  'const { players, isHost, myId, mapId, matchDuration, toggleSettings } = useGameStore();'
);

const oldOptionsBtn = `        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 px-6 py-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-[0.3em] transition-all duration-300"
        >
          {showOptions ? 'Hide Options' : 'Options'}
          <svg className={\`w-4 h-4 transition-transform duration-300 \${showOptions ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>`;

const newOptionsBtn = `        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-2 px-6 py-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-[0.3em] transition-all duration-300"
          >
            {showOptions ? 'Hide Options' : 'Options'}
            <svg className={\`w-4 h-4 transition-transform duration-300 \${showOptions ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => toggleSettings()}
            className="p-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white transition-all duration-300 group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>`;

content = content.replace(oldOptionsBtn, newOptionsBtn);

fs.writeFileSync('src/App.tsx', content);
