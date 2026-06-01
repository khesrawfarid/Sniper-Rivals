import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';

class FakeSocket {
  public id: string = '';
  public connected: boolean = false;
  public io = { opts: { query: {} as any } };
  private listeners: Record<string, Function[]> = {};
  
  private currentRoom: string = '';
  private unsubPlayers: Function | null = null;
  private unsubEvents: Function | null = null;
  
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
        damage: data.headshot ? 100 : 34,
        x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0,
        createdAt: Date.now()
      }).catch(console.error);
    }
  }

  async connect() {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated before connecting');
      }
      this.id = auth.currentUser!.uid;
      this.connected = true;
      
      const roomId = this.io.opts.query.room || 'QUICK';
      this.currentRoom = roomId;
      
      // Ensure room exists
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          roomCode: roomId,
          state: 'playing',
          timeRemaining: 300,
          createdAt: Date.now()
        });
      }
      
      // Add self to players
      const playerRef = doc(db, 'rooms', roomId, 'players', this.id);
      await setDoc(playerRef, {
        x: 0, y: 10, z: 0,
        rx: 0, ry: 0,
        isMoving: false, isSprinting: false, isCrouching: false, isJumping: false,
        health: 100, kills: 0, deaths: 0,
        outfitColor: this.io.opts.query.outfitColor || '#3182ce',
        eyeColor: this.io.opts.query.eyeColor || '#1a202c',
        nickname: this.io.opts.query.name || 'Player',
        lastUpdate: Date.now()
      });
      
      this.trigger('connect');
      
      // Init payload
      this.trigger('init', {
        id: this.id,
        matchState: 'playing',
        timeRemaining: 300,
        players: {}
      });
      this.trigger('matchStarted', { players: { [this.id]: { x: 0, y: 10, z: 0 } } });
      
      // Listen to players
      const playersCol = collection(db, 'rooms', roomId, 'players');
      this.unsubPlayers = onSnapshot(playersCol, (snap) => {
        snap.docChanges().forEach(change => {
          const docId = change.doc.id;
          const data = change.doc.data();
          if (change.type === 'added') {
            if (docId !== this.id) this.trigger('playerJoined', { id: docId, player: data });
          } else if (change.type === 'modified') {
            if (docId !== this.id) this.trigger('playerMoved', { id: docId, player: data });
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
                         const safeX = (Math.random() - 0.5) * 40;
                         const safeZ = (Math.random() - 0.5) * 40;
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
      
    } catch(e) {
      console.error(e);
    }
  }

  disconnect() {
    this.connected = false;
    if (this.unsubPlayers) this.unsubPlayers();
    if (this.unsubEvents) this.unsubEvents();
    if (this.id && this.currentRoom) {
      deleteDoc(doc(db, 'rooms', this.currentRoom, 'players', this.id)).catch(e => {});
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
