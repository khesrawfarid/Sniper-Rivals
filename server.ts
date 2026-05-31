import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server } from "socket.io";
import { PlayerData, Room } from "./serverTypes";
import { initBotAI, updateBots, handleSoundEvent } from "./botAI";

const MAX_KILLS = 10;
const MATCH_DURATION = 300; // 5 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const rooms: Record<string, Room> = {};

  const SPAWN_POINTS = [
    { x: 0, y: 5, z: 0 },
    { x: 5, y: 5, z: -5 },
    { x: -5, y: 5, z: 5 },
    { x: -5, y: 5, z: -5 }
  ];

  function getOrCreateRoom(roomCode: string): Room {
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        matchState: 'waiting',
        timeRemaining: MATCH_DURATION,
        timerInterval: null,
        botInterval: null,
        winner: null
      };

      if (roomCode === 'TRAINING_GROUND') {
        for (let i = 0; i < 10; i++) {
          rooms[roomCode].players[`target_${i}`] = {
            id: `target_${i}`,
            nickname: 'Target_' + i,
            x: (Math.random() - 0.5) * 30,
            y: 0.8,
            z: (Math.random() - 0.5) * 30,
            rx: 0, ry: Math.random() * Math.PI * 2, rz: 0,
            health: 100, kills: 0, deaths: 0,
            isTarget: true
          };
        }
      } else if (roomCode === 'QUICK' || roomCode.startsWith('BOT_')) {
        const parts = roomCode.split('_');
        const botCount = roomCode.startsWith('BOT_') && parts.length >= 3 ? parseInt(parts[2]) || 3 : 2;
        for (let i = 0; i < botCount; i++) {
          const spawn = getRandomSpawn();
          rooms[roomCode].players[`bot_${i}`] = {
            id: `bot_${i}`,
            nickname: 'Bot_' + i,
            x: spawn.x,
            y: 0.8,
            z: spawn.z,
            rx: 0, ry: Math.random() * Math.PI * 2, rz: 0,
            health: 100, kills: 0, deaths: 0,
            isTarget: false
          };
        }
      }
    }
    return rooms[roomCode];
  }

  function resetMatch(roomCode: string) {
    const room = rooms[roomCode];
    if (!room) return;

    room.matchState = 'waiting';
    room.timeRemaining = MATCH_DURATION;
    room.winner = null;
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = null;
    
    // Clear targets and bots
    Object.keys(room.players).forEach(id => {
      if (id.startsWith('target_') || id.startsWith('bot_')) delete room.players[id];
    });

    if (roomCode === 'TRAINING_GROUND') {
      for (let i = 0; i < 10; i++) {
        room.players[`target_${i}`] = {
          id: `target_${i}`,
          nickname: 'Target_' + i,
          x: (Math.random() - 0.5) * 30,
          y: 0.8,
          z: (Math.random() - 0.5) * 30,
          rx: 0, ry: Math.random() * Math.PI * 2, rz: 0,
          health: 100, kills: 0, deaths: 0,
          isTarget: true
        };
      }
    } else if (roomCode.startsWith('BOT_')) {
      const parts = roomCode.split('_');
      const botCount = parts.length >= 3 ? parseInt(parts[2]) || 3 : 3;
      for (let i = 0; i < botCount; i++) {
        const spawn = getRandomSpawn();
        room.players[`bot_${i}`] = {
          id: `bot_${i}`,
          nickname: 'Bot_' + i,
          x: spawn.x,
          y: 0.8,
          z: spawn.z,
          rx: 0, ry: Math.random() * Math.PI * 2, rz: 0,
          health: 100, kills: 0, deaths: 0,
          isTarget: false
        };
      }
    }

    // Reset real player stats
    Object.keys(room.players).forEach((id) => {
      if (id.startsWith('target_') || id.startsWith('bot_')) return;
      const spawn = getRandomSpawn();
      room.players[id].kills = 0;
      room.players[id].deaths = 0;
      room.players[id].health = 100;
      room.players[id].x = spawn.x;
      room.players[id].y = spawn.y;
      room.players[id].z = spawn.z;
    });
    
    io.to(roomCode).emit('gameState', { 
      matchState: room.matchState, 
      timeRemaining: room.timeRemaining, 
      winner: room.winner, 
      players: room.players 
    });
  }


  const COLLISION_BOXES: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];

  function checkCollision(x: number, z: number, radius = 1.0): boolean {
    if (x < -100 + radius || x > 100 - radius || z < -100 + radius || z > 100 - radius) return true;
    for (const box of COLLISION_BOXES) {
      if (
        x + radius > box.minX && x - radius < box.maxX &&
        z + radius > box.minZ && z - radius < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  // Initialize bot AI
  initBotAI({
    rooms,
    COLLISION_BOXES,
    checkCollision,
    io,
    scheduleRespawn,
    endMatch,
    getRandomSpawn
  });

  function getRandomSpawn() {
    let x = 0, z = 0, y = 5;
    
    // If we don't have map data yet, use safe fallback points to avoid spawning in buildings
    if (COLLISION_BOXES.length === 0) {
        const SAFE_SPAWNS = [
            { x: 0, y: 5, z: 15 },
            { x: 0, y: 5, z: -15 },
            { x: 15, y: 5, z: 0 },
            { x: -15, y: 5, z: 0 }
        ];
        const safe = SAFE_SPAWNS[Math.floor(Math.random() * SAFE_SPAWNS.length)];
        return { x: safe.x, y: safe.y, z: safe.z };
    }

    let found = false;
    for (let i = 0; i < 50; i++) {
        x = (Math.random() - 0.5) * 50; // map is roughly 50x50 playable area
        z = (Math.random() - 0.5) * 50;
        if (!checkCollision(x, z, 2.0)) {
            found = true;
            break;
        }
    }
    if (!found) {
        x = 0;
        z = 0;
    }
    return { x, y, z };
  }

  function scheduleRespawn(roomCode: string, targetId: string) {
    setTimeout(() => {
        const activeRoom = rooms[roomCode];
        if (!activeRoom || activeRoom.matchState !== 'playing') return;
        const target = activeRoom.players[targetId];
        if (!target) return;
        
        target.health = 100;
        const spawn = getRandomSpawn();
        target.x = spawn.x;
        target.y = targetId.startsWith('target_') || targetId.startsWith('bot_') ? 0.8 : spawn.y;
        target.z = spawn.z;
        target.ry = Math.random() * Math.PI * 2;
        
        io.to(roomCode).emit("playerRespawned", { id: targetId, player: target });
    }, 3000);
  }

  function startMatch(roomCode: string) {
    const room = rooms[roomCode];
    if (!room) return;

    resetMatch(roomCode);
    room.matchState = 'playing';
    io.to(roomCode).emit('matchStarted', { players: room.players });
    
    room.timerInterval = setInterval(() => {
      room.timeRemaining--;
      io.to(roomCode).emit('timeUpdate', room.timeRemaining);
      
      if (room.timeRemaining <= 0) {
        endMatch(roomCode, null); // draw or timeout
      }
    }, 1000);

    if (roomCode.startsWith('BOT_')) {
      room.botInterval = setInterval(() => {
        updateBots(roomCode);
      }, 50);
    }
  }

  function endMatch(roomCode: string, winId: string | null) {
    const room = rooms[roomCode];
    if (!room) return;

    room.matchState = 'ended';
    room.winner = winId;
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = null;
    if (room.botInterval) clearInterval(room.botInterval);
    room.botInterval = null;
    io.to(roomCode).emit('matchEnded', { winner: room.winner, players: room.players });
    
    // restart after 10 seconds if players are still there
    setTimeout(() => {
      const activeRoom = rooms[roomCode];
      if (!activeRoom) return;

      const realPlayers = Object.keys(activeRoom.players).filter(id => !id.startsWith('target_') && !id.startsWith('bot_'));
      if (realPlayers.length >= 2 || (roomCode !== 'QUICK' && realPlayers.length >= 1)) {
        startMatch(roomCode);
      } else {
        resetMatch(roomCode);
      }
    }, 10000);
  }

  io.on("connection", (socket) => {
    // Read name and room from socket handshake query
    const roomCode = (socket.handshake.query.room as string) || "QUICK";
    const nickName = (socket.handshake.query.name as string) || "Player";
    const skinColor = (socket.handshake.query.skinColor as string) || "#ffffff";
    const outfitColor = (socket.handshake.query.outfitColor as string) || "#3182ce";
    const hatColor = (socket.handshake.query.hatColor as string) || "#1a202c";

    console.log(`Player connected to room [${roomCode}] as [${nickName}]: ${socket.id}`);

    const room = getOrCreateRoom(roomCode);

    const realPlayerIds = Object.keys(room.players).filter(id => !id.startsWith('target_') && !id.startsWith('bot_'));
    if (realPlayerIds.length >= 2) {
      socket.emit("gameFull");
      socket.disconnect();
      return;
    }

    socket.join(roomCode);

    const spawn = getRandomSpawn();

    room.players[socket.id] = {
      id: socket.id,
      nickname: nickName,
      skinColor,
      outfitColor,
      hatColor,
      x: spawn.x, y: spawn.y, z: spawn.z,
      rx: 0, ry: 0, rz: 0,
      health: 100, kills: 0, deaths: 0
    };

    socket.emit("init", { id: socket.id, players: room.players, matchState: room.matchState, timeRemaining: room.timeRemaining });
    socket.to(roomCode).emit("playerJoined", { id: socket.id, player: room.players[socket.id] });

    if (room.matchState === 'waiting') {
      const activeRealPlayers = Object.keys(room.players).filter(id => !id.startsWith('target_') && !id.startsWith('bot_'));
      if (activeRealPlayers.length >= 1) {
        startMatch(roomCode);
      }
    }

    socket.on("move", (data) => {
      const activeRoom = rooms[roomCode];
      if (activeRoom && activeRoom.players[socket.id] && activeRoom.players[socket.id].health > 0) {
        // Detect movement speed to determine if shifting or sprinting
        const dx = data.x - activeRoom.players[socket.id].x;
        const dz = data.z - activeRoom.players[socket.id].z;
        const speed = Math.hypot(dx, dz);
        
        activeRoom.players[socket.id].x = data.x;
        activeRoom.players[socket.id].y = data.y;
        activeRoom.players[socket.id].z = data.z;
        activeRoom.players[socket.id].rx = data.rx;
        activeRoom.players[socket.id].ry = data.ry;
        activeRoom.players[socket.id].rz = data.rz;
        socket.to(roomCode).emit("playerMoved", { id: socket.id, player: data });

        if (speed > 0.05) {
            handleSoundEvent(roomCode, {type: 'footstep', x: data.x, y: data.y, z: data.z, volume: speed * 10});
        }
      }
    });

    socket.on("shoot", (data) => {
      handleSoundEvent(roomCode, {type: 'gunshot', x: data.position[0], y: data.position[1], z: data.position[2], volume: 100});
      socket.to(roomCode).emit("playerShoot", { id: socket.id, position: data.position, direction: data.direction, hitPoint: data.hitPoint, bulletId: data.id });
    });

    socket.on("hit", (data) => {
      const activeRoom = rooms[roomCode];
      if (!activeRoom) return;

      const targetId = data.id;
      const target = activeRoom.players[targetId];
      if (target && target.health > 0 && activeRoom.matchState === 'playing') {
        const damage = data.headshot ? 100 : 50; // Headshot instant kill, body 2 shots
        target.health -= damage;
        
        io.to(roomCode).emit("playerHit", { id: targetId, damage, shooterId: socket.id, headshot: data.headshot });
        
        if (target.health <= 0) {
          target.deaths++;
          activeRoom.players[socket.id].kills++;
          
          io.to(roomCode).emit("playerDied", { victimId: targetId, killerId: socket.id, kills: activeRoom.players[socket.id].kills, deaths: target.deaths });
          
          if (activeRoom.players[socket.id].kills >= MAX_KILLS) {
            endMatch(roomCode, socket.id);
          } else {
            scheduleRespawn(roomCode, targetId);
          }
        }
      }
    });

    socket.on("uploadMapBoxes", (boxes) => {
      // Only keep reasonable boxes, empty and clear them if another client sends them
      if (boxes && Array.isArray(boxes)) {
        COLLISION_BOXES.length = 0;
        COLLISION_BOXES.push(...boxes);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected from room [${roomCode}]: ${socket.id}`);
      const activeRoom = rooms[roomCode];
      if (activeRoom) {
        delete activeRoom.players[socket.id];
        io.to(roomCode).emit("playerLeft", socket.id);
        
        const realPlayers = Object.keys(activeRoom.players).filter(id => !id.startsWith('target_') && !id.startsWith('bot_'));
        if (realPlayers.length === 0) {
          if (activeRoom.timerInterval) clearInterval(activeRoom.timerInterval);
          delete rooms[roomCode];
        } else {
          resetMatch(roomCode);
        }
      }
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  app.get("/api/check-name", (req, res) => {
    const name = (req.query.name as string || "").trim().toLowerCase();
    if (!name || name.length < 3) {
       return res.json({ available: false, error: "Name must be at least 3 characters." });
    }
    
    let taken = false;
    Object.values(rooms).forEach(room => {
       Object.values(room.players).forEach(p => {
           if (p.nickname.toLowerCase() === name) taken = true;
       });
    });
    
    res.json({ available: !taken });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
