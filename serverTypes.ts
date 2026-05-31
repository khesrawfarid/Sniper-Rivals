// Share interfaces and types for the server
export interface PlayerData {
  id: string;
  nickname: string;
  skinColor?: string;
  outfitColor?: string;
  hatColor?: string;
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  health: number;
  kills: number;
  deaths: number;
  isTarget?: boolean;
}

export interface Room {
  players: Record<string, PlayerData>;
  matchState: 'waiting' | 'playing' | 'ended';
  timeRemaining: number;
  timerInterval: NodeJS.Timeout | null;
  botInterval: NodeJS.Timeout | null;
  winner: string | null;
}
