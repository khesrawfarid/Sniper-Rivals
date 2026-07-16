import React, { useEffect, useState, Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { socket } from "./socket";
import { getRandomSpawn } from "./socket";
import { useGameStore } from "./store/gameStore";
import { GameScene } from "./components/GameScene";
import { MainMenu } from "./components/MainMenu";
import { UploadedCharacter } from "./components/Opponent";
import { playSound } from "./utils/audio";
import { WEAPONS } from "./config/weapons";
import { LogOut, Play, Crown, Settings } from "lucide-react";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export const getSafeSpawnPosition = (yPos: number) => {
  const base = getRandomSpawn();
  const jitterX = (Math.random() - 0.5) * 5;
  const jitterZ = (Math.random() - 0.5) * 5;
  return { x: base.x + jitterX, y: yPos, z: base.z + jitterZ };
};

const initializeUISounds = () => {
  let hoverTimeout = false;
  document.addEventListener("mouseover", (e) => {
    if (
      !hoverTimeout &&
      (e.target as HTMLElement).closest("button, .interactive")
    ) {
      playSound("hover");
      hoverTimeout = true;
      setTimeout(() => (hoverTimeout = false), 50); // debounce hover
    }
  });
  document.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest("button, .interactive")) {
      playSound("click");
    }
  });
};
initializeUISounds();

