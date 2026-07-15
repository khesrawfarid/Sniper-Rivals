import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

const LETTER_CHARS = ['ا', 'ب', 'پ', 'ت', 'ج', 'چ', 'خ', 'د', 'ر', 'ز', 'ش', 'ع', 'ف', 'ک', 'گ', 'م', 'ن', 'و', 'ه', 'ی'];

export const getLetterTextures = () => {
  if (!(window as any).__letterTextures) {
    const textures: THREE.CanvasTexture[] = [];
    for (const char of LETTER_CHARS) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 32, 32);
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
    }
    (window as any).__letterTextures = textures;
  }
  return (window as any).__letterTextures as THREE.CanvasTexture[];
};

type VolumeProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: THREE.ColorRepresentation;
  density?: number;
  opacity?: number;
};

type BoxVolumeProps = VolumeProps & { args: [number, number, number] };
type SphereVolumeProps = VolumeProps & { args: [number] };
type CylinderVolumeProps = VolumeProps & { args: [number, number, number] }; // rTop, rBottom, height

const TILE_SIZE = 0.12;

export const LetterBox = ({ args, position, rotation, scale, color = '#ffffff', density = 50, opacity = 1 }: BoxVolumeProps) => {
  const [w, h, d] = args;
  
  const instanceData = useMemo(() => {
    const data = Array.from({ length: LETTER_CHARS.length }, () => [] as THREE.Matrix4[]);
    const dummy = new THREE.Object3D();
    
    const scaleFactor = Math.min(2.5, Math.max(0.2, 30 / Math.max(1, density)));
    const currentTileSize = TILE_SIZE * scaleFactor;
    const step = currentTileSize * 0.8;
    
    const xSteps = Math.max(1, Math.floor(w / step));
    const ySteps = Math.max(1, Math.floor(h / step));
    const zSteps = Math.max(1, Math.floor(d / step));
    
    const addPlane = (axes: string[], countA: number, countB: number, offsetAxis: string, offsetValue: number, faceNormal: THREE.Vector3) => {
       for (let a = 0; a <= countA; a++) {
         for (let b = 0; b <= countB; b++) {
             const pos: any = { x: 0, y: 0, z: 0 };
             pos[axes[0]] = countA === 0 ? 0 : (a / countA - 0.5) * (axes[0] === 'x' ? w : axes[0] === 'y' ? h : d);
             pos[axes[1]] = countB === 0 ? 0 : (b / countB - 0.5) * (axes[1] === 'x' ? w : axes[1] === 'y' ? h : d);
             pos[offsetAxis] = offsetValue;
             
             dummy.position.set(pos.x, pos.y, pos.z);
             const lookTarget = dummy.position.clone().add(faceNormal);
             dummy.lookAt(lookTarget);
             
             dummy.scale.setScalar(currentTileSize * 1.3);
             dummy.updateMatrix();
             data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
         }
       }
    };
    
    addPlane(['x', 'y'], xSteps, ySteps, 'z', d/2, new THREE.Vector3(0, 0, 1));
    addPlane(['x', 'y'], xSteps, ySteps, 'z', -d/2, new THREE.Vector3(0, 0, -1));
    addPlane(['z', 'y'], zSteps, ySteps, 'x', w/2, new THREE.Vector3(1, 0, 0));
    addPlane(['z', 'y'], zSteps, ySteps, 'x', -w/2, new THREE.Vector3(-1, 0, 0));
    addPlane(['x', 'z'], xSteps, zSteps, 'y', h/2, new THREE.Vector3(0, 1, 0));
    addPlane(['x', 'z'], xSteps, zSteps, 'y', -h/2, new THREE.Vector3(0, -1, 0));

    return data;
  }, [w, h, d, density]);

  return <LetterInstancer instanceData={instanceData} position={position} rotation={rotation} scale={scale} color={color} opacity={opacity} />;
};

