
import React, { useState, useCallback } from 'react';
import { 
  COINS, 
  DEXES, 
  INITIAL_CASH, 
  INITIAL_DEBT, 
  DEBT_INTEREST
} from './constants';
import { PlayerState, MarketState, GameStatus } from './types';
import { generateMarketNews } from './geminiService';

const StatCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col items-center justify-center shadow-lg shadow-black/50">
    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
    <span className={`text-lg font-bold ${color || 'text-white'}`}>{value}</span>
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({
    cash: INITIAL_CASH,
    debt: INITIAL_DEBT,
    inventory: {},
    currentDexId: DEXES[0].id,
    day: 1,
    maxDays: 30,
    health: 100,
    history: ["Terminal initialized..."]
  });

  const [market, setMarket] = useState<MarketState>({
    prices: {},
    prevPrices: {},
    news: "Welcome to the trenches. Watch your OpSec, pay your debt, and aim for the moon."
  });

  const refreshPrices = useCallback((dexId: string) => {
    const newPrices: Record<string, number> = {};
    COINS.forEach(coin => {
      let vol = coin.volatility;
      if (dexId === 'piteas' && vol >= 0.4) {
        vol = Math.min(0.99, vol * 1.5);
      }
      const fluctuation = (Math.random() - 0.5) * 2 * vol;
      const finalPrice = coin.basePrice * (1 + fluctuation);
      newPrices[coin.id] = Math.max(0.00000000001, finalPrice);
    });
    return newPrices;
  }, []);

  const handleReset = useCallback(() => {
    setStatus(GameStatus.START);
    setLoading(false);
    setPlayer({
      cash: INITIAL_CASH,
      debt: INITIAL_DEBT,
      inventory: {},
      currentDexId: DEXES[0].id,
      day: 1,
      maxDays: 30,
      health: 100,
      history: ["Terminal initialized..."]
    });
    setMarket({
      prices: {},
      prevPrices: {},
      news: "Welcome to the trenches. Watch your OpSec, pay your debt, and aim for the moon."
    });
  }, []);

  const startGame = (days: number) => {
    const initialPrices = refreshPrices(DEXES[0].id);
    setPlayer({ 
      cash: INITIAL_CASH,
      debt: INITIAL_DEBT,
      inventory: {},
      currentDexId: DEXES[0].id,
      day: 1,
      maxDays: days,
      health: 100,
      history: [`Day 1: Connection established at Uniswap.`]
    });
    setMarket({
      prices: initialPrices,
      prevPrices: initialPrices,
      news: "The markets are open. Volatility is high. Good luck, Mogul."
    });
    setStatus(GameStatus.PLAYING);
  };

  const travel = async (dexId: string) => {
    if (dexId === player.currentDexId || loading) return;
    setLoading(true);
    const newDay = player.day + 1;
    if (newDay > player.maxDays) {
      setStatus(GameStatus.GAMEOVER);
      setLoading(false);
      return;
    }

    const newPrices = refreshPrices(dexId);
    const prevPrices = { ...market.prices };
    const newDebt = Math.round(player.debt * DEBT_INTEREST);
    const dexName = DEXES.find(d => d.id === dexId)?.name || 'Unknown DEX';
    let healthPenalty = 0;
    let message = `Traveled to ${dexName}.`;

    const isImmune = dexId === 'pulsex';
    if (!isImmune && Math.random() < 0.08) {
      healthPenalty = 20;
      message += " RUG PULL! You lost 20% OpSec.";
    } else if (isImmune && Math.random() < 0.08) {
      message += " [PERK] Avoided a rug pull via Safe Haven audit.";
    }

    let interestEarned = 0;
    if (dexId === 'internetmoney') {
      interestEarned = Math.floor(player.cash * 0.02);
      if (interestEarned > 0) {
        message += ` [PERK] Staking yield: $${interestEarned.toLocaleString()}.`;
      }
    }

    const news = await generateMarketNews(newDay, dexName);
    setPlayer(prev => ({
      ...prev,
      day: newDay,
      debt: newDebt,
      cash: prev.cash + interestEarned,
      currentDexId: dexId,
      health: Math.max(0, prev.health - healthPenalty),
      history: [message, ...prev.history].slice(0, 5)
    }));
    setMarket({ prices: newPrices, prevPrices: prevPrices, news: news });
    setLoading(false);
  };

  const buyCoin = (coinId: string) => {
    let price = market.prices[coinId];
    if (!price) return;
    if (player.currentDexId === 'libertyswap') price *= 0.95;
    
    const amount = Math.floor(player.cash / price);
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
    let price = market.prices[coinId];
    if (amount <= 0 || !price) return;
    if (player.currentDexId === 'uniswap') price *= 1.05;
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

  const totalAssetsValue = player.cash + (Object.entries(player.inventory) as [string, number][]).reduce((acc, [id, qty]) => acc + (qty * (market.prices[id] || 0)), 0);

  const getPriceChange = (coinId: string) => {
    const current = market.prices[coinId];
    const prev = market.prevPrices[coinId];
    if (!current || !prev || player.day === 1) return null;
    return ((current - prev) / prev) * 100;
  };

  const shareToX = () => {
    const netWorth = totalAssetsValue - player.debt;
    const text = `I just dominated the trenches in DEX Wars! My net worth: $${netWorth.toLocaleString()}. 🚀📈 #DEXWars #PulseChain`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  if (status === GameStatus.START) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border-2 border-green-500/50 p-10 rounded-2xl shadow-2xl text-center">
          <h1 className="text-5xl font-black text-green-500 mb-2 italic">DEX WARS</h1>
          <p className="text-slate-500 mb-8 text-xs font-bold uppercase tracking-[0.3em]">Trench Simulator</p>
          <div className="space-y-4">
            <button onClick={() => startGame(30)} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-lg border-b-4 border-green-800 transition-all transform active:scale-95">30 DAY SPRINT</button>
            <button onClick={() => startGame(60)} className="w-full border-2 border-slate-700 hover:border-slate-500 text-slate-300 font-black py-4 rounded-lg transition-all transform active:scale-95">60 DAY MARATHON</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAMEOVER) {
    const netWorth = totalAssetsValue - player.debt;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border-2 border-white/20 p-10 rounded-2xl shadow-2xl text-center">
          <h1 className="text-4xl font-black text-white mb-2 italic">RUN COMPLETE</h1>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 my-8">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Final Net Worth</p>
            <p className="text-4xl font-black text-green-500">${netWorth.toLocaleString()}</p>
          </div>
          <div className="space-y-3">
            <button onClick={shareToX} className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-black py-4 rounded-lg">POST TO X</button>
            <button onClick={handleReset} className="w-full bg-slate-200 hover:bg-white text-black font-black py-4 rounded-lg">NEW RUN</button>
          </div>
        </div>
      </div>
    );
  }

  const currentDex = DEXES.find(d => d.id === player.currentDexId);
  const totalUnitsHeld = (Object.values(player.inventory) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto p-4 md:p-8 gap-6 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Day" value={`${player.day}/${player.maxDays}`} color="text-yellow-400" />
        <StatCard label="Cash" value={`$${player.cash.toLocaleString()}`} color="text-green-400" />
        <StatCard label="Debt" value={`$${player.debt.toLocaleString()}`} color="text-red-500" />
        <StatCard label="Holdings" value={`${totalUnitsHeld.toLocaleString()} units`} color="text-blue-400" />
        <StatCard label="OpSec" value={`${player.health}%`} color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">DEX: {currentDex?.name}</h2>
              <span className="text-[18px]">{currentDex?.icon}</span>
            </div>
            <p className="text-[9px] text-slate-400 mb-6 border-b border-slate-800 pb-2 italic">
              {currentDex?.specialty}
            </p>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {COINS.map(coin => {
                let price = market.prices[coin.id] || 0;
                if (player.currentDexId === 'libertyswap') price *= 0.95;
                const change = getPriceChange(coin.id);
                
                return (
                  <div key={coin.id} className="flex items-center justify-between p-2 hover:bg-slate-900/50 rounded-lg group transition-colors">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white group-hover:text-green-400 transition-colors">{coin.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-mono text-slate-500">
                          ${price > 1 ? price.toLocaleString() : price.toFixed(6)}
                          {player.currentDexId === 'libertyswap' && <span className="text-green-500 ml-1 text-[8px] font-bold">-5%</span>}
                        </p>
                        {change !== null && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${change >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => buyCoin(coin.id)} disabled={player.cash < price || loading} className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white px-3 py-1.5 text-[10px] font-black rounded-lg border border-green-500/40 disabled:opacity-20 transition-all transform active:scale-95">BUY</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Storage</h2>
            <div className="space-y-3">
              {Object.entries(player.inventory).length === 0 ? <p className="text-[10px] text-slate-600 italic">Empty wallet.</p> :
                (Object.entries(player.inventory) as [string, number][]).map(([id, qty]) => {
                  let price = market.prices[id] || 0;
                  if (player.currentDexId === 'uniswap') price *= 1.05;
                  
                  return (
                    <div key={id} className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                      <div>
                        <p className="text-xs font-bold text-white">{COINS.find(c => c.id === id)?.name}</p>
                        <p className="text-[8px] text-slate-500 font-mono">{qty.toLocaleString()} units</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] text-green-400 font-mono">${(qty * price).toLocaleString()}</p>
                          {player.currentDexId === 'uniswap' && <p className="text-green-500 text-[8px] font-black tracking-tighter uppercase">+5% LP BONUS</p>}
                        </div>
                        <button onClick={() => sellCoin(id)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1 text-[10px] font-black rounded border border-red-500/40 transition-colors">SELL</button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-black border-2 border-slate-800 rounded-2xl p-6 font-mono text-xs shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-20 animate-pulse"></div>
            <h3 className="text-slate-600 mb-4 uppercase font-black tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              Intel Terminal
            </h3>
            {loading ? <p className="animate-pulse text-green-500 font-bold">SYNCING BLOCKS & REBALANCING LIQUIDITY...</p> : 
              <div className="space-y-2 text-slate-300">
                {market.news.split('\n').map((line, i) => (
                  <p key={i}>
                    <span className="text-green-500">&gt;&gt;</span> {line.replace(/^- /, '')}
                  </p>
                ))}
              </div>
            }
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Bridge To</h2>
              <div className="space-y-3">
                {DEXES.map(dex => (
                  <button 
                    key={dex.id} 
                    disabled={player.currentDexId === dex.id || loading} 
                    onClick={() => travel(dex.id)} 
                    style={{ borderColor: player.currentDexId === dex.id ? dex.color : '#1e293b' }}
                    className={`w-full text-left p-3 rounded-xl border-2 flex justify-between items-center transition-all group ${player.currentDexId === dex.id ? 'bg-slate-900 shadow-[0_0_15px_-5px_currentColor]' : 'hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">{dex.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black" style={{ color: player.currentDexId === dex.id ? dex.color : 'white' }}>{dex.name}</span>
                        <span className="text-[7px] text-slate-500 uppercase tracking-tighter">{dex.network}</span>
                      </div>
                    </div>
                    {player.currentDexId === dex.id ? (
                      <span className="text-[8px] bg-white text-black px-1.5 py-0.5 rounded font-black">STATIONED</span>
                    ) : (
                      <div className="text-right">
                        <span className="text-[8px] font-bold uppercase truncate max-w-[80px]" style={{ color: dex.color }}>{dex.specialty.split(':')[0]}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Actions</h2>
              <button onClick={payWhale} disabled={player.debt <= 0 || player.cash <= 0} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl border-b-4 border-red-800 disabled:opacity-20 transition-all active:translate-y-1 active:border-b-0 mb-6">PAY THE WHALE</button>
              
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <p className="text-[8px] text-slate-600 uppercase mb-3 font-black tracking-widest">Transaction Log</p>
                <div className="space-y-2 h-[80px] overflow-y-auto custom-scrollbar">
                  {player.history.map((h, i) => (
                    <p key={i} className={`text-[10px] border-l-2 pl-2 mb-1 ${h.includes('[PERK]') ? 'text-green-400 border-green-500' : 'text-slate-500 border-slate-800'}`}>
                      {h}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        id="reset-game-btn"
        onClick={() => {
          if (window.confirm("ABORT MISSION? You will lose all your progress and return to the start menu.")) {
            handleReset();
          }
        }}
        className="fixed bottom-6 right-6 z-[100] bg-slate-950/90 hover:bg-red-950/90 text-slate-600 hover:text-red-500 border border-slate-800 hover:border-red-900/50 px-5 py-2.5 text-[10px] font-black rounded-xl shadow-2xl transition-all uppercase tracking-[0.2em] backdrop-blur-md active:scale-95 border-2 shadow-red-500/5"
      >
        Reset Game
      </button>
    </div>
  );
};

export default App;
