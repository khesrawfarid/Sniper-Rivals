const fs = require('fs');
let content = fs.readFileSync('src/socket.ts', 'utf8');

const target1 = `        outfitColor: this.io.opts.query.outfitColor || "#3182ce",
        eyeColor: this.io.opts.query.eyeColor || "#1a202c",
        nickname: this.io.opts.query.name || "Player",
        lastUpdate: Date.now(),
      };`;

const replacement1 = `        outfitColor: this.io.opts.query.outfitColor || "#3182ce",
        eyeColor: this.io.opts.query.eyeColor || "#1a202c",
        nickname: this.io.opts.query.name || "Player",
        joinedAt: Date.now(),
        lastUpdate: Date.now(),
      };`;

content = content.replace(target1, replacement1);

const target2 = `      // Listen to players
      const playersCol = collection(db, "matches", roomId, "players");
      this.unsubPlayers = onSnapshot(playersCol, (snap) => {
        let playerIds: string[] = [];
        snap.docs.forEach((doc) => {
          playerIds.push(doc.id);
        });
        playerIds.sort();
        this.isHost = playerIds.length > 0 && playerIds[0] === this.id;
        this.trigger("gameState", { isHost: this.isHost });`;

const replacement2 = `      // Listen to players
      const playersCol = collection(db, "matches", roomId, "players");
      this.unsubPlayers = onSnapshot(playersCol, (snap) => {
        let activePlayers: { id: string, joinedAt: number }[] = [];
        snap.docs.forEach((doc) => {
          activePlayers.push({ id: doc.id, joinedAt: doc.data().joinedAt || Date.now() });
        });
        activePlayers.sort((a, b) => a.joinedAt - b.joinedAt);
        this.isHost = activePlayers.length > 0 && activePlayers[0].id === this.id;
        this.trigger("gameState", { isHost: this.isHost });`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/socket.ts', content);
