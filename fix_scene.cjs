const fs = require('fs');
let content = fs.readFileSync('src/components/GameScene.tsx', 'utf8');

content = content.replace(
  '<MapErrorBoundary>\n          <Suspense fallback={null}>\n            <Arena />\n          </Suspense>\n        </MapErrorBoundary>',
  '{matchState !== "lobby" && <MapErrorBoundary>\n          <Suspense fallback={null}>\n            <Arena />\n          </Suspense>\n        </MapErrorBoundary>}'
);

fs.writeFileSync('src/components/GameScene.tsx', content);
