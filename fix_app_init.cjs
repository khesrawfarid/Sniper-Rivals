const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'mapId: data.mapId,\n          isHost: data.isHost,',
  'mapId: data.mapId,\n          isHost: data.isHost,\n          matchDuration: data.matchDuration,'
);

fs.writeFileSync('src/App.tsx', content);
