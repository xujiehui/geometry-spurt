
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Obstacle, PowerUp, PowerUpType, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, JUMP_FORCE, INITIAL_SPEED, COLORS, PLAYER_SIZE, FLOOR_HEIGHT } from '../constants';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  onGameOver: (score: number, reason: string) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(INITIAL_SPEED);
  
  // Cooldown in pixels before next spawn
  const spawnCooldownRef = useRef<number>(0);
  
  // Game Entities Refs (Mutable for performance loop)
  const playerRef = useRef<Player>({
    x: 100,
    y: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    angle: 0,
    isGrounded: true,
    hasShield: false,
    trailActive: false,
    color: COLORS.player,
    dashTimer: 0,
    invincibleTimer: 0,
    speedBoostTimer: 0
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef<number>(0);
  
  // DEBUG CONSTANT: Set to true to see hitboxes
  const SHOW_HITBOXES = false;
  
  const spawnObstacle = () => {
    const speed = gameSpeedRef.current;
    let type: 'SPIKE' | 'BLOCK' | 'FLYING' = 'SPIKE';
    let width = 30;
    let height = 30;
    let y = CANVAS_HEIGHT - FLOOR_HEIGHT - 30;

    // Difficulty Logic based on Speed
    const rand = Math.random();
    
    if (speed < 8) {
        // EASY: Mostly spikes, occasional small block
        if (rand > 0.85) {
            type = 'BLOCK';
            width = 40;
            height = 40;
            y = CANVAS_HEIGHT - FLOOR_HEIGHT - 40;
        }
    } else if (speed < 11) {
        // MEDIUM: Taller blocks, introduction of flying enemies
        if (rand > 0.7) {
            type = 'BLOCK';
            width = 40;
            height = 50 + Math.random() * 10; // Taller
            y = CANVAS_HEIGHT - FLOOR_HEIGHT - height;
        } else if (rand > 0.9) {
            type = 'FLYING';
            // Constraint flying enemies to either Low (must jump) or High (can run under)
            // Low: y approx 370 (Floor - 80). High: y approx 320 (Floor - 130)
            const isHigh = Math.random() > 0.5;
            y = CANVAS_HEIGHT - FLOOR_HEIGHT - (isHigh ? 130 : 70); 
            width = 35;
            height = 35;
        }
    } else {
        // HARD: Tricky flying enemies, tall walls
        if (rand > 0.6) {
            type = 'BLOCK';
            width = 40;
            height = 60;
            y = CANVAS_HEIGHT - FLOOR_HEIGHT - 60;
        } else if (rand > 0.8) {
            type = 'FLYING';
             const isHigh = Math.random() > 0.5;
            y = CANVAS_HEIGHT - FLOOR_HEIGHT - (isHigh ? 140 : 60);
            width = 35;
            height = 35;
        }
    }

    // Spawn immediately at the right edge
    obstaclesRef.current.push({
      x: CANVAS_WIDTH,
      y: y,
      width,
      height,
      type,
      passed: false
    });

    // Calculate next spawn gap (Distance = Speed * Frames)
    // Min frames to jump ~40. We add buffer.
    // As speed increases, we keep the time gap somewhat consistent to rhythm, 
    // effectively increasing distance gap.
    const minFrames = 40; 
    const maxFrames = 90;
    // slightly randomize rhythm
    const nextFrames = minFrames + Math.random() * (maxFrames - minFrames);
    spawnCooldownRef.current = nextFrames * speed; 
  };

  const spawnPowerUp = () => {
    // Only spawn powerups occasionally
    if (Math.random() > 0.3) return; 

    const types = [PowerUpType.SPEED, PowerUpType.DASH, PowerUpType.SHIELD, PowerUpType.TRAIL];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Spawn in air usually
    const y = CANVAS_HEIGHT - FLOOR_HEIGHT - 100 - (Math.random() * 50);
    const startX = CANVAS_WIDTH; // Spawn at edge now

    powerUpsRef.current.push({
      x: startX,
      y,
      width: 25,
      height: 25,
      type,
      active: true
    });
  };

  const createParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const resetGame = () => {
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      dy: 0,
      angle: 0,
      isGrounded: true,
      hasShield: false,
      trailActive: false,
      color: COLORS.player,
      dashTimer: 0,
      invincibleTimer: 0, // Reset invincibility
      speedBoostTimer: 0
    };
    obstaclesRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    gameSpeedRef.current = INITIAL_SPEED;
    frameCountRef.current = 0;
    
    // IMPORTANT: Set a positive initial cooldown so obstacles don't spawn instantly
    // 500 pixels / 6 speed ~= 83 frames (~1.3 seconds)
    spawnCooldownRef.current = 500; 
    
    setScore(0);
  };

  const handleJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const player = playerRef.current;
    if (player.isGrounded) {
      player.dy = JUMP_FORCE;
      player.isGrounded = false;
      audioService.playJump();
      // Rotation logic handled in update
      createParticles(player.x + player.width/2, player.y + player.height, '#fff', 3);
    }
  }, [gameState]);

  const update = () => {
    // 0. Game State Guard
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;
    const player = playerRef.current;
    
    // Manage Timers
    if (player.invincibleTimer > 0) player.invincibleTimer--;
    if (player.dashTimer > 0) {
        player.dashTimer--;
        // While dashing, maintain height and speed
        player.dy = 0; 
        createParticles(player.x, player.y + player.height/2, COLORS.powerups.DASH, 2);
    }
    
    if (player.speedBoostTimer > 0) {
        player.speedBoostTimer--;
        if (player.speedBoostTimer === 0) {
             gameSpeedRef.current = Math.max(INITIAL_SPEED + (scoreRef.current / 1000), gameSpeedRef.current - 2);
        }
    }

    // 1. Player Physics
    if (player.dashTimer <= 0) {
        player.dy += GRAVITY;
        player.y += player.dy;
    }

    // Floor Collision
    if (player.y + player.height > CANVAS_HEIGHT - FLOOR_HEIGHT) {
      player.y = CANVAS_HEIGHT - FLOOR_HEIGHT - player.height;
      player.dy = 0;
      player.isGrounded = true;
      // Snap angle
      player.angle = Math.round(player.angle / 90) * 90; 
    } else {
      player.isGrounded = false;
      // Spin fast if dashing, normal if jumping
      player.angle += player.dashTimer > 0 ? 20 : 5; 
    }

    // 2. Spawn Managers
    gameSpeedRef.current += 0.001;
    
    // Effective speed for movement
    // Cap effective speed to avoid glitches
    const effectiveSpeed = player.dashTimer > 0 ? Math.min(gameSpeedRef.current * 2, 25) : gameSpeedRef.current;
    
    // Manage Obstacle Spawning with Cooldown
    spawnCooldownRef.current -= effectiveSpeed;
    if (spawnCooldownRef.current <= 0) {
        spawnObstacle();
    }
    
    // Powerups independent spawn cycle (every ~3-5 seconds depending on speed)
    if (frameCountRef.current % 240 === 0) {
      spawnPowerUp();
    }

    // 3. Move Obstacles & Collision
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= effectiveSpeed;

      // Clean up off-screen
      if (obs.x + obs.width < 0) {
        obstaclesRef.current.splice(i, 1);
        continue;
      }

      // SAFE FRAME CHECK: Skip all collisions for the first 60 frames (1 second)
      if (frameCountRef.current < 60) continue;

      // Skip collision if invincible
      if (player.invincibleTimer > 0) continue;

      // Collision Detection (AABB with forgiveness)
      // We shrink the hitbox slightly to be forgiving to the player
      const forgiveness = 6; // pixels
      const playerHitbox = {
          x: player.x + forgiveness,
          y: player.y + forgiveness,
          w: player.width - forgiveness * 2,
          h: player.height - forgiveness * 2
      };

      const obsHitbox = {
          x: obs.x + forgiveness,
          y: obs.y + forgiveness,
          w: obs.width - forgiveness * 2,
          h: obs.height - forgiveness * 2
      };

      // Special Hitbox for Spikes (Triangular approximation or just lower half)
      if (obs.type === 'SPIKE') {
          // Lower the top of the spike hitbox significantly so you only die if you hit the body, not the tip top air
          // Visual tip is at obs.y. Base is at obs.y + obs.height.
          // We make the kill zone start 40% down from the tip.
          const offsetTop = obs.height * 0.4;
          obsHitbox.y = obs.y + offsetTop; 
          obsHitbox.h = obs.height - offsetTop;
          
          // Also shrink width more for spikes to simulate triangle
          const offsetSide = obs.width * 0.3;
          obsHitbox.x = obs.x + offsetSide;
          obsHitbox.w = obs.width - (offsetSide * 2);
      } else if (obs.type === 'FLYING') {
          // Flying Hitbox optimization
          const offset = 5;
          obsHitbox.y += offset;
          obsHitbox.h -= offset * 2;
          obsHitbox.x += offset;
          obsHitbox.w -= offset * 2;
      }

      if (
        playerHitbox.x < obsHitbox.x + obsHitbox.w &&
        playerHitbox.x + playerHitbox.w > obsHitbox.x &&
        playerHitbox.y < obsHitbox.y + obsHitbox.h &&
        playerHitbox.y + playerHitbox.h > obsHitbox.y
      ) {
        if (player.hasShield) {
          // Use shield
          player.hasShield = false;
          audioService.playCrash();
          createParticles(obs.x, obs.y, COLORS.powerups.SHIELD, 10);
          obstaclesRef.current.splice(i, 1); // Remove obstacle
          player.invincibleTimer = 30; // Brief invincibility after shield break
        } else {
          // Game Over
          audioService.playCrash();
          const reason = obs.type === 'SPIKE' ? '被尖刺刺穿' : (obs.type === 'FLYING' ? '撞到了飞行器' : '撞到了墙壁');
          setGameState(GameState.GAME_OVER);
          onGameOver(Math.floor(scoreRef.current), reason);
          return; // Stop update
        }
      }
    }

    // 4. Move PowerUps & Collision
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const pu = powerUpsRef.current[i];
      pu.x -= effectiveSpeed;

      if (
        player.x < pu.x + pu.width &&
        player.x + player.width > pu.x &&
        player.y < pu.y + pu.height &&
        player.y + player.height > pu.y
      ) {
        // Collect PowerUp
        audioService.playCollect(pu.type);
        createParticles(pu.x, pu.y, COLORS.powerups[pu.type], 10);
        
        switch (pu.type) {
          case PowerUpType.SPEED:
            gameSpeedRef.current += 2;
            player.speedBoostTimer = 180; // ~3 seconds at 60fps
            break;
          case PowerUpType.DASH:
             player.dashTimer = 30; // 0.5s dash
             player.invincibleTimer = 45; // Invincible slightly longer than dash
             scoreRef.current += 150;
             createParticles(player.x, player.y, COLORS.powerups.DASH, 20);
            break;
          case PowerUpType.SHIELD:
            player.hasShield = true;
            break;
          case PowerUpType.TRAIL:
            player.trailActive = true;
            setTimeout(() => { if(playerRef.current) playerRef.current.trailActive = false; }, 5000); 
            break;
        }
        
        powerUpsRef.current.splice(i, 1);
      } else if (pu.x + pu.width < 0) {
        powerUpsRef.current.splice(i, 1);
      }
    }

    // 5. Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Trail Effect
    if (player.trailActive || player.hasShield || player.dashTimer > 0) {
      if (frameCountRef.current % 5 === 0) {
        const color = player.dashTimer > 0 ? COLORS.powerups.DASH : (player.trailActive ? COLORS.powerups.TRAIL : COLORS.powerups.SHIELD);
        createParticles(player.x, player.y + player.height / 2, color, 1);
      }
    }

    // Score
    scoreRef.current += effectiveSpeed / 10;
    // Sync score to React occasionally for UI
    if (frameCountRef.current % 10 === 0) {
      setScore(Math.floor(scoreRef.current));
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Floor
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH, FLOOR_HEIGHT);
    // Floor grid
    ctx.strokeStyle = '#24345e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0; i<CANVAS_WIDTH; i+=40) {
        // Offset by speed to make floor look moving
        const offset = (frameCountRef.current * gameSpeedRef.current) % 40;
        ctx.moveTo(i - offset, CANVAS_HEIGHT - FLOOR_HEIGHT);
        ctx.lineTo(i - offset, CANVAS_HEIGHT);
    }
    ctx.stroke();

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    });

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.lineWidth = 2;
      
      if (obs.type === 'SPIKE') {
        ctx.save(); // Save context for shadow effects
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.spike;
        
        ctx.fillStyle = COLORS.spike;
        ctx.beginPath();
        // FIXED: Use lineTo instead of moveTo to actually draw lines!
        ctx.moveTo(obs.x, obs.y + obs.height); // Start Bottom Left
        ctx.lineTo(obs.x + obs.width / 2, obs.y); // Top Middle
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height); // Bottom Right
        ctx.closePath(); // Back to Bottom Left
        ctx.fill();
        
        // Inner brighter triangle for depth
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width * 0.2, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height * 0.3); // FIXED
        ctx.lineTo(obs.x + obs.width * 0.8, obs.y + obs.height); // FIXED
        ctx.closePath();
        ctx.fill();

        ctx.restore(); 
      } else if (obs.type === 'BLOCK') {
        ctx.fillStyle = COLORS.block;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Inner detail
        ctx.strokeStyle = '#2d3436';
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, 4);
      } else if (obs.type === 'FLYING') {
         ctx.fillStyle = COLORS.flying;
         // Draw a simple shape for flying, maybe a diamond or hexagon concept
         ctx.beginPath();
         ctx.moveTo(obs.x, obs.y + obs.height/2);
         ctx.lineTo(obs.x + obs.width/2, obs.y);
         ctx.lineTo(obs.x + obs.width, obs.y + obs.height/2);
         ctx.lineTo(obs.x + obs.width/2, obs.y + obs.height);
         ctx.closePath();
         ctx.fill();
         
         ctx.strokeStyle = '#e1b12c';
         ctx.stroke();
      }
      
      // DEBUG: DRAW HITBOXES
      if (SHOW_HITBOXES) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 1;
          const forgiveness = 6;
          const h = {
             x: obs.x + forgiveness,
             y: obs.y + forgiveness,
             w: obs.width - forgiveness*2,
             h: obs.height - forgiveness*2
          };
          
          if (obs.type === 'SPIKE') {
            const offsetTop = obs.height * 0.4;
            h.y = obs.y + offsetTop;
            h.h = obs.height - offsetTop;
            const offsetSide = obs.width * 0.3;
            h.x = obs.x + offsetSide;
            h.w = obs.width - (offsetSide * 2);
          }
          ctx.strokeRect(h.x, h.y, h.w, h.h);
      }
    });

    // Draw PowerUps
    powerUpsRef.current.forEach(pu => {
      ctx.fillStyle = COLORS.powerups[pu.type];
      ctx.beginPath();
      ctx.arc(pu.x + pu.width/2, pu.y + pu.height/2, pu.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.powerups[pu.type];
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Player
    const p = playerRef.current;
    ctx.save();
    
    // Ghost effect logic
    if (p.dashTimer > 0) {
        // Draw ghosts
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = COLORS.powerups.DASH;
        ctx.fillRect(p.x - 20, p.y + (p.height - p.height*0.6)/2, p.width * 1.5, p.height * 0.6);
        ctx.globalAlpha = 1.0;
    }
    
    // Apply transformations
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate((p.angle * Math.PI) / 180);
    
    // Dash stretch effect
    if (p.dashTimer > 0) {
        ctx.scale(1.5, 0.6);
    }
    
    // Shield glow
    if (p.hasShield) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLORS.powerups.SHIELD;
    }
    
    // Blinking if invincible but not dashing (e.g. after hit)
    if (p.invincibleTimer > 0 && p.dashTimer === 0) {
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
    }
    
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
    
    // Player Eyes (cute factor)
    ctx.fillStyle = '#fff';
    // Prevent eyes from stretching weirdly
    ctx.fillRect(2, -8, 6, 6);
    ctx.fillRect(12, -8, 6, 6);
    
    ctx.restore();
    
    // DEBUG: DRAW PLAYER HITBOX
    if (SHOW_HITBOXES) {
        ctx.strokeStyle = 'cyan';
        ctx.strokeRect(p.x + 6, p.y + 6, p.width - 12, p.height - 12);
    }
  };

  const gameLoop = () => {
    update();
    draw();
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // Start Loop
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      // ALWAYS reset game when entering playing state (e.g. from Menu or GameOver)
      resetGame();
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      // If we are in MENU, reset to show clean background
      if (gameState === GameState.MENU) {
        resetGame();
      }
      // Just draw one frame
      draw();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleJump();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
        // Prevent default only if playing to stop scrolling
        if(gameState === GameState.PLAYING) e.preventDefault();
        handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Use non-passive for touch to prevent scrolling
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('mousedown', handleJump);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousedown', handleJump);
    };
  }, [handleJump, gameState]);

  return (
    <div className="relative w-full max-w-4xl mx-auto shadow-2xl border-4 border-gray-800 rounded-lg overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto block"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Scanline effect overlay */}
      <div className="scanline"></div>
    </div>
  );
};

export default GameCanvas;
