import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import GameOver from './components/GameOver';
import Leaderboard from './components/Leaderboard';
import { GameState, ScoreRecord } from './types';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScores, setHighScores] = useState<ScoreRecord[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [lastDeathReason, setLastDeathReason] = useState<string>("");

  // Load scores on mount
  useEffect(() => {
    const saved = localStorage.getItem('pixelDashScores');
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load scores");
      }
    }
  }, []);

  // Audio State Management
  useEffect(() => {
    // Try to init audio on first state change if not already done
    const initAudio = async () => {
      await audioService.init();
    };
    
    initAudio();
    audioService.playBGM(gameState);

    // If user hasn't interacted, audio might be suspended. 
    // We add a one-time global click listener to ensure context is resumed.
    const unlockAudio = () => {
        audioService.init();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
  }, [gameState]);

  const saveScore = (newScore: number) => {
    const newRecord: ScoreRecord = {
      score: newScore,
      date: new Date().toISOString()
    };
    const updated = [...highScores, newRecord];
    setHighScores(updated);
    localStorage.setItem('pixelDashScores', JSON.stringify(updated));
  };

  const handleStartGame = () => {
    audioService.init(); // Ensure audio is ready
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number, reason: string) => {
    setLastDeathReason(reason);
    saveScore(finalScore);
  };

  const handleRestart = () => {
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleGoHome = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl aspect-[16/9]">
        
        {/* Score HUD during gameplay */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-4 right-6 z-10 text-white font-mono text-2xl drop-shadow-md">
            SCORE: {score}
          </div>
        )}

        {/* The Game Canvas - Always rendered to maintain context, but logic pauses based on state */}
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore}
          onGameOver={handleGameOver}
        />

        {/* Overlays */}
        {gameState === GameState.MENU && (
          <MainMenu 
            onStart={handleStartGame} 
            onShowLeaderboard={() => setShowLeaderboard(true)} 
          />
        )}

        {gameState === GameState.GAME_OVER && (
          <GameOver 
            score={score} 
            deathReason={lastDeathReason}
            onRestart={handleRestart} 
            onHome={handleGoHome}
          />
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <Leaderboard 
            scores={highScores} 
            onClose={() => setShowLeaderboard(false)} 
          />
        )}

        {/* Mobile controls hint (only visual) */}
        <div className="absolute bottom-[-40px] left-0 right-0 text-center text-gray-500 text-xs md:hidden">
            推荐横屏游玩以获得最佳体验
        </div>
      </div>
    </div>
  );
};

export default App;