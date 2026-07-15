// ═══════════════════════════════════════════════════════════════════
//  WEAPON CONFIG  –  Sniper Rivals
//  Every gameplay parameter lives here. No magic numbers in code.
// ═══════════════════════════════════════════════════════════════════

export type WeaponId = 'sniper';

// ─── Sub-types ──────────────────────────────────────────────────────
export interface RecoilPattern {
  /** Base pitch kick per shot (upward camera movement, radians) */
  pitchKick: number;
  /** Random ±yaw wobble per shot (left/right, radians) */
  yawWobble: number;
  /** How fast recoil recovers back to 0 each frame (0–1 lerp factor) */
  recoverySpeed: number;
  /** Extra multiplier while NOT scoped (hip-fire feels punchier) */
  hipfireMultiplier: number;
}

export interface HoldConfig {
  /** Weapon model X offset from camera centre (positive = right) */
  posX: number;
  /** Weapon model Y offset from camera centre (negative = lower) */
  posY: number;
  /** Weapon model Z offset from camera centre (negative = forward) */
  posZ: number;
  /** Idle sway amplitude on X axis (side-to-side) */
  idleSwayX: number;
  /** Idle sway amplitude on Y axis (up-down) */
  idleSwayY: number;
  /** Walk-bob amplitude (up-down while moving) */
  walkBob: number;
  /** Walk-bob frequency multiplier */
  walkBobFreq: number;
  /** Roll (z-rotation) scale applied from mouse horizontal movement */
  rollScale: number;
  /** Mouse-sway scale – how much the gun lags behind cursor movement */
  mouseSwayScale: number;
}

export interface AdsConfig {
  /** Field of view when fully scoped (degrees). Original FOV restored on unscope. */
  fov: number;
  /** Time to reach full zoom (ms) */
  adsInMs: number;
  /** Time to return to hip-fire (ms) */
  adsOutMs: number;
  /** Spread multiplier while ADS (1 = no change, 0.1 = 90% tighter) */
  spreadMultiplier: number;
}

export interface AnimConfig {
  /** Weapon Z offset pushed toward camera during reload (positive = toward player) */
  reloadPullBack: number;
  /** Weapon X rotation during reload (negative = tilts muzzle down) */
  reloadTiltX: number;
  /** Time (ms) before the mag visually seats and the model snaps back */
  reloadSnapMs: number;
  /** Scale of the muzzle-flash sprite */
  muzzleFlashScale: number;
  /** Duration muzzle flash is visible (ms) */
  muzzleFlashMs: number;
}

export interface SoundConfig {
  /**
   * Sounds are generated procedurally by audio.ts.
   * Keys here map to the SoundType union.
   */
  fire: 'shoot';
  reload: 'reload';
  scope: 'scope';
  unscope: 'unscope';
  dryFire: 'click';
  hit: 'hit';
  headshot: 'headshot';
  /**
   * Volume scale for this weapon's fire sound (0–1).
   * Lets louder weapons feel more impactful.
   */
  fireVolume: number;
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;

  // ── Magazine & ammo ──────────────────────────────────────────────
  magSize: number;

  // ── Fire mechanics ───────────────────────────────────────────────
  /** Milliseconds between consecutive shots. 100 = ~600 RPM (M4) */
  fireRateMs: number;
  /** Milliseconds to reload a full magazine */
  reloadMs: number;
  /** Hold trigger = continuous fire */
  automatic: boolean;
  /** Pellets fired per trigger pull (1 = rifle/pistol, 8 = shotgun) */
  pellets: number;
  /** Cone half-angle spread (degrees). 0 = laser-accurate */
  spreadDeg: number;

  // ── Damage ───────────────────────────────────────────────────────
  /** Damage per pellet at point-blank range */
  pelletDamage: number;
  /** Distance (m) where damage begins to fall off */
  falloffStart: number;
  /** Distance (m) where damage reaches zero */
  maxRange: number;
  /** Headshot damage multiplier */
  headshotMultiplier: number;

  // ── Scope / ADS ──────────────────────────────────────────────────
  canScope: boolean;
  ads: AdsConfig;

  // ── Recoil ───────────────────────────────────────────────────────
  recoil: number;          // legacy scalar kept for useFPSCamera.ts
  recoilPattern: RecoilPattern;

  // ── Visual / animation ───────────────────────────────────────────
  hold: HoldConfig;
  anim: AnimConfig;

  // ── Audio ────────────────────────────────────────────────────────
  sounds: SoundConfig;
}

// ═══════════════════════════════════════════════════════════════════
//  M4 GLYPH CARBINE  (the only weapon right now)
// ═══════════════════════════════════════════════════════════════════
export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  sniper: {
    id: 'sniper',
    name: 'M4 Glyph Carbine',

    // Ammo
    magSize: 30,

    // Fire
    fireRateMs: 112,           // 20% faster than before (was 140)
    reloadMs: 2200,            // 2.2 s reload
    automatic: true,
    pellets: 1,
    spreadDeg: 1.2,            // slight hip-fire cone; tightens 90% on ADS

    // Damage
    pelletDamage: 5,           // 20 body shots to kill
    falloffStart: 40,          // full damage up to 40 m
    maxRange: 80,              // zero damage at 80 m
    headshotMultiplier: 2.5,

    // Scope / ADS
    canScope: true,
    ads: {
      fov: 62,                 // mild holo zoom (R6S holo style, NOT sniper)
      adsInMs: 90,             // fast snap – holo sights are quick
      adsOutMs: 80,
      spreadMultiplier: 0.25,  // tighter than hip-fire, but not laser like a sniper
    },

    // Recoil
    recoil: 0.5,               // used by useFPSCamera.ts triggerRecoil()
    recoilPattern: {
      pitchKick: 0.025,        // moderate upward kick per shot
      yawWobble: 0.008,        // small left/right drift
      recoverySpeed: 0.12,     // lerps back to 0 every frame
      hipfireMultiplier: 1.8,  // hip-fire recoil feels beefier
    },

    // How the weapon is held in view
    hold: {
      posX:  0.30,             // right side of screen
      posY: -0.30,             // slightly below centre
      posZ: -0.50,             // forward (closer to far clip = bigger model)
      idleSwayX: 0.005,        // gentle left-right drift
      idleSwayY: 0.005,        // gentle up-down drift
      walkBob:   0.004,        // bob amplitude while moving
      walkBobFreq: 12,         // bob cycles per second
      rollScale: 0.0005,       // how much the gun rolls with mouse X
      mouseSwayScale: 0.0002,  // how much the gun lags behind the cursor
    },

    // Animations
    anim: {
      reloadPullBack: 0.35,    // weapon pulls toward player during reload
      reloadTiltX: -0.50,      // muzzle dips down
      reloadSnapMs: 1800,      // model snaps back this many ms into reload
      muzzleFlashScale: 1.0,
      muzzleFlashMs: 55,
    },

    // Sounds (keys map to SoundType in audio.ts)
    sounds: {
      fire: 'shoot',
      reload: 'reload',
      scope: 'scope',
      unscope: 'unscope',
      dryFire: 'click',
      hit: 'hit',
      headshot: 'headshot',
      fireVolume: 0.85,
    },
  },
};
