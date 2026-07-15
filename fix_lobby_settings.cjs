const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const { players, isHost, myId, mapId, matchDuration, toggleSettings } = useGameStore();',
  'const { players, isHost, myId, mapId, matchDuration, toggleSettings, showSettings } = useGameStore();'
);

content = content.replace(
  '    <div className="absolute inset-0 z-[100] bg-[#0f1923] text-white flex flex-col pt-16">\n      {/* HEADER */}',
  '    <div className="absolute inset-0 z-[100] bg-[#0f1923] text-white flex flex-col pt-16">\n      {showSettings && <SettingsMenu onQuit={onLeave} />}\n      {/* HEADER */}'
);

fs.writeFileSync('src/App.tsx', content);
