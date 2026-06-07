import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";
import { socket } from "../socket";
import { playSound } from "../utils/audio";
import { SniperWeapon } from "./SniperWeapon";
import { MuzzleFlash } from "./Effects";
import { useFPSCamera } from "../hooks/useFPSCamera";

const BASE_SPEED = 4;
const SPRINT_SPEED = 7;
const JUMP_FORCE = 7;
const FIRE_RATE_MS = 1500;
const RELOAD_MS = 2500;

const pressedKeys = new Set<string>();

window.addEventListener("keydown", (e) => {
  pressedKeys.add(e.key.toLowerCase());
  if (e.code === "Space") pressedKeys.add(" ");
});
window.addEventListener("keyup", (e) => {
  pressedKeys.delete(e.key.toLowerCase());
  if (e.code === "Space") pressedKeys.delete(" ");
});

const COLLIDER_ARGS: [number, number] = [0.55, 0.3];
const DEFAULT_POSITION: [number, number, number] = [0, 5, 0];

export const Player = ({ position = DEFAULT_POSITION }: { position?: [number, number, number] }) => {
  const { rapier, world } = useRapier();
  const { camera, scene } = useThree();
  const bodyRef = useRef<RapierRigidBody>(null);
  const raycaster = useRef(new THREE.Raycaster());
  
  const lastEmitTime = useRef(0);
  const lastFireTime = useRef(0);
  
  const myId = useGameStore((state) => state.myId);
  const { ammo, matchState, health, showSettings } = useGameStore();
  const [isMoving, setIsMoving] = useState(false);
  const [flash, setFlash] = useState(false);

  const { updateCamera, triggerRecoil, euler } = useFPSCamera();

  // Weapon sway specific
  const mouseDelta = useRef({ x: 0, y: 0 });
  const weaponContainerRef = useRef<THREE.Group>(null);

  const isSliding = useRef(false);
  const slideStartTime = useRef(0);
  const lastSlideEndTime = useRef(0);
  const slideDirection = useRef(new THREE.Vector3());
  const prevCrouch = useRef(false);
  const crouchToggle = useRef(false);
  const crouchKeyWasPressed = useRef(false);
  const sprintToggle = useRef(false);
  const sprintKeyWasPressed = useRef(false);

  const isDead = useRef(false);
  const prevGrounded = useRef(true);
  const lastStepTime = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        mouseDelta.current.x = THREE.MathUtils.lerp(mouseDelta.current.x, e.movementX, 0.5);
        mouseDelta.current.y = THREE.MathUtils.lerp(mouseDelta.current.y, e.movementY, 0.5);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.pointerLockElement !== document.body) return;
      const store = useGameStore.getState();
      const key_r = store.settings.keybinds.reload.toLowerCase();
      if (e.key.toLowerCase() === key_r) {
        if (matchState === 'playing' && health > 0 && !store.isReloading && store.ammo < 5) {
          playSound('reload');
          store.setLocalState({ isReloading: true, isScoped: false });
          setTimeout(() => {
            useGameStore.getState().setLocalState({ ammo: 5, isReloading: false });
          }, RELOAD_MS);
        }
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== document.body) return;
      if (matchState !== 'playing' || health <= 0) return;

      const store = useGameStore.getState();

      if (e.button === 2) {
        store.setLocalState({ isScoped: true });
        playSound('scope');
        return;
      }
      
      if (e.button === 0) {
        const now = Date.now();
        if (store.isReloading || now - lastFireTime.current < FIRE_RATE_MS || store.ammo <= 0) {
          if (store.ammo <= 0 && !store.isReloading) {
            playSound('reload');
            store.setLocalState({ isReloading: true, isScoped: false });
            setTimeout(() => {
              useGameStore.getState().setLocalState({ ammo: 5, isReloading: false });
            }, RELOAD_MS);
          }
          return;
        }

        lastFireTime.current = now;
        store.setLocalState({ ammo: store.ammo - 1, isScoped: false });
        playSound('shoot');
        setFlash(true);
        setTimeout(() => setFlash(false), 50);

        triggerRecoil(store.isScoped);

        if (store.ammo - 1 <= 0) {
          setTimeout(() => {
            if (useGameStore.getState().health > 0) {
              playSound('reload');
              useGameStore.getState().setLocalState({ isReloading: true });
              setTimeout(() => {
                useGameStore.getState().setLocalState({ ammo: 5, isReloading: false });
              }, RELOAD_MS);
            }
          }, 500);
        }

        const directionV = new THREE.Vector3();
        camera.getWorldDirection(directionV);
        const pos = camera.position.clone();
        
        const bulletId = Math.random().toString(36).substring(7);
        
        raycaster.current.set(pos, directionV);
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        
        let localHitPoint: THREE.Vector3 | null = null;
        
        for (let hit of intersects) {
          // Ignore our own weapon model
          if (hit.object.name === "weapon") continue;

          localHitPoint = hit.point.clone();

          let obj: THREE.Object3D | null = hit.object;
          let opponentHit = null;
          while (obj) {
            if (obj.name && obj.name.startsWith("opponent-")) {
              opponentHit = obj;
              break;
            }
            obj = obj.parent;
          }

          if (opponentHit) {
            const hitId = opponentHit.name.substring("opponent-".length);
            const hitPointYLocal = opponentHit.worldToLocal(hit.point.clone()).y;
            const isHeadshot = hitPointYLocal > 0.3;
            
            playSound(isHeadshot ? 'headshot' : 'hit');
            store.addHitmarker(isHeadshot);

            socket.emit("hit", { id: hitId, headshot: isHeadshot });
            break;
          }
          if (hit.object.name === "arena") {
            break; 
          }
        }
        
        const endPos: [number, number, number] | null = localHitPoint ? [localHitPoint.x, localHitPoint.y, localHitPoint.z] : null;

        socket.emit("shoot", {
          position: [pos.x, pos.y, pos.z],
          direction: [directionV.x, directionV.y, directionV.z],
          id: bulletId,
          hitPoint: endPos
        });
        
        // Add locally so I can see my own tracer immediately
        store.addBullet({
          id: bulletId,
          position: [pos.x, pos.y, pos.z],
          direction: [directionV.x, directionV.y, directionV.z],
          hitPoint: endPos
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        useGameStore.getState().setLocalState({ isScoped: false });
        playSound('unscope');
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [camera, scene, matchState, health]);

  useFrame((state, delta) => {
    if (!bodyRef.current) return;

    if (health <= 0) {
      if (!isDead.current) {
        playSound('death');
        isDead.current = true;
      }
      const currentPos = bodyRef.current.translation();
      camera.position.x = currentPos.x;
      camera.position.z = currentPos.z;
      
      // Fall down to the ground slowly
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, currentPos.y - 0.5, 3 * delta);
      
      // Tilt the camera to the side to simulate falling over
      // Use the FPS camera's euler state so we don't spin infinitely
      const deathEuler = new THREE.Euler(euler.x, euler.y, 0, 'YXZ');
      
      // Target tilt: PI/3
      const targetQuat = new THREE.Quaternion().setFromEuler(deathEuler);
      targetQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 3));
      
      camera.quaternion.slerp(targetQuat, 3 * delta);
      
      if (weaponContainerRef.current) {
        weaponContainerRef.current.visible = false;
      }
      
      bodyRef.current.setLinvel({ x: 0, y: bodyRef.current.linvel().y, z: 0 }, true);
      return; 
    } else {
      isDead.current = false;
    }

    const { isScoped, settings, teleportTo } = useGameStore.getState();
    if (teleportTo) {
      bodyRef.current.setTranslation({ x: teleportTo[0], y: teleportTo[1], z: teleportTo[2] }, true);
      useGameStore.getState().setLocalState({ teleportTo: null });
      if (weaponContainerRef.current) {
        weaponContainerRef.current.visible = true;
      }
    }
    const { keybinds } = settings;
    
    const canMove = matchState === 'playing' && !showSettings;
    
    const isW = canMove && pressedKeys.has(keybinds.forward.toLowerCase());
    const isS = canMove && pressedKeys.has(keybinds.backward.toLowerCase());
    const isA = canMove && pressedKeys.has(keybinds.left.toLowerCase());
    const isD = canMove && pressedKeys.has(keybinds.right.toLowerCase());
    const isSpace = canMove && pressedKeys.has(keybinds.jump.toLowerCase());
    const isSprintKeyDown = canMove && pressedKeys.has(keybinds.sprint.toLowerCase());
    if (settings.sprintMode === 'hold') {
      sprintToggle.current = isSprintKeyDown;
    } else {
      if (isSprintKeyDown && !sprintKeyWasPressed.current) {
        sprintToggle.current = !sprintToggle.current;
      }
      
      // Stop sprinting when we stop moving forward or crouch
      if (!isW || crouchToggle.current) {
        sprintToggle.current = false;
      }
    }
    sprintKeyWasPressed.current = isSprintKeyDown;

    const isShift = sprintToggle.current;
    
    const isCrouchKeyDown = canMove && pressedKeys.has(keybinds.crouch.toLowerCase());
    
    if (settings.crouchMode === 'hold') {
      crouchToggle.current = isCrouchKeyDown || isSliding.current;
    } else {
      if (isCrouchKeyDown && !crouchKeyWasPressed.current) {
        crouchToggle.current = !crouchToggle.current;
      }
      
      // Sprinting breaks crouch, unless we are currently holding the crouch key or sliding
      if (isShift && isW && crouchToggle.current && !isCrouchKeyDown && !isSliding.current) {
        crouchToggle.current = false;
      }
    }

    // Automatically untoggle crouch if we try to jump (this also allows slide-jumping)
    if (isSpace && crouchToggle.current) {
      crouchToggle.current = false;
    }
    crouchKeyWasPressed.current = isCrouchKeyDown;
    
    const isCrouching = crouchToggle.current;
    
    const isSprinting = isShift && !isScoped && !isCrouching && isW;
    const isHoldingBreath = isShift && isScoped;
    
    const currentVel = bodyRef.current.linvel();
    const currentPos = bodyRef.current.translation();
    
    // Raycast down from just below the collider to check if grounded
    const rayOrigin = { x: currentPos.x, y: currentPos.y - 0.86, z: currentPos.z };
    const rayDir = { x: 0, y: -1, z: 0 };
    const ray = new rapier.Ray(rayOrigin, rayDir);
    const hit = world.castRay(ray, 0.2, true);
    
    // Fallback to vel y if raycast fails but we are moving flat
    const isGrounded = hit != null || Math.abs(currentVel.y) < 0.05;

    if (isGrounded && !prevGrounded.current && currentVel.y < -3) {
      playSound('land');
    }
    prevGrounded.current = isGrounded;

    const now = Date.now();
    const isTryingToMove = isW || isA || isS || isD;
    if (isGrounded && isTryingToMove && !isSliding.current) {
      const stepInterval = isSprinting ? 300 : (isCrouching ? 600 : 450);
      if (now - lastStepTime.current > stepInterval) {
        playSound('footstep');
        lastStepTime.current = now;
      }
    }

    // Detect slide initiation
    const SLIDE_COOLDOWN = 1000; // 1 second between slides
    if (isCrouching && !prevCrouch.current && isShift && isW && isGrounded && !isScoped) {
      if (Date.now() - lastSlideEndTime.current > SLIDE_COOLDOWN) {
        isSliding.current = true;
        playSound('slide');
        slideStartTime.current = Date.now();
        const yawObj = new THREE.Object3D();
        yawObj.rotation.y = euler.y;
        slideDirection.current.set(0, 0, -1).applyEuler(yawObj.rotation).normalize();
      }
    }
    prevCrouch.current = isCrouching;

    const SLIDE_DURATION = 600;
    const SLIDE_MAX_SPEED = 14;

    let isCurrentlySliding = false;
    let currentSlideSpeed = 0;
    
    if (isSliding.current) {
      const timeSinceSlide = Date.now() - slideStartTime.current;
      if (timeSinceSlide < SLIDE_DURATION && isCrouching) {
        isCurrentlySliding = true;
        const progress = timeSinceSlide / SLIDE_DURATION;
        currentSlideSpeed = THREE.MathUtils.lerp(SLIDE_MAX_SPEED, BASE_SPEED * 0.5, progress);
      } else {
        isSliding.current = false;
        lastSlideEndTime.current = Date.now();
      }
    }

    const direction = new THREE.Vector3();
    let isMovingNow = false;

    if (isCurrentlySliding) {
      direction.copy(slideDirection.current).multiplyScalar(currentSlideSpeed);
      isMovingNow = true;
    } else {
      const frontVector = new THREE.Vector3(0, 0, (isS ? 1 : 0) - (isW ? 1 : 0));
      const sideVector = new THREE.Vector3((isA ? 1 : 0) - (isD ? 1 : 0), 0, 0);

      isMovingNow = frontVector.lengthSq() > 0 || sideVector.lengthSq() > 0;

      let speed = isSprinting ? SPRINT_SPEED : BASE_SPEED;
      if (isScoped) speed *= 0.4;
      if (isCrouching) speed *= 0.3;

      // Calculate rotation purely from camera yaw
      const yawObj = new THREE.Object3D();
      yawObj.rotation.y = euler.y;

      direction
        .subVectors(frontVector, sideVector)
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(yawObj.rotation);
    }

    if (isMovingNow !== isMoving) setIsMoving(isMovingNow);

    let nextVelY = currentVel.y;
    // Counteract gravity if we are grounded to prevent sliding down slopes
    if (isGrounded && hit && currentVel.y < 0) {
      if (!isMovingNow) {
        nextVelY = 0; // Stop completely if standing still
      } else {
        // If moving, we still want to limit downward velocity so we don't bounce off slopes
        nextVelY = Math.max(-2, currentVel.y);
      }
    }

    bodyRef.current.setLinvel({ x: direction.x, y: nextVelY, z: direction.z }, true);

    // Jump
    if (isSpace && (isGrounded || Math.abs(currentVel.y) < 0.1) && !isCrouching && !isCurrentlySliding) {
      playSound('jump');
      bodyRef.current.setLinvel({ x: direction.x, y: JUMP_FORCE, z: direction.z }, true);
      pressedKeys.delete(keybinds.jump.toLowerCase()); // consume jump
    }

    // Refresh translation after physics modification if necessary
    const newPos = bodyRef.current.translation();
    
    // Strafe tilt direction
    const strafeDir = (isA ? 1 : 0) - (isD ? 1 : 0);

    // Update camera using our custom hook
    updateCamera(
      new THREE.Vector3(newPos.x, newPos.y, newPos.z), 
      { isMoving: isMovingNow, isSprinting, isCrouching, isGrounded, isHoldingBreath, isSliding: isCurrentlySliding }, 
      strafeDir,
      delta
    );

    if (weaponContainerRef.current) {
      weaponContainerRef.current.position.copy(camera.position);
      weaponContainerRef.current.quaternion.copy(camera.quaternion);
      weaponContainerRef.current.visible = !isScoped;
    }

    // Fade out mouse delta for weapon sway
    mouseDelta.current.x = THREE.MathUtils.lerp(mouseDelta.current.x, 0, 10 * delta);
    mouseDelta.current.y = THREE.MathUtils.lerp(mouseDelta.current.y, 0, 10 * delta);

    // Emit position to server
    if (now - lastEmitTime.current > 50) {
      if (myId) {
        socket.emit('move', {
          x: newPos.x,
          y: newPos.y,
          z: newPos.z,
          rx: euler.x,
          ry: euler.y,
          rz: euler.z,
          isMoving: isMovingNow,
          isSprinting: isSprinting,
          isCrouching: isCrouching,
          isJumping: !isGrounded && currentVel.y > 0.1
        });
      }
      lastEmitTime.current = now;
    }
  });

  // Do not unmount RigidBody when dead to avoid Rapier unsafe aliasing rust crashes
  // if (health <= 0) return null;

  return (
    <>
      <group ref={weaponContainerRef} name="weapon" visible={health > 0}>
        <SniperWeapon isMoving={isMoving} mouseDelta={mouseDelta.current} />
        {flash && <MuzzleFlash visible={true} />}
      </group>
      
      <RigidBody ref={bodyRef} position={position} colliders={false} mass={1} type="dynamic" linearDamping={0.8} angularDamping={1} lockRotations name={`player-${myId}`}>
        <CapsuleCollider args={COLLIDER_ARGS} />
        {/* We don't render our own body locally for true FPS feel */}
      </RigidBody>
    </>
  );
};
