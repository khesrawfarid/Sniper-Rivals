import { Canvas } from "@react-three/fiber";
import * as THREE from 'three';
import { Physics } from "@react-three/rapier";
import { Sky, Stars } from "@react-three/drei";
import { Player } from "./Player";
import { Arena } from "./Arena";
import { Opponent } from "./Opponent";
import { Tracers } from "./Effects";
import { useGameStore } from "../store/gameStore";
import { MapErrorBoundary } from "./MapErrorBoundary";
import React, { Suspense, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";

const GRAVITY: [number, number, number] = [0, -25, 0];

const R3fFpsTracker = () => {
  const showFps = useGameStore((state) => state.settings.showFps);
  const frameCounter = React.useRef({ count: 0, lastTime: performance.now() });

  useFrame(() => {
    if (!showFps) return;
    const now = performance.now();
    frameCounter.current.count++;
    
    if (now - frameCounter.current.lastTime >= 1000) {
      const el = document.getElementById("fps-counter");
      if (el) {
        el.innerText = `${frameCounter.current.count} FPS`;
      }
      frameCounter.current.count = 0;
      frameCounter.current.lastTime = now;
    }
  });
  
  return null;
};

export const GameScene = () => {
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);

  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ fov: 75 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
      <R3fFpsTracker />
      <fog attach="fog" args={['#1a202c', 10, 100]} />
      <color attach="background" args={['#1a202c']} />
      
      <Sky sunPosition={[100, 20, 100]} turbidity={10} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.6} />
      <hemisphereLight groundColor="#2a3038" color="#ffffff" intensity={0.5} />
      <directionalLight castShadow position={[50, 80, 50]} intensity={1.2} shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={200} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-bias={-0.0005} shadow-normalBias={0.04} />
      <directionalLight position={[-50, 20, -20]} intensity={0.8} color="#8a9ab0" />
      
      <Physics gravity={GRAVITY}>
        <Suspense fallback={null}>
          {myId && <Player key={`player-${myId}`} />}
        </Suspense>
        <MapErrorBoundary>
          <Suspense fallback={null}>
            <Arena />
          </Suspense>
        </MapErrorBoundary>
        
        <Suspense fallback={null}>
          {Object.entries(players).map(([id, player]) => {
            if (id === myId) return null;
            return <Opponent key={id} id={id} />;
          })}
        </Suspense>
      </Physics>

      <Tracers />
    </Canvas>
  );
};
