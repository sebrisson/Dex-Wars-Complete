
import { GoogleGenAI } from "@google/genai";
import { COINS, DEXES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMarketNews(day: number, currentDex: string) {
  const coinNames = COINS.map(c => c.name).join(", ");
  const dexNames = DEXES.map(d => d.name).join(", ");
  
  const prompt = `
    You are a crypto-market news bot for a game called DEX Wars. 
    Context: Day ${day}, Location: ${currentDex}.
    Coins: ${coinNames}.
    
    Generate 3 short, punchy crypto news events.
    Culture: Cynical, witty, "crypto-twitter" style.
    Specific Vibes: PulseChain, Hexicans, Ethereum maxis, and meme coin mania.
    Format: Return 3 bullet points.
    
    Example: 
    - "SEC chairman spotted at a coffee shop; Markets dump 5% in fear."
    - "New PulseChain bridge update goes live; HEX staking volume hits record high!"
    - "Pepe whale accidentally burns $2M; deflationary pressure intensifies."
    
    Include a "Whale Alert" for one of the points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });
    return response.text || "The blocks are stalling. No news is good news.";
  } catch (error) {
    console.error("News Generation Error:", error);
    return "The RPC is down. Markets are moving in silence.";
  }
}
