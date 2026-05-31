import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export const Particles = () => {
  return null; // Will implement if needed, keeping simple for now
};

const Tracer = ({ bullet }: { bullet: any }) => {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  const start = new THREE.Vector3(bullet.position[0], bullet.position[1], bullet.position[2]);
  const end = new THREE.Vector3();
  if (bullet.hitPoint) {
    end.set(bullet.hitPoint[0], bullet.hitPoint[1], bullet.hitPoint[2]);
  } else {
     end.copy(start).add(new THREE.Vector3(bullet.direction[0], bullet.direction[1], bullet.direction[2]).multiplyScalar(200));
  }
  
  const distance = start.distanceTo(end);
  const midPoint = start.clone().lerp(end, 0.5);
  
  const orientation = new THREE.Matrix4().lookAt(start, end, new THREE.Vector3(0, 1, 0));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

  useFrame(() => {
    const age = Date.now() - bullet.createdAt;
    if (materialRef.current) {
        let opacity = 1.0 - (age / 150);
        if (opacity < 0) opacity = 0;
        materialRef.current.opacity = opacity;
    }
  });
  
  return (
    <group position={midPoint} quaternion={quaternion}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, distance, 4]} />
        <meshBasicMaterial ref={materialRef} color="#fffebb" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Tracers = () => {
  const bullets = useGameStore(state => state.bullets);
  
  // Filter out very old bullets to avoid React rendering unneeded components
  const activeBullets = bullets.filter(b => Date.now() - b.createdAt < 200);

  return (
    <>
      {activeBullets.map(b => (
         <Tracer key={b.id} bullet={b} />
      ))}
    </>
  );
};

const ZERO_VECTOR = new THREE.Vector3(0, 0, 0);

export const MuzzleFlash = ({ visible }: { visible: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 0, 0.2);
    }
    if (meshRef.current) {
      meshRef.current.scale.lerp(ZERO_VECTOR, 0.2);
    }
  });

  // Whenever visible becomes true, pop the flash
  if (visible) {
    if (lightRef.current) lightRef.current.intensity = 5;
    if (meshRef.current) meshRef.current.scale.set(1,1,1);
  }

  return (
    <group position={[0.2, -0.2, -1]}>
      <pointLight ref={lightRef} color="orange" distance={5} intensity={0} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};
