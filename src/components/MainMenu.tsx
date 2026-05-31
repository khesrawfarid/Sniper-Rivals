import React, { useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Sparkles, PerspectiveCamera, Sky, Stars, OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Play, Crosshair, Users, Briefcase, Trophy, Settings, User, LogOut, MessageSquare, Plus, Globe, Key, Medal, Swords, CheckCircle, CircleDot, X } from 'lucide-react';
import * as THREE from 'three';
import { UploadedCharacter } from './Opponent';
import { MapErrorBoundary } from './MapErrorBoundary';
import { createJumpPadTexture } from './Arena';

// Target board replica for visual consistency in the menu
const StaticTarget = ({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) => {

  return (
    <group position={position} rotation={rotation}>
      {/* Stand (wooden pole) */}
      <mesh castShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Target Board */}
      <group position={[0, 0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1, 1, 0.1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        
        {/* Target rings facing front */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.051, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.01, 32]} />
            <meshStandardMaterial color="#e53e3e" />
          </mesh>
          <mesh position={[0, 0.052, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.01, 32]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.053, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.01, 32]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// Visual reconstruction of the gameplay map (Arena.tsx) without physics dependencies
const GameplayMap = () => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/arenamap.v.2.0.glb");
  const padTex = React.useMemo(() => createJumpPadTexture(), []);
  
  const clonedScene = React.useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Apply stylized "low poly / Fortnite" shading to all general environment meshes
        if (child.material) {
          const applyStylized = (mat: THREE.Material) => {
            if ('roughness' in mat) {
              (mat as THREE.MeshStandardMaterial).flatShading = false;
              (mat as THREE.MeshStandardMaterial).roughness = 0.9;
              (mat as THREE.MeshStandardMaterial).metalness = 0.0;
            }
            mat.needsUpdate = true;
          };
          if (Array.isArray(child.material)) {
            child.material.forEach(applyStylized);
          } else {
            applyStylized(child.material);
          }
        }
        
        if (['Cube.005', 'Cube.006', 'Cube.007', 'Cube.008'].includes(child.name)) {
          child.position.y = 0.05; 
          child.updateMatrix();
          
          child.material = new THREE.MeshStandardMaterial({
            color: '#00ffff',
            emissive: '#00aaff',
            emissiveIntensity: 3,
            toneMapped: false,
            roughness: 0.1,
            metalness: 0.1,
          });
        }
      }
    });
    return clone;
  }, [scene, padTex]);

  const { actions } = useAnimations(animations, group);
  
  React.useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => action?.play());
    }
  }, [actions]);

  return (
    <group ref={group}>
      <primitive object={clonedScene} />
      {/* Jump pad visuals */}
      {[
        [-0.04906, 0.5, 2.4572],
        [-0.04906, 0.5, -2.9699],
        [-2.7311, 0.5, -0.3312],
        [ 2.7884, 0.5, -0.2247]
      ].map((pos, i) => (
        <group key={`jumppad-vis-${i}`}>
          <mesh position={[pos[0], 0.04, pos[2]]} scale={[1.9, 0.05, 1.9]}>
            <boxGeometry />
            <meshStandardMaterial color="#00ffff" emissive="#00aaff" emissiveIntensity={2} roughness={0.1} toneMapped={false} />
          </mesh>
          <pointLight position={[pos[0], pos[1] + 1, pos[2]]} color="#00ffff" intensity={2} distance={5} />
        </group>
      ))}
    </group>
  );
};

