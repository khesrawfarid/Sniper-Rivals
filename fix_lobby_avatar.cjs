const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<PerspectiveCamera makeDefault position={\[0, 1\.0, actualMaxPlayers === 8 \? 4\.5 : 3\.5\]} fov={actualMaxPlayers === 8 \? 50 : 40} \/>/g,
  '<PerspectiveCamera makeDefault position={[0, 0.2, actualMaxPlayers === 8 ? 4.5 : 3.5]} fov={actualMaxPlayers === 8 ? 50 : 40} />'
);

content = content.replace(
  /<group position={\[0, -1\.0, 0\]} rotation={\[0, Math\.PI, 0\]}>/g,
  '<group position={[0, 0.4, 0]} rotation={[0, Math.PI, 0]}>'
);

fs.writeFileSync('src/App.tsx', content);
