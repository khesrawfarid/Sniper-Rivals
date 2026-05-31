import { Server } from "socket.io";
import { PlayerData, Room } from "./serverTypes";

interface Box {
  minX: number; maxX: number; minZ: number; maxZ: number;
}

interface AIConfig {
    rooms: Record<string, Room>;
    COLLISION_BOXES: Box[];
    checkCollision: (x: number, z: number, radius?: number) => boolean;
    io: Server;
    scheduleRespawn: (roomCode: string, targetId: string) => void;
    endMatch: (roomCode: string, winId: string | null) => void;
    getRandomSpawn: () => { x: number, y: number, z: number };
}

let deps: AIConfig;

// Core Bot State Memory
interface BotMemory {
    state: 'PATROL' | 'INVESTIGATE' | 'ENGAGE' | 'HIDE' | 'REPOSITION' | 'HOLD_BREATH' | 'FAKE_PEEK';
    targetPos: { x: number, z: number } | null;
    lastKnownEnemyPos: { x: number, z: number, time: number } | null;
    suspectedEnemyObj: string | null;
    reactionTimer: number;
    campTimer: number;
    peekTimer: number;
    emotion: {
        aggression: number; // 0 to 1, goes up when hit or missing shots
        fear: number;       // 0 to 1, goes up when low HP or dominated
    };
    misses: number;
    accuracyCooldown: number;
    stuckTimer: number;
    lastPos: {x: number, z: number};
}

const botsMemory: Record<string, Record<string, BotMemory>> = {};

export function initBotAI(config: AIConfig) {
    deps = config;
}

export function handleSoundEvent(roomCode: string, event: {type: 'footstep' | 'gunshot', x: number, y: number, z: number, volume: number}) {
    if (!deps) return;
    const room = deps.rooms[roomCode];
    if (!room || room.matchState !== 'playing') return;

    if (!botsMemory[roomCode]) botsMemory[roomCode] = {};

    Object.keys(room.players).forEach(botId => {
        if (!botId.startsWith('bot_')) return;
        const bot = room.players[botId];
        if (bot.health <= 0) return;

        const memory = getBotMemory(roomCode, botId);
        const dist = Math.hypot(event.x - bot.x, event.z - bot.z);
        
        let hearingThreshold = event.type === 'gunshot' ? 80 : 15;
        
        if (dist <= hearingThreshold) {
            // Heard sound
            if (memory.state !== 'ENGAGE') {
                memory.state = 'INVESTIGATE';
                memory.targetPos = getOffsetPos(event.x, event.z, 2); // Go near the sound
                memory.campTimer = 0;
            }
        }
    });
}

function getBotMemory(roomCode: string, botId: string): BotMemory {
    if (!botsMemory[roomCode]) botsMemory[roomCode] = {};
    if (!botsMemory[roomCode][botId]) {
        botsMemory[roomCode][botId] = {
            state: 'PATROL',
            targetPos: null,
            lastKnownEnemyPos: null,
            suspectedEnemyObj: null,
            reactionTimer: 0,
            campTimer: 0,
            peekTimer: 0,
            emotion: { aggression: 0.5, fear: 0.0 },
            misses: 0,
            accuracyCooldown: 0,
            stuckTimer: 0,
            lastPos: { x: 0, z: 0 }
        };
    }
    return botsMemory[roomCode][botId];
}

// 2D Line intersection with AABB (for Line of Sight)
function checkLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    const boxes = deps.COLLISION_BOXES;
    for (const box of boxes) {
        if (liangBarsky(box.minX, box.maxX, box.minZ, box.maxZ, x1, z1, x2, z2)) {
            return false; // Intersected with cover
        }
    }
    return true; // Clear line of sight
}

function liangBarsky(xmin: number, xmax: number, ymin: number, ymax: number, x0: number, y0: number, x1: number, y1: number) {
    let t0 = 0.0;
    let t1 = 1.0;
    const dx = x1 - x0;
    const dy = y1 - y0;
    let p = 0, q = 0, r = 0;

    for (let edge = 0; edge < 4; edge++) {
        if (edge === 0) { p = -dx; q = -(xmin - x0); }
        if (edge === 1) { p = dx; q =  (xmax - x0); }
        if (edge === 2) { p = -dy; q = -(ymin - y0); }
        if (edge === 3) { p = dy; q =  (ymax - y0); }

        if (p === 0 && q < 0) return false;

        if (p !== 0) {
             r = q / p;
             if (p < 0) {
                 if (r > t1) return false;
                 else if (r > t0) t0 = r;
             } else if (p > 0) {
                 if (r < t0) return false;
                 else if (r < t1) t1 = r;
             }
        }
    }
    return t0 <= t1;
}

