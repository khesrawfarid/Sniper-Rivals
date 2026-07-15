const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<Canvas className="w-full h-full pointer-events-none" camera={{ position: [0, 1.3, 2.5], fov: 35 }}>',
  '<Canvas className="w-full h-full pointer-events-none" camera={{ position: [0, 1.3, actualMaxPlayers === 8 ? 3.5 : 2.5], fov: actualMaxPlayers === 8 ? 50 : 35 }}>'
);

fs.writeFileSync('src/App.tsx', content);
