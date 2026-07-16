const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const playersList = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  const actualMaxPlayers = mapId === '1v1' ? 2 : 8;
  const slots = Array.from({ length: actualMaxPlayers }).map((_, i) => playersList[i] || null);
  const hostId = Object.keys(players).sort()[0];`;

const replacement = `  const playersList = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  const actualMaxPlayers = mapId === '1v1' ? 2 : 8;
  const slots = Array.from({ length: actualMaxPlayers }).map((_, i) => playersList[i] || null);
  const hostId = playersList.length > 0 ? [...playersList].sort((a, b) => (a.joinedAt || Date.now()) - (b.joinedAt || Date.now()))[0].id : '';`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
