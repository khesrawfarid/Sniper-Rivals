import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useGLTF, useAnimations } from "@react-three/drei";
import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { socket } from "../socket";

export const createJumpPadTexture = () => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  
  // Background
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(0, 0, 512, 512);
  
  // Outer border
  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 496);
  
  // Grid
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.stroke();
  }
  
  // Center arrows
  ctx.fillStyle = "#00ffff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 15;
  
  for (let y = 120; y <= 320; y += 100) {
    ctx.beginPath();
    ctx.moveTo(256, y);
    ctx.lineTo(384, y + 100);
    ctx.lineTo(256, y + 60);
    ctx.lineTo(128, y + 100);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Ensure the texture repeats nicely if scaled
  texture.repeat.set(2, 2);
  return texture;
};

export const Arena = () => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}arenamap.v.2.0.glb`);
  const padTex = useMemo(() => createJumpPadTexture(), []);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Apply stylized "low poly / Fortnite" shading to all general environment meshes
        if (child.material) {
          if (child.name.toLowerCase().includes('invis') || 
              child.name.toLowerCase().includes('collis') || 
              child.name.toLowerCase().includes('bound') || 
              child.name.toLowerCase().includes('kollision') ||
              child.name.toLowerCase().includes('clip')) {
            child.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
          } else {
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
        }
        
        if (['Cube.005', 'Cube.006', 'Cube.007', 'Cube.008'].includes(child.name)) {
          // Lower platform for a smooth step-up
          child.position.y = 0.05; 
          child.updateMatrix();
          
          // Apply a glowing jump-pad texture material
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
  
  useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => action?.play());
    }
  }, [actions]);

  useEffect(() => {
    // Only extract and send collision boxes if we haven't done it yet
    const boxes: { minX: number, maxX: number, minZ: number, maxZ: number }[] = [];
    const box3 = new THREE.Box3();
    
    clonedScene.updateMatrixWorld(true);

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (bbox) {
          box3.copy(bbox).applyMatrix4(child.matrixWorld);
          
          // Heuristic: if it's tall enough, it's a wall/obstacle. Ignore flat floors.
          const height = box3.max.y - box3.min.y;
          const width = box3.max.x - box3.min.x;
          const depth = box3.max.z - box3.min.z;
          if (height > 1.5 && width < 40 && depth < 40) {
            boxes.push({
              minX: box3.min.x - 1,
              maxX: box3.max.x + 1,
              minZ: box3.min.z - 1,
              maxZ: box3.max.z + 1
            });
          }
        }
      }
    });

    if (boxes.length > 0) {
      socket.emit("uploadMapBoxes", boxes);
    }
  }, [clonedScene]);

  return (
    <group ref={group}>
      <RigidBody type="fixed" colliders="trimesh">
        <primitive object={clonedScene} name="arena" />
      </RigidBody>

      {/* Invisible Boundary Walls (Removed as requested) */}

      {/* Jump pad visuals and sensors */}
      {[
        [-0.04906, 0.5, 2.4572],
        [-0.04906, 0.5, -2.9699],
        [-2.7311, 0.5, -0.3312],
        [ 2.7884, 0.5, -0.2247]
      ].map((pos, i) => (
        <group key={`jumppad-group-${i}`}>
          <mesh position={[pos[0], 0.04, pos[2]]} scale={[1.9, 0.05, 1.9]}>
            <boxGeometry />
            <meshStandardMaterial color="#00ffff" emissive="#00aaff" emissiveIntensity={2} roughness={0.1} toneMapped={false} />
          </mesh>
          <pointLight position={[pos[0], pos[1] + 1, pos[2]]} color="#00ffff" intensity={2} distance={5} />
          <RigidBody 
            type="fixed" 
            sensor 
            onIntersectionEnter={(e) => {
              if (e.other.rigidBodyObject?.name?.startsWith("player")) {
                const rb = e.other.rigidBody;
                if (rb) {
                  const vel = rb.linvel();
                  rb.setLinvel({ x: vel.x, y: 35, z: vel.z }, true);
                }
              }
            }}
          >
            <CuboidCollider args={[1, 0.5, 1]} position={pos as [number, number, number]} />
          </RigidBody>
        </group>
      ))}
    </group>
  );
};


