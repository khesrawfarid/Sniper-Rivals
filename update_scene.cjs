const fs = require('fs');
let content = fs.readFileSync('src/components/GameScene.tsx', 'utf8');

content = content.replace('  const matchState = useGameStore((state) => state.matchState);\n  const matchState = useGameStore((state) => state.matchState);', '  const matchState = useGameStore((state) => state.matchState);');

content = content.replace('            if (matchState === \'lobby\') return null;\n            if (matchState === "lobby") return null;\n            return <Opponent key={id} id={id} />;', '            if (matchState === "lobby") return null;\n            return <Opponent key={id} id={id} />;');

fs.writeFileSync('src/components/GameScene.tsx', content);
