import { db } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

const SAFE_SPAWNS = [
  { x: -15, y: 10, z: -15 },
  { x: 15, y: 10, z: 15 },
  { x: -15, y: 10, z: 15 },
  { x: 15, y: 10, z: -15 },
  { x: 0, y: 10, z: 20 },
  { x: 0, y: 10, z: -20 },
  { x: 20, y: 10, z: 0 },
  { x: -20, y: 10, z: 0 },
];

export const getRandomSpawn = () =>
  SAFE_SPAWNS[Math.floor(Math.random() * SAFE_SPAWNS.length)];

class FakeSocket {
  public id: string = "";
  public connected: boolean = false;
  public io = { opts: { query: {} as any } };
  private listeners: Record<string, Function[]> = {};

  private cleanupInterval: number | null = null;
  private currentRoom: string = "";
  private unsubPlayers: Function | null = null;
  private unsubEvents: Function | null = null;
  private unsubRoom: Function | null = null;
  private timeRemainingInterval: number | null = null;
  private isHost: boolean = false;

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

    if (event === "move") {
      const now = Date.now();
      if (now - this.lastMoveTime < 100) return; // throttle to 10hz
      this.lastMoveTime = now;

      const playerRef = doc(db, "matches", this.currentRoom, "players", this.id);
      setDoc(
        playerRef,
        {
          ...data,
          lastUpdate: now,
        },
        { merge: true },
      ).catch(console.error);
    } else if (event === "shoot") {
      const eventsRef = collection(db, "matches", this.currentRoom, "events");
      addDoc(eventsRef, {
        type: "shoot",
        shooterId: this.id,
        victimId: "",
        headshot: false,
        damage: 0,
        x: data.position[0],
        y: data.position[1],
        z: data.position[2],
        dx: data.direction[0],
        dy: data.direction[1],
        dz: data.direction[2],
        createdAt: Date.now(),
      }).catch(console.error);
    } else if (event === "hit") {
      const eventsRef = collection(db, "matches", this.currentRoom, "events");
      addDoc(eventsRef, {
        type: "hit",
        shooterId: this.id,
        victimId: data.id,
        headshot: data.headshot,
        damage: 100,
        x: 0,
        y: 0,
        z: 0,
        dx: 0,
        dy: 0,
        dz: 0,
        createdAt: Date.now(),
      }).catch(console.error);
    } else if (event === "ping") {
      // Simulate real cloud latency (15-40ms) or measure actual firestore latency
      // A quick doc read costs money, so we simulate network time for ping
      setTimeout(() => {
        this.trigger("pong", data);
      }, Math.floor(Math.random() * 5) + 18);
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
          collection(db, "matches"),
          where("state", "==", "playing"),
          where("type", "==", "QUICK"),
          orderBy("createdAt", "desc"),
          limit(10),
        );
        const snapshot = await getDocs(openRoomsQuery);
        let foundOpenRoom = null;
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const playerCount = data.playerCount || 0;
          const createdAt = data.createdAt || 0;
          
          if (playerCount <= 0 && Date.now() - createdAt > 10000) {
            deleteDoc(doc(db, "matches", docSnap.id)).catch(() => {});
            continue;
          }
          
