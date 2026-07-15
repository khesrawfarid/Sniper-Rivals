const fs = require('fs');
let content = fs.readFileSync('src/socket.ts', 'utf8');

content = content.replace(
  'mapId: this.mapId,',
  'mapId: this.mapId,\n        matchDuration: this.matchDuration,'
);

content = content.replace(
  'this.trigger("gameState", { mapId: this.mapId });',
  'this.trigger("gameState", { mapId: this.mapId, matchDuration: this.matchDuration });'
);

content = content.replace(
  'this.mapId = data.mapId;',
  'this.mapId = data.mapId;\n            if (data.matchDuration) this.matchDuration = data.matchDuration;'
);

content = content.replace(
  'if (data.mapId && data.mapId !== this.mapId) {',
  'if ((data.mapId && data.mapId !== this.mapId) || (data.matchDuration && data.matchDuration !== this.matchDuration)) {'
);

fs.writeFileSync('src/socket.ts', content);
