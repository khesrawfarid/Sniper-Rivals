import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const RobotModel = ({ movingRef, scale = [0.8, 0.8, 0.8] }: { movingRef: React.MutableRefObject<boolean>, scale?: [number, number, number] }) => {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      // Hover bobbing
      group.current.position.y = -0.85 + Math.sin(time * 3) * 0.1;
    }
    
    if (movingRef.current) {
      const walkCycle = Math.sin(time * 10);
      if (leftArm.current) leftArm.current.rotation.x = -walkCycle * 0.5;
    } else {
      if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, 0.1);
    }
  });

  const bodyMaterial = <meshStandardMaterial color="#ffffff" metalness={0.6} roughness={0.2} />;
  const jointMaterial = <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.4} />;
  const accentMaterial = <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} />;
  const eyeMaterial = <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={2} toneMapped={false} />;

  return (
    <group ref={group} position={[0, -0.85, 0]} scale={scale}>
      {/* Head Group */}
      <group position={[0, 1.8, 0]}>
        {/* Main Head */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          {bodyMaterial}
        </mesh>
        
        {/* Visor Area */}
        <mesh position={[0, 0.05, -0.12]} castShadow>
          <sphereGeometry args={[0.26, 32, 32]} />
          {eyeMaterial}
        </mesh>

        {/* Earpieces */}
        <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
          {accentMaterial}
        </mesh>
        <mesh position={[0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
          {accentMaterial}
        </mesh>

        {/* Neck */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 32]} />
          {jointMaterial}
        </mesh>
      </group>

      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.3, 0.5, 32, 32]} />
        {bodyMaterial}
      </mesh>

      {/* Torso Core Accent */}
      <mesh position={[0, 1.1, -0.3]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        {eyeMaterial}
      </mesh>

      {/* Left Arm */}
      <group ref={leftArm} position={[-0.45, 1.4, 0]}>
        {/* Shoulder */}
        <mesh castShadow>
          <sphereGeometry args={[0.15, 32, 32]} />
          {accentMaterial}
        </mesh>
        {/* Upper Arm */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 32]} />
          {bodyMaterial}
        </mesh>
        {/* Elbow */}
        <mesh position={[0, -0.5, 0]} castShadow>
          <sphereGeometry args={[0.1, 32, 32]} />
          {jointMaterial}
        </mesh>
        {/* Lower Arm */}
        <mesh position={[0, -0.75, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.06, 0.4, 32]} />
          {accentMaterial}
        </mesh>
        {/* Hand */}
        <mesh position={[0, -1.0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.15]} />
          {jointMaterial}
        </mesh>
      </group>

      {/* Right Arm (Aiming Forward) */}
      <group ref={rightArm} position={[0.45, 1.4, 0]}>
        {/* Shoulder */}
        <mesh castShadow>
          <sphereGeometry args={[0.15, 32, 32]} />
          {accentMaterial}
        </mesh>
        <group rotation={[Math.PI / 2 - 0.1, 0, 0]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 32]} />
            {bodyMaterial}
          </mesh>
          {/* Elbow */}
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.1, 32, 32]} />
            {jointMaterial}
          </mesh>
          <group position={[0, -0.5, 0]}>
            {/* Lower Arm */}
            <mesh position={[0, -0.25, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.4, 32]} />
              {accentMaterial}
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, 0.15]} />
              {jointMaterial}
            </mesh>
          </group>
        </group>
      </group>

      {/* Pelvis */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.3, 32]} />
        {jointMaterial}
      </mesh>

      {/* Hover Thruster (Replaces Legs) */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.3, 32]} />
        {jointMaterial}
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        {eyeMaterial}
      </mesh>
    </group>
  );
};

