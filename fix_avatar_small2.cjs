const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<PerspectiveCamera makeDefault position={\[0, 1\.4, 2\.5\]} fov={30} \/>/g,
  '<PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={40} />'
);

fs.writeFileSync('src/App.tsx', content);
