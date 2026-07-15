import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { MuzzleFlash } from './Effects';

// ── Full Dari alphabet (weapon body uses all letters) ─────────────────────────
const DARI_LETTERS = [
  'ا','ب','پ','ت','ث','ج','چ','ح','خ','د',
  'ذ','ر','ز','ژ','س','ش','ص','ض','ط','ظ',
  'ع','غ','ف','ق','ک','گ','ل','م','ن','و','ه','ی',
];

// ── Only letters with dots ABOVE the body (used in scope ring) ────────────────
const DOTTED_TOP = ['ت','ث','خ','ذ','ز','ژ','ش','ض','ظ','غ','ف','ق','ن'];

// ── One canvas texture per (letter + color), shared across all sprites ────────
const textureCache = new Map<string, THREE.CanvasTexture>();
function getTex(letter: string, color = '#39FF14'): THREE.CanvasTexture {
  const key = `${letter}__${color}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);
  ctx.font = 'bold 64px "Noto Sans Arabic",Arial,Tahoma,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(letter, 48, 52);
  ctx.shadowBlur = 3;
  ctx.fillText(letter, 48, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

// ── Random-scatter cluster (weapon body parts) ────────────────────────────────
interface ClusterProps {
  center: [number,number,number];
  size:   [number,number,number];
  count:  number;
  glyphSize?: number;
  color?: string;
  pool?: string[];
}
const LetterCluster = ({
  center, size, count, glyphSize = 0.045, color = '#39FF14', pool = DARI_LETTERS,
}: ClusterProps) => {
  const glyphs = useMemo(() => {
    const items: { pos:[number,number,number]; tex:THREE.CanvasTexture }[] = [];
    for (let i = 0; i < count; i++) {
      const l = pool[Math.floor(Math.random() * pool.length)];
      items.push({
        pos: [
          center[0] + (Math.random()-0.5)*size[0],
          center[1] + (Math.random()-0.5)*size[1],
          center[2] + (Math.random()-0.5)*size[2],
        ],
        tex: getTex(l, color),
      });
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, color, ...center, ...size]);

  return (
    <group>
      {glyphs.map((g,i) => (
        <sprite frustumCulled={false} renderOrder={9999} key={i} position={g.pos} scale={[glyphSize,glyphSize,1]}>
          <spriteMaterial map={g.tex} transparent depthWrite={false} depthTest={false} />
        </sprite>
      ))}
    </group>
  );
};

// ── Evenly-spaced letter ring (scope reticle) ─────────────────────────────────
interface RingProps {
  center:    [number,number,number];
  radius:    number;
  count:     number;
  glyphSize?: number;
  color?:    string;
  pool?:     string[];
}
const LetterRing = ({
  center, radius, count, glyphSize = 0.024, color = '#ff3344', pool = DARI_LETTERS,
}: RingProps) => {
  const glyphs = useMemo(() => {
    const items: { pos:[number,number,number]; tex:THREE.CanvasTexture }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i/count)*Math.PI*2;
      const l = pool[Math.floor(Math.random() * pool.length)];
      items.push({
        pos: [
          center[0] + Math.cos(angle)*radius,
          center[1] + Math.sin(angle)*radius,
          center[2],
        ],
        tex: getTex(l, color),
      });
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, color, radius, ...center]);

  return (
    <group>
      {glyphs.map((g,i) => (
        <sprite frustumCulled={false} renderOrder={9999} key={i} position={g.pos} scale={[glyphSize,glyphSize,1]}>
          <spriteMaterial map={g.tex} transparent depthWrite={false} depthTest={false} />
        </sprite>
      ))}
    </group>
  );
};

// ── Single center glyph (ن) for the scope ────────────────────────────────────
const CenterNun = ({ pos }: { pos:[number,number,number] }) => {
  const tex = useMemo(() => getTex('ن','#ff1122'), []);
  return (
    <sprite frustumCulled={false} renderOrder={9999} position={pos} scale={[0.015, 0.015, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
};

// ── M4 body + holo optic ring ─────────────────────────────────────────────────
//
// SCOPE RING MATH:
//   Ring sits at model-space (0, +0.065, -0.05).
//   When ADS, the weapon group is lerped to camera-space (0, -0.065, -0.50).
//   ⟹  ring camera-space = (0, -0.065+0.065, -0.50-0.05) = (0, 0, -0.55)
//   That is exactly the camera's forward axis → dead-centre on screen.
//
export const SniperWeaponModel = () => (
  <group>
    {/* Receiver */}
    <LetterCluster center={[0,-0.04, 0.05]} size={[0.15,0.14,0.42]} count={70} glyphSize={0.042} />
    {/* Barrel */}
    <LetterCluster center={[0, 0.015,-0.50]} size={[0.10,0.07,0.62]} count={65} glyphSize={0.038} />
    {/* Handguard */}
    <LetterCluster center={[0,-0.03,-0.24]} size={[0.15,0.10,0.22]} count={40} glyphSize={0.038} />
    {/* Magazine */}
    <group position={[0,-0.16,-0.02]} rotation={[0.22,0,0]}>
      <LetterCluster center={[0,-0.05,0]} size={[0.09,0.24,0.07]} count={38} glyphSize={0.036} />
    </group>
    {/* Stock */}
    <LetterCluster center={[0,-0.06, 0.42]} size={[0.11,0.12,0.24]} count={36} glyphSize={0.038} />
    {/* Pistol grip */}
    <group position={[0,-0.15,0.15]} rotation={[0.3,0,0]}>
      <LetterCluster center={[0,-0.04,0]} size={[0.09,0.14,0.06]} count={20} glyphSize={0.033} />
    </group>

    {/* ── Scope optic ──────────────────────────────────────────────────────────
        Ring of dotted-top Dari letters + single ن in the centre.
        At ADS the whole weapon group shifts so this ring lands at screen-centre.
    ──────────────────────────────────────────────────────────────────────── */}
    <LetterRing
      center={[0, 0.120, -0.05]}
      radius={0.036}
      count={16}
      glyphSize={0.025}
      color="#ff2233"
      pool={DOTTED_TOP}
    />
    <CenterNun pos={[0, 0.120, -0.048]} />
  </group>
);

// ── Animated weapon wrapper ───────────────────────────────────────────────────
export const SniperWeapon = ({
  isMoving,
  mouseDelta,
  flash,
}: {
  isMoving: boolean;
  mouseDelta: { x: number; y: number };
  flash?: boolean;
}) => {
  const groupRef   = useRef<THREE.Group>(null);
  const isScoped   = useGameStore((s) => s.isScoped);
  const isReloading = useGameStore((s) => s.isReloading);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Sway / bob
    const swayMult = isScoped ? 0.1 : 1.0;
    const swayX = Math.sin(state.clock.elapsedTime * 2) * 0.005 * swayMult;
    const swayY = Math.cos(state.clock.elapsedTime * 4) * 0.005 * swayMult;
    const mSwayX = THREE.MathUtils.clamp(-mouseDelta.x * 0.0002, -0.05, 0.05) * swayMult;
    const mSwayY = THREE.MathUtils.clamp(-mouseDelta.y * 0.0002, -0.05, 0.05) * swayMult;
    const bob = isMoving ? Math.sin(state.clock.elapsedTime * 12) * 0.004 * swayMult : 0;

    const tZ    = isReloading ? 0.35 : 0;
    const tRotX = isReloading ? -0.5 : 0;

    // ADS / Hip-fire targets
    const targetX = isScoped ? 0 : 0.30;
    const targetY = isScoped ? -0.120 : -0.30;
    const targetZ = isScoped ? -0.50 : -0.50;

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX + swayX + mSwayX, 10*delta);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY + swayY + bob + mSwayY, 10*delta);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ + tZ, 10*delta);

    const roll = THREE.MathUtils.clamp(-mouseDelta.x * 0.0005, -0.1, 0.1);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, roll, 10*delta);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tRotX, 10*delta);

    groupRef.current.visible = true;
  });

  return (
    <group ref={groupRef}>
      <SniperWeaponModel />
      {flash && <MuzzleFlash visible={true} />}
    </group>
  );
};
