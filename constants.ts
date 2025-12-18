
import { Coin, Dex } from './types';

export const COINS: Coin[] = [
  { id: 'btc', name: 'Bitcoin', basePrice: 65000, volatility: 0.1, description: 'The King.' },
  { id: 'eth', name: 'Ethereum', basePrice: 3500, volatility: 0.15, description: 'The World Computer.' },
  { id: 'hex', name: 'Hex', basePrice: 0.05, volatility: 0.4, description: 'Staking for glory.' },
  { id: 'pls', name: 'Pulsechain', basePrice: 0.0001, volatility: 0.5, description: 'The native gas.' },
  { id: 'plsx', name: 'PulseX', basePrice: 0.00005, volatility: 0.5, description: 'Main DEX coin.' },
  { id: 'inc', name: 'INC', basePrice: 15, volatility: 0.3, description: 'Yield farming reward.' },
  { id: 'provex', name: 'ProveX', basePrice: 0.1, volatility: 0.7, description: 'High risk, high reward.' },
  { id: 'sol', name: 'Solana', basePrice: 150, volatility: 0.25, description: 'Ethereum Killer?' },
  { id: 'pepe', name: 'Pepe', basePrice: 0.000001, volatility: 0.9, description: 'Pure meme magic.' },
];

export const DEXES: Dex[] = [
  { id: 'uniswap', name: 'Uniswap', network: 'Ethereum', specialty: 'Blue chips' },
  { id: 'pulsex', name: 'PulseX', network: 'PulseChain', specialty: 'Pulse Ecosystem' },
  { id: 'pancakeswap', name: 'PancakeSwap', network: 'BSC', specialty: 'Low fees' },
  { id: 'raydium', name: 'Raydium', network: 'Solana', specialty: 'Memecoins' },
  { id: 'traderjoe', name: 'Trader Joe', network: 'Avalanche', specialty: 'DeFi 2.0' },
];

export const INITIAL_CASH = 5000;
export const INITIAL_DEBT = 5000;
export const DEBT_INTEREST = 1.15; // 15% per day
export const INITIAL_CAPACITY = 100; // Units of coins
