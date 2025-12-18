
import React, { useState, useEffect, useCallback } from 'react';
import { 
  COINS, 
  DEXES, 
  INITIAL_CASH, 
  INITIAL_DEBT, 
  DEBT_INTEREST, 
  INITIAL_CAPACITY 
} from './constants';
import { PlayerState, MarketState, GameStatus, Coin } from './types';
import { generateMarketNews } from './services/geminiService';

// Components
const StatCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col items-center justify-center">
    <span className="text-[10px] text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`text-lg font-bold ${color || 'text-white'}`}>{value}</span>
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({
    cash: INITIAL_CASH,
    debt: INITIAL_DEBT,
    walletCapacity: INITIAL_CAPACITY,
    inventory: {},
    currentDexId: DEXES[0].id,
    day: 1,
    maxDays: 30,
    health: 100,
    history: ["Game started. Welcome to the trenches."]
  });

  const [market, setMarket] = useState<MarketState>({
    prices: {},
    news: "Welcome to DEX Wars. Buy low, sell high, and don't get rugged."
  });

  // Calculate market prices based on base price + volatility
  const refreshPrices = useCallback(() => {
    const newPrices: Record<string, number> = {};
    COINS.forEach(coin => {
      const fluctuation = (Math.random() - 0.5) * 2 * coin.volatility;
      const finalPrice = coin.basePrice * (1 + fluctuation);
      newPrices[coin.id] = Math.max(0.00000001, finalPrice);
    });
    return newPrices;
  }, []);

  const startGame = (days: number) => {
    const initialPrices = refreshPrices();
    setPlayer({ 
      cash: INITIAL_CASH,
      debt: INITIAL_DEBT,
      walletCapacity: INITIAL_CAPACITY,
      inventory: {},
      currentDexId: DEXES[0].id,
      day: 1,
      maxDays: days,
      health: 100,
      history: [`Your ${days}-day journey begins. Pay the Whale his money.`]
    });
    setMarket({
      prices: initialPrices,
      news: "The bull run is starting. Get in early!"
    });
    setStatus(GameStatus.PLAYING);
  };

  const travel = async (dexId: string) => {
    if (dexId === player.currentDexId) return;
    
    setLoading(true);
    const newDay = player.day + 1;
    
    if (newDay > player.maxDays) {
      setStatus(GameStatus.GAMEOVER);
      setLoading(false);
      return;
    }

    const newPrices = refreshPrices();
    const newDebt = Math.round(player.debt * DEBT_INTEREST);
    const dexName = DEXES.find(d => d.id === dexId)?.name || 'Unknown DEX';
    
    // Random events
    let healthPenalty = 0;
    let message = `Traveled to ${dexName}.`;
    const rand = Math.random();
    if (rand < 0.1) {
      healthPenalty = 15;
      message += " You were phished! Lost some OpSec.";
    } else if (rand < 0.2) {
      const stolenCash = Math.floor(player.cash * 0.1);
      setPlayer(p => ({ ...p, cash: p.cash - stolenCash }));
      message += ` Met a scammer. Lost $${stolenCash.toLocaleString()}.`;
    }

    const geminiNews = await generateMarketNews(newDay, dexName);

    setPlayer(prev => ({
      ...prev,
      day: newDay,
      debt: newDebt,
      currentDexId: dexId,
      health: Math.max(0, prev.health - healthPenalty),
      history: [message, ...prev.history].slice(0, 5)
    }));

    setMarket({
      prices: newPrices,
      news: geminiNews
    });

    setLoading(false);
  };

  const buyCoin = (coinId: string) => {
    const price = market.prices[coinId];
    if (!price) return;
    
    const maxAffordable = Math.floor(player.cash / price);
    const currentInventoryCount = (Object.values(player.inventory) as number[]).reduce((a, b) => a + b, 0);
    const spaceLeft = player.walletCapacity - currentInventoryCount;
    
    const amount = Math.min(maxAffordable, spaceLeft);
    if (amount <= 0) return;

    setPlayer(prev => {
      const newInventory = { ...prev.inventory };
      newInventory[coinId] = (newInventory[coinId] || 0) + amount;
      return {
        ...prev,
        cash: prev.cash - (amount * price),
        inventory: newInventory,
        history: [`Bought ${amount.toLocaleString()} ${coinId.toUpperCase()}`, ...prev.history].slice(0, 5)
      };
    });
  };

  const sellCoin = (coinId: string) => {
    const amount = player.inventory[coinId] || 0;
    if (amount <= 0) return;

    const price = market.prices[coinId];
    if (!price) return;

    setPlayer(prev => {
      const newInventory = { ...prev.inventory };
      delete newInventory[coinId];
      return {
        ...prev,
        cash: prev.cash + (amount * price),
        inventory: newInventory,
        history: [`Sold ${amount.toLocaleString()} ${coinId.toUpperCase()}`, ...prev.history].slice(0, 5)
      };
    });
  };

  const payWhale = () => {
    const amount = Math.min(player.cash, player.debt);
    if (amount <= 0) return;
    setPlayer(prev => ({
      ...prev,
      cash: prev.cash - amount,
      debt: prev.debt - amount,
      history: [`Paid Whale $${amount.toLocaleString()}`, ...prev.history].slice(0, 5)
    }));
  };

  const totalAssetsValue = player.cash + (Object.entries(player.inventory) as [string, number][]).reduce((acc, [id, qty]) => {
    return acc + (qty * (market.prices[id] || 0));
  }, 0);

  const shareToX = () => {
    const netWorth = totalAssetsValue - player.debt;
    const text = `I just finished a run of DEX Wars: Crypto Mogul! My final net worth was $${netWorth.toLocaleString()}. Can you beat me in the trenches? 🚀📈 #DEXWars #Crypto #PulseChain`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  if (status === GameStatus.START) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border-2 border-green-500/50 p-8 rounded-2xl shadow-2xl shadow-green-500/20 text-center">
          <h1 className="text-4xl font-black text-green-500 mb-2 italic">DEX WARS</h1>
          <p className="text-slate-400 mb-8 text-sm uppercase tracking-widest">The Crypto Mogul Simulator</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => startGame(30)}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105"
            >
              START 30 DAY RUN
            </button>
            <button 
              onClick={() => startGame(60)}
              className="w-full border-2 border-slate-700 hover:border-slate-500 text-slate-300 font-bold py-4 rounded-lg transition-all"
            >
              START 60 DAY RUN
            </button>
          </div>

          <div className="mt-8 text-left space-y-2">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Rules of the Trench:</p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Buy low, sell high across different DEXs.</li>
              <li>Every travel to a new DEX takes 1 day.</li>
              <li>The Whale wants his money. Debt grows at 15%/day.</li>
              <li>Watch out for rug pulls and phishing attacks.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAMEOVER) {
    const netWorth = totalAssetsValue - player.debt;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border-2 border-red-500/50 p-8 rounded-2xl shadow-2xl shadow-red-500/20 text-center">
          <h1 className="text-4xl font-black text-white mb-2 italic">GAME OVER</h1>
          <p className="text-slate-400 mb-8 uppercase tracking-widest">Run Complete</p>
          
          <div className="space-y-4 mb-8">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500 uppercase mb-1">Final Net Worth</p>
              <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${netWorth.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={shareToX}
              className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              SHARE SCORE TO X
            </button>
            <button 
              onClick={() => setStatus(GameStatus.START)}
              className="w-full bg-slate-200 hover:bg-white text-black font-bold py-4 rounded-lg transition-all"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentDex = DEXES.find(d => d.id === player.currentDexId);
  const walletUsed = (Object.values(player.inventory) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col max-w-5xl mx-auto p-4 md:p-6 gap-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Day" value={`${player.day} / ${player.maxDays}`} color="text-yellow-400" />
        <StatCard label="Cash" value={`$${player.cash.toLocaleString()}`} color="text-green-400" />
        <StatCard label="Debt" value={`$${player.debt.toLocaleString()}`} color="text-red-400" />
        <StatCard label="Wallet" value={`${walletUsed} / ${player.walletCapacity}`} color="text-blue-400" />
        <StatCard label="OpSec" value={`${player.health}%`} color={player.health > 50 ? 'text-green-400' : 'text-red-400'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Market Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2">
               <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Live Market: {currentDex?.name}
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
              {COINS.map(coin => {
                const price = market.prices[coin.id] || 0;
                return (
                  <div key={coin.id} className="flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-white group-hover:text-green-400 transition-colors">{coin.name}</p>
                      <p className="text-[10px] text-slate-500">${price > 1 ? price.toLocaleString() : price.toFixed(8)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        disabled={player.cash < price || walletUsed >= player.walletCapacity}
                        onClick={() => buyCoin(coin.id)}
                        className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white px-3 py-1 text-xs font-bold rounded border border-green-500/50 transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        BUY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Your Inventory</h2>
            <div className="space-y-3">
              {Object.entries(player.inventory).length === 0 ? (
                <p className="text-xs text-slate-600 italic">No assets held.</p>
              ) : (
                (Object.entries(player.inventory) as [string, number][]).map(([coinId, qty]) => {
                  const coin = COINS.find(c => c.id === coinId);
                  const price = market.prices[coinId] || 0;
                  return (
                    <div key={coinId} className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{coin?.name}</p>
                        <p className="text-[10px] text-slate-500">{qty.toLocaleString()} Units</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                           <p className="text-xs font-bold text-green-400">${(qty * price).toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => sellCoin(coinId)}
                          className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1 text-xs font-bold rounded border border-red-500/50 transition-all"
                        >
                          SELL
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main Console */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* News Terminal */}
          <div className="bg-black border border-slate-800 rounded-xl p-6 font-mono text-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
            <h3 className="text-slate-500 mb-2 uppercase text-[10px] tracking-widest">Market Intel Feed</h3>
            {loading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <p className="text-slate-400 animate-pulse">Scanning blockchains for intelligence...</p>
              </div>
            ) : (
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {market.news}
              </div>
            )}
          </div>

          {/* Travel Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Travel to DEX</h2>
              <div className="grid grid-cols-1 gap-