const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("setMapError('Too many players for this map.');", "setMapError('Can\\'t change the map because there are too many players');");

content = content.replace(
  '<div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Map</div>',
  '<div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Map</div>'
); // Was already changed

fs.writeFileSync('src/App.tsx', content);
