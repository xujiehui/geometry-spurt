import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import GameOver from './components/GameOver';
import Leaderboard from './components/Leaderboard';
import { GameState, ScoreRecord } from './types';
import { audioService } from './services/audioService';
import { Smartphone, RotateCw } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScores, setHighScores] = useState<ScoreRecord[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [lastDeathReason, setLastDeathReason] = useState<string>("");
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

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
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
  }, [gameState]);

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      // Check if width < height implies portrait
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const saveScore = (newScore: number) => {
    const newRecord: ScoreRecord = {
      score: newScore,
      date: new Date().toISOString()
    };
    const updated = [...highScores, newRecord];
    setHighScores(updated);
    localStorage.setItem('pixelDashScores', JSON.stringify(updated));
  };

  const tryEnterFullscreenAndLock = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      }

      // Attempt to lock orientation (Works mostly on Android/Chrome)
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch((e: any) => {
             // Lock failed (common on iOS or if not fullscreen), ignore
             console.log("Orientation lock not supported or denied:", e);
        });
      }
    } catch (e) {
      console.log("Fullscreen request failed:", e);
    }
  };

  const handleStartGame = () => {
    audioService.init(); // Ensure audio is ready
    tryEnterFullscreenAndLock(); // Try to force landscape
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number, reason: string) => {
    setLastDeathReason(reason);
    saveScore(finalScore);
  };

  const handleRestart = () => {
    tryEnterFullscreenAndLock();
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleGoHome = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      
      {/* Portrait Warning Overlay */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="mb-8 relative">
             <Smartphone className="w-24 h-24 text-gray-600" />
             <RotateCw className="w-12 h-12 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin-slow" />
          </div>
          <h2 className="text-xl text-yellow-400 mb-4" style={{ fontFamily: '"Press Start 2P", cursive' }}>
            请旋转手机
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            为了最佳游戏体验，<br/>请将设备横屏使用。
          </p>
        </div>
      )}

      {/* Main Game Container */}
      <div className={`relative w-full max-w-4xl aspect-[16/9] ${isPortrait ? 'hidden' : 'block'}`}>
        
        {/* Score HUD during gameplay */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-4 right-6 z-10 text-white font-mono text-2xl drop-shadow-md select-none pointer-events-none">
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
      </div>
    </div>
  );
};

export default App;