// 3D Background Scene for Main Menu - Map Overview
const MenuBackground = () => {
  const cameraGroup = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cameraGroup.current) {
      // Cinematic camera movement showing the whole map
      const radius = 60;
      const speed = 0.04;
      cameraGroup.current.position.x = Math.sin(t * speed) * radius;
      cameraGroup.current.position.z = Math.cos(t * speed) * radius;
      cameraGroup.current.position.y = 30 + Math.sin(t * 0.1) * 5;
      cameraGroup.current.lookAt(0, -5, 0);
    }
  });

  return (
    <>
      <color attach="background" args={['#1a202c']} />
      <fog attach="fog" args={['#1a202c', 20, 250]} />
      
      <Sky sunPosition={[100, 20, 100]} turbidity={10} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.6} />
      <hemisphereLight groundColor="#2a3038" color="#ffffff" intensity={0.5} />
      <directionalLight castShadow position={[50, 80, 50]} intensity={1.2} shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={200} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-bias={-0.0005} shadow-normalBias={0.04} />
      <directionalLight position={[-50, 20, -20]} intensity={0.8} color="#8a9ab0" />

      <group ref={cameraGroup}>
        <PerspectiveCamera makeDefault fov={60} />
      </group>

      <MapErrorBoundary
        fallback={
          <group>
            <mesh receiveShadow position={[0, -0.5, 0]}>
              <boxGeometry args={[100, 1, 100]} />
              <meshStandardMaterial color="#3a404a" />
            </mesh>
            <mesh receiveShadow position={[0, 2, -10]}>
              <boxGeometry args={[10, 4, 1]} />
              <meshStandardMaterial color="#ff4444" />
            </mesh>
          </group>
        }
      >
        <React.Suspense fallback={null}>
          <GameplayMap />
        </React.Suspense>
      </MapErrorBoundary>

      <Sparkles count={400} scale={100} size={1} speed={0.2} opacity={0.3} color="#ffffff" />
    </>
  );
};

const menuItems = [
  { id: 'play', label: 'PLAY', icon: Play, subMenus: ['Quick Match', 'Ranked', 'Custom Match', 'Bots'] },
  { id: 'training', label: 'TRAINING', icon: CircleDot, subMenus: ['Training Ground'] },
  { id: 'settings', label: 'SETTINGS', icon: Settings, subMenus: ['Graphics', 'Sensitivity', 'Audio', 'Keybinds'] },
];

function CustomizationCamera({ focusedPart, controlsRef }: { focusedPart: 'skin' | 'outfit' | 'hat' | null, controlsRef: any }) {
  const { camera, gl } = useThree();
  const manualMode = useRef(false);

  React.useEffect(() => {
    const handleInteract = () => { manualMode.current = true; };
    const domElement = gl.domElement;
    
    domElement.addEventListener('wheel', handleInteract, { passive: true });
    domElement.addEventListener('pointerdown', handleInteract, { passive: true });
    domElement.addEventListener('touchstart', handleInteract, { passive: true });
    
    return () => {
      domElement.removeEventListener('wheel', handleInteract);
      domElement.removeEventListener('pointerdown', handleInteract);
      domElement.removeEventListener('touchstart', handleInteract);
    };
  }, [gl.domElement]);

  React.useEffect(() => {
    manualMode.current = false;
  }, [focusedPart]);
  
  useFrame((state, delta) => {
    if (manualMode.current) return;

    let desiredPos = new THREE.Vector3(0, 0.4, 4);
    let desiredLookAt = new THREE.Vector3(0, 0.2, 0);

    if (focusedPart === 'skin') {
      desiredPos.set(0, 0.8, 1.8);
      desiredLookAt.set(0, 0.8, 0);
    } else if (focusedPart === 'hat') {
      desiredPos.set(0, 1.1, 1.8);
      desiredLookAt.set(0, 1.0, 0);
    } else if (focusedPart === 'outfit') {
      desiredPos.set(0, 0.2, 2.5);
      desiredLookAt.set(0, 0.2, 0);
    } else {
        if (camera.position.distanceTo(desiredPos) < 0.05 && controlsRef.current?.target.distanceTo(desiredLookAt) < 0.05) {
            return;
        }
    }

    const lerpSpeed = focusedPart ? 5 : 2;
    camera.position.lerp(desiredPos, lerpSpeed * delta);
    if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredLookAt, lerpSpeed * delta);
        controlsRef.current.update();
    }
  });
  return null;
}

