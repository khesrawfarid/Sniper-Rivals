const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('PerspectiveCamera')) {
  content = content.replace(
    'import { Canvas } from "@react-three/fiber";',
    'import { Canvas } from "@react-three/fiber";\nimport { PerspectiveCamera } from "@react-three/drei";'
  );
} else if (!content.includes('import { PerspectiveCamera')) {
  // It's used but not imported
  content = content.replace(
    'import { Canvas } from "@react-three/fiber";',
    'import { Canvas } from "@react-three/fiber";\nimport { PerspectiveCamera } from "@react-three/drei";'
  );
}

fs.writeFileSync('src/App.tsx', content);
