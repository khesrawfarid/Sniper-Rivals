import { create } from 'zustand';

interface GameSettings {
  outfitColor: string;
  eyeColor: string;
  sensitivity: number;
  fov: number;
  invertMouse: boolean;
  motionBlur: boolean;
  smoothing: number;
  crouchMode: 'toggle' | 'hold';
  sprintMode: 'toggle' | 'hold';
  masterVolume: number;
  uiVolume: number;
  keybinds: {
    forward: string;
    backward: string;
    left: string;
    right: string;
    jump: string;
    sprint: string;
    crouch: string;
    reload: string;
  };
}

interface GameState {
  players: Record<string, any>;
  bullets: Array<{ id: string; position: [number, number, number]; direction: [number, number, number]; createdAt: number }>;
  myId: string | null;
  matchState: 'waiting' | 'playing' | 'ended';
  timeRemaining: number;
  winner: string | null;
  
  // Local Player State
  ammo: number;
  isScoped: boolean;
  isReloading: boolean;
  health: number;
  teleportTo: [number, number, number] | null;
  hitmarkers: Array<{ id: string, headshot: boolean, createdAt: number }>;
  killFeed: Array<{ id: string, killer: string, victim: string, headshot: boolean, createdAt: number }>;

  // Settings
  settings: GameSettings;
  showSettings: boolean;

  setMyId: (id: string) => void;
  updateGameState: (data: Partial<GameState>) => void;
  updatePlayer: (id: string, data: any) => void;
  removePlayer: (id: string) => void;
  addBullet: (bullet: { id: string; position: [number, number, number]; direction: [number, number, number]; hitPoint?: [number, number, number] | null }) => void;
  removeBullet: (id: string) => void;
  setLocalState: (data: Partial<GameState>) => void;
  addHitmarker: (headshot: boolean) => void;
  addKillFeed: (killer: string, victim: string, headshot: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  toggleSettings: () => void;
  resetStore: () => void;
}

const defaultSettings: GameSettings = {
  outfitColor: '#3182ce',
  eyeColor: '#1a202c',
  sensitivity: 1.0,
  fov: 90,
  invertMouse: false,
  motionBlur: false,
  smoothing: 0.5,
  masterVolume: 1.0,
  uiVolume: 1.0,
  crouchMode: 'hold',
  sprintMode: 'hold',
  keybinds: {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
    jump: ' ',
    sprint: 'shift',
    crouch: 'c',
    reload: 'r',
  },
};

// Load saved settings
const savedSettingsStr = typeof window !== 'undefined' ? localStorage.getItem('fps_settings') : null;
const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : {};
const initialSettings = { 
  ...defaultSettings, 
  ...savedSettings,
  keybinds: { ...defaultSettings.keybinds, ...(savedSettings.keybinds || {}) }
};

export const useGameStore = create<GameState>((set) => ({
  players: {},
  bullets: [],
  myId: null,
  matchState: 'waiting',
  timeRemaining: 300,
  winner: null,
  
  ammo: 5,
  isScoped: false,
  isReloading: false,
  health: 100,
  teleportTo: null,
  hitmarkers: [],
  killFeed: [],

  settings: initialSettings,
  showSettings: false,

  setMyId: (id) => set({ myId: id }),
  updateGameState: (data) => set((state) => ({ ...state, ...data })),
  updatePlayer: (id, data) => set((state) => ({
    players: {
      ...state.players,
      [id]: { ...(state.players[id] || {}), ...data, localLastUpdate: Date.now() }
    }
  })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),
  addBullet: (bullet) => set((state) => ({
    bullets: [...state.bullets, { ...bullet, createdAt: Date.now() }]
  })),
  removeBullet: (id) => set((state) => ({
    bullets: state.bullets.filter(b => b.id !== id)
  })),
  setLocalState: (data) => set((state) => ({ ...state, ...data })),
  addHitmarker: (headshot) => set((state) => ({
    hitmarkers: [...state.hitmarkers, { id: Math.random().toString(36).substring(7), headshot, createdAt: Date.now() }]
  })),
  addKillFeed: (killer, victim, headshot) => set((state) => {
    const newFeed = [...state.killFeed, { id: Math.random().toString(36).substring(7), killer, victim, headshot, createdAt: Date.now() }];
    if (newFeed.length > 5) newFeed.shift();
    return { killFeed: newFeed };
  }),
  updateSettings: (newSettings) => set((state) => {
    const updated = { ...state.settings, ...newSettings };
    localStorage.setItem('fps_settings', JSON.stringify(updated));
    return { settings: updated };
  }),
  toggleSettings: () => set((state) => {
    if (!state.showSettings) {
      document.exitPointerLock();
    }
    return { showSettings: !state.showSettings };
  }),
  resetStore: () => set((state) => ({
    players: {},
    bullets: [],
    myId: null,
    matchState: 'waiting',
    timeRemaining: 300,
    winner: null,
    ammo: 5,
    isScoped: false,
    isReloading: false,
    health: 100,
    hitmarkers: [],
    killFeed: [],
    showSettings: false
  })),
}));
