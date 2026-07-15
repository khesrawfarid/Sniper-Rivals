const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}',
  'dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}'
);

fs.writeFileSync('src/App.tsx', content);