          if (playerCount < 8) {
            foundOpenRoom = docSnap.id;
            matchEndTime = data.matchEndTime || matchEndTime;
            break;
          }
        }

        if (foundOpenRoom) {
          roomId = foundOpenRoom;
          roomRef = doc(db, "matches", roomId);
        } else {
          this.isHost = true;
          roomId = `QUICK_${Math.random().toString(36).substring(2, 8)}`;
          roomRef = doc(db, "matches", roomId);
          await setDoc(roomRef, {
            roomCode: roomId,
            type: "QUICK",
            state: "playing",
            playerCount: 0,
            timeRemaining: 110,
            matchEndTime: matchEndTime,
            createdAt: Date.now(),
          });
        }
      } else {
        // Custom Room
        roomRef = doc(db, "matches", roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          this.isHost = true;
          await setDoc(roomRef, {
            roomCode: roomId,
            type: "CUSTOM",
            state: "playing",
            playerCount: 0,
            timeRemaining: 110,
            matchEndTime: matchEndTime,
            createdAt: Date.now(),
          });
        } else {
          const data = roomSnap.data();
          const playerCount = data?.playerCount || 0;
          const createdAt = data?.createdAt || 0;
          
          if (playerCount <= 0 && Date.now() - createdAt > 10000) {
            this.isHost = true;
            await updateDoc(roomRef, {
              timeRemaining: 110,
              matchEndTime: matchEndTime,
              createdAt: Date.now()
            });
          } else {
            matchEndTime = data?.matchEndTime || matchEndTime;
          }
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
      const playerRef = doc(db, "matches", roomId, "players", this.id);
      const spawn = getRandomSpawn();
      const myPlayerState = {
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        rx: 0,
        ry: 0,
        isMoving: false,
        isSprinting: false,
        isCrouching: false,
        isJumping: false,
        health: 100,
        kills: 0,
        deaths: 0,
        outfitColor: this.io.opts.query.outfitColor || "#3182ce",
        eyeColor: this.io.opts.query.eyeColor || "#1a202c",
        nickname: this.io.opts.query.name || "Player",
        lastUpdate: Date.now(),
      };

      await setDoc(playerRef, myPlayerState);

      this.trigger("connect");

      // Init payload
      const snapForInitial = await getDoc(roomRef);
      let initialRemaining = 110;
      if (snapForInitial.exists() && snapForInitial.data().timeRemaining !== undefined) {
         initialRemaining = snapForInitial.data().timeRemaining;
      }

      this.trigger("init", {
        id: this.id,
        matchState: "playing",
        timeRemaining: initialRemaining > -15 ? initialRemaining : 0,
        players: {},
      });
      this.trigger("matchStarted", { players: { [this.id]: myPlayerState } });

      let localTimeRemaining = initialRemaining;

      this.unsubRoom = onSnapshot(roomRef, (snap) => {
        if (snap.exists() && snap.data().timeRemaining !== undefined) {
          const tr = snap.data().timeRemaining;
          // If we drift too far, snap to authoritative time from host
          if (tr === -15 || (!this.isHost && Math.abs(localTimeRemaining - tr) > 2)) {
             localTimeRemaining = tr;
          }
        }
      });

      if (this.timeRemainingInterval) clearInterval(this.timeRemainingInterval);
      this.timeRemainingInterval = window.setInterval(() => {
        if (this.currentRoom !== "TRAINING_GROUND") {
          localTimeRemaining = localTimeRemaining - 1;
        }

        // Host pushes the current true time every 5 seconds
        if (this.isHost && localTimeRemaining > 0 && localTimeRemaining % 5 === 0 && this.currentRoom) {
          updateDoc(doc(db, "matches", this.currentRoom), {
            timeRemaining: localTimeRemaining,
          }).catch(() => {});
        }

        if (localTimeRemaining <= -15) {
          localTimeRemaining = 110;
          if (this.isHost && this.currentRoom) {
            updateDoc(doc(db, "matches", this.currentRoom), {
              timeRemaining: 110,
            }).catch(() => {});
          }

          const spawn = getRandomSpawn();
          setDoc(
            doc(db, "matches", roomId, "players", this.id),
            {
              kills: 0,
              deaths: 0,
              health: 100,
              x: spawn.x,
              y: spawn.y,
              z: spawn.z,
              localLastUpdate: Date.now(),
            },
            { merge: true },
          ).catch(() => {});

          import("./store/gameStore").then(({ useGameStore }) => {
            useGameStore.getState().updateGameState({ matchState: "playing" });
            useGameStore
              .getState()
              .setLocalState({
                health: 100,
                ammo: 5,
                teleportTo: [spawn.x, spawn.y, spawn.z],
              });
          });
        }

        import("./store/gameStore").then(({ useGameStore }) => {
          useGameStore
            .getState()
            .updateGameState({
              timeRemaining: localTimeRemaining,
              intermissionTime:
                localTimeRemaining <= 0 ? 15 + localTimeRemaining : 0,
            });
          if (localTimeRemaining <= 0 && localTimeRemaining > -15 && this.currentRoom !== "TRAINING_GROUND") {
            useGameStore.getState().updateGameState({ matchState: "ended" });
          }
        });
      }, 1000);

      // Listen to players
      const playersCol = collection(db, "matches", roomId, "players");
      this.unsubPlayers = onSnapshot(playersCol, (snap) => {
        let playerIds: string[] = [];
        snap.docs.forEach((doc) => {
          playerIds.push(doc.id);
        });
        playerIds.sort();
        this.isHost = playerIds.length > 0 && playerIds[0] === this.id;

        snap.docChanges().forEach((change) => {
          const docId = change.doc.id;
          const data = change.doc.data();
          if (change.type === "added") {
            if (docId !== this.id)
              this.trigger("playerJoined", { id: docId, player: data });
          } else if (change.type === "modified") {
            if (docId !== this.id)
              this.trigger("playerMoved", { id: docId, player: data });
          } else if (change.type === "removed") {
            this.trigger("playerLeft", docId);
          }
        });
      });

      // Listen to events
      const eventsCol = query(
        collection(db, "matches", roomId, "events"),
        where("createdAt", ">", Date.now()),
      );
      this.unsubEvents = onSnapshot(eventsCol, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.type === "shoot" && data.shooterId !== this.id) {
              this.trigger("playerShoot", {
                id: data.shooterId,
                bulletId: change.doc.id,
                position: [data.x, data.y, data.z],
                direction: [data.dx, data.dy, data.dz],
              });
            } else if (data.type === "hit") {
              this.trigger("playerHit", {
                id: data.victimId,
                damage: data.damage,
                shooterId: data.shooterId,
                headshot: data.headshot,
              });

              if (data.victimId === this.id) {
                // We were hit. Let's update our own health!
                import("./store/gameStore").then(({ useGameStore }) => {
                  const store = useGameStore.getState();
                  const currentHealth = store.players[this.id]?.health || 100;
                  const newHealth = Math.max(0, currentHealth - data.damage);

                  // Update Firestore
                  const playerRef = doc(
                    db,
                    "matches",
                    this.currentRoom,
                    "players",
                    this.id,
                  );
                  setDoc(
                    playerRef,
                    { health: newHealth, lastUpdate: Date.now() },
                    { merge: true },
                  );

                  if (currentHealth > 0 && newHealth <= 0) {
                    // We died! Wait a tick before firing death so hit lands
                    setTimeout(() => {
                      const eventsRef = collection(
                        db,
                        "matches",
                        this.currentRoom,
                        "events",
                      );
                      addDoc(eventsRef, {
                        type: "death",
                        shooterId: data.shooterId,
                        victimId: this.id,
                        headshot: data.headshot,
                        damage: 0,
                        x: 0,
                        y: 0,
                        z: 0,
                        dx: 0,
                        dy: 0,
                        dz: 0,
                        createdAt: Date.now(),
                      });
                    }, 50);
                  }
                });
              }
            } else if (data.type === "death") {
              // The killer gets the kill
              import("./store/gameStore").then(({ useGameStore }) => {
                const store = useGameStore.getState();
                const killerState = store.players[data.shooterId];
                const victimState = store.players[data.victimId];

                const newKills = (killerState?.kills || 0) + 1;
                const newDeaths = (victimState?.deaths || 0) + 1;

                // Local UI dispatch
                this.trigger("playerDied", {
                  victimId: data.victimId,
                  killerId: data.shooterId,
                  kills: newKills,
                  deaths: newDeaths,
                });

                if (data.shooterId === this.id) {
                  // We killed them, update our own kills in Firestore
                  setDoc(
                    doc(db, "matches", this.currentRoom, "players", this.id),
                    {
                      kills: newKills,
                      lastUpdate: Date.now(),
                    },
                    { merge: true },
                  );
                }
                if (data.victimId === this.id) {
                  // We died, update our own deaths in Firestore
                  setDoc(
                    doc(db, "matches", this.currentRoom, "players", this.id),
                    {
                      deaths: newDeaths,
                      lastUpdate: Date.now(),
                    },
                    { merge: true },
                  );

                  // Schedule respawn after 3s
                  setTimeout(() => {
                    const spawn = getRandomSpawn();
                    const safeX = spawn.x;
                    const safeZ = spawn.z;

                    const baseState = {
                      outfitColor: this.io.opts.query.outfitColor || "#3182ce",
                      eyeColor: this.io.opts.query.eyeColor || "#1a202c",
                      nickname: this.io.opts.query.name || "Player",
                    };

                    setDoc(
                      doc(db, "matches", this.currentRoom, "players", this.id),
                      {
                        ...baseState,
                        health: 100,
                        x: safeX,
                        y: 5,
                        z: safeZ,
                        lastUpdate: Date.now(),
                      },
                      { merge: true },
                    );

                    this.trigger("playerRespawned", {
                      id: this.id,
                      player: {
                        ...store.players[this.id],
                        ...baseState,
                        health: 100,
                        x: safeX,
                        y: 5,
                        z: safeZ,
                      },
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
        import("./store/gameStore").then(({ useGameStore }) => {
          const store = useGameStore.getState();
          const now = Date.now();
          for (const [id, player] of Object.entries(store.players)) {
            if (
              id !== this.id &&
              player.localLastUpdate &&
              now - player.localLastUpdate > 3000
            ) {
              if (!id.startsWith("target_") && !id.startsWith("bot_")) {
                this.trigger("playerLeft", id);
                deleteDoc(
                  doc(db, "matches", this.currentRoom, "players", id),
                ).catch(() => {});
              }
            }
          }
        });
      }, 5000);
    } catch (e) {
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
      deleteDoc(doc(db, "matches", this.currentRoom, "players", this.id)).catch(
        (e) => {},
      );
      updateDoc(doc(db, "matches", this.currentRoom), {
        playerCount: increment(-1),
      }).catch((e) => {});
    }
    this.trigger("disconnect");
  }

  skipIntermission() {
    if (this.currentRoom && this.isHost) {
      updateDoc(doc(db, "matches", this.currentRoom), {
        timeRemaining: -15, // Instantly trigger the round restart which happens at <= -15
      }).catch(() => {});
    } else if (this.currentRoom) {
      // For a quick fix so it "works" for anyone playing alone or host:
      updateDoc(doc(db, "matches", this.currentRoom), {
        timeRemaining: -15,
      }).catch(() => {});
    }
    // Update local state instantly so the interval catches it on next tick
    import("./store/gameStore").then(({ useGameStore }) => {
      useGameStore.getState().updateGameState({ 
        timeRemaining: -15, 
        intermissionTime: 0 
      });
    });
  }

  private trigger(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}

export const socket = new FakeSocket();
