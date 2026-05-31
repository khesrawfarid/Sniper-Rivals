import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export const SniperWeaponModel = () => (
  <>
    {/* Main Body (AWP Green) */}
    <mesh castShadow position={[0, -0.05, 0.1]}>
      <boxGeometry args={[0.08, 0.12, 0.8]} />
      <meshStandardMaterial color="#2d4232" roughness={0.8} metalness={0.2} />
    </mesh>

    {/* Stock (AWP Green) */}
    <mesh castShadow position={[0, -0.05, 0.6]}>
      <boxGeometry args={[0.07, 0.15, 0.3]} />
      <meshStandardMaterial color="#2d4232" roughness={0.8} metalness={0.2} />
    </mesh>

    {/* Shoulder Pad (Black) */}
    <mesh castShadow position={[0, -0.05, 0.77]}>
      <boxGeometry args={[0.06, 0.16, 0.04]} />
      <meshStandardMaterial color="#111" roughness={0.9} />
    </mesh>

    {/* Barrel (Black) */}
    <mesh castShadow position={[0, 0, -0.7]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.018, 0.022, 1.0, 12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.8} />
    </mesh>

    {/* Muzzle Brake */}
    <mesh castShadow position={[0, 0, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 0.1, 12]} />
      <meshStandardMaterial color="#111" roughness={0.7} metalness={0.8} />
    </mesh>

    {/* Scope */}
    <mesh castShadow position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.45, 16]} />
      <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.6} />
    </mesh>

    {/* Scope Mounts */}
    <mesh castShadow position={[0, 0.04, 0.1]}>
      <boxGeometry args={[0.04, 0.06, 0.05]} />
      <meshStandardMaterial color="#111" />
    </mesh>
    <mesh castShadow position={[0, 0.04, -0.1]}>
      <boxGeometry args={[0.04, 0.06, 0.05]} />
      <meshStandardMaterial color="#111" />
    </mesh>

    {/* Magazine */}
    <mesh castShadow position={[0, -0.15, 0.2]}>
      <boxGeometry args={[0.06, 0.15, 0.15]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>

    {/* Bolt Handle */}
    <mesh castShadow position={[0.06, 0.02, 0.25]} rotation={[0, 0, -Math.PI / 4]}>
      <cylinderGeometry args={[0.008, 0.008, 0.08]} />
      <meshStandardMaterial color="#222" metalness={0.9} />
    </mesh>
    <mesh castShadow position={[0.09, -0.01, 0.25]}>
      <sphereGeometry args={[0.015]} />
      <meshStandardMaterial color="#111" />
    </mesh>
  </>
);

export const SniperWeapon = ({ isMoving, mouseDelta }: { isMoving: boolean, mouseDelta: {x: number, y: number} }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { isScoped, isReloading } = useGameStore();

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Base Sway from time
    const swayX = Math.sin(state.clock.elapsedTime * 2) * 0.005;
    const swayY = Math.cos(state.clock.elapsedTime * 4) * 0.005;
    
    // Weapon Sway from mouse movement
    const targetSwayX = THREE.MathUtils.clamp(-mouseDelta.x * 0.0002, -0.05, 0.05);
    const targetSwayY = THREE.MathUtils.clamp(-mouseDelta.y * 0.0002, -0.05, 0.05);

    // Bobbing when moving
    const bob = isMoving ? Math.sin(state.clock.elapsedTime * 12) * 0.004 : 0;
    
    // Recoil / Reload animation
    let targetZ = 0;
    let targetRotX = 0;
    
    if (isReloading) {
      targetZ = 0.5; // pull back
      targetRotX = -0.6; // point down heavily
    } else if (isScoped) {
      // Very slight pull back
      targetZ = -0.1;
    }

    // Apply interpolation
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0.3 + swayX + targetSwayX, 10 * delta);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -0.3 + swayY + bob + targetSwayY, 10 * delta);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -0.6 + targetZ, 10 * delta);
    
    // Rotation tilts with mouse delta
    const rollSway = THREE.MathUtils.clamp(-mouseDelta.x * 0.0005, -0.1, 0.1);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, rollSway, 10 * delta);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 10 * delta);
  });

  if (isScoped) return null; // Hide mesh when scoped

  return (
    <group ref={groupRef}>
      <SniperWeaponModel />
    </group>
  );
};
