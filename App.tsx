
import React, { useState, useCallback } from 'react';
import { 
  COINS, 
  DEXES, 
  INITIAL_CASH, 
  INITIAL_DEBT, 
  DEBT_INTEREST, 
  INITIAL_CAPACITY 
} from './constants';
import { PlayerState, MarketState, GameStatus } from './types';
import { generateMarketNews } from './services/geminiService';

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
    walletCapacity: INITIAL_CAPACITY,
    inventory: {},
    currentDexId: DEXES[0].id,
    day: 1,
    maxDays: 30,
    health: 100,
    history: ["Terminal initialized..."]
  });

  const [market, setMarket] = useState<MarketState>({
    prices: {},
    news: "Welcome to the trenches. Watch your OpSec, pay your debt, and aim for the moon."
  });

  const refreshPrices = useCallback(() => {
    const newPrices: Record<string, number> = {};
    COINS.forEach(coin => {
      const fluctuation = (Math.random() - 0.5) * 2 * coin.volatility;
      const finalPrice = coin.basePrice * (1 + fluctuation);
      newPrices[coin.id] = Math.max(0.00000000001, finalPrice);
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
      history: [`Day 1: Connection established at Uniswap.`]
    });
    setMarket({
      prices: initialPrices,
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
    const newPrices = refreshPrices();
    const newDebt = Math.round(player.debt * DEBT_INTEREST);
    const dexName = DEXES.find(d => d.id === dexId)?.name || 'Unknown DEX';
    let healthPenalty = 0;
    let message = `Traveled to ${dexName}.`;
    if (Math.random() < 0.08) {
      healthPenalty = 20;
      message += " RUG PULL! You lost 20% OpSec.";
    }
    const news = await generateMarketNews(newDay, dexName);
    setPlayer(prev => ({
      ...prev,
      day: newDay,
      debt: newDebt,
      currentDexId: dexId,
      health: Math.max(0, prev.health - healthPenalty),
      history: [message, ...prev.history].slice(0, 5)
    }));
    setMarket({ prices: newPrices, news: news });
    setLoading(false);
  };

  const buyCoin = (coinId: string) => {
    const price = market.prices[coinId];
    if (!price) return;
    const currentInventoryCount = (Object.values(player.inventory) as number[]).reduce((a, b) => a + b, 0);
    const spaceLeft = player.walletCapacity - currentInventoryCount;
    const amount = Math.min(Math.floor(player.cash / price), spaceLeft);
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
    const price = market.prices[coinId];
    if (amount <= 0 || !price) return;
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
            <button onClick={() => startGame(30)} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-lg border-b-4 border-green-800">30 DAY SPRINT</button>
            <button onClick={() => startGame(60)} className="w-full border-2 border-slate-700 hover:border-slate-500 text-slate-300 font-black py-4 rounded-lg">60 DAY MARATHON</button>
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
            <button onClick={() => setStatus(GameStatus.START)} className="w-full bg-slate-200 hover:bg-white text-black font-black py-4 rounded-lg">NEW RUN</button>
          </div>
        </div>
      </div>
    );
  }

  const currentDex = DEXES.find(d => d.id === player.currentDexId);
  const walletUsed = (Object.values(player.inventory) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto p-4 md:p-8 gap-6 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Day" value={`${player.day}/${player.maxDays}`} color="text-yellow-400" />
        <StatCard label="Cash" value={`$${player.cash.toLocaleString()}`} color="text-green-400" />
        <StatCard label="Debt" value={`$${player.debt.toLocaleString()}`} color="text-red-500" />
        <StatCard label="Wallet" value={`${walletUsed}/${player.walletCapacity}`} color="text-blue-400" />
        <StatCard label="OpSec" value={`${player.health}%`} color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">DEX: {currentDex?.name}</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {COINS.map(coin => {
                const price = market.prices[coin.id] || 0;
                return (
                  <div key={coin.id} className="flex items-center justify-between p-2 hover:bg-slate-900/50 rounded-lg">
                    <div>
                      <p className="font-bold text-sm text-white">{coin.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">${price > 1 ? price.toLocaleString() : price.toFixed(6)}</p>
                    </div>
                    <button onClick={() => buyCoin(coin.id)} disabled={player.cash < price || walletUsed >= player.walletCapacity || loading} className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white px-3 py-1.5 text-[10px] font-black rounded-lg border border-green-500/40 disabled:opacity-20">BUY</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Storage</h2>
            <div className="space-y-3">
              {Object.entries(player.inventory).length === 0 ? <p className="text-[10px] text-slate-600 italic">Empty wallet.</p> :
                (Object.entries(player.inventory) as [string, number][]).map(([id, qty]) => (
                  <div key={id} className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                    <p className="text-xs font-bold text-white">{COINS.find(c => c.id === id)?.name}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-green-400 font-mono">${(qty * (market.prices[id] || 0)).toLocaleString()}</p>
                      <button onClick={() => sellCoin(id)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1 text-[10px] font-black rounded border border-red-500/40">SELL</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-black border-2 border-slate-800 rounded-2xl p-6 font-mono text-xs shadow-2xl">
            <h3 className="text-slate-600 mb-4 uppercase font-black tracking-widest">Intel Terminal</h3>
            {loading ? <p className="animate-pulse text-green-500">Syncing blocks...</p> : 
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
              <div className="space-y-2">
                {DEXES.map(dex => (
                  <button key={dex.id} disabled={player.currentDexId === dex.id || loading} onClick={() => travel(dex.id)} className={`w-full text-left p-3 rounded-xl border-2 flex justify-between items-center ${player.currentDexId === dex.id ? 'border-green-500 bg-green-500/10' : 'border-slate-800 hover:border-slate-600 bg-slate-900/40'}`}>
                    <span className="text-xs font-black">{dex.name}</span>
                    {player.currentDexId === dex.id && <span className="text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded">ONLINE</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Actions</h2>
              <button onClick={payWhale} disabled={player.debt <= 0 || player.cash <= 0} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl border-b-4 border-red-800 disabled:opacity-20">PAY THE WHALE</button>
              <div className="mt-6 bg-slate-900/50 p-3 rounded-lg max-h-[100px] overflow-y-auto">
                <p className="text-[8px] text-slate-600 uppercase mb-2 font-black">History:</p>
                {player.history.map((h, i) => <p key={i} className="text-[10px] text-slate-500 border-l border-slate-800 pl-2 mb-1">{h}</p>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
