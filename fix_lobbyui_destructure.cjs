const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const { players, isHost, myId, mapId } = useGameStore();',
  'const { players, isHost, myId, mapId, matchDuration } = useGameStore();'
);

// We need to also clean up the one we just added from fix_lobbyui_state.cjs (which might have failed because we didn't have const myId = ...)
content = content.replace(
  'const myId = useGameStore((state) => state.myId);\n  const matchDuration = useGameStore((state) => state.matchDuration);',
  ''
);

fs.writeFileSync('src/App.tsx', content);
