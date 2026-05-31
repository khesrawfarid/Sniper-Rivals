import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export function useFPSCamera() {
  const { camera } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  const recoil = useRef({ pitch: 0, yaw: 0 });
  const targetRecoil = useRef({ pitch: 0, yaw: 0 });
  
  const bobFactor = useRef(0);
  const breathFactor = useRef(0);
  const tilt = useRef(0);

  // Smooth mouse input
  const targetEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== document.body) return;
      const { sensitivity, invertMouse, smoothing } = useGameStore.getState().settings;
      const isScoped = useGameStore.getState().isScoped;
      
      const mY = invertMouse ? -e.movementY : e.movementY;
      const scopedMult = isScoped ? 0.2 : 1.0; 
      
      const multiplier = sensitivity * 0.002 * scopedMult;
      
      // Calculate target rotation
      targetEuler.current.y -= e.movementX * multiplier;
      targetEuler.current.x -= mY * multiplier;
      
      // Clamp pitch
      targetEuler.current.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, targetEuler.current.x));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerRecoil = (isScoped: boolean) => {
    const recoilStrength = isScoped ? 0.08 : 0.05;
    targetRecoil.current.pitch += recoilStrength + Math.random() * 0.02;
    targetRecoil.current.yaw += (Math.random() - 0.5) * 0.04;
  };

  const updateCamera = (
    pos: THREE.Vector3,
    state: { isMoving: boolean; isSprinting: boolean; isCrouching: boolean; isGrounded: boolean; isHoldingBreath: boolean; isSliding?: boolean },
    strafeDir: number, // -1 left, 1 right, 0 none
    delta: number
  ) => {
    const { settings, isScoped, matchState, health } = useGameStore.getState();

    // 1. Mouse Smoothing Fallback (forced to high smoothing)
    const smoothing = 0.90;
    if (smoothing > 0) {
      const ease = 1 - Math.pow(1 - smoothing, delta * 60);
      euler.current.x = THREE.MathUtils.lerp(euler.current.x, targetEuler.current.x, ease);
      euler.current.y = THREE.MathUtils.lerp(euler.current.y, targetEuler.current.y, ease);
    } else {
      euler.current.copy(targetEuler.current);
    }

    // 2. Recoil interpolation (spring system)
    recoil.current.pitch = THREE.MathUtils.lerp(recoil.current.pitch, targetRecoil.current.pitch, 15 * delta);
    recoil.current.yaw = THREE.MathUtils.lerp(recoil.current.yaw, targetRecoil.current.yaw, 15 * delta);
    
    // Recovery (brings target recoil back to 0)
    targetRecoil.current.pitch = THREE.MathUtils.lerp(targetRecoil.current.pitch, 0, 5 * delta);
    targetRecoil.current.yaw = THREE.MathUtils.lerp(targetRecoil.current.yaw, 0, 5 * delta);

    // 3. Update Camera base position
    const crouchOffset = state.isCrouching ? -0.35 : 0;
    const targetY = pos.y + 0.65 + crouchOffset; // Eye level
    
    camera.position.x = pos.x;
    camera.position.z = pos.z;
    // Smooth crouch transition
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 15 * delta);

    // 4. Bobbing & Breathing effects
    if (state.isGrounded && state.isMoving) {
      const speed = state.isSprinting && !isScoped ? 10 : 7;
      bobFactor.current += delta * speed;
    } else {
      // Smoothly return bob to idle center (closest multiple of PI)
      const targetBob = Math.round(bobFactor.current / Math.PI) * Math.PI;
      bobFactor.current = THREE.MathUtils.lerp(bobFactor.current, targetBob, 5 * delta);
    }

    breathFactor.current += delta * (state.isHoldingBreath ? 1.5 : 2);

    const bobAmp = state.isSprinting && !isScoped ? 0.02 : (state.isMoving ? 0.01 : 0);
    const breathAmp = state.isHoldingBreath ? 0.001 : 0.002;
    
    const bobY = Math.abs(Math.sin(bobFactor.current)) * bobAmp;
    const bobX = Math.cos(bobFactor.current) * bobAmp * 0.5;
    
    const breathY = Math.sin(breathFactor.current) * breathAmp;
    const breathX = Math.cos(breathFactor.current * 0.5) * breathAmp;

    camera.position.y += bobY + breathY;
    
    // 5. Build Final Rotation
    const finalEuler = euler.current.clone();
    
    // Add recoil
    finalEuler.x += recoil.current.pitch;
    finalEuler.y += recoil.current.yaw;
    
    // Add sway/bob orientation
    finalEuler.x -= bobY * 0.2;
    finalEuler.y -= bobX * 0.2;
    finalEuler.x += breathY;
    finalEuler.y += breathX;

    // 6. Strafing Tilt
    const targetTilt = strafeDir * (isScoped ? 0.005 : 0.02);
    tilt.current = THREE.MathUtils.lerp(tilt.current, targetTilt, 10 * delta);
    finalEuler.z += tilt.current;

    camera.quaternion.setFromEuler(finalEuler);

    // 7. Dynamic FOV
    let targetFov = settings.fov;
    if (isScoped) {
      targetFov = 20;
    }

    const pccamera = camera as THREE.PerspectiveCamera;
    if (pccamera.fov !== undefined) {
      pccamera.fov = THREE.MathUtils.lerp(pccamera.fov, targetFov, 8 * delta);
      pccamera.updateProjectionMatrix();
    }
  };

  return { updateCamera, triggerRecoil, euler: euler.current };
}
