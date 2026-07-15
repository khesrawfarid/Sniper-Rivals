const fs = require('fs');
let content = fs.readFileSync('src/socket.ts', 'utf8');

content = content.replace(
  'mapId: this.mapId,\n        matchDuration: this.matchDuration,',
  'mapId: this.mapId,'
);

fs.writeFileSync('src/socket.ts', content);
