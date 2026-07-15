const fs = require('fs');
let content = fs.readFileSync('src/socket.ts', 'utf8');

// 1. Add matchDuration property to Socket class
content = content.replace('mapId: string = "default";', 'mapId: string = "default";\n  matchDuration: number = 300;');

// 2. Set matchDuration in QUICK match creation
content = content.replace(
  'playerCount: 0,\n            timeRemaining: 300,',
  'playerCount: 0,\n            timeRemaining: 300,\n            matchDuration: 300,'
);

// 3. Set matchDuration in CUSTOM match creation
content = content.replace(
  'maxPlayers: Number(this.io.opts.query.maxPlayers) || 8,\n            timeRemaining: 300,',
  'maxPlayers: Number(this.io.opts.query.maxPlayers) || 8,\n            timeRemaining: 300,\n            matchDuration: 300,'
);

// 4. Read matchDuration from snapshot
content = content.replace(
  'this.mapId = snapData?.mapId || this.mapId;',
  'this.mapId = snapData?.mapId || this.mapId;\n      this.matchDuration = snapData?.matchDuration || 300;'
);

// 5. Update reset logic at localTimeRemaining <= -15
content = content.replace(
  'if (localTimeRemaining <= -15) {\n          localTimeRemaining = 300;\n          if (this.isHost && this.currentRoom) {\n            updateDoc(doc(db, "matches", this.currentRoom), {\n              timeRemaining: 300,\n              matchEndTime: Date.now() + 300000,',
  'if (localTimeRemaining <= -15) {\n          localTimeRemaining = this.matchDuration;\n          if (this.isHost && this.currentRoom) {\n            updateDoc(doc(db, "matches", this.currentRoom), {\n              timeRemaining: this.matchDuration,\n              matchEndTime: Date.now() + (this.matchDuration * 1000),'
);

// 6. Update startMatch method
content = content.replace(
  'startMatch() {\n    if (this.currentRoom && this.isHost) {\n      updateDoc(doc(db, "matches", this.currentRoom), {\n        state: "playing",\n        timeRemaining: 300,\n        matchEndTime: Date.now() + 300000,',
  'startMatch() {\n    if (this.currentRoom && this.isHost) {\n      updateDoc(doc(db, "matches", this.currentRoom), {\n        state: "playing",\n        timeRemaining: this.matchDuration,\n        matchEndTime: Date.now() + (this.matchDuration * 1000),'
);

// 7. Update skipIntermission method
content = content.replace(
  'timeRemaining: -15, // Instantly trigger the round restart which happens at <= -15\n        matchEndTime: Date.now() + 300000,',
  'timeRemaining: -15, // Instantly trigger the round restart which happens at <= -15\n        matchEndTime: Date.now() + (this.matchDuration * 1000),'
);

content = content.replace(
  'timeRemaining: -15,\n        matchEndTime: Date.now() + 300000,',
  'timeRemaining: -15,\n        matchEndTime: Date.now() + (this.matchDuration * 1000),'
);

// 8. Add changeTime method
content = content.replace(
  'changeMap(mapId: string) {',
  'changeTime(duration: number) {\n    if (this.currentRoom && this.isHost) {\n      updateDoc(doc(db, "matches", this.currentRoom), {\n        matchDuration: duration\n      }).catch(() => {});\n    }\n  }\n\n  changeMap(mapId: string) {'
);


fs.writeFileSync('src/socket.ts', content);
