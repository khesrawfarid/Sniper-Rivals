import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGameStore } from "../store/gameStore";
import { SniperWeaponModel } from "./SniperWeapon";
import { useGLTF, Clone, useAnimations } from "@react-three/drei";
import { RobotModel } from "./RobotModel";

export const UploadedCharacter = ({ playerState, outfitColor = "#2b6cb0", eyeColor = "#1a202c", position = [0, -0.85, 0], scale = [0.8, 0.8, 0.8], hasWeapon = false }: { playerState?: any, outfitColor?: string, eyeColor?: string, position?: [number, number, number], scale?: [number, number, number], hasWeapon?: boolean }) => {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}spieler.v.02.glb`);
  const modelRef = useRef<THREE.Group>(null);
  
  // Compute normalized bounding box info using useMemo so it only happens once
  const metrics = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    
    let meshIndex = 0;
    clone.traverse((child: any) => {
      if (child.isMesh) {
         if (child.material) {
           child.material = child.material.clone();
           
           if (meshIndex === 3 || meshIndex === 4) {
              child.material = new THREE.MeshStandardMaterial({
                color: eyeColor,
                flatShading: true
              });
           } else {
              // Default fallback coloring for the custom user mesh
              child.material = new THREE.MeshStandardMaterial({
                color: outfitColor,
                flatShading: true
              });
           }
           
           child.material.flatShading = true;
           child.material.needsUpdate = true;
         }
         meshIndex++;
      }
    });
    
    // Calculate bounding box so we can dynamically place eyes/hands!
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Let's normalize the clone scale so it roughly fits in a 1.8 unit tall box
    const targetHeight = 1.8;
    const modelScale = targetHeight / (size.y === 0 ? 1 : size.y);
    clone.scale.setScalar(modelScale);
    
    // Recompute box after scaling to get positions for eyes and hands
    const normalizedBox = new THREE.Box3().setFromObject(clone);
    const nSize = normalizedBox.getSize(new THREE.Vector3());
    const nCenter = normalizedBox.getCenter(new THREE.Vector3());
    
    // Offset the model so its feet are at Y=0
    clone.position.y = -normalizedBox.min.y;

    return {
      clone
    };
  }, [scene, outfitColor, eyeColor]);

  const weaponRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();
    
    const isMoving = playerState ? playerState.isMoving : false;
    const isSprinting = playerState ? playerState.isSprinting : false;
    const isCrouching = playerState ? playerState.isCrouching : false;
    const isJumping = playerState ? playerState.isJumping : false;
    const pitch = playerState ? playerState.rx || 0 : 0;

    if (weaponRef.current) {
        // Apply pitch (rx from camera) to the weapon so opponents see where they are aiming
        // We invert the pitch because the weapon is rotated 180 degrees on Y
        weaponRef.current.rotation.x = THREE.MathUtils.lerp(weaponRef.current.rotation.x, -pitch, 10 * delta);
    }

    let targetY = 0;
    let targetRotX = 0;
    let targetRotZ = 0;
    let targetScaleY = 1;
    let targetScaleXZ = 1;

    if (isCrouching) {
       targetScaleY = 0.65;
       targetScaleXZ = 1.15;
       targetY = -0.3;
    } else if (isJumping) {
       targetScaleY = 1.15;
       targetScaleXZ = 0.9;
    }

    if (isMoving && !isJumping) {
       const speedScale = isSprinting ? 20 : 12;
       const bounceAmp = isSprinting ? 0.1 : 0.05;
       targetY += Math.abs(Math.sin(t * speedScale)) * bounceAmp;
       
       targetRotZ = Math.sin(t * (speedScale * 0.5)) * (isSprinting ? 0.15 : 0.08);
       targetRotX = isSprinting ? 0.2 : 0.05;
    } else if (!isMoving && !isJumping && !isCrouching) {
       targetScaleY = 1 + Math.sin(t * 3) * 0.02;
       targetScaleXZ = 1 + Math.cos(t * 3) * 0.01;
    }

    modelRef.current.position.y = THREE.MathUtils.lerp(modelRef.current.position.y, targetY, 15 * delta);
    modelRef.current.rotation.x = THREE.MathUtils.lerp(modelRef.current.rotation.x, targetRotX, 15 * delta);
    modelRef.current.rotation.z = THREE.MathUtils.lerp(modelRef.current.rotation.z, targetRotZ, 15 * delta);
    
    // Scale must be applied carefully considering the original modelScale.
    // Wait, modelRef is inside scale={scale}, so its native scale is 1.
    modelRef.current.scale.x = THREE.MathUtils.lerp(modelRef.current.scale.x, targetScaleXZ, 15 * delta);
    modelRef.current.scale.y = THREE.MathUtils.lerp(modelRef.current.scale.y, targetScaleY, 15 * delta);
    modelRef.current.scale.z = THREE.MathUtils.lerp(modelRef.current.scale.z, targetScaleXZ, 15 * delta);
  });

  return (
    <group position={position} scale={scale}>
      <group ref={modelRef}>
         <primitive object={metrics.clone} castShadow receiveShadow />
         {hasWeapon && (
           <group ref={weaponRef} position={[0.2, 0.8, 0.5]} rotation={[0, Math.PI, 0]} scale={0.9}>
             <SniperWeaponModel />
           </group>
         )}
      </group>
    </group>
  );
};

export const Opponent = ({ id }: { id: string }) => {
  const meshRef = useRef<THREE.Group>(null);
  const botGroupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const movingRef = useRef(false);
  const playerState = useGameStore((state) => state.players[id]);

  useFrame((state, delta) => {
    if (!meshRef.current || !playerState) return;

    // Smooth interpolation
    targetPos.current.set(playerState.x, playerState.y, playerState.z);
    const dist = meshRef.current.position.distanceTo(targetPos.current);
    
    if (dist > 5) {
      meshRef.current.position.copy(targetPos.current);
      movingRef.current = false;
    } else {
      movingRef.current = dist > 0.05;
      meshRef.current.position.lerp(targetPos.current, THREE.MathUtils.clamp(12 * delta, 0, 1));
    }
    
    // Yaw rotation
    const currentRot = meshRef.current.rotation.y;
    // Handle wrap around smoothly
    let diff = playerState.ry - currentRot;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    meshRef.current.rotation.y += diff * THREE.MathUtils.clamp(15 * delta, 0, 1);

    // Bot Animation
    if (botGroupRef.current) {
      const timeOffset = parseInt(id.replace(/\D/g, '')) || 0;
      botGroupRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 2 + timeOffset) * 0.05;
    }
  });

  if (!playerState || playerState.health <= 0) return null;

  const isTarget = id.startsWith('target_') || playerState.isTarget;
  const isBot = id.startsWith('bot_');

  return (
    <group ref={meshRef} name={`opponent-${id}`}>
      {/* Invisible Hitbox scaled exactly like the new player size (-0.85 to 0.85 local Y height) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.6, 1.7, 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {isTarget ? (
        <>
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
            
            {/* Target rings facing front (+Z) */}
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
            
            {/* Target rings facing back (-Z) */}
            <group rotation={[-Math.PI / 2, 0, 0]}>
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
        </>
      ) : isBot ? (
        <>
          <RobotModel movingRef={movingRef} />
        </>
      ) : (
        <>
          <UploadedCharacter 
             playerState={playerState} 
             outfitColor={playerState.outfitColor || "#2b6cb0"}
             eyeColor={playerState.eyeColor || "#1a202c"}
             hasWeapon={true}
          />
        </>
      )}
    </group>
  );
};


