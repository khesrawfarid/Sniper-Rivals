import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// ── Full Dari alphabet ──────────────────────────────────────────────────────
const DARI_LETTERS = [
  'ا','ب','پ','ت','ث','ج','چ','ح','خ','د',
  'ذ','ر','ز','ژ','س','ش','ص','ض','ط','ظ',
  'ع','غ','ف','ق','ک','گ','ل','م','ن','و','ه','ی',
];

// ── One canvas texture per letter, reused across all bullet sprites ──────────
const texCache = new Map<string, THREE.CanvasTexture>();
function getBulletTex(letter: string): THREE.CanvasTexture {
  if (texCache.has(letter)) return texCache.get(letter)!;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = 'bold 50px "Noto Sans Arabic", Arial, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Warm glow – hot brass / muzzle energy look
  ctx.shadowColor  = '#ffdd44';
  ctx.shadowBlur   = 14;
  ctx.fillStyle    = '#ffffff';
  ctx.fillText(letter, 32, 36);
  ctx.shadowBlur   = 4;
  ctx.fillStyle    = '#ffe870';
  ctx.fillText(letter, 32, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  texCache.set(letter, tex);
  return tex;
}

// ── Bullet Speed (units per second) ──────────────────────────────────────────
const BULLET_SPEED = 800;

// ─────────────────────────────────────────────────────────────────────────────
//  BulletLetter – the main glyph that flies from the barrel tip to the target.
//  Size 0.065 world-units ≈ ~1.5× the weapon glyph size (0.042), so it reads
//  clearly in flight without looking oversized next to the weapon model.
// ─────────────────────────────────────────────────────────────────────────────
const BulletLetter = ({ bullet }: { bullet: any }) => {
  const ref = useRef<THREE.Sprite>(null);

  const letter  = useMemo(
    () => DARI_LETTERS[Math.floor(Math.random() * DARI_LETTERS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bullet.id],
  );
  const texture = useMemo(() => getBulletTex(letter), [letter]);

  const start = useMemo(
    () => new THREE.Vector3(...(bullet.position as [number, number, number])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bullet.id],
  );
  const end = useMemo(() => {
    if (bullet.hitPoint)
      return new THREE.Vector3(...(bullet.hitPoint as [number, number, number]));
    return start
      .clone()
      .addScaledVector(
        new THREE.Vector3(...(bullet.direction as [number, number, number])),
        120,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bullet.id]);

  const travelMs = useMemo(() => {
    return (start.distanceTo(end) / BULLET_SPEED) * 1000;
  }, [start, end]);

  const born = bullet.createdAt as number;

  useFrame(() => {
    if (!ref.current) return;
    const t = travelMs > 0 ? (Date.now() - born) / travelMs : 1;
    const clampedT = Math.min(t, 1);
    ref.current.position.lerpVectors(start, end, clampedT);
    // Fade out in the last 30 % of travel
    (ref.current.material as THREE.SpriteMaterial).opacity =
      clampedT < 0.70 ? 1 : Math.max(0, 1 - (clampedT - 0.70) / 0.30);
  });

  return (
    <sprite
      ref={ref}
      position={[start.x, start.y, start.z]}
      // 0.13 = clearly visible in flight, proportional to the weapon model glyphs
      scale={[0.13, 0.13, 1]}
    >
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  TrailGlyph – ONE smaller letter sprite that trails behind the main bullet.
//  lag  : how many seconds behind the main bullet this sprite trails
//  alpha: base opacity (trail letters are progressively dimmer the further back)
// ─────────────────────────────────────────────────────────────────────────────
const TrailGlyph = ({
  bullet,
  lagMs,
  alpha,
}: {
  bullet: any;
  lagMs: number;
  alpha: number;
}) => {
  const ref = useRef<THREE.Sprite>(null);

  const letter = useMemo(
    () => DARI_LETTERS[Math.floor(Math.random() * DARI_LETTERS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bullet.id, lagMs],
  );
  const texture = useMemo(() => getBulletTex(letter), [letter]);

  const start = useMemo(
    () => new THREE.Vector3(...(bullet.position as [number, number, number])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bullet.id],
  );
  const end = useMemo(() => {
    if (bullet.hitPoint)
      return new THREE.Vector3(...(bullet.hitPoint as [number, number, number]));
    return start
      .clone()
      .addScaledVector(
        new THREE.Vector3(...(bullet.direction as [number, number, number])),
        120,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bullet.id]);

  const travelMs = useMemo(() => {
    return (start.distanceTo(end) / BULLET_SPEED) * 1000;
  }, [start, end]);

  const born = bullet.createdAt as number;

  useFrame(() => {
    if (!ref.current) return;
    const t = travelMs > 0 ? (Date.now() - born - lagMs) / travelMs : 1;
    const trailT = Math.max(0, Math.min(t, 1));
    ref.current.position.lerpVectors(start, end, trailT);
    // Fade with travel progress; trail glyphs vanish faster than the head
    (ref.current.material as THREE.SpriteMaterial).opacity = Math.max(
      0,
      alpha * (1 - trailT * 1.6),
    );
  });

  return (
    // Trail glyphs are slightly smaller than the main bullet but clearly visible
    <sprite
      ref={ref}
      position={[start.x, start.y, start.z]}
      scale={[0.090, 0.090, 1]}
    >
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Tracers – renders all active bullets as a main glyph + 3 trailing glyphs
// ─────────────────────────────────────────────────────────────────────────────
export const Tracers = () => {
  const bullets = useGameStore((state) => state.bullets);
  const active  = bullets.filter((b) => Date.now() - b.createdAt < 2000);

  return (
    <>
      {active.map((b) => (
        <group key={b.id}>
          {/* Main bullet glyph – full size, full opacity */}
          <BulletLetter bullet={b} />

          {/* 3 trail glyphs – clearly visible, each one dimmer further back */}
          <TrailGlyph bullet={b} lagMs={15} alpha={0.80} />
          <TrailGlyph bullet={b} lagMs={30} alpha={0.55} />
          <TrailGlyph bullet={b} lagMs={45} alpha={0.30} />
        </group>
      ))}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MuzzleFlash – brief flash + point-light at the barrel tip.
//  Position [0.14, -0.28, -1.25] is the barrel tip in weapon-container space.
// ─────────────────────────────────────────────────────────────────────────────
const ZERO_VEC = new THREE.Vector3(0, 0, 0);

export const MuzzleFlash = ({ visible }: { visible: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef  = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (lightRef.current)
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity, 0, 0.22,
      );
    if (meshRef.current) meshRef.current.scale.lerp(ZERO_VEC, 0.22);
  });

  if (visible) {
    if (lightRef.current) lightRef.current.intensity = 4;
    if (meshRef.current)  meshRef.current.scale.set(1, 1, 1);
  }

  return (
    <group position={[0, 0.015, -0.81]}>
      <pointLight ref={lightRef} color="#ffcc44" distance={4} intensity={0} />
      <mesh ref={meshRef} scale={[0, 0, 0]} frustumCulled={false} renderOrder={9999}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.85} depthTest={false} />
      </mesh>
    </group>
  );
};

export const Particles = () => null;
