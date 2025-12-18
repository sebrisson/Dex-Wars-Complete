
export interface Coin {
  id: string;
  name: string;
  basePrice: number;
  volatility: number; // 0.1 to 1.0
  description: string;
}

export interface Dex {
  id: string;
  name: string;
  network: string;
  specialty?: string;
}

export interface MarketState {
  prices: Record<string, number>;
  news: string;
  eventEffect?: { coinId: string; multiplier: number };
}

export interface PlayerState {
  cash: number;
  debt: number;
  walletCapacity: number;
  inventory: Record<string, number>;
  currentDexId: string;
  day: number;
  maxDays: number;
  health: number; // Represents "OpSec" or "Reputation"
  history: string[];
}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}