function getOffsetPos(x: number, z: number, spread: number = 20) {
    let nx = x + (Math.random() - 0.5) * spread;
    let nz = z + (Math.random() - 0.5) * spread;
    // Keep within bounds
    nx = Math.max(-25, Math.min(25, nx));
    nz = Math.max(-25, Math.min(25, nz));
    return { x: nx, z: nz };
}

// Tactical Waypoints
const WAYPOINTS = [
    {x: 0, z: 15}, {x: 0, z: -15}, {x: -15, z: 0}, {x: 15, z: 0},
    {x: -25, z: 25}, {x: 25, z: -25}, {x: -25, z: -25}, {x: 25, z: 25},
    {x: -20, z: -10}, {x: 20, z: -10}, {x: -10, z: 20}, {x: -10, z: -20}
];

export function updateBots(roomCode: string) {
    if (!deps) return;
    const room = deps.rooms[roomCode];
    if (!room || room.matchState !== 'playing') return;

    const isMedium = roomCode.includes('_MEDIUM');
    const isHard = roomCode.includes('_HARD');
    let difficulty = isHard ? 'HARD' : (isMedium ? 'MEDIUM' : 'EASY');

    const dt = 0.05; // 50ms tick

    const realPlayers = Object.keys(room.players).filter(id => !id.startsWith('bot_') && !id.startsWith('target_'));

    Object.keys(room.players).forEach(botId => {
        if (!botId.startsWith('bot_')) return;
        const bot = room.players[botId];
        if (bot.health <= 0) return;

        const mem = getBotMemory(roomCode, botId);
        
        const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

        // Settings based on difficulty
        const speed = difficulty === 'EASY' ? 0.25 : difficulty === 'MEDIUM' ? 0.35 : 0.45;
        const reactionTime = difficulty === 'EASY' ? randomInRange(0.8, 1.5) : difficulty === 'MEDIUM' ? randomInRange(0.4, 0.8) : randomInRange(0.2, 0.5); // Faster reactions
        const accuracyBase = difficulty === 'EASY' ? 0.40 : difficulty === 'MEDIUM' ? 0.60 : 0.80;
        const fireCooldown = difficulty === 'EASY' ? randomInRange(1.5, 3.0) : difficulty === 'MEDIUM' ? randomInRange(1.0, 2.0) : randomInRange(0.5, 1.0);

        // Base emotions
        if (bot.health < 40) mem.emotion.fear += dt * 0.1;
        mem.emotion.fear = Math.min(1, Math.max(0, mem.emotion.fear - dt * 0.02));
        mem.emotion.aggression = Math.min(1, Math.max(0, mem.emotion.aggression - dt * 0.02));

        // 1. VISION SYSTEM
        let visibleEnemy: string | null = null;
        let enemyPos = null;
        
        realPlayers.forEach(pId => {
            const p = room.players[pId];
            if (p.health > 0) {
                const dist = Math.hypot(p.x - bot.x, p.z - bot.z);
                // LOS check
                if (dist < 100 && checkLineOfSight(bot.x, bot.z, p.x, p.z)) {
                   // FoV check (simple 180 degrees)
                   const dx = p.x - bot.x;
                   const dz = p.z - bot.z;
                   const angleToPlayer = Math.atan2(-dx, -dz);
                   
                   let angleDiff = Math.abs(angleToPlayer - bot.ry);
                   angleDiff = (angleDiff + Math.PI) % (Math.PI * 2) - Math.PI;
                   
                   if (Math.abs(angleDiff) < Math.PI / 2 || dist < 10) { 
                       // Seen!
                       visibleEnemy = pId;
                       enemyPos = {x: p.x, z: p.z};
                       mem.lastKnownEnemyPos = { ...enemyPos, time: Date.now() };
                   }
                }
            }
        });

        // 2. BEHAVIOR TREE / STATE MACHINE
        if (visibleEnemy) {
            if (mem.state !== 'ENGAGE' && mem.state !== 'HOLD_BREATH' && mem.state !== 'FAKE_PEEK') {
                if (difficulty === 'HARD' && Math.random() < 0.3) {
                     mem.state = 'FAKE_PEEK';
                     mem.peekTimer = 0.5 + Math.random() * 1.5;
                } else if (difficulty !== 'EASY' && Math.random() < 0.4) {
                     mem.state = 'HOLD_BREATH';
                     if (mem.reactionTimer <= 0) mem.reactionTimer = reactionTime + 1.0; // Extra time for perfect shot
                } else {
                     if (mem.reactionTimer <= 0) mem.reactionTimer = reactionTime; // Reaction wind-up
                     mem.state = 'ENGAGE';
                }
            }
            if (mem.emotion.fear > 0.7 && mem.state !== 'FAKE_PEEK') {
                mem.state = 'HIDE';
            }
            mem.suspectedEnemyObj = visibleEnemy;
        } else {
            if (mem.state === 'ENGAGE' || mem.state === 'HOLD_BREATH' || mem.state === 'FAKE_PEEK') {
                mem.state = 'INVESTIGATE';
                if (mem.lastKnownEnemyPos) mem.targetPos = { x: mem.lastKnownEnemyPos.x, z: mem.lastKnownEnemyPos.z };
                mem.campTimer = 0;
            }
        }

        // Timer decrements
        if (mem.reactionTimer > 0) mem.reactionTimer -= dt;
        if (mem.accuracyCooldown > 0) mem.accuracyCooldown -= dt;
        if (mem.campTimer > 0) mem.campTimer -= dt;
        if (mem.peekTimer > 0) mem.peekTimer -= dt;

        // Stuck detection
        const moved = Math.hypot(bot.x - mem.lastPos.x, bot.z - mem.lastPos.z);
        if (moved < 0.05 && mem.targetPos != null) {
            mem.stuckTimer += dt;
            if (mem.stuckTimer > 1.5) {
                // Find new local random target to get unstuck
                mem.targetPos = getOffsetPos(bot.x, bot.z, 20);
                mem.stuckTimer = 0;
            }
        } else {
            mem.stuckTimer = 0;
        }
        mem.lastPos = { x: bot.x, z: bot.z };

        // ACTION EXECUTION
        let desiredX = bot.x;
        let desiredZ = bot.z;

        if (mem.state === 'PATROL') {
            if (!mem.targetPos || Math.hypot(mem.targetPos.x - bot.x, mem.targetPos.z - bot.z) < 2) {
                if (mem.campTimer <= 0) {
                    let campChance = difficulty === 'HARD' ? 0.1 : (difficulty === 'MEDIUM' ? 0.2 : 0.4);
                    if (Math.random() < campChance) {
                        mem.campTimer = 3 + Math.random() * 5;
                    } else {
                        let useWaypointChance = difficulty === 'HARD' ? 0.8 : (difficulty === 'MEDIUM' ? 0.6 : 0.2);
                        if (Math.random() < useWaypointChance) {
                            mem.targetPos = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
                        } else {
                            mem.targetPos = getOffsetPos(bot.x, bot.z, 40);
                        }
                    }
                }
            }
            
            if (mem.targetPos && mem.campTimer <= 0) {
                desiredX = mem.targetPos.x;
                desiredZ = mem.targetPos.z;
                
                // look where walking
                bot.ry = Math.atan2(-(desiredX - bot.x), -(desiredZ - bot.z));
            }
        }
        else if (mem.state === 'INVESTIGATE') {
            if (mem.targetPos) {
                 desiredX = mem.targetPos.x;
                 desiredZ = mem.targetPos.z;
                 bot.ry = Math.atan2(-(desiredX - bot.x), -(desiredZ - bot.z));
                 
                 if (Math.hypot(mem.targetPos.x - bot.x, mem.targetPos.z - bot.z) < 2) {
                     mem.state = 'PATROL'; // Done investigating
                 }
            } else {
                mem.state = 'PATROL';
            }
        }
        else if (mem.state === 'HIDE') {
            // Move away from last known enemy
            if (mem.lastKnownEnemyPos) {
                const dx = bot.x - mem.lastKnownEnemyPos.x;
                const dz = bot.z - mem.lastKnownEnemyPos.z;
                const len = Math.hypot(dx, dz);
                if (len > 0) {
                    desiredX = bot.x + (dx/len) * 5;
                    desiredZ = bot.z + (dz/len) * 5;
                }
                bot.ry = Math.atan2(-dx, -dz);
            }
            if (mem.stuckTimer > 1.0) mem.emotion.fear *= 0.5; // Calm down if stuck hiding
        }
        else if (mem.state === 'FAKE_PEEK') {
            // Jiggle peek corner roughly
            if (enemyPos) {
                const dx = enemyPos.x - bot.x;
                const dz = enemyPos.z - bot.z;
                bot.ry = Math.atan2(-dx, -dz);
                
                const timeSeed = Date.now() / 200;
                const strafe = Math.sin(timeSeed) * 1.5;
                desiredX = bot.x + Math.cos(bot.ry) * strafe;
                desiredZ = bot.z - Math.sin(bot.ry) * strafe;
            }
            if (mem.peekTimer <= 0) {
                mem.state = 'ENGAGE';
                mem.reactionTimer = 0; // ready to shoot
                mem.accuracyCooldown = 0;
            }
        }
        else if (mem.state === 'ENGAGE' || mem.state === 'HOLD_BREATH') {
            if (enemyPos) {
                let aimPos = enemyPos;
                if (difficulty === 'HARD' && visibleEnemy) {
                    const hitT = room.players[visibleEnemy];
                    if (hitT && mem.lastKnownEnemyPos) {
                        const targetVelX = (hitT.x - mem.lastKnownEnemyPos.x) / dt;
                        const targetVelZ = (hitT.z - mem.lastKnownEnemyPos.z) / dt;
                        aimPos = { x: hitT.x + targetVelX * 0.1, z: hitT.z + targetVelZ * 0.1 };
                    }
                }

                const dx = aimPos.x - bot.x;
                const dz = aimPos.z - bot.z;
                const dist = Math.hypot(dx, dz);
                
                // Aim precisely
                bot.ry = Math.atan2(-dx, -dz);
                
                // Tactical positioning: distance maintenance
                if (dist < 15 && difficulty !== 'EASY') {
                    // Backpedal
                    desiredX = bot.x - (dx/dist);
                    desiredZ = bot.z - (dz/dist);
                } else if (dist > 40 && difficulty !== 'EASY') {
                    // Close the gap slightly
                    desiredX = bot.x + (dx/dist);
                    desiredZ = bot.z + (dz/dist);
                } else {
                    // Strafe slightly, but stop if holding breath
                    if (mem.state !== 'HOLD_BREATH') {
                        if (difficulty !== 'EASY' || Math.random() < 0.1) {
                            const timeSeed = Date.now() / 1000;
                            const strafeSpeed = difficulty === 'HARD' ? 3.0 : 2.0;
                            const strafe = Math.sin(timeSeed * strafeSpeed + parseInt(botId.slice(4)) ) * strafeSpeed;
                            desiredX = bot.x + Math.cos(bot.ry) * strafe;
                            desiredZ = bot.z - Math.sin(bot.ry) * strafe;
                        }
                    }
                }

                // Combat Logic: Shooting
                if (mem.reactionTimer <= 0 && mem.accuracyCooldown <= 0 && mem.state !== 'FAKE_PEEK') {
                    
                    // Fire rate based on difficulty
                    mem.accuracyCooldown = fireCooldown;
                    
                    // Emotion modifies accuracy. Holding breath drastically improves it.
                    let breathBonus = mem.state === 'HOLD_BREATH' ? 0.2 : 0;
                    let finalAcc = accuracyBase - (mem.emotion.fear * 0.3) + (mem.emotion.aggression * 0.1) + breathBonus;
                    finalAcc = Math.min(1, Math.max(0.1, finalAcc));
                    
                    // Artificial aiming error
                    const missFactor = (1 - finalAcc) * 4.0;
                    
                    let hitT_ref = visibleEnemy ? room.players[visibleEnemy] : null;
                    const spreadTargetX = aimPos.x + (Math.random()-0.5)*missFactor;
                    const spreadTargetZ = aimPos.z + (Math.random()-0.5)*missFactor;
                    const spreadTargetY = hitT_ref ? hitT_ref.y + 0.5 : bot.y + 0.5;
                    
                    const hitPoint = [
                        spreadTargetX, 
                        spreadTargetY + (Math.random()-0.5)*missFactor*0.5, 
                        spreadTargetZ
                    ];

                    // Calculate hand position for bullet origin 
                    const handOffsetX = 0.52 * Math.cos(bot.ry) - 1.15 * Math.sin(bot.ry);
                    const handOffsetZ = -0.52 * Math.sin(bot.ry) - 1.15 * Math.cos(bot.ry);

                    deps.io.to(roomCode).emit("playerShoot", { 
                        id: botId, 
                        position: [bot.x + handOffsetX, bot.y + 0.65, bot.z + handOffsetZ], 
                        direction: [-Math.sin(bot.ry), 0, -Math.cos(bot.ry)], 
                        hitPoint, 
                        bulletId: Math.random().toString(36).substring(7) 
                    });
                    
                    // Did we hit?
                    const hitT = deps.rooms[roomCode].players[mem.suspectedEnemyObj!];
                    if (hitT && Math.random() < finalAcc && checkLineOfSight(bot.x, bot.z, Math.random() < 0.5 ? hitT.x : enemyPos.x, Math.random() < 0.5 ? hitT.z : enemyPos.z)) {
                        const dmg = difficulty === 'HARD' ? 25 : 20;
                        const headshot = difficulty === 'HARD' && Math.random() < 0.05; // 5% headshot for Hard
                        
                        hitT.health -= headshot ? 100 : dmg;
                        deps.io.to(roomCode).emit("playerHit", { id: hitT.id, damage: headshot ? 100: dmg, shooterId: botId, headshot });
                        
                        if (hitT.health <= 0) {
                            hitT.deaths++;
                            bot.kills++;
                            mem.emotion.aggression = 0; // Reset
                            mem.emotion.fear = 0;
                            mem.state = 'PATROL';
                            mem.targetPos = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
                            
                            deps.io.to(roomCode).emit("playerDied", { victimId: hitT.id, killerId: botId, kills: bot.kills, deaths: hitT.deaths });
                            if (bot.kills >= 10) {
                                deps.endMatch(roomCode, botId);
                            } else {
                                deps.scheduleRespawn(roomCode, hitT.id);
                            }
                        } else {
                            if (mem.state === 'HOLD_BREATH') mem.state = 'ENGAGE';
                        }
                    } else {
                        // Missed
                        mem.emotion.aggression += 0.2; // Gets more aggressive after missing
                        
                        // Reposition tactically
                        mem.state = 'REPOSITION';
                        const offset = getOffsetPos(bot.x, bot.z, 20); // random nearby cover-ish
                        mem.targetPos = offset;
                    }
                }
            }
        }
        else if (mem.state === 'REPOSITION') {
            if (mem.targetPos) {
                 desiredX = mem.targetPos.x;
                 desiredZ = mem.targetPos.z;
                 
                 bot.ry = Math.atan2(-(desiredX - bot.x), -(desiredZ - bot.z));
                 
                 // Sprinting effectively
                 
                 if (Math.hypot(mem.targetPos.x - bot.x, mem.targetPos.z - bot.z) < 2) {
                     mem.state = 'INVESTIGATE'; 
                 }
                 
                 // If we see them while repositioning, engage 
                 if (visibleEnemy) {
                    mem.state = 'ENGAGE';
                 }
            } else {
                mem.state = 'PATROL';
            }
        }


        // MOVEMENT APPLICATION
        if (desiredX !== bot.x || desiredZ !== bot.z) {
            const dx = desiredX - bot.x;
            const dz = desiredZ - bot.z;
            const dist = Math.hypot(dx, dz);
            
            let moveSpeed = speed;
            if (mem.state === 'ENGAGE') moveSpeed *= 0.5; // Walk while aiming
            if (mem.state === 'REPOSITION' || mem.state === 'HIDE') moveSpeed *= 1.5; // Sprint while moving tactically

            if (dist > 1.0) {
                const newX = bot.x + (dx / dist) * moveSpeed;
                const newZ = bot.z + (dz / dist) * moveSpeed;
                
                // Collision resolution (slides)
                if (!deps.checkCollision(newX, newZ)) {
                    bot.x = newX;
                    bot.z = newZ;
                } else if (!deps.checkCollision(bot.x, newZ)) {
                    bot.z = newZ; 
                } else if (!deps.checkCollision(newX, bot.z)) {
                    bot.x = newX; 
                }
            }
            
            deps.io.to(roomCode).emit('playerMoved', { id: botId, player: bot });
        }

    });
}