export const LetterSphere = ({ args, position, rotation, scale, color = '#ffffff', density = 50, opacity = 1 }: SphereVolumeProps) => {
  const [r] = args;

  const instanceData = useMemo(() => {
    const data = Array.from({ length: LETTER_CHARS.length }, () => [] as THREE.Matrix4[]);
    const dummy = new THREE.Object3D();

    const scaleFactor = Math.min(2.5, Math.max(0.2, 30 / Math.max(1, density)));
    const currentTileSize = TILE_SIZE * scaleFactor;
    const step = currentTileSize * 0.8;
    
    const latSteps = Math.max(2, Math.floor((Math.PI * r) / step));
    
    for (let i = 0; i <= latSteps; i++) {
        const phi = (i / latSteps) * Math.PI; 
        const radiusAtPhi = r * Math.sin(phi);
        const lonSteps = Math.max(1, Math.floor((2 * Math.PI * radiusAtPhi) / step));
        
        for (let j = 0; j < lonSteps; j++) {
            const theta = (j / lonSteps) * 2 * Math.PI;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const z = r * Math.sin(phi) * Math.sin(theta);
            const y = r * Math.cos(phi);
            
            dummy.position.set(x, y, z);
            dummy.lookAt(x * 2, y * 2, z * 2);
            dummy.scale.setScalar(currentTileSize * 1.3);
            dummy.updateMatrix();
            data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
        }
    }
    return data;
  }, [r, density]);

  return <LetterInstancer instanceData={instanceData} position={position} rotation={rotation} scale={scale} color={color} opacity={opacity} />;
};

export const LetterCylinder = ({ args, position, rotation, scale, color = '#ffffff', density = 50, opacity = 1 }: CylinderVolumeProps) => {
  const [rTop, rBottom, h] = args;

  const instanceData = useMemo(() => {
    const data = Array.from({ length: LETTER_CHARS.length }, () => [] as THREE.Matrix4[]);
    const dummy = new THREE.Object3D();

    const scaleFactor = Math.min(2.5, Math.max(0.2, 30 / Math.max(1, density)));
    const currentTileSize = TILE_SIZE * scaleFactor;
    const step = currentTileSize * 0.8;
    
    const hSteps = Math.max(1, Math.floor(h / step));
    
    // Side
    for (let i = 0; i <= hSteps; i++) {
       const height = (i / hSteps) * h - h / 2;
       const currentR = rBottom + (rTop - rBottom) * (i / hSteps);
       const thetaSteps = Math.max(1, Math.floor((2 * Math.PI * currentR) / step));
       
       for (let j = 0; j < thetaSteps; j++) {
           const theta = (j / thetaSteps) * 2 * Math.PI;
           const x = currentR * Math.cos(theta);
           const z = currentR * Math.sin(theta);
           
           dummy.position.set(x, height, z);
           dummy.lookAt(x * 2, height, z * 2); 
           dummy.scale.setScalar(currentTileSize * 1.3);
           dummy.updateMatrix();
           data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
       }
    }
    
    // caps
    [rTop, rBottom].forEach((radius, capIndex) => {
        if (radius > 0) {
            const radSteps = Math.max(1, Math.floor(radius / step));
            const yPos = capIndex === 0 ? h / 2 : -h / 2;
            const yLook = capIndex === 0 ? h / 2 + 1 : -h / 2 - 1;
            
            for (let rStep = 1; rStep <= radSteps; rStep++) {
                const currentR = (rStep / radSteps) * radius;
                const thetaSteps = Math.max(1, Math.floor((2 * Math.PI * currentR) / step));
                for (let j = 0; j < thetaSteps; j++) {
                    const theta = (j / thetaSteps) * 2 * Math.PI;
                    dummy.position.set(currentR * Math.cos(theta), yPos, currentR * Math.sin(theta));
                    dummy.lookAt(dummy.position.x, yLook, dummy.position.z); 
                    dummy.scale.setScalar(currentTileSize * 1.3);
                    dummy.updateMatrix();
                    data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
                }
            }
        }
    });

    return data;
  }, [rTop, rBottom, h, density]);

  return <LetterInstancer instanceData={instanceData} position={position} rotation={rotation} scale={scale} color={color} opacity={opacity} />;
};

type CapsuleVolumeProps = VolumeProps & { args: [number, number] }; // radius, length

