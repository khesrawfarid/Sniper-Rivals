import { useEffect, useState } from 'react';
import { socket } from './socket';
import { useGameStore } from './store/gameStore';
import { GameScene } from './components/GameScene';
import { MainMenu } from './components/MainMenu';
import { playSound } from './utils/audio';
import { LogOut } from 'lucide-react';
import { auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const SettingsMenu = ({ onQuit }: { onQuit: () => void }) => {
  const { settings, updateSettings, toggleSettings } = useGameStore();
  
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-700 p-8 rounded-xl w-[500px] text-white">
        <h2 className="text-3xl font-black mb-6 uppercase tracking-wider text-blue-400">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
              <span>Sensitivity</span>
              <span>{settings.sensitivity.toFixed(2)}</span>
            </label>
            <input 
              type="range" min="0.1" max="5.0" step="0.1" 
              value={settings.sensitivity}
              onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
              <span>Base FOV</span>
              <span>{settings.fov}</span>
            </label>
            <input 
              type="range" min="60" max="120" step="1" 
              value={settings.fov}
              onChange={(e) => updateSettings({ fov: parseInt(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-400 uppercase">Invert Y Axis</span>
            <input 
              type="checkbox" 
              checked={settings.invertMouse}
              onChange={(e) => updateSettings({ invertMouse: e.target.checked })}
              className="w-5 h-5 accent-blue-500"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            toggleSettings();
            try {
              const promise = document.body.requestPointerLock();
              if (promise) {
                promise.catch((e: any) => console.warn("Pointer lock error:", e));
              }
            } catch (e) {
              console.warn("Pointer lock error:", e);
            }
          }}
          className="mt-10 w-full py-4 bg-blue-600 hover:bg-blue-500 rounded font-black uppercase tracking-widest transition-colors"
        >
          Resume Game
        </button>

        <button 
          onClick={() => {
            onQuit();
          }}
          className="mt-3 w-full py-4 border border-red-500/30 hover:bg-red-500/15 text-red-400 font-bold rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> BACK TO MENU
        </button>
      </div>
    </div>
  );
};

const UIOverlay = ({ onQuit }: { onQuit: () => void }) => {
  const { matchState, timeRemaining, winner, myId, players, ammo, isReloading, isScoped, health, hitmarkers, killFeed, showSettings, toggleSettings } = useGameStore();

  const myPlayerState = myId ? players[myId] : null;
  const opponentId = Object.keys(players).find(id => id !== myId && !id.startsWith('target_'));
  const opponentState = opponentId ? players[opponentId] : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (matchState === 'playing') {
          // Let pointer lock handle escape, we just sync state via pointerlockchange
        }
      }
    };
    
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === document.body;
      const storeState = useGameStore.getState();
      
      if (!isLocked && storeState.matchState === 'playing' && !storeState.showSettings) {
        useGameStore.getState().updateSettings({}); // touch
        useGameStore.getState().toggleSettings(); // open settings
      } else if (isLocked && storeState.showSettings) {
        useGameStore.getState().toggleSettings(); // close settings
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [matchState]);

  if (matchState === 'waiting') {
    const activeRoomCode = socket.io.opts.query && (socket.io.opts.query as any).room;
    const isCustom = activeRoomCode && activeRoomCode !== 'QUICK';
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 text-white font-sans backdrop-blur-sm select-none">
        <h1 className="text-5xl font-black mb-4 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">SNIPER DUEL</h1>
        <p className="text-xl animate-pulse text-gray-300">Waiting for opponent to connect...</p>
        
        {isCustom ? (
          <div className="mt-4 bg-black/40 border border-white/10 px-6 py-4 rounded-2xl text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Lobby Code</p>
            <p className="text-3xl font-mono font-black tracking-widest text-blue-400">{activeRoomCode}</p>
            <p className="text-xs text-gray-500 mt-2">Give this code to your opponent!</p>
          </div>
        ) : (
          <p className="text-sm mt-4 text-gray-500">Share this link with a friend to play.</p>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm flex flex-col gap-2">
          <p className="text-white font-bold mb-2">Controls:</p>
          <div className="grid grid-cols-2 gap-4 text-left mb-6">
            <p className="bg-gray-800 px-3 py-1 rounded">WASD: Move</p>
            <p className="bg-gray-800 px-3 py-1 rounded">SPACE: Jump</p>
            <p className="bg-gray-800 px-3 py-1 rounded">SHIFT: Sprint / Hold Breath</p>
            <p className="bg-gray-800 px-3 py-1 rounded">C: Crouch</p>
            <p className="bg-gray-800 px-3 py-1 rounded">LMB: Shoot</p>
            <p className="bg-gray-800 px-3 py-1 rounded">RMB: Scope</p>
            <p className="bg-gray-800 px-3 py-1 rounded">ESC: Settings</p>
          </div>
        </div>

        <button
          onClick={() => {
            onQuit();
          }}
          className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-4 rounded-xl transition-all uppercase tracking-wider text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
        >
          <LogOut size={16} /> Leave Lobby
        </button>
      </div>
    );
  }

  if (matchState === 'ended') {
    const isWinner = winner === myId;
    return (
      <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center text-white font-sans backdrop-blur-md select-none ${isWinner ? 'bg-blue-900/80 text-blue-100' : 'bg-red-900/80 text-red-100'}`}>
        <h1 className="text-7xl font-black mb-4 tracking-tighter uppercase">{isWinner ? 'VICTORY' : 'DEFEAT'}</h1>
        <p className="text-2xl mb-8">Score: {myPlayerState?.kills} - {opponentState?.kills}</p>
        <p className="text-lg animate-pulse mb-8">Restarting match shortly...</p>

        <button
          onClick={() => {
            onQuit();
          }}
          className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-4 rounded-xl transition-all uppercase tracking-wider text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
        >
          <LogOut size={16} /> Quit Game
        </button>
      </div>
    );
  }

  // Active playing UI
  return (
    <>
      {showSettings && <SettingsMenu onQuit={onQuit} />}
      
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 select-none font-sans">
        
        {/* Top HUD */}
        <div className="flex justify-between items-start text-white">
          <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
                {myPlayerState?.nickname || 'YOU'}
              </p>
              <p className="text-4xl font-black">{myPlayerState?.kills || 0}</p>
            </div>
            {opponentState && (
              <>
                <div className="text-3xl font-black text-gray-600">-</div>
                <div className="text-center">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
                    {opponentState?.nickname || 'ENEMY'}
                  </p>
                  <p className="text-4xl font-black">{opponentState?.kills || 0}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 text-center">
            <p className="text-2xl font-mono font-bold tracking-widest">{formatTime(timeRemaining)}</p>
          </div>
        </div>

        {/* Kill Feed */}
        <div className="absolute top-24 right-6 flex flex-col gap-2 items-end">
          {killFeed.map(k => (
            <div key={k.id} className="bg-gradient-to-r from-transparent to-red-600/60 pl-8 pr-4 py-1 flex items-center gap-3 animate-pulse border-r-4 border-red-500 rounded-l-full shadow-lg">
              <span className="font-bold text-white">
                {players[k.killer]?.nickname || (k.killer === myId ? 'You' : (k.killer.startsWith('target_') ? 'Target' : 'Enemy'))}
              </span>
              <span className="text-sm text-red-100">sniped {k.headshot && '(Headshot)'}</span>
              <span className="font-bold text-white">
                {players[k.victim]?.nickname || (k.victim === myId ? 'You' : (k.victim.startsWith('target_') ? 'Target' : 'Enemy'))}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end">
          {/* Ammo (Left) */}
          <div className="bg-black/50 backdrop-blur-md p-6 rounded-xl border border-white/10 text-left shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[200px]">
            <div className="text-sm font-bold text-gray-400 tracking-widest mb-2">AMMO</div>
            <div className="flex items-center gap-2">
              {isReloading ? (
                <span className="text-2xl font-black text-yellow-500 animate-pulse uppercase tracking-wider">RELOADING...</span>
              ) : (
                <>
                  <span className={`text-5xl font-black ${ammo === 0 ? 'text-red-500' : 'text-white'}`}>{ammo}</span>
                  <span className="text-2xl text-gray-500 font-black">/ 5</span>
                </>
              )}
            </div>
          </div>

          {/* Health (Right) */}
          <div className="bg-black/50 backdrop-blur-md p-6 rounded-xl border border-white/10 w-80 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-gray-400 tracking-widest">HP // {Math.max(0, health)}</span>
              <span className="text-3xl font-black text-white">{Math.max(0, health)}</span>
            </div>
            <div className="h-4 w-full bg-gray-900 rounded overflow-hidden flex justify-end">
              <div 
                className="h-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, health)}%`, backgroundColor: health <= 30 ? '#ef4444' : 'white' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scope Overlay */}
      {isScoped ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none animate-in fade-in zoom-in-95 duration-150">
          <div className="relative w-[110vmin] h-[110vmin] rounded-full overflow-hidden border-[40px] border-black flex items-center justify-center shadow-[inset_0_0_100px_50px_rgba(0,0,0,0.8)]" style={{ background: 'transparent' }}>
            
            {/* Crosshair lines inside scope */}
            <div className="absolute h-full w-[2px] bg-black/90 opacity-80" />
            <div className="absolute w-full h-[2px] bg-black/90 opacity-80" />
            
            {/* Red dot center */}
            <div className="absolute h-1.5 w-1.5 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
            
            {/* Mil-dots */}
            {[...Array(9)].map((_,i) => i !== 4 && (
              <div key={`h${i}`} className="absolute h-[15px] w-[2px] bg-black/80" style={{ left: `${10 + i*10}%` }}></div>
            ))}
            {[...Array(9)].map((_,i) => i !== 4 && (
              <div key={`v${i}`} className="absolute w-[15px] h-[2px] bg-black/80" style={{ top: `${10 + i*10}%` }}></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center mix-blend-difference select-none">
          {/* Dynamic Hipfire Crosshair */}
          <div className="relative flex items-center justify-center opacity-70 transition-all duration-100 ease-out" 
            style={{ transform: `scale(${isReloading ? 1.5 : (ammo === 0 ? 0.8 : 1)})` }}>
            <div className="absolute h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_4px_white]"></div>
            <div className="absolute h-3 w-[2px] -translate-y-4 bg-white opacity-80"></div>
            <div className="absolute h-3 w-[2px] translate-y-4 bg-white opacity-80"></div>
            <div className="absolute h-[2px] w-3 -translate-x-4 bg-white opacity-80"></div>
            <div className="absolute h-[2px] w-3 translate-x-4 bg-white opacity-80"></div>
          </div>
        </div>
      )}

      {/* Hitmarkers */}
      {hitmarkers.map((h) => {
        // Show hitmarker for 200ms
        const age = Date.now() - h.createdAt;
        if (age > 200) return null;
        const color = h.headshot ? 'bg-red-500' : 'bg-white';
        const shadow = h.headshot ? 'shadow-[0_0_8px_red]' : '';
        
        return (
          <div key={h.id} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center select-none opacity-80 animate-ping" style={{ animationDuration: '0.2s' }}>
            <div className="relative w-8 h-8 flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
              <div className={`absolute h-4 w-[2px] -translate-y-3 ${color} ${shadow}`}></div>
              <div className={`absolute h-4 w-[2px] translate-y-3 ${color} ${shadow}`}></div>
              <div className={`absolute h-[2px] w-4 -translate-x-3 ${color} ${shadow}`}></div>
              <div className={`absolute h-[2px] w-4 translate-x-3 ${color} ${shadow}`}></div>
            </div>
          </div>
        );
      })}

      {/* Blood screen if low health */}
      {health > 0 && health <= 40 && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-red-900 opacity-25 rounded-[100px] shadow-[inset_0_0_150px_60px_rgba(255,0,0,0.6)] animate-pulse"></div>
      )}

      {/* Death Screen */}
      {health <= 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-red-950/40 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-1000">
          <h2 className="text-7xl font-black text-red-500 tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] uppercase">Wasted</h2>
          <p className="text-xl text-white mt-4 animate-pulse">Waiting for respawn...</p>
        </div>
      )}

      {/* Click interceptor to lock pointer */}
      {!showSettings && (
        <div 
          className="absolute inset-0 z-0 cursor-crosshair"
          onClick={() => {
            if (document.pointerLockElement !== document.body) {
              try {
                const promise = document.body.requestPointerLock();
                if (promise) promise.catch((e: any) => console.warn(e));
              } catch (e) {
                console.warn(e);
              }
            }
          }}
        />
      )}
    </>
  );
};

const NameSetup = ({ onComplete }: { onComplete: (name: string) => void }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 3) {
      setError('Name must be at least 3 characters.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      onComplete(cleanName);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate.');
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="bg-gray-900 border border-white/10 p-10 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-black italic tracking-widest text-blue-400 uppercase mb-8 text-center">Sniper Rivals</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1 text-center">Enter Your Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 16))}
              placeholder="Your Name"
              autoFocus
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-xl font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          {error && <div className="text-red-500 text-sm font-bold text-center animate-pulse">{error}</div>}
          <button 
            type="submit"
            disabled={loading || name.trim().length < 3}
            className={`w-full font-black py-4 rounded-xl transition-all uppercase flex items-center justify-center ${loading || name.trim().length < 3 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'}`}
          >
            {loading ? 'Checking...' : 'Enter Arena'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [globalName, setGlobalName] = useState<string | null>(null);
  const [inMenu, setInMenu] = useState(true);
  const [connected, setConnected] = useState(false);
  const [gameFull, setGameFull] = useState(false);
  const [customPlayOptions, setCustomPlayOptions] = useState<{ name?: string, roomCode?: string } | null>(null);

  useEffect(() => {
    if (inMenu || !globalName) return;

    const { settings } = useGameStore.getState();

    if (customPlayOptions) {
      socket.io.opts.query = {
        name: globalName,
        room: customPlayOptions.roomCode || 'QUICK',
        outfitColor: settings.outfitColor,
        eyeColor: settings.eyeColor
      };
    } else {
      socket.io.opts.query = {
        name: globalName,
        room: 'QUICK',
        outfitColor: settings.outfitColor,
        eyeColor: settings.eyeColor
      };
    }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('gameFull', () => {
      setGameFull(true);
    });

    socket.on('gameState', (state: any) => {
      useGameStore.getState().updateGameState(state);
    });

    socket.on('init', (data: any) => {
      useGameStore.getState().setMyId(data.id);
      useGameStore.getState().updateGameState({ matchState: data.matchState, timeRemaining: data.timeRemaining });
      Object.entries(data.players).forEach(([id, pInfo]: [string, any]) => {
        useGameStore.getState().updatePlayer(id, pInfo);
        if (id === data.id) useGameStore.getState().setLocalState({ health: pInfo.health });
      });
    });

    socket.on('playerJoined', (data: { id: string, player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
    });
    
    socket.on('matchStarted', (data: any) => {
      useGameStore.getState().updateGameState({ matchState: 'playing' });
      // Reset local state
      
      const myId = useGameStore.getState().myId;
      if (myId && data.players[myId]) {
         const playerStart = data.players[myId];
         useGameStore.getState().setLocalState({ 
            health: 100, 
            ammo: 5, 
            isReloading: false, 
            isScoped: false,
            teleportTo: [playerStart.x, playerStart.y, playerStart.z]
         });
         useGameStore.getState().updatePlayer(myId, playerStart);
      } else {
         useGameStore.getState().setLocalState({ health: 100, ammo: 5, isReloading: false, isScoped: false });
      }
    });

    socket.on('matchEnded', (data: any) => {
      useGameStore.getState().updateGameState({ matchState: 'ended', winner: data.winner });
      useGameStore.getState().setLocalState({ isScoped: false });
      document.exitPointerLock();
    });

    socket.on('timeUpdate', (time: number) => {
      useGameStore.getState().updateGameState({ timeRemaining: time });
    });

    socket.on('playerMoved', (data: { id: string, player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
    });

    socket.on('playerShoot', (data: { id: string, position: [number, number, number], direction: [number, number, number], hitPoint?: [number, number, number] | null, bulletId?: string }) => {
      useGameStore.getState().addBullet({
        id: data.bulletId || Math.random().toString(36).substring(7),
        position: data.position,
        direction: data.direction,
        hitPoint: data.hitPoint
      });
      playSound('shoot');
    });

    socket.on('playerHit', (data: { id: string, damage: number, shooterId: string, headshot: boolean }) => {
      const myId = useGameStore.getState().myId;
      useGameStore.getState().updatePlayer(data.id, { health: Math.max(0, useGameStore.getState().players[data.id].health - data.damage) });
      
      if (data.id === myId) {
        playSound('hit'); // we got hit
        useGameStore.getState().setLocalState({ health: Math.max(0, useGameStore.getState().health - data.damage) });
      }
    });

    socket.on('playerDied', (data: { victimId: string, killerId: string, kills: number, deaths: number }) => {
      const db = useGameStore.getState();
      db.updatePlayer(data.killerId, { kills: data.kills });
      db.updatePlayer(data.victimId, { deaths: data.deaths, health: 0 });
      db.addKillFeed(data.killerId, data.victimId, false);
      
      if (data.victimId === db.myId) {
        playSound('death');
        db.setLocalState({ isScoped: false });
      }
    });

    socket.on('playerRespawned', (data: { id: string, player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
      if (data.id === useGameStore.getState().myId) {
        useGameStore.getState().setLocalState({ 
            health: 100, 
            ammo: 5,
            teleportTo: [data.player.x, data.player.y, data.player.z]
        });
      }
    });

    socket.on('playerLeft', (id: string) => {
      useGameStore.getState().removePlayer(id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('gameFull');
      socket.off('gameState');
      socket.off('init');
      socket.off('playerJoined');
      socket.off('matchStarted');
      socket.off('matchEnded');
      socket.off('timeUpdate');
      socket.off('playerMoved');
      socket.off('playerShoot');
      socket.off('playerHit');
      socket.off('playerDied');
      socket.off('playerRespawned');
      socket.off('playerLeft');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [inMenu]);

  // Update hitmarkers timeout cleanup loop
  useEffect(() => {
    const interval = setInterval(() => {
      const hitmarkers = useGameStore.getState().hitmarkers;
      const now = Date.now();
      if (hitmarkers.some(h => now - h.createdAt > 200)) {
        useGameStore.getState().setLocalState({
          hitmarkers: hitmarkers.filter(h => now - h.createdAt <= 200)
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [inMenu]);

  if (gameFull) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-sans">
        <h1 className="text-3xl font-bold text-red-500">Game is already full (Max 2 Players).</h1>
      </div>
    );
  }

  const handleQuit = () => {
    socket.disconnect();
    useGameStore.getState().resetStore();
    setInMenu(true);
  };

  if (!globalName) {
    return <NameSetup onComplete={setGlobalName} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <GameScene />
      
      {inMenu && (
        <div className="absolute inset-0 z-50">
          <MainMenu 
            playerName={globalName}
            onPlay={(options) => {
              if (options) {
                setCustomPlayOptions(options);
              } else {
                setCustomPlayOptions({
                  name: 'Player_' + Math.floor(Math.random() * 9000 + 1000),
                  roomCode: 'QUICK'
                });
              }
              setInMenu(false);
            }} 
          />
        </div>
      )}

      {!inMenu && connected && <UIOverlay onQuit={handleQuit} />}

      {!inMenu && !connected && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white font-sans gap-8">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-xl font-bold tracking-widest text-blue-400">CONNECTING TO SERVER...</h1>
          </div>
          <button
            onClick={() => {
              socket.disconnect();
              useGameStore.getState().resetStore();
              setInMenu(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3.5 rounded-xl transition-all uppercase tracking-wider text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <LogOut size={16} /> Cancel Connection
          </button>
        </div>
      )}

      <div className="hidden lg:block absolute bottom-2 left-2 text-[10px] text-gray-600 z-50 mix-blend-difference pointer-events-none">Desktop Recommended</div>
    </div>
  );
}
