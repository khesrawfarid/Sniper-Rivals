const fs = require('fs');
let content = fs.readFileSync('src/store/gameStore.ts', 'utf8');

if (!content.includes('matchDuration?: number;')) {
  content = content.replace(
    'mapId?: \'default\' | \'1v1\';',
    'mapId?: \'default\' | \'1v1\';\n  matchDuration?: number;'
  );
  
  content = content.replace(
    'mapId: undefined,',
    'mapId: undefined,\n  matchDuration: 300,'
  );

  fs.writeFileSync('src/store/gameStore.ts', content);
}
