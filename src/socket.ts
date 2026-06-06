import { db } from './firebase';
import { doc, getDoc, getDocs, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, deleteDoc, updateDoc, increment } from 'firebase/firestore';

const SAFE_SPAWNS = [
  { x: -15, z: -15 }, { x: 15, z: 15 },
  { x: -15, z: 15 }, { x: 15, z: -15 },
  { x: 0, z: 20 }, { x: 0, z: -20 },
  { x: 20, z: 0 }, { x: -20, z: 0 }
];

export const getRandomSpawn = () => SAFE_SPAWNS[Math.floor(Math.random() * SAFE_SPAWNS.length)];

class FakeSocket {
  public id: string = '';
  public connected: boolean = false;
  public io = { opts: { query: {} as any } };
  private listeners: Record<string, Function[]> = {};
  
  private cleanupInterval: number | null = null;
  private currentRoom: string = '';
  private unsubPlayers: Function | null = null;
  private unsubEvents: Function | null = null;
  private timeRemainingInterval: number | null = null;
  
  private lastMoveTime = 0;
  
  constructor() {}

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string) {
    this.listeners[event] = [];
  }

  emit(event: string, data?: any) {
    if (!this.connected) return;
    
    if (event === 'move') {
      const now = Date.now();
      if (now - this.lastMoveTime < 100) return; // throttle to 10hz
      this.lastMoveTime = now;
      
      const playerRef = doc(db, 'rooms', this.currentRoom, 'players', this.id);
      setDoc(playerRef, {
        ...data,
        lastUpdate: now
      }, { merge: true }).catch(console.error);
    } 
    else if (event === 'shoot') {
      const eventsRef = collection(db, 'rooms', this.currentRoom, 'events');
      addDoc(eventsRef, {
        type: 'shoot',
        shooterId: this.id,
        victimId: '',
        headshot: false,
        damage: 0,
        x: data.position[0],
        y: data.position[1],
        z: data.position[2],
        dx: data.direction[0],
        dy: data.direction[1],
        dz: data.direction[2],
        createdAt: Date.now()
      }).catch(console.error);
    }
    else if (event === 'hit') {
      const eventsRef = collection(db, 'rooms', this.currentRoom, 'events');
      addDoc(eventsRef, {
        type: 'hit',
        shooterId: this.id,
        victimId: data.id,
        headshot: data.headshot,
        damage: 100,
        x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0,
        createdAt: Date.now()
      }).catch(console.error);
    }
  }

  async connect() {
    try {
      if (!this.id) {
        this.id = crypto.randomUUID();
      }
      this.connected = true;
      
      let roomId = this.io.opts.query.room;
      let roomRef;
      let matchEndTime = Date.now() + 5 * 60 * 1000;
      
      if (!roomId) {
        // Quick Match
        const openRoomsQuery = query(
          collection(db, 'rooms'),
          where('state', '==', 'playing'),
          where('type', '==', 'QUICK'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(openRoomsQuery);
        let foundOpenRoom = null;
        for (const docSnap of snapshot.docs) {
           const playerCount = docSnap.data().playerCount || 0;
           if (playerCount < 8) {
               foundOpenRoom = docSnap.id;
               matchEndTime = docSnap.data().matchEndTime || matchEndTime;
               break;
           }
        }
        
        if (foundOpenRoom) {
            roomId = foundOpenRoom;
            roomRef = doc(db, 'rooms', roomId);
        } else {
            roomId = `QUICK_${Math.random().toString(36).substring(2,8)}`;
            roomRef = doc(db, 'rooms', roomId);
            await setDoc(roomRef, {
              roomCode: roomId,
              type: 'QUICK',
              state: 'playing',
              playerCount: 0,
              matchEndTime: matchEndTime,
              createdAt: Date.now()
            });
        }
      } else {
        // Custom Room
        roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          await setDoc(roomRef, {
            roomCode: roomId,
            type: 'CUSTOM',
            state: 'playing',
            playerCount: 0,
            matchEndTime: matchEndTime,
            createdAt: Date.now()
          });
        } else {
          matchEndTime = roomSnap.data().matchEndTime || matchEndTime;
        }
      }
      this.currentRoom = roomId;

      // Increment player count
      try {
        await updateDoc(roomRef, { playerCount: increment(1) });
      } catch (e) {
        await setDoc(roomRef, { playerCount: increment(1) }, { merge: true });
      }
      
      // Add self to players
      const playerRef = doc(db, 'rooms', roomId, 'players', this.id);
      const spawn = getRandomSpawn();
      const myPlayerState = {
        x: spawn.x, y: 10, z: spawn.z,
        rx: 0, ry: 0,
        isMoving: false, isSprinting: false, isCrouching: false, isJumping: false,
        health: 100, kills: 0, deaths: 0,
        outfitColor: this.io.opts.query.outfitColor || '#3182ce',
        eyeColor: this.io.opts.query.eyeColor || '#1a202c',
        nickname: this.io.opts.query.name || 'Player',
        lastUpdate: Date.now()
      };
      
      await setDoc(playerRef, myPlayerState);
      
      this.trigger('connect');
      
      // Init payload
      const initialRemaining = Math.max(0, Math.floor((matchEndTime - Date.now()) / 1000));
      this.trigger('init', {
        id: this.id,
        matchState: 'playing',
        timeRemaining: initialRemaining,
        players: {}
      });
      this.trigger('matchStarted', { players: { [this.id]: myPlayerState } });

      if (this.timeRemainingInterval) clearInterval(this.timeRemainingInterval);
      this.timeRemainingInterval = window.setInterval(() => {
        const remaining = Math.max(0, Math.floor((matchEndTime - Date.now()) / 1000));
        import('./store/gameStore').then(({ useGameStore }) => {
          useGameStore.getState().updateGameState({ timeRemaining: remaining });
          if (remaining <= 0) {
             useGameStore.getState().updateGameState({ matchState: 'ended' });
          }
        });
      }, 1000);
      
      // Listen to players
      const playersCol = collection(db, 'rooms', roomId, 'players');
      this.unsubPlayers = onSnapshot(playersCol, (snap) => {
        snap.docChanges().forEach(change => {
          const docId = change.doc.id;
          const data = change.doc.data();
          if (change.type === 'added') {
            if (data.lastUpdate && Date.now() - data.lastUpdate > 10000) {
              if (docId !== this.id) deleteDoc(doc(db, 'rooms', roomId, 'players', docId)).catch(() => {});
            } else {
              if (docId !== this.id) this.trigger('playerJoined', { id: docId, player: data });
            }
          } else if (change.type === 'modified') {
            if (data.lastUpdate && Date.now() - data.lastUpdate > 10000) {
              if (docId !== this.id) deleteDoc(doc(db, 'rooms', roomId, 'players', docId)).catch(() => {});
            } else {
              if (docId !== this.id) this.trigger('playerMoved', { id: docId, player: data });
            }
          } else if (change.type === 'removed') {
            this.trigger('playerLeft', docId);
          }
        });
      });
      
      // Listen to events
      const eventsCol = query(collection(db, 'rooms', roomId, 'events'), where('createdAt', '>', Date.now()));
      this.unsubEvents = onSnapshot(eventsCol, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.type === 'shoot' && data.shooterId !== this.id) {
              this.trigger('playerShoot', {
                id: data.shooterId,
                bulletId: change.doc.id,
                position: [data.x, data.y, data.z],
                direction: [data.dx, data.dy, data.dz]
              });
            } else if (data.type === 'hit') {
              this.trigger('playerHit', {
                id: data.victimId,
                damage: data.damage,
                shooterId: data.shooterId,
                headshot: data.headshot
              });
              
              if (data.victimId === this.id) {
                 // We were hit. Let's update our own health!
                 import('./store/gameStore').then(({ useGameStore }) => {
                   const store = useGameStore.getState();
                   const currentHealth = store.players[this.id]?.health || 100;
                   const newHealth = Math.max(0, currentHealth - data.damage);
                   
                   // Update Firestore
                   const playerRef = doc(db, 'rooms', this.currentRoom, 'players', this.id);
                   setDoc(playerRef, { health: newHealth, lastUpdate: Date.now() }, { merge: true });
                   
                   if (currentHealth > 0 && newHealth <= 0) {
                     // We died! Wait a tick before firing death so hit lands
                     setTimeout(() => {
                       const eventsRef = collection(db, 'rooms', this.currentRoom, 'events');
                       addDoc(eventsRef, {
                          type: 'death',
                          shooterId: data.shooterId,
                          victimId: this.id,
                          headshot: data.headshot,
                          damage: 0,
                          x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0,
                          createdAt: Date.now()
                       });
                     }, 50);
                   }
                 });
              }
            } else if (data.type === 'death') {
              // The killer gets the kill
              import('./store/gameStore').then(({ useGameStore }) => {
                 const store = useGameStore.getState();
                 const killerState = store.players[data.shooterId];
                 const victimState = store.players[data.victimId];
                 
                 const newKills = (killerState?.kills || 0) + 1;
                 const newDeaths = (victimState?.deaths || 0) + 1;
                 
                 // Local UI dispatch
                 this.trigger('playerDied', {
                    victimId: data.victimId,
                    killerId: data.shooterId,
                    kills: newKills,
                    deaths: newDeaths
                 });
                 
                 if (data.shooterId === this.id) {
                     // We killed them, update our own kills in Firestore
                     setDoc(doc(db, 'rooms', this.currentRoom, 'players', this.id), {
                         kills: newKills,
                         lastUpdate: Date.now()
                     }, { merge: true });
                 }
                 if (data.victimId === this.id) {
                     // We died, update our own deaths in Firestore
                     setDoc(doc(db, 'rooms', this.currentRoom, 'players', this.id), {
                         deaths: newDeaths,
                         lastUpdate: Date.now()
                     }, { merge: true });

                     // Schedule respawn after 3s
                     setTimeout(() => {
                         const spawn = getRandomSpawn();
                         const safeX = spawn.x;
                         const safeZ = spawn.z;
                         setDoc(doc(db, 'rooms', this.currentRoom, 'players', this.id), {
                             health: 100,
                             x: safeX, y: 5, z: safeZ,
                             lastUpdate: Date.now()
                         }, { merge: true });
                         
                         this.trigger('playerRespawned', {
                             id: this.id,
                             player: { ...store.players[this.id], health: 100, x: safeX, y: 5, z: safeZ }
                         });
                     }, 3000);
                 }
              });
            }
          }
        });
      });
      
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      this.cleanupInterval = window.setInterval(() => {
        import('./store/gameStore').then(({ useGameStore }) => {
          const store = useGameStore.getState();
          const now = Date.now();
          for (const [id, player] of Object.entries(store.players)) {
            if (id !== this.id && player.lastUpdate && now - player.lastUpdate > 10000) {
              this.trigger('playerLeft', id);
              deleteDoc(doc(db, 'rooms', this.currentRoom, 'players', id)).catch(() => {});
            }
          }
        });
      }, 5000);
      
    } catch(e) {
      console.error(e);
    }
  }

  disconnect() {
    this.connected = false;
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.timeRemainingInterval) clearInterval(this.timeRemainingInterval);
    if (this.unsubPlayers) this.unsubPlayers();
    if (this.unsubEvents) this.unsubEvents();
    if (this.id && this.currentRoom) {
      deleteDoc(doc(db, 'rooms', this.currentRoom, 'players', this.id)).catch(e => {});
      updateDoc(doc(db, 'rooms', this.currentRoom), {
        playerCount: increment(-1)
      }).catch(e => {});
    }
    this.trigger('disconnect');
  }

  private trigger(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export const socket = new FakeSocket();
