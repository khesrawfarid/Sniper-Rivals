import fs from 'fs';
const data = fs.readFileSync('public/1v1_map_optimized.glb');
console.log("File loaded, size: " + data.length);
