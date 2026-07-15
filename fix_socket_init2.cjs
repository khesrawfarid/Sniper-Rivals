const fs = require('fs');
let content = fs.readFileSync('src/socket.ts', 'utf8');

if (!content.includes('matchDuration: this.matchDuration,')) {
  content = content.replace(
    'this.trigger("init", {\n        mapId: this.mapId,',
    'this.trigger("init", {\n        mapId: this.mapId,\n        matchDuration: this.matchDuration,'
  );
  fs.writeFileSync('src/socket.ts', content);
}