export const MainMenu = ({ onPlay, playerName }: { onPlay: (options?: { name?: string; roomCode?: string }) => void, playerName?: string | null }) => {
  const [activeMenu, setActiveMenu] = useState('play');
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  
  const [focusedPart, setFocusedPart] = useState<'skin' | 'outfit' | 'hat' | null>(null);
  const controlsRef = useRef<any>(null);
  
  // Custom Match Popup State
  const [showCustomPopup, setShowCustomPopup] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customName, setCustomName] = useState('Player_' + Math.floor(Math.random() * 9000 + 1000));
  const [roomCode, setRoomCode] = useState('');
  const [popupMode, setPopupMode] = useState<'selection' | 'create' | 'join' | 'bot_difficulty'>('selection');

  const [botCount, setBotCount] = useState(5);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setRoomCode(code);
    setPopupMode('create');
  };
  const { settings, updateSettings } = useGameStore();

  const activeMenuData = menuItems.find(m => m.id === activeMenu);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <MenuBackground />
        </Canvas>
      </div>

      {/* Vignette & CRT Effect Layers */}

      {/* Player Profile (Top Right) */}
      <div 
        className="absolute top-10 right-16 z-50 flex items-center gap-4 bg-black/40 border border-white/5 box-border px-6 py-3 rounded-xl backdrop-blur-md hover:bg-black/60 hover:border-white/10 transition-all cursor-pointer"
        onClick={() => setShowCustomization(true)}
        title="Customize Character"
      >
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-blue-500/80 font-black uppercase tracking-[0.2em] leading-none mb-1">OPERATIVE</span>
          <span className="text-lg font-black text-white uppercase tracking-wider leading-none shadow-black drop-shadow-md">{playerName || 'UNKNOWN'}</span>
        </div>
        <div className="w-12 h-12 rounded-lg bg-blue-900/40 border-2 border-blue-500/30 flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(59,130,246,0.2)] overflow-hidden">
          <Canvas camera={{ position: [0, 1, 2], fov: 30 }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[2, 2, 2]} intensity={1} />
            <group position={[0, -0.8, 0]} rotation={[0, Math.PI, 0]}>
              <UploadedCharacter 
                playerState={null} 
                position={[0, -0.6, 0]}
                outfitColor={settings.outfitColor}
                eyeColor={settings.eyeColor}
              />
            </group>
          </Canvas>
        </div>
      </div>

      {/* Character Customization Popup */}
      <AnimatePresence>
        {showCustomization && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-white/10 p-8 rounded-2xl w-[800px] max-w-[90vw] shadow-2xl relative flex gap-8"
            >
              <button 
                onClick={() => setShowCustomization(false)}
                className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex-1 bg-black/50 rounded-xl overflow-hidden relative border border-white/5 min-h-[400px]">
                 <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[5, 5, 5]} intensity={1.5} />
                    <OrbitControls 
                      ref={controlsRef}
                      enablePan={false}
                      enableZoom={true}
                      minDistance={2}
                      maxDistance={8}
                      target={[0, 1, 0]}
                    />
                    <CustomizationCamera focusedPart={focusedPart} controlsRef={controlsRef} />
                    <group rotation={[0, Math.PI, 0]}>
                      <UploadedCharacter 
                          playerState={null} 
                          position={[0, -0.6, 0]}
                          outfitColor={settings.outfitColor}
                          eyeColor={settings.eyeColor}
                      />
                    </group>
                    <Environment preset="city" />
                 </Canvas>
              </div>

              <div className="flex-1 flex flex-col justify-center" onMouseLeave={() => setFocusedPart(null)}>
                 <h2 className="text-2xl font-black italic tracking-widest text-blue-400 uppercase mb-8">Customization</h2>
                 
                 <div className="space-y-6">
                    <div onMouseEnter={() => setFocusedPart('outfit')}>
                       <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Outfit Color</label>
                       <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={settings.outfitColor}
                            onChange={(e) => updateSettings({ outfitColor: e.target.value })}
                            className="w-12 h-12 bg-transparent cursor-pointer rounded overflow-hidden"
                          />
                          <span className="font-mono text-gray-400">{settings.outfitColor.toUpperCase()}</span>
                       </div>
                    </div>

                    <div className="h-px bg-white/5 my-2"></div>

                    <div onMouseEnter={() => setFocusedPart('hat')}>
                       <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Eye Color</label>
                       <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={settings.eyeColor}
                            onChange={(e) => updateSettings({ eyeColor: e.target.value })}
                            className="w-12 h-12 bg-transparent cursor-pointer rounded overflow-hidden"
                          />
                          <span className="font-mono text-gray-400">{settings.eyeColor.toUpperCase()}</span>
                       </div>
                    </div>

                    <div className="h-px bg-white/5 my-2"></div>

                    <button 
                      onClick={() => setShowCustomization(false)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all uppercase mt-4"
                    >
                      DONE
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <div className="absolute inset-0 z-20 flex pt-32 px-16 pb-16">
        
        {/* Left Nav */}
        <div className="w-[30%] flex flex-col justify-between">
          <div>
             {/* Title container removed */}

            <nav className="flex flex-col gap-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    if (item.id === 'exit') {
                      window.location.reload();
                      return;
                    }
                    setActiveMenu(item.id);
                  }}
                  onMouseEnter={() => setHoveredMenu(item.id)}
                  onMouseLeave={() => setHoveredMenu(null)}
                  className={`relative flex items-center gap-4 px-6 py-4 rounded-xl text-left transition-all duration-300 overflow-hidden group
                    ${activeMenu === item.id 
                      ? 'bg-blue-600/20 border-l-4 border-blue-500 shadow-[inset_4px_0_20px_rgba(59,130,246,0.2)]' 
                      : 'bg-black/40 border border-white/5 hover:bg-white/10 hover:border-white/10'
                    } backdrop-blur-md`}
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 transition-opacity duration-300 ${hoveredMenu === item.id ? 'opacity-100' : ''}`}></div>
                  
                  <item.icon size={24} className={`${activeMenu === item.id ? 'text-blue-400 shadow-blue-500' : 'text-gray-400 group-hover:text-white'} transition-colors duration-300 z-10`} />
                  <span className={`text-xl font-black uppercase tracking-wider z-10 transition-colors duration-300 ${activeMenu === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {item.label}
                  </span>
                  
                  {activeMenu === item.id && (
                    <motion.div layoutId="navIndicator" className="absolute right-4 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]" />
                  )}
                </motion.button>
              ))}
            </nav>
          </div>
          
          {/* Bottom Left UI Info removed */}
        </div>

        {/* Right Content Area (Submenus) */}
        <div className="w-[70%] pl-24 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl"
            >
              
              {activeMenu === 'play' && (
                <div className="space-y-4">

                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPlay()}
                    className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500 p-8 shadow-[0_0_30px_rgba(37,99,235,0.3)] mb-6"
                  >
                     <div className="relative z-10 flex items-center justify-between">
                       <div className="text-left">
                         <h3 className="text-4xl font-black italic tracking-wider drop-shadow-lg group-hover:text-blue-200 transition-colors uppercase">PLAY</h3>
                       </div>
                       <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_white] group-hover:shadow-[0_0_30px_white] transition-shadow">
                         <Play fill="currentColor" size={32} className="text-white ml-2" />
                       </div>
                     </div>
                  </motion.button>

                  <div className="grid grid-cols-2 gap-4">
                     {activeMenuData?.subMenus.slice(1).map((sub, i) => {
                       const isRanked = sub === 'Ranked';
                       return (
                         <button 
                           key={i} 
                           disabled={isRanked}
                           onClick={() => {
                             if (sub === 'Custom Match') {
                               setShowCustomPopup(true);
                               setPopupMode('selection');
                             } else if (sub === 'Bots') {
                               setShowCustomPopup(true);
                               setPopupMode('bot_difficulty');
                             } else if (sub === 'Quick Match' || sub === 'Bots') {
                               onPlay();
                             }
                           }}
                           className={`p-6 rounded-xl transition-all text-left group overflow-hidden relative border flex justify-between items-center
                             ${isRanked 
                               ? 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed grayscale' 
                               : 'bg-black/50 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20'
                             }`}
                         >
                           <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <h4 className="text-xl font-bold uppercase tracking-wider relative z-10">{sub}</h4>
                           {isRanked && (
                             <span className="relative z-10 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                               Soon
                             </span>
                           )}
                         </button>
                       );
                     })}
                  </div>
                </div>
              )}

              {activeMenu === 'profile' && (
                <div className="space-y-6 bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl">
                   <div className="flex items-center gap-8 mb-8 pb-8 border-b border-white/10">
                     <div className="relative w-32 h-32 rounded-full border-4 border-blue-500 overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                       <div className="absolute inset-0 bg-blue-900 flex items-center justify-center text-5xl font-black">GL</div>
                     </div>
                     <div>
                       <h2 className="text-4xl font-black tracking-wider mb-2">GHOST_LEADER</h2>
                       <div className="flex gap-4 mb-4">
                         <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded text-sm font-bold tracking-widest uppercase">Online</span>
                         <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-sm font-bold tracking-widest uppercase flex items-center gap-2"><Medal size={14}/> Prestige 2</span>
                       </div>
                       <div className="w-full max-w-sm">
                         <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                           <span>Level 64</span>
                           <span>12,450 / 15,000 XP</span>
                         </div>
                         <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-[83%] shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4">
                     {[
                       { label: 'Kills', value: '4,289', icon: Crosshair, color: 'text-red-400' },
                       { label: 'Wins', value: '312', icon: Trophy, color: 'text-yellow-400' },
                       { label: 'Accuracy', value: '68.4%', icon: CircleDot, color: 'text-blue-400' },
                       { label: 'Headshots', value: '1,402', icon: TargetIcon, color: 'text-purple-400' },
                       { label: 'K/D Ratio', value: '2.14', icon: Swords, color: 'text-green-400' },
                       { label: 'Matches', value: '540', icon: CheckCircle, color: 'text-gray-400' }
                     ].map((stat, i) => (
                       <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                         <div className={`p-3 rounded-lg bg-black/40 ${stat.color}`}>
                           <stat.icon size={20} />
                         </div>
                         <div>
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                           <div className="text-2xl font-black">{stat.value}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeMenu === 'settings' && (
                <div className="space-y-6 w-full max-w-2xl bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <div className="flex items-center gap-2 mb-6">
                     <Settings className="text-blue-400" size={24} />
                     <h2 className="text-2xl font-black tracking-wider uppercase">Game Settings</h2>
                   </div>

                   {/* Sensitivity */}
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Sensitivity</label>
                       <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{settings.sensitivity.toFixed(2)}</span>
                     </div>
                     <input 
                       type="range" min="0.1" max="10" step="0.01" 
                       value={settings.sensitivity} 
                       onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                       className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                   </div>

                   {/* FOV */}
                   <div className="space-y-4 pt-4 border-t border-white/5">
                     <div className="flex justify-between items-center">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Field of View (FOV)</label>
                       <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{settings.fov}</span>
                     </div>
                     <input 
                       type="range" min="60" max="120" step="1" 
                       value={settings.fov} 
                       onChange={(e) => updateSettings({ fov: parseInt(e.target.value) })}
                       className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                   </div>

                   {/* Invert Y Axis */}
                   <div className="space-y-4 pt-4 border-t border-white/5">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">Invert Y Axis</span>
                       <input 
                         type="checkbox" 
                         checked={settings.invertMouse}
                         onChange={(e) => updateSettings({ invertMouse: e.target.checked })}
                         className="w-5 h-5 accent-blue-500"
                       />
                     </div>
                   </div>

                   {/* Keybinds */}
                   <div className="space-y-4 pt-6 border-t border-white/5 pb-4">
                     <label className="text-sm font-bold text-gray-300 uppercase tracking-widest block mb-4">Key Bindings</label>
                     <div className="space-y-2">
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
                                 if (e.key === 'Escape') return; // let parent handle it if needed
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
                </div>
              )}

              {/* Generic State for other menus */}
              {activeMenu !== 'play' && activeMenu !== 'profile' && activeMenu !== 'settings' && (
                 <div>
                   <h2 className="text-sm font-bold text-blue-400 tracking-[0.2em] mb-6 uppercase flex items-center gap-2">
                     <div className="w-8 h-px bg-blue-400"></div> {activeMenuData?.label}
                   </h2>
                   
                   <div className="grid grid-cols-2 gap-4">
                     {activeMenuData?.subMenus.map((sub, i) => (
                       <button key={i} onClick={() => { if(sub === 'Training Ground') onPlay({ roomCode: 'TRAINING_GROUND' }); }} className="bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/50 p-6 rounded-xl transition-all text-left flex justify-between items-center group">
                         <span className="text-xl font-bold uppercase tracking-wider">{sub}</span>
                         <Plus className="text-gray-600 group-hover:text-blue-400 transition-colors" size={20} />
                       </button>
                     ))}
                   </div>
                 </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Social Button bar (bottom right) removed */}

      {/* Custom Match Popup */}
      <AnimatePresence>
        {showCustomPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCustomPopup(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>

              <h2 className="text-3xl font-black italic tracking-widest text-blue-400 uppercase mb-8">Custom Match</h2>

              <div className="space-y-6">
                {popupMode === 'bot_difficulty' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Number of Bots</label>
                        <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{botCount}</span>
                      </div>
                      <input 
                        type="range" min="1" max="20" step="1" 
                        value={botCount} 
                        onChange={(e) => setBotCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-center font-bold text-gray-300 uppercase tracking-widest mb-4">Select Difficulty</h3>
                      <div className="space-y-2">
                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                          <button 
                            key={diff}
                            onClick={() => onPlay({ name: customName, roomCode: `BOT_${diff.toUpperCase()}_${botCount}` })}
                            className="w-full bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/50 text-white font-black py-4 rounded-xl transition-all uppercase flex items-center justify-center"
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {popupMode === 'selection' && (
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={generateCode}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all uppercase flex items-center justify-center gap-3"
                    >
                      <Plus size={20} /> Create Lobby
                    </button>
                    <button 
                      onClick={() => setPopupMode('join')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-4 rounded-xl transition-all uppercase flex items-center justify-center gap-3"
                    >
                      <Users size={20} /> Join Party
                    </button>
                  </div>
                )}

                {popupMode === 'create' && (
                  <div className="space-y-6 text-center">
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Lobby Code</div>
                      <div className="text-5xl font-black font-mono tracking-[0.2em] text-white bg-black/30 py-6 rounded-2xl border border-white/5 mb-4 select-all">
                        {roomCode}
                      </div>
                      <p className="text-xs text-gray-400">Share this code with your friend to play together.</p>
                    </div>
                    <button 
                      onClick={() => onPlay({ name: customName, roomCode: roomCode })}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all uppercase"
                    >
                      Start Lobby
                    </button>
                    <button onClick={() => setPopupMode('selection')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest underline underline-offset-4">Change Mode</button>
                  </div>
                )}

                {popupMode === 'join' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Party Code</label>
                      <input 
                        type="text" 
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase().substring(0, 4))}
                        placeholder="E.G. X7F2"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-10 text-3xl text-center font-black uppercase tracking-[0.3em] font-mono text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => roomCode.length === 4 && onPlay({ name: customName, roomCode: roomCode })}
                      disabled={roomCode.length !== 4}
                      className={`w-full font-black py-4 rounded-xl transition-all uppercase ${roomCode.length === 4 ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                      Join Lobby
                    </button>
                    <div className="text-center">
                      <button onClick={() => setPopupMode('selection')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest underline underline-offset-4">Back to Menu</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function TargetIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
