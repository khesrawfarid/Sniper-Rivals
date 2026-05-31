import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const RobotModel = ({ movingRef }: { movingRef: React.MutableRefObject<boolean> }) => {
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

  // Materials
  const whitePlastic = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.1 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.6, metalness: 0.8 });
  const chromeMetal = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.2, metalness: 0.9 });
  const glowBlue = new THREE.MeshStandardMaterial({ color: '#00ffff', emissive: '#00ccff', emissiveIntensity: 2, toneMapped: false });
  const blackGlass = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.1, metalness: 0.8 });

  return (
    <group ref={group} position={[0, -0.85, 0]} scale={[0.8, 0.8, 0.8]}>
      {/* Head Group */}
      <group position={[0, 1.8, 0]}>
        {/* Main Head */}
        <mesh material={whitePlastic} castShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
        </mesh>
        
        {/* Visor */}
        <mesh material={blackGlass} position={[0, 0.05, -0.12]} scale={[1, 0.6, 1]} rotation={[0, Math.PI, 0]}>
          <sphereGeometry args={[0.26, 32, 32, 0, Math.PI, 0, Math.PI / 2.5]} />
        </mesh>

        {/* Glowing Eyes */}
        <mesh material={glowBlue} position={[-0.1, 0.05, -0.32]}>
          <circleGeometry args={[0.04, 16]} />
        </mesh>
        <mesh material={glowBlue} position={[0.1, 0.05, -0.32]}>
          <circleGeometry args={[0.04, 16]} />
        </mesh>

        {/* Earpieces */}
        <mesh material={chromeMetal} position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        </mesh>
        <mesh material={glowBlue} position={[-0.37, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.1, 0.12, 32]} />
        </mesh>
        
        <mesh material={chromeMetal} position={[0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        </mesh>
        <mesh material={glowBlue} position={[0.37, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.1, 0.12, 32]} />
        </mesh>

        {/* Neck */}
        <mesh material={darkMetal} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 16]} />
        </mesh>
      </group>

      {/* Torso */}
      <mesh material={whitePlastic} position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.5, 16, 16]} />
      </mesh>
      
      {/* Torso core accent */}
      <mesh material={glowBlue} position={[0, 1.1, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArm} position={[-0.45, 1.4, 0]}>
        {/* Shoulder */}
        <mesh material={chromeMetal} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        {/* Upper Arm */}
        <mesh material={whitePlastic} position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
        </mesh>
        {/* Elbow */}
        <mesh material={darkMetal} position={[0, -0.5, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
        </mesh>
        {/* Lower Arm */}
        <mesh material={chromeMetal} position={[0, -0.75, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.06, 0.4, 16]} />
        </mesh>
        {/* Hand */}
        <mesh material={darkMetal} position={[0, -1.0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.15]} />
        </mesh>
      </group>

      {/* Right Arm (Aiming forward to shoot) */}
      <group ref={rightArm} position={[0.45, 1.4, 0]}>
        {/* Shoulder */}
        <mesh material={chromeMetal} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        
        {/* The rest of the arm pointing forward */}
        <group rotation={[Math.PI / 2 - 0.1, 0, 0]}>
          {/* Upper Arm */}
          <mesh material={whitePlastic} position={[0, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
          </mesh>
          {/* Elbow */}
          <mesh material={darkMetal} position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
          </mesh>
          {/* Lower Arm */}
          <group position={[0, -0.5, 0]}>
            <mesh material={chromeMetal} position={[0, -0.25, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.4, 16]} />
            </mesh>
            {/* Hand */}
            <mesh material={darkMetal} position={[0, -0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, 0.15]} />
            </mesh>
            {/* Glowing Blaster inside the hand */}
            <mesh material={glowBlue} position={[0, -0.58, 0]}>
              <sphereGeometry args={[0.05, 16, 16]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Pelvis */}
      <mesh material={darkMetal} position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
      </mesh>

      {/* Hover Thruster (Instead of Legs) */}
      <mesh material={darkMetal} position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.2, 16]} />
      </mesh>
      <mesh material={glowBlue} position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.2, 16]} />
      </mesh>
      
      {/* Thruster Flame/Glow Effect */}
      <mesh material={glowBlue} position={[0, 0.40, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.05, 16, 16]} />
      </mesh>
    </group>
  );
};
