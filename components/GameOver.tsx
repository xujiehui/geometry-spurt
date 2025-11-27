import React, { useEffect, useState } from 'react';
import { RotateCcw, Home, Sparkles } from 'lucide-react';
import { getGameComment } from '../services/geminiService';

interface GameOverProps {
  score: number;
  deathReason: string;
  onRestart: () => void;
  onHome: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, deathReason, onRestart, onHome }) => {
  const [aiComment, setAiComment] = useState<string>("正在分析你的操作...");

  useEffect(() => {
    let isMounted = true;
    getGameComment(score, deathReason).then(comment => {
      if (isMounted) setAiComment(comment);
    });
    return () => { isMounted = false; };
  }, [score, deathReason]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 text-white p-4">
      <h2 className="text-4xl text-red-500 mb-2">GAME OVER</h2>
      <p className="text-gray-400 text-sm mb-6">死因: {deathReason}</p>
      
      <div className="bg-gray-900 p-6 rounded-lg border-2 border-gray-700 text-center mb-6 w-full max-w-md">
        <div className="text-xs text-gray-500 mb-1">本次得分</div>
        <div className="text-5xl text-yellow-400 mb-4">{score}</div>
        
        <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="flex items-center justify-center gap-2 text-purple-400 mb-2 text-xs uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> AI 教练点评
            </div>
            <p className="text-sm italic text-gray-300 leading-relaxed min-h-[3rem]">
                "{aiComment}"
            </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
        >
          <RotateCcw className="w-5 h-5" /> 重试
        </button>
        <button
          onClick={onHome}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 transition-all"
        >
          <Home className="w-5 h-5" /> 菜单
        </button>
      </div>
    </div>
  );
};

export default GameOver;