const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<Canvas className="w-full h-full pointer-events-none" dpr={\[1, 1\.5\]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ position: \[0, 1\.4, 2\.5\], fov: 30 }}>/g,
  '<Canvas className="w-full h-full pointer-events-none" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>\n    <PerspectiveCamera makeDefault position={[0, 1.4, 2.5]} fov={30} />'
);

fs.writeFileSync('src/App.tsx', content);
