import React from 'react';
import { Play, Trophy } from 'lucide-react';

interface MainMenuProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onShowLeaderboard }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-white">
      <h1 className="text-4xl md:text-6xl text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8 tracking-widest animate-pulse" style={{ fontFamily: '"Press Start 2P", cursive' }}>
        PIXEL DASH
      </h1>
      
      <div className="space-y-6 flex flex-col items-center">
        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 transition-all clip-path-polygon text-xl flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
        >
          <Play className="w-6 h-6" />
          <span>开始游戏</span>
          <div className="absolute inset-0 border-2 border-white opacity-20 group-hover:opacity-40 pointer-events-none"></div>
        </button>

        <button
          onClick={onShowLeaderboard}
          className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors text-sm"
        >
          <Trophy className="w-4 h-4" />
          排行榜
        </button>
      </div>
      
      <div className="mt-12 text-xs text-gray-500 text-center">
        <p>点击屏幕 / 空格键跳跃</p>
        <div className="flex gap-4 justify-center mt-2">
           <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full"></span> 加速</span>
           <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 冲刺</span>
           <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span> 护盾</span>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;