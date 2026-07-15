const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<Canvas className="w-full h-full pointer-events-none" camera={{ position:',
  '<Canvas className="w-full h-full pointer-events-none" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ position:'
);

fs.writeFileSync('src/App.tsx', content);