const SettingsMenu = ({ onQuit }: { onQuit: () => void }) => {
  const { settings, updateSettings, toggleSettings } = useGameStore();
  const [activeTab, setActiveTab] = React.useState("AUDIO");

  return (
    <div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-700 p-8 rounded-xl w-[600px] text-white">
        <h2 className="text-3xl font-black mb-6 uppercase tracking-wider text-blue-400">
          Settings
        </h2>

        <div className="flex gap-6 border-b border-gray-700 mb-6">
          {["AUDIO", "VIDEO", "MOUSE & KEYBOARD"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-bold tracking-widest uppercase transition-colors relative ${
                activeTab === tab
                  ? "text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></div>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar min-h-[450px]">
          {activeTab === "AUDIO" && (
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
                  <span>Master Volume</span>
                  <span>
                    {Math.round((settings.masterVolume ?? 1.0) * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume ?? 1.0}
                  onChange={(e) =>
                    updateSettings({ masterVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
                  <span>UI Volume</span>
                  <span>{Math.round((settings.uiVolume ?? 1.0) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.uiVolume ?? 1.0}
                  onChange={(e) =>
                    updateSettings({ uiVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === "VIDEO" && (
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
                  <span>Base FOV</span>
                  <span>{settings.fov}</span>
                </label>
                <input
                  type="range"
                  min="60"
                  max="120"
                  step="1"
                  value={settings.fov}
                  onChange={(e) =>
                    updateSettings({ fov: parseInt(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-400 uppercase">
                  Show FPS
                </span>
                <input
                  type="checkbox"
                  checked={settings.showFps}
                  onChange={(e) =>
                    updateSettings({ showFps: e.target.checked })
                  }
                  className="w-5 h-5 accent-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === "MOUSE & KEYBOARD" && (
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-bold text-gray-400 mb-2 uppercase">
                  <span>Sensitivity</span>
                  <span>{settings.sensitivity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={settings.sensitivity}
                  onChange={(e) =>
                    updateSettings({ sensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-400 uppercase">
                  Invert Y Axis
                </span>
                <input
                  type="checkbox"
                  checked={settings.invertMouse}
                  onChange={(e) =>
                    updateSettings({ invertMouse: e.target.checked })
                  }
                  className="w-5 h-5 accent-blue-500"
                />
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-bold text-gray-500 mb-4 tracking-widest uppercase">Keybinds</h4>
                {Object.entries(settings.keybinds).map(([action, key]) => (
                  <div key={action} className="flex flex-col rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all overflow-hidden group">
                    <div className="flex justify-between items-center p-3">
                      <span className="text-sm font-medium text-gray-300 uppercase">{action}</span>
                      <input 
                        readOnly
                        value={key === ' ' ? 'SPACE' : key.toUpperCase()}
                        onKeyDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.key === 'Escape') return;
                          const val = e.code === 'Space' ? ' ' : e.key.toLowerCase();
                          updateSettings({ keybinds: { ...settings.keybinds, [action]: val }});
                          e.currentTarget.blur();
                        }}
                        className="px-4 py-1.5 min-w-[80px] text-center rounded-md bg-black/60 border border-blue-500/30 text-blue-400 font-bold font-mono group-hover:border-blue-500 transition-colors focus:outline-none focus:border-blue-400 focus:bg-blue-900/30 cursor-pointer"
                      />
                    </div>
                    {action === 'crouch' && (
                      <div className="flex justify-end items-center gap-2 px-3 pb-3">
                        <button 
                          onClick={() => updateSettings({ crouchMode: 'hold' })}
                          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest transition-colors ${settings.crouchMode === 'hold' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-black/40 text-gray-500 hover:text-gray-300'}`}
                        >
                          Hold
                        </button>
                        <button 
                          onClick={() => updateSettings({ crouchMode: 'toggle' })}
                          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest transition-colors ${settings.crouchMode === 'toggle' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-black/40 text-gray-500 hover:text-gray-300'}`}
                        >
                          Toggle
                        </button>
                      </div>
                    )}
                    {action === 'sprint' && (
                      <div className="flex justify-end items-center gap-2 px-3 pb-3">
                        <button 
                          onClick={() => updateSettings({ sprintMode: 'hold' })}
                          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest transition-colors ${settings.sprintMode === 'hold' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-black/40 text-gray-500 hover:text-gray-300'}`}
                        >
                          Hold
                        </button>
                        <button 
                          onClick={() => updateSettings({ sprintMode: 'toggle' })}
                          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest transition-colors ${settings.sprintMode === 'toggle' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-black/40 text-gray-500 hover:text-gray-300'}`}
                        >
                          Toggle
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            toggleSettings();
            try {
              const promise = document.body.requestPointerLock();
              if (promise) {
                promise.catch((e: any) =>
                  console.warn("Pointer lock error:", e),
                );
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

const FpsCounter = () => {
  const { settings } = useGameStore();

  if (!settings.showFps) return null;

  return (
    <>
      <div className="w-px h-3 bg-white/20 mx-1"></div>
      <span id="fps-counter" className="text-xs font-mono font-bold text-gray-300">0 FPS</span>
    </>
  );
};

const PlayerAvatar = ({ outfitColor, eyeColor }: { outfitColor: string, eyeColor: string }) => (
  <Canvas className="w-full h-full pointer-events-none" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
    <PerspectiveCamera makeDefault position={[0, 1.4, 2.5]} fov={30} />
    <Suspense fallback={null}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <group position={[0, 0.4, 0]} rotation={[0, Math.PI, 0]}>
        <UploadedCharacter 
          outfitColor={outfitColor || '#3182ce'}
          eyeColor={eyeColor || '#1a202c'}
          hasWeapon={false}
        />
      </group>
    </Suspense>
  </Canvas>
);

const LobbyUI = ({ roomCode, onLeave }: { roomCode: string, onLeave: () => void }) => {
  const { players, isHost, myId, mapId, matchDuration, toggleSettings, showSettings } = useGameStore();
  const [showOptions, setShowOptions] = React.useState(false);
  const [mapError, setMapError] = React.useState('');
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, playerId: string } | null>(null);

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleStartMatch = () => {
    socket.startMatch();
  };

  const playersList = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  const actualMaxPlayers = mapId === '1v1' ? 2 : 8;
  const slots = Array.from({ length: actualMaxPlayers }).map((_, i) => playersList[i] || null);
  const hostId = playersList.length > 0 ? [...playersList].sort((a, b) => (a.joinedAt || Date.now()) - (b.joinedAt || Date.now()))[0].id : '';

  return (
    <div className="absolute inset-0 z-[100] bg-[#0f1923] text-white flex flex-col overflow-hidden">
      {showSettings && <SettingsMenu onQuit={onLeave} />}
      {/* HEADER */}
      <div className="w-full p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-black/80 to-transparent shrink-0 z-20">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
           <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">Lobby</h1>
           <span className="text-xs md:text-sm font-bold text-gray-400 mt-1 md:mt-2 uppercase tracking-widest">Party Code: <span className="text-white select-all">{roomCode}</span></span>
        </div>
        <div className="flex gap-2 md:gap-4 flex-wrap justify-center">
           {isHost ? (
             <button onClick={handleStartMatch} className="bg-red-500 hover:bg-red-400 text-white font-black px-6 md:px-12 py-3 md:py-4 rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all uppercase tracking-widest text-sm md:text-base">
               Start Match
             </button>
           ) : (
             <div className="text-gray-400 font-bold uppercase tracking-widest px-4 md:px-8 py-3 md:py-4 bg-black/50 rounded border border-white/10 text-xs md:text-base">Waiting for Host...</div>
           )}
           <button onClick={onLeave} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 md:px-8 py-3 md:py-4 rounded transition-all uppercase tracking-widest flex items-center gap-2 text-sm md:text-base">
             <LogOut className="w-5 h-5" /> Leave
           </button>
        </div>
      </div>

      {/* PLAYER CARDS */}
      <div className="flex-1 flex flex-wrap justify-center items-start md:items-center gap-2 md:gap-4 p-4 md:px-12 pb-32 md:pb-12 overflow-y-auto w-full content-start md:content-center">
         {slots.map((p, i) => (
           <div 
             key={i} 
             onContextMenu={(e) => {
               if (isHost && p && p.id !== myId) {
                 e.preventDefault();
                 setContextMenu({ x: e.clientX, y: e.clientY, playerId: p.id });
               }
             }}
             className={`relative flex-[1_1_45%] md:flex-1 max-w-[260px] min-w-[100px] md:min-w-[120px] h-[25vh] md:h-[60vh] min-h-[150px] md:min-h-[400px] max-h-[700px] border transition-all duration-500 ${p ? (p.id === myId ? 'border-yellow-400/50 bg-black/40 shadow-[0_0_30px_rgba(250,204,21,0.1)]' : 'border-blue-500/30 bg-black/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]') : 'border-white/5 bg-black/20'} overflow-hidden flex flex-col justify-end group clip-path-slant`}
           >
              {/* If player exists, render their 3D model */}
              {p && (
                 <div className="absolute inset-0 z-0">
                    <Canvas className="w-full h-full pointer-events-none" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
                       <PerspectiveCamera makeDefault position={[0, 0.2, actualMaxPlayers === 8 ? 4.5 : 3.5]} fov={actualMaxPlayers === 8 ? 50 : 40} />
                       <ambientLight intensity={1.5} />
                       <directionalLight position={[2, 2, 2]} intensity={1.5} />
                       <group position={[0, 0.4, 0]} rotation={[0, Math.PI, 0]}>
                         <Suspense fallback={null}>
                            <UploadedCharacter outfitColor={p.outfitColor || '#3182ce'} eyeColor={p.eyeColor || '#1a202c'} hasWeapon={true} />
                         </Suspense>
                       </group>
                    </Canvas>
                 </div>
              )}
              
              {/* Decorator top */}
              {p && <div className={`absolute top-0 left-0 w-full h-1 ${p.id === myId ? 'bg-yellow-400' : 'bg-blue-400'} shadow-[0_0_10px_currentColor]`}></div>}
              
              {/* Player Info Box at bottom */}
              <div className="relative z-10 p-2 md:p-6 bg-gradient-to-t from-[#0f1923] via-black/80 to-transparent border-t border-white/5">
                 {p ? (() => {
                   const isPlayerHost = p.id === hostId;
                   const displayName = p.nickname || 'Player';
                   const namePrefix = displayName.slice(0, -1);
                   const lastChar = displayName.slice(-1);

                   return (
                   <div className="flex flex-col items-center">
                      <span className="text-green-400 text-[10px] md:text-xs font-black tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">Ready</span>
                      <div className={`text-sm md:text-xl font-bold w-full flex justify-center ${p.id === myId ? 'text-yellow-400' : 'text-white'}`}>
                        <div className="relative max-w-full inline-flex">
                        {isPlayerHost ? (
                          <span>
                            {namePrefix}
                            <span className="relative inline-block">
                              {lastChar}
                              <Crown className="w-4 h-4 text-yellow-400 absolute -top-2 -right-1 rotate-12 drop-shadow-md" />
                            </span>
                          </span>
                        ) : (
                          displayName
                        )}
                        </div>
                      </div>
                   </div>
                   );
                 })() : (
                   <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase mb-1">Empty Slot</span>
                      <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50">Searching...</span>
                   </div>
                 )}
              </div>
           </div>
         ))}
      </div>
      
      
      
      {/* MATCH SETTINGS (TIME & ARENA) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110]">
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-2 px-6 py-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-[0.3em] transition-all duration-300"
          >
            {showOptions ? 'Hide Options' : 'Options'}
            <svg className={`w-4 h-4 transition-transform duration-300 ${showOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => toggleSettings()}
            className="p-2 bg-black/80 hover:bg-white/10 rounded-full border border-white/20 text-white transition-all duration-300 group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>

        <div className={`flex flex-col md:flex-row gap-4 p-2 bg-black/60 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-500 ${showOptions ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        
        {/* TIME SETTINGS */}
        {(!mapId || mapId === 'default') && (
          <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5">
            <div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Time</div>
            {isHost ? (
              <div className="flex gap-1 relative">
                {[60, 300, 600].map((t) => (
                  <div 
                    key={t}
                    onClick={() => socket.changeTime(t)}
                    className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 ${matchDuration === t || (!matchDuration && t === 300) ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                  >
                    {t / 60}m
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-1">
                {[60, 300, 600].map((t) => (
                  <div 
                    key={t}
                    className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs ${matchDuration === t || (!matchDuration && t === 300) ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-transparent text-gray-500 hidden'}`}
                  >
                    {t / 60}m
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARENA SETTINGS */}
        <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5 relative">
          <div className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Map</div>
          {isHost ? (
            <div className="flex gap-1 relative">
              {mapError && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  {mapError}
                </div>
              )}
              <div 
                onClick={() => socket.changeMap('default')}
                className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 ${(!mapId || mapId === 'default') ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              >
                Default (8P)
              </div>
              <div 
                onClick={() => {
                  if (Object.keys(players).length > 2) {
                    setMapError('Can\'t change the map because there are too many players');
                    setTimeout(() => setMapError(''), 3000);
                  } else {
                    socket.changeMap('1v1');
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all duration-300 ${mapId === '1v1' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              >
                1v1 Arena (2P)
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              <div className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs ${(!mapId || mapId === 'default') ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-transparent text-gray-500 hidden'}`}>
                Default (8P)
              </div>
              <div className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs ${mapId === '1v1' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-transparent text-gray-500 hidden'}`}>
                1v1 Arena (2P)
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Background styling for slant effect */}
      <style dangerouslySetInnerHTML={{__html: `
        .clip-path-slant {
           clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);
        }
      `}} />

      {contextMenu && (
        <div 
          className="absolute z-[200] bg-gray-900 border border-white/20 rounded shadow-xl py-2 px-4 cursor-pointer hover:bg-red-600 text-red-500 hover:text-white font-bold text-sm transition-colors"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => {
            e.stopPropagation();
            socket.kickPlayer(contextMenu.playerId);
            setContextMenu(null);
          }}
        >
          Kick Player
        </div>
      )}
    </div>
  );
};

const UIOverlay = ({ onQuit, roomCode, playerName }: { onQuit: () => void, roomCode: string, playerName: string }) => {
  const [hasSkipped, setHasSkipped] = React.useState(false);
  const {
    matchState,
    timeRemaining,
    intermissionTime,
    winner,
    myId,
    players,
    ammo,
    currentWeapon,
    isReloading,
    isScoped,
    health,
    hitmarkers,
    killFeed,
    showSettings,
    toggleSettings,
    ping,
  } = useGameStore();

  const myPlayerState = myId ? players[myId] : null;
  const opponentId = Object.keys(players).find(
    (id) => id !== myId && !id.startsWith("target_"),
  );
  const opponentState = opponentId ? players[opponentId] : null;

  useEffect(() => {
    if (matchState === "ended") {
      document.exitPointerLock();
    }
  }, [matchState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (matchState === "playing") {
          // Let pointer lock handle escape, we just sync state via pointerlockchange
        }
      }
    };

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === document.body;
      const storeState = useGameStore.getState();

      if (
        !isLocked &&
        storeState.matchState === "playing" &&
        !storeState.showSettings
      ) {
        useGameStore.getState().updateSettings({}); // touch
        useGameStore.getState().toggleSettings(); // open settings
      } else if (isLocked && storeState.showSettings) {
        useGameStore.getState().toggleSettings(); // close settings
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [matchState]);

  if (matchState === "waiting") {
    const activeRoomCode =
      socket.io.opts.query && (socket.io.opts.query as any).room;
    const isCustom = activeRoomCode && activeRoomCode !== "QUICK";
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 text-white font-sans backdrop-blur-sm select-none">
        <h1 className="text-5xl font-black mb-4 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
          SNIPER RIVALS
        </h1>
        <p className="text-xl animate-pulse text-gray-300">
          Waiting for opponent to connect...
        </p>

        {isCustom ? (
          <div className="mt-4 bg-black/40 border border-white/10 px-6 py-4 rounded-2xl text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
              Lobby Code
            </p>
            <p className="text-3xl font-mono font-black tracking-widest text-blue-400">
              {activeRoomCode}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Give this code to your opponent!
            </p>
          </div>
        ) : (
          <p className="text-sm mt-4 text-gray-500">
            Share this link with a friend to play.
          </p>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm flex flex-col gap-2">
          <p className="text-white font-bold mb-2">Controls:</p>
          <div className="grid grid-cols-2 gap-4 text-left mb-6">
            <p className="bg-gray-800 px-3 py-1 rounded">WASD: Move</p>
            <p className="bg-gray-800 px-3 py-1 rounded">SPACE: Jump</p>
            <p className="bg-gray-800 px-3 py-1 rounded">
              SHIFT: Sprint / Hold Breath
            </p>
            <p className="bg-gray-800 px-3 py-1 rounded">C: Crouch</p>
            <p className="bg-gray-800 px-3 py-1 rounded">LMB: Hold to Fire</p>
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

  if (matchState === "ended") {
    const sortedPlayers = Object.entries(players)
       .map(([id, p]) => ({ id, ...p }))
       .sort((a, b) => (b.kills || 0) - (a.kills || 0));
    
    const isWinner = sortedPlayers.length > 0 && sortedPlayers[0].id === myId;
    
    return (
      <div
        className={`absolute inset-0 z-[100] flex flex-col items-center justify-center pt-8 overflow-y-auto text-white font-sans backdrop-blur-xl select-none ${isWinner ? "bg-blue-900/90 text-blue-100" : "bg-gray-900/90 text-gray-100"}`}
      >
        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-widest uppercase drop-shadow-2xl">
          {isWinner ? "VICTORY" : "MATCH ENDED"}
        </h1>

        <div className="flex items-end justify-center gap-6 sm:gap-12 mb-8 h-auto pb-4">
           {/* SECOND PLACE */}
           {sortedPlayers.length > 1 ? (
              <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <span className="text-gray-400 font-bold mb-2 uppercase tracking-wide text-sm">2nd</span>
                  <div className={`w-20 h-20 bg-gray-800 border-4 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden relative ${sortedPlayers[1].id === myId ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'border-gray-600'}`}>
                    <PlayerAvatar outfitColor={sortedPlayers[1].outfitColor as string} eyeColor={sortedPlayers[1].eyeColor as string} />
                  </div>
                  <span className={`font-bold text-lg max-w-[120px] truncate ${sortedPlayers[1].id === myId ? 'text-yellow-100' : ''}`}>{sortedPlayers[1].id === myId ? playerName : sortedPlayers[1].nickname || 'Player'}</span>
                  <span className="text-gray-400 font-mono text-sm">{sortedPlayers[1].kills || 0} Kills</span>
                  <div className="w-24 h-24 bg-gray-800 border-t-4 border-gray-600 rounded-t-xl mt-4 opacity-80" />
              </div>
           ) : <div className="w-24" />}

           {/* FIRST PLACE */}
           {sortedPlayers.length > 0 && (
              <div className="flex flex-col items-center animate-fade-in-up scale-110 z-10">
                  <span className="text-white/80 font-black mb-2 uppercase tracking-widest">1st</span>
                  <div className={`w-28 h-28 bg-gray-800 border-4 rounded-2xl flex items-center justify-center mb-4 overflow-hidden relative ${sortedPlayers[0].id === myId ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'border-gray-400 shadow-lg'}`}>
                    <PlayerAvatar outfitColor={sortedPlayers[0].outfitColor as string} eyeColor={sortedPlayers[0].eyeColor as string} />
                  </div>
                  <span className={`font-black text-xl max-w-[140px] truncate ${sortedPlayers[0].id === myId ? 'text-yellow-100' : 'text-white'}`}>{sortedPlayers[0].id === myId ? playerName : sortedPlayers[0].nickname || 'Player'}</span>
                  <span className={`${sortedPlayers[0].id === myId ? 'text-yellow-200/80' : 'text-gray-300'} font-mono font-bold mt-1`}>{sortedPlayers[0].kills || 0} Kills</span>
                  <div className={`w-32 h-32 border-t-4 rounded-t-xl mt-4 backdrop-blur-sm ${sortedPlayers[0].id === myId ? 'bg-yellow-600/20 border-yellow-400' : 'bg-gray-600/20 border-gray-400'}`} />
              </div>
           )}

           {/* THIRD PLACE */}
           {sortedPlayers.length > 2 ? (
              <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                  <span className="text-gray-500 font-bold mb-2 uppercase tracking-wide text-sm">3rd</span>
                  <div className={`w-20 h-20 bg-gray-800 border-4 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden relative ${sortedPlayers[2].id === myId ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'border-gray-700'}`}>
                    <PlayerAvatar outfitColor={sortedPlayers[2].outfitColor as string} eyeColor={sortedPlayers[2].eyeColor as string} />
                  </div>
                  <span className={`font-bold text-lg max-w-[120px] truncate ${sortedPlayers[2].id === myId ? 'text-yellow-100' : ''}`}>{sortedPlayers[2].id === myId ? playerName : sortedPlayers[2].nickname || 'Player'}</span>
                  <span className="text-gray-400 font-mono text-sm">{sortedPlayers[2].kills || 0} Kills</span>
                  <div className="w-24 h-16 bg-gray-800/80 border-t-4 border-gray-700 rounded-t-xl mt-4 opacity-80" />
              </div>
           ) : <div className="w-24" />}
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          <button
            onClick={() => {
              if (roomCode === "TRAINING_GROUND" || Object.keys(players).length <= 1) {
                socket.skipIntermission();
              } else {
                setHasSkipped(true);
              }
            }}
            disabled={hasSkipped && Object.keys(players).length > 1}
            className={`${hasSkipped && Object.keys(players).length > 1 ? "bg-green-600 border-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]" : "bg-blue-600 hover:bg-blue-500 border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.4)]"} text-white font-black px-8 py-4 rounded-xl transition-all uppercase tracking-wider text-sm flex items-center gap-3 pointer-events-auto cursor-pointer border disabled:opacity-90 disabled:cursor-default`}
          >
            {hasSkipped && Object.keys(players).length > 1 ? (
              <>Ready ({intermissionTime}s)</>
            ) : (
              <><Play size={18} fill="currentColor" /> Play Again ({intermissionTime}s)</>
            )}
          </button>

          <button
            onClick={() => {
              onQuit();
            }}
            className="text-gray-400 hover:text-white hover:bg-red-600/50 font-bold px-6 py-3 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center gap-2 pointer-events-auto cursor-pointer"
          >
            <LogOut size={14} /> Leave Room
          </button>
        </div>
      </div>
    );
  }

  // Active playing UI
  return (
    <>
      {showSettings && <SettingsMenu onQuit={onQuit} />}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-6 select-none font-sans overflow-hidden">
        {/* Top HUD */}
        <div className="flex w-full justify-between items-start text-white relative gap-2">
          <div className="flex flex-col items-start gap-1 z-10 shrink-0">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse pb-px"></div>
              <span className="text-xs font-mono font-bold text-gray-300">{ping || 0}ms</span>
              <FpsCounter />
            </div>
          </div>
          {roomCode !== "TRAINING_GROUND" && (
            <>
              <div className="flex-1 flex justify-center items-start flex-wrap gap-2 sm:gap-6 px-1 sm:px-4 max-h-24 sm:max-h-none overflow-hidden">
                {Object.entries(players)
                  .map(([id, p]) => ({ id, ...p }))
                  .sort((a, b) => (b.kills || 0) - (a.kills || 0))
                  .map(({ id, nickname, kills, outfitColor, eyeColor }) => (
                    <div key={id} className={`flex flex-col items-center gap-1.5 transition-all ${id === myId ? 'scale-110' : 'opacity-80'}`}>
                      <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[50px] sm:max-w-[80px] ${id === myId ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'text-gray-400'}`}>
                        {id === myId ? (nickname || playerName) : (nickname || 'Player')}
                      </span>
                      <div className={`w-8 h-8 sm:w-14 sm:h-14 bg-black/60 backdrop-blur-md rounded-xl border flex items-center justify-center shadow-lg overflow-hidden ${id === myId ? 'border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-white/10'}`}>
                        <PlayerAvatar outfitColor={outfitColor as string} eyeColor={eyeColor as string} />
                      </div>
                      <span className={`text-[10px] sm:text-sm font-black font-mono text-white bg-black/60 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-white/10 min-w-[30px] sm:min-w-[40px] text-center shadow-lg ${id === myId ? 'border-yellow-400/50 text-yellow-100' : ''}`}>
                        {kills || 0}
                      </span>
                    </div>
                  ))
                }
              </div>

              <div className="z-10 shrink-0">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-xl border border-white/10 text-center shadow-lg">
                  <p className="text-xl sm:text-2xl font-mono font-bold tracking-widest">
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Kill Feed */}
        <div className="absolute top-24 right-2 sm:right-6 flex flex-col gap-1 sm:gap-2 items-end z-0">
          {killFeed.map((k) => (
            <div
              key={k.id}
              className="bg-gradient-to-r from-transparent to-red-600/60 pl-4 sm:pl-8 pr-2 sm:pr-4 py-0.5 sm:py-1 flex items-center gap-1 sm:gap-3 animate-pulse border-r-2 sm:border-r-4 border-red-500 rounded-l-full shadow-lg text-[10px] sm:text-base"
            >
              <span className="font-bold text-white">
                {players[k.killer]?.nickname ||
                  (k.killer === myId
                    ? "You"
                    : k.killer.startsWith("target_")
                      ? "Target"
                      : "Enemy")}
              </span>
              <span className="text-sm text-red-100">
                sniped {k.headshot && "(Headshot)"}
              </span>
              <span className="font-bold text-white">
                {players[k.victim]?.nickname ||
                  (k.victim === myId
                    ? "You"
                    : k.victim.startsWith("target_")
                      ? "Target"
                      : "Enemy")}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end">
          {/* Ammo (Left) */}
          <div className="bg-black/50 backdrop-blur-md p-3 sm:p-6 rounded-xl border border-white/10 text-left shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[120px] sm:min-w-[200px]">
            <div className="text-sm font-bold text-gray-400 tracking-widest mb-2">
              AMMO
            </div>
            <div className="flex items-center gap-2">
              {isReloading ? (
                <span className="text-sm sm:text-2xl font-black text-yellow-500 animate-pulse uppercase tracking-wider">
                  RELOADING...
                </span>
              ) : (
                <>
                  <span
                    className={`text-3xl sm:text-5xl font-black ${ammo === 0 ? "text-red-500" : "text-white"}`}
                  >
                    {ammo}
                  </span>
                  <span className="text-lg sm:text-2xl text-gray-500 font-black">/ {WEAPONS[currentWeapon].magSize}</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest mt-2 uppercase">
              {WEAPONS[currentWeapon].name}
            </div>
          </div>

          {/* Health (Right) */}
          <div className="bg-black/50 backdrop-blur-md p-3 sm:p-6 rounded-xl border border-white/10 w-40 sm:w-80 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] sm:text-sm font-bold text-gray-400 tracking-widest">
                HP // {Math.max(0, health)}
              </span>
              <span className="text-xl sm:text-3xl font-black text-white">
                {Math.max(0, health)}
              </span>
            </div>
            <div className="h-4 w-full bg-gray-900 rounded overflow-hidden flex justify-end">
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.max(0, health)}%`,
                  backgroundColor: health <= 30 ? "#ef4444" : "white",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Scope reticle overlay (Vignette only) ── */}
      {isScoped ? (
        <div className="pointer-events-none absolute inset-0 z-20 select-none">
          {/* Very subtle edge vignette – doesn't block view */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 58% at center, transparent 0%, rgba(0,0,0,0.18) 100%)'
          }} />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center mix-blend-difference select-none">
          {/* Dynamic Hipfire Crosshair */}
          <div
            className="relative flex items-center justify-center opacity-70 transition-all duration-100 ease-out"
            style={{
              transform: `scale(${isReloading ? 1.5 : ammo === 0 ? 0.8 : 1})`,
            }}
          >
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
        const color = h.headshot ? "bg-red-500" : "bg-white";
        const shadow = h.headshot ? "shadow-[0_0_8px_red]" : "";

        return (
          <div
            key={h.id}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center select-none opacity-80 animate-ping"
            style={{ animationDuration: "0.2s" }}
          >
            <div
              className="relative w-8 h-8 flex items-center justify-center"
              style={{ transform: "rotate(45deg)" }}
            >
              <div
                className={`absolute h-4 w-[2px] -translate-y-3 ${color} ${shadow}`}
              ></div>
              <div
                className={`absolute h-4 w-[2px] translate-y-3 ${color} ${shadow}`}
              ></div>
              <div
                className={`absolute h-[2px] w-4 -translate-x-3 ${color} ${shadow}`}
              ></div>
              <div
                className={`absolute h-[2px] w-4 translate-x-3 ${color} ${shadow}`}
              ></div>
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
          <h2 className="text-7xl font-black text-red-500 tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] uppercase">
            Wasted
          </h2>
          <p className="text-xl text-white mt-4 animate-pulse">
            Waiting for respawn...
          </p>
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
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      onComplete(cleanName);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to authenticate.");
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="bg-gray-900 border border-white/10 p-6 md:p-10 rounded-2xl w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-black italic tracking-widest text-blue-400 uppercase mb-8 text-center">
          Sniper Rivals
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1 text-center">
              Enter Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 16))}
              placeholder="Your Name"
              autoFocus
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-xl font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm font-bold text-center animate-pulse">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || name.trim().length < 3}
            className={`w-full font-black py-4 rounded-xl transition-all uppercase flex items-center justify-center ${loading || name.trim().length < 3 ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"}`}
          >
            {loading ? "Checking..." : "Enter Arena"}
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
  const [showAfkModal, setShowAfkModal] = useState(false);
  const lastInputTime = React.useRef(Date.now());
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const matchState = useGameStore((state) => state.matchState);
  const [customPlayOptions, setCustomPlayOptions] = useState<{
    name?: string;
    roomCode?: string;
    mapId?: string;
    maxPlayers?: number;
  } | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      lastInputTime.current = Date.now();
    };
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, []);

  const handleQuit = () => {
    socket.disconnect();
    useGameStore.getState().resetStore();
    setInMenu(true);
  };

  useEffect(() => {
    const afkInterval = setInterval(() => {
      if (!inMenu && connected && matchState === "playing") {
        if (Date.now() - lastInputTime.current > 90000) {
          handleQuit();
          setShowAfkModal(true);
        }
      }
    }, 1000);
    return () => clearInterval(afkInterval);
  }, [inMenu, connected, matchState]);

  useEffect(() => {
    if (inMenu || !globalName) return;

    const { settings } = useGameStore.getState();

    if (customPlayOptions) {
      socket.io.opts.query = {
        name: customPlayOptions.name || globalName,
        room: customPlayOptions.roomCode || "",
        outfitColor: settings.outfitColor,
        eyeColor: settings.eyeColor,
        mapId: customPlayOptions.mapId || "default",
        maxPlayers: customPlayOptions.maxPlayers || 8,
      };
    } else {
      socket.io.opts.query = {
        name: globalName,
        room: "",
        outfitColor: settings.outfitColor,
        eyeColor: settings.eyeColor,
        mapId: "default",
        maxPlayers: 8,
      };
    }

    socket.connect();

    socket.on("connect", () => {
      // socket connected, but wait for init
    });

    socket.on("gameFull", () => {
      setGameFull(true);
    });

    socket.on("gameState", (state: any) => {
      useGameStore.getState().updateGameState(state);
    });

    socket.on("init", (data: any) => {
      useGameStore.getState().setMyId(data.id);
      useGameStore
        .getState()
        .updateGameState({
          matchState: data.matchState,
          timeRemaining: data.timeRemaining,
          mapId: data.mapId,
          isHost: data.isHost,
          matchDuration: data.matchDuration,
        });
      
      if (data.spawn) {
        useGameStore.getState().setLocalState({ 
          teleportTo: [data.spawn.x, data.spawn.y, data.spawn.z, data.spawn.ry || 0] 
        });
      }

      Object.entries(data.players).forEach(([id, pInfo]: [string, any]) => {
        useGameStore.getState().updatePlayer(id, pInfo);
        if (id === data.id)
          useGameStore.getState().setLocalState({ health: pInfo.health });
      });
      setConnected(true);
    });

    socket.on("playerJoined", (data: { id: string; player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
    });

    socket.on("matchStarted", (data: any) => {
      useGameStore.getState().updateGameState({ matchState: "playing" });
      // Reset local state

      const myId = useGameStore.getState().myId;
      if (myId && data.players[myId]) {
        const playerStart = data.players[myId];
        useGameStore.getState().setLocalState({
          health: 100,
          ammo: WEAPONS.sniper.magSize,
          currentWeapon: 'sniper',
          isReloading: false,
          isScoped: false,
          teleportTo: [playerStart.x, playerStart.y, playerStart.z],
        });
        useGameStore.getState().updatePlayer(myId, playerStart);
      } else {
        useGameStore
          .getState()
          .setLocalState({
            health: 100,
            ammo: WEAPONS.sniper.magSize,
            currentWeapon: 'sniper',
            isReloading: false,
            isScoped: false,
          });
      }

      const currentRoom = customPlayOptions?.roomCode || socket.io.opts.query.room || "QUICK";

      if (currentRoom === "TRAINING_GROUND") {
        const store = useGameStore.getState();
        for (let i = 0; i < 10; i++) {
          const tId = `target_${i}`;
          const safeSpawn = getRandomSpawn();
          const spawnPos = {
             x: safeSpawn.x + (Math.random() - 0.5) * 10,
             y: 0.8,
             z: safeSpawn.z + (Math.random() - 0.5) * 10
          };
          store.updatePlayer(tId, {
            nickname: `Target ${i + 1}`,
            x: spawnPos.x,
            y: spawnPos.y,
            z: spawnPos.z,
            rx: 0,
            ry: Math.random() * Math.PI * 2,
            health: 1,
            isTarget: true,
            isMoving: false,
            isJumping: false,
            outfitColor: "#ff0000",
            eyeColor: "#000000",
          });
        }
      }
    });

    socket.on("matchEnded", (data: any) => {
      useGameStore
        .getState()
        .updateGameState({ matchState: "ended", winner: data.winner });
      useGameStore.getState().setLocalState({ isScoped: false });
      document.exitPointerLock();
    });

    socket.on("kicked", () => {
      socket.disconnect();
      useGameStore.getState().resetStore();
      setInMenu(true);
      setConnected(false);
      setCustomPlayOptions(null);
      alert("You have been kicked from the lobby.");
    });

    socket.on("timeUpdate", (time: number) => {
      useGameStore.getState().updateGameState({ timeRemaining: time });
    });

    socket.on("playerMoved", (data: { id: string; player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
    });

    socket.on(
      "playerShoot",
      (data: {
        id: string;
        position: [number, number, number];
        direction: [number, number, number];
        hitPoint?: [number, number, number] | null;
        bulletId?: string;
      }) => {
        useGameStore.getState().addBullet({
          id: data.bulletId || Math.random().toString(36).substring(7),
          position: data.position,
          direction: data.direction,
          hitPoint: data.hitPoint,
        });
        playSound("shoot");
      },
    );

    socket.on(
      "playerHit",
      (data: {
        id: string;
        damage: number;
        shooterId: string;
        headshot: boolean;
      }) => {
        const myId = useGameStore.getState().myId;
        const currentHealth =
          useGameStore.getState().players[data.id]?.health ?? 100;
        const newHealth = Math.max(0, currentHealth - data.damage);
        useGameStore.getState().updatePlayer(data.id, { health: newHealth });

        if (data.id === myId) {
          playSound("hit"); // we got hit
          useGameStore.getState().setLocalState({ health: newHealth });
        } else if (
          data.id.startsWith("target_") &&
          currentHealth > 0 &&
          newHealth === 0
        ) {
          // Dummy died, simulate death locally
          setTimeout(() => {
            const db = useGameStore.getState();
            const kills = (db.players[data.shooterId]?.kills || 0) + 1;
            db.updatePlayer(data.shooterId, { kills });
            db.updatePlayer(data.id, {
              deaths: (db.players[data.id]?.deaths || 0) + 1,
              health: 0,
            });
            db.addKillFeed(data.shooterId, data.id, data.headshot);

            // Respawn dummy after delay
            setTimeout(() => {
              const safeSpawn = getRandomSpawn();
              const spawnPos = {
                 x: safeSpawn.x + (Math.random() - 0.5) * 10,
                 y: 0.8,
                 z: safeSpawn.z + (Math.random() - 0.5) * 10
              };
              useGameStore.getState().updatePlayer(data.id, {
                health: 1,
                x: spawnPos.x,
                y: spawnPos.y,
                z: spawnPos.z,
                rx: 0,
                ry: Math.random() * Math.PI * 2,
              });
            }, 3000);
          }, 50);
        }
      },
    );

    socket.on(
      "playerDied",
      (data: {
        victimId: string;
        killerId: string;
        kills: number;
        deaths: number;
      }) => {
        const db = useGameStore.getState();
        db.updatePlayer(data.killerId, { kills: data.kills });
        db.updatePlayer(data.victimId, { deaths: data.deaths, health: 0 });
        db.addKillFeed(data.killerId, data.victimId, false);

        if (data.victimId === db.myId) {
          playSound("death");
          db.setLocalState({ isScoped: false });
        }
      },
    );

    socket.on("playerRespawned", (data: { id: string; player: any }) => {
      useGameStore.getState().updatePlayer(data.id, data.player);
      if (data.id === useGameStore.getState().myId) {
        const liveWeapon = useGameStore.getState().currentWeapon;
        useGameStore.getState().setLocalState({
          health: 100,
          ammo: WEAPONS[liveWeapon].magSize,
          teleportTo: [data.player.x, data.player.y, data.player.z],
        });
      }
    });

    socket.on("playerLeft", (id: string) => {
      useGameStore.getState().removePlayer(id);
    });

    socket.on("pong", (timestamp: number) => {
      const ping = Date.now() - timestamp;
      useGameStore.getState().updateGameState({ ping });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping", Date.now());
      }
    }, 2000);

    const handleBeforeUnload = () => {
      socket.disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.off("connect");
      socket.off("gameFull");
      socket.off("gameState");
      socket.off("init");
      socket.off("playerJoined");
      socket.off("matchStarted");
      socket.off("matchEnded");
      socket.off("timeUpdate");
      socket.off("playerMoved");
      socket.off("playerShoot");
      socket.off("playerHit");
      socket.off("playerDied");
      socket.off("playerRespawned");
      socket.off("playerLeft");
      socket.off("pong");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [inMenu]);

  // Update hitmarkers and bullets timeout cleanup loop
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const now = Date.now();
      let updates: any = {};

      if (state.hitmarkers.some((h) => now - h.createdAt > 200)) {
        updates.hitmarkers = state.hitmarkers.filter(
          (h) => now - h.createdAt <= 200,
        );
      }

      const BULLET_LIFETIME = 2000;
      if (state.bullets.some((b) => now - b.createdAt > BULLET_LIFETIME)) {
        updates.bullets = state.bullets.filter(
          (b) => now - b.createdAt <= BULLET_LIFETIME,
        );
      }

      if (Object.keys(updates).length > 0) {
        state.setLocalState(updates);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [inMenu]);

  if (gameFull) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-900 text-white font-sans gap-4">
        <h1 className="text-3xl font-bold text-red-500">
          Game is already full.
        </h1>
        <button
          onClick={() => {
            setGameFull(false);
            setInMenu(true);
            setConnected(false);
            setCustomPlayOptions(null);
          }}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-all"
        >
          Return to Menu
        </button>
      </div>
    );
  }

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
            onNameChange={setGlobalName}
            onPlay={(options) => {
              if (options) {
                setCustomPlayOptions({ ...options, name: options.name || globalName });
              } else {
                setCustomPlayOptions({
                  name: globalName,
                  roomCode: "QUICK",
                });
              }
              setInMenu(false);
            }}
          />
        </div>
      )}

      {!inMenu && connected && matchState === "lobby" && (
        <LobbyUI roomCode={customPlayOptions?.roomCode || "QUICK"} onLeave={handleQuit} />
      )}

      {!inMenu && connected && matchState !== "lobby" && <UIOverlay onQuit={handleQuit} roomCode={customPlayOptions?.roomCode || "QUICK"} playerName={globalName!} />}

      {!inMenu && !connected && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white font-sans overflow-hidden select-none">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <h1 className="text-4xl md:text-6xl text-center font-black mb-8 tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600 drop-shadow-sm z-10 transition-all hover:scale-105">
            SNIPER RIVALS
          </h1>
          
          <div className="flex flex-col items-center z-10 w-full max-w-sm px-6">
             <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-6 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: '100%', transformOrigin: 'left', animation: 'progress 1.5s ease-in-out infinite alternate' }}></div>
             </div>
             <p className="text-sm font-bold tracking-widest text-blue-400 uppercase animate-pulse">
               Connecting to Lobby...
             </p>
             <p className="text-xs font-mono text-gray-500 mt-2 text-center">
               Loading assets & synchronizing game state
             </p>

             <div className="mt-8 text-center">
               <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Match starts in</p>
               <p className="text-3xl font-mono font-bold text-white tracking-widest">
                 {timeRemaining !== undefined && timeRemaining !== null ? formatTime(Math.max(0, timeRemaining)) : "--:--"}
               </p>
             </div>
          </div>
          
          <button
            onClick={() => {
              socket.disconnect();
              useGameStore.getState().resetStore();
              setInMenu(true);
            }}
            className="absolute bottom-12 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 font-black px-6 py-3 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer z-10"
          >
            Cancel
          </button>
          
          <style>{`
            @keyframes progress {
              0% { transform: scaleX(0.1); }
              100% { transform: scaleX(1); }
            }
          `}</style>
        </div>
      )}

      <div className="hidden lg:block absolute bottom-2 left-2 text-[10px] text-gray-600 z-50 mix-blend-difference pointer-events-none">
        Desktop Recommended
      </div>

      {showAfkModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-red-500/30 p-10 rounded-2xl w-[400px] text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <h2 className="text-3xl font-black mb-4 uppercase text-red-500 tracking-wider">
              Disconnected
            </h2>
            <p className="text-gray-300 font-medium mb-8">
              You were disconnected for being AFK.
            </p>
            <button
              onClick={() => setShowAfkModal(false)}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3 rounded-xl transition-all uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] pointer-events-auto cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
