export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum PowerUpType {
  SPEED = 'SPEED',       // Yellow: Increases speed
  DASH = 'DASH',         // Cyan: Teleport/Dash forward
  SHIELD = 'SHIELD',     // Green: Ignore next collision
  TRAIL = 'TRAIL'        // Pink: Visual flair + score multiplier
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  angle: number;
  isGrounded: boolean;
  hasShield: boolean;
  trailActive: boolean;
  color: string;
  dashTimer: number;
  invincibleTimer: number;
  speedBoostTimer: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'SPIKE' | 'BLOCK' | 'FLYING';
  passed: boolean;
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface ScoreRecord {
  score: number;
  date: string;
  aiComment?: string;
}