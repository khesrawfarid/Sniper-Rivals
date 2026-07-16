const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `         {slots.map((p, i) => (
           <div key={i} className={\`relative flex-[1_1_45%] md:flex-1 max-w-[260px] min-w-[100px] md:min-w-[120px] h-[25vh] md:h-[60vh] min-h-[150px] md:min-h-[400px] max-h-[700px] border transition-all duration-500 \${p ? (p.id === myId ? 'border-yellow-400/50 bg-black/40 shadow-[0_0_30px_rgba(250,204,21,0.1)]' : 'border-blue-500/30 bg-black/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]') : 'border-white/5 bg-black/20'} overflow-hidden flex flex-col justify-end group clip-path-slant\`}>`;

const replacement = `         {slots.map((p, i) => (
           <div 
             key={i} 
             onContextMenu={(e) => {
               if (isHost && p && p.id !== myId) {
                 e.preventDefault();
                 setContextMenu({ x: e.clientX, y: e.clientY, playerId: p.id });
               }
             }}
             className={\`relative flex-[1_1_45%] md:flex-1 max-w-[260px] min-w-[100px] md:min-w-[120px] h-[25vh] md:h-[60vh] min-h-[150px] md:min-h-[400px] max-h-[700px] border transition-all duration-500 \${p ? (p.id === myId ? 'border-yellow-400/50 bg-black/40 shadow-[0_0_30px_rgba(250,204,21,0.1)]' : 'border-blue-500/30 bg-black/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]') : 'border-white/5 bg-black/20'} overflow-hidden flex flex-col justify-end group clip-path-slant\`}
           >`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
