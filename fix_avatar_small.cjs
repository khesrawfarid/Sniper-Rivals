const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<PerspectiveCamera makeDefault position={\[0, 1\.4, 2\.5\]} fov={30} \/>/g,
  '<PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={40} />'
);

content = content.replace(
  /<group position={\[0, -0\.3, 0\]} rotation={\[0, Math\.PI, 0\]}>/g,
  '<group position={[0, 0.2, 0]} rotation={[0, Math.PI, 0]}>'
);

fs.writeFileSync('src/App.tsx', content);
