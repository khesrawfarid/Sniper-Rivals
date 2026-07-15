const fs = require('fs');
let content = fs.readFileSync('src/components/Arena.tsx', 'utf8');

if (!content.includes('useGLTF.preload')) {
  content += `\nuseGLTF.preload(\`\${import.meta.env.BASE_URL}1v1_map_optimized.glb\`);\n`;
  content += `useGLTF.preload(\`\${import.meta.env.BASE_URL}arenamap.v.2.1.glb\`);\n`;
  fs.writeFileSync('src/components/Arena.tsx', content);
}