export const LetterCapsule = ({ args, position, rotation, scale, color = '#ffffff', density = 50, opacity = 1 }: CapsuleVolumeProps) => {
  const [r, h] = args;

  const instanceData = useMemo(() => {
    const data = Array.from({ length: LETTER_CHARS.length }, () => [] as THREE.Matrix4[]);
    const dummy = new THREE.Object3D();

    const scaleFactor = Math.min(2.5, Math.max(0.2, 30 / Math.max(1, density)));
    const currentTileSize = TILE_SIZE * scaleFactor;
    const step = currentTileSize * 0.8;
    
    const hSteps = Math.max(1, Math.floor(h / step));
    
    // Middle Cylinder part
    for (let i = 0; i <= hSteps; i++) {
       const height = (i / hSteps) * h - h / 2;
       const thetaSteps = Math.max(1, Math.floor((2 * Math.PI * r) / step));
       
       for (let j = 0; j < thetaSteps; j++) {
           const theta = (j / thetaSteps) * 2 * Math.PI;
           const x = r * Math.cos(theta);
           const z = r * Math.sin(theta);
           
           dummy.position.set(x, height, z);
           dummy.lookAt(x * 2, height, z * 2); 
           dummy.scale.setScalar(currentTileSize * 1.3);
           dummy.updateMatrix();
           data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
       }
    }
    
    // Top and Bottom Hemispheres
    const latSteps = Math.max(1, Math.floor((Math.PI * r / 2) / step));
    
    for (let isTop of [true, false]) {
        for (let i = 1; i <= latSteps; i++) { 
            const phi = (i / latSteps) * (Math.PI / 2); 
            const radiusAtPhi = r * Math.cos(phi);
            const lonSteps = Math.max(1, Math.floor((2 * Math.PI * radiusAtPhi) / step));
            
            for (let j = 0; j < lonSteps; j++) {
                const theta = (j / lonSteps) * 2 * Math.PI;
                
                const x = r * Math.cos(phi) * Math.cos(theta);
                const z = r * Math.cos(phi) * Math.sin(theta);
                const yOffset = r * Math.sin(phi);
                const y = isTop ? h / 2 + yOffset : -h / 2 - yOffset;
                
                dummy.position.set(x, y, z);
                dummy.lookAt(x * 2, isTop ? (y + yOffset) * 2 : (y - yOffset) * 2, z * 2);
                dummy.scale.setScalar(currentTileSize * 1.3);
                dummy.updateMatrix();
                data[Math.floor(Math.random() * LETTER_CHARS.length)].push(dummy.matrix.clone());
            }
        }
    }
    
    return data;
  }, [r, h, density]);

  return <LetterInstancer instanceData={instanceData} position={position} rotation={rotation} scale={scale} color={color} opacity={opacity} />;
};

const LetterInstancer = ({ instanceData, position, rotation, scale, color, opacity = 1 }: { instanceData: THREE.Matrix4[][]; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; color: THREE.ColorRepresentation, opacity?: number }) => {
  const textures = getLetterTextures();
  
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {instanceData.map((matrices, index) => {
        if (matrices.length === 0) return null;
        return (
          <InstancedMeshWrapper key={index} matrices={matrices} texture={textures[index]} color={color} opacity={opacity} />
        );
      })}
    </group>
  );
};

const InstancedMeshWrapper = ({ matrices, texture, color, opacity = 1 }: { matrices: THREE.Matrix4[], texture: THREE.Texture, color: THREE.ColorRepresentation, opacity?: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useLayoutEffect(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => {
        meshRef.current!.setMatrixAt(i, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, matrices.length]} castShadow receiveShadow visible={opacity > 0.01}>
      <planeGeometry args={[1, 1]} />
      <meshPhysicalMaterial 
        color={color} 
        map={texture} 
        alphaTest={opacity < 1 ? 0 : 0.5} 
        transparent={true} 
        opacity={opacity}
        side={THREE.DoubleSide} 
        metalness={1.0} 
        roughness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.0}
        envMapIntensity={10.0}
        emissive={color}
        emissiveIntensity={2.5}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
