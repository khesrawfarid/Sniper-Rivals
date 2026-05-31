import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from 'three';
import { Physics } from "@react-three/rapier";
import { Sky, Stars } from "@react-three/drei";
import { Player } from "./Player";
import { Arena } from "./Arena";
import { Opponent } from "./Opponent";
import { Tracers } from "./Effects";
import { useGameStore } from "../store/gameStore";
import { MapErrorBoundary } from "./MapErrorBoundary";
import React, { Suspense } from "react";

const BULLET_LIFETIME = 2000; // ms

// Helper to clean up old bullets
const GameManager = () => {
  useFrame(() => {
    const state = useGameStore.getState();
    const now = Date.now();
    const oldBullets = state.bullets.filter(b => now - b.createdAt > BULLET_LIFETIME);
    if (oldBullets.length > 0) {
      oldBullets.forEach(b => state.removeBullet(b.id));
    }
  });
  return null;
};

const GRAVITY: [number, number, number] = [0, -25, 0];

export const GameScene = () => {
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);

  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ fov: 75 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
      <fog attach="fog" args={['#1a202c', 10, 100]} />
      <color attach="background" args={['#1a202c']} />
      
      <Sky sunPosition={[100, 20, 100]} turbidity={10} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.6} />
      <hemisphereLight groundColor="#2a3038" color="#ffffff" intensity={0.5} />
      <directionalLight castShadow position={[50, 80, 50]} intensity={1.2} shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={200} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-bias={-0.0005} shadow-normalBias={0.04} />
      <directionalLight position={[-50, 20, -20]} intensity={0.8} color="#8a9ab0" />
      
      <Physics gravity={GRAVITY}>
        <GameManager />
        {myId && <Player key={`player-${myId}`} />}
        <MapErrorBoundary>
          <Suspense fallback={null}>
            <Arena />
          </Suspense>
        </MapErrorBoundary>
        
        {Object.entries(players).map(([id, player]) => {
          if (id === myId) return null;
          return <Opponent key={id} id={id} />;
        })}
      </Physics>

      <Tracers />
    </Canvas>
  );
};
