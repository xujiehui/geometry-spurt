import React from 'react';
import { X, Trophy, Medal } from 'lucide-react';
import { ScoreRecord } from '../types';

interface LeaderboardProps {
  scores: ScoreRecord[];
  onClose: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ scores, onClose }) => {
  // Sort scores descending
  const sortedScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-40 p-4">
      <div className="w-full max-w-md bg-gray-900 border-2 border-indigo-500 rounded-lg p-6 relative">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-white"
        >
            <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl text-center text-yellow-400 mb-6 flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" /> 
            排行榜
        </h2>

        {scores.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无记录，快去创造历史吧！</p>
        ) : (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {sortedScores.map((record, index) => (
                    <li key={index} className={`flex justify-between items-center p-3 rounded ${index === 0 ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-800'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500 text-black' : 
                                index === 1 ? 'bg-gray-400 text-black' : 
                                index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                            }`}>
                                {index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-white text-sm">{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <span className="text-green-400 font-mono text-lg">{record.score}</span>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;