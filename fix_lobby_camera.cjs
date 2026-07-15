const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the camera prop on Canvas with a fixed one, and add PerspectiveCamera inside
content = content.replace(
  /<Canvas className="w-full h-full pointer-events-none" dpr={\[1, 1\.5\]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ position: \[0, 1\.3, actualMaxPlayers === 8 \? 4\.8 : 2\.5\], fov: actualMaxPlayers === 8 \? 60 : 35 }}>/g,
  '<Canvas className="w-full h-full pointer-events-none" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>\n                       <PerspectiveCamera makeDefault position={[0, 1.3, actualMaxPlayers === 8 ? 3.5 : 2.5]} fov={actualMaxPlayers === 8 ? 45 : 35} />'
);

fs.writeFileSync('src/App.tsx', content);
