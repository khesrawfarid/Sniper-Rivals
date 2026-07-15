const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const myId = useGameStore((state) => state.myId);',
  'const myId = useGameStore((state) => state.myId);\n  const matchDuration = useGameStore((state) => state.matchDuration);'
);

content = content.replace(
  /useGameStore\.getState\(\)\.matchDuration/g,
  'matchDuration'
);

fs.writeFileSync('src/App.tsx', content);
