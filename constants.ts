
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GRAVITY = 0.6;
export const JUMP_FORCE = -12;
export const INITIAL_SPEED = 6;
export const MAX_SPEED = 12;
export const FLOOR_HEIGHT = 50; // Pixels from bottom

export const COLORS = {
  background: '#1a1a2e',
  floor: '#16213e',
  player: '#e94560',
  playerShield: '#0f3460',
  obstacle: '#fff', // General fallback
  spike: '#ff3838', // Brighter Neon Red
  block: '#4cd137', // Neon Green/Cyan
  flying: '#fbc531', // Bright Yellow/Orange
  text: '#ffffff',
  powerups: {
    SPEED: '#f1c40f', // Yellow
    DASH: '#00d2d3',  // Cyan
    SHIELD: '#2ecc71', // Green
    TRAIL: '#ff9ff3'  // Pink
  }
};

export const PLAYER_SIZE = 30;

export const AI_PERSONA = `
你是一个复古像素游戏的“AI 游戏大师”。
你的任务是根据玩家的死亡分数和情况，给出简短、风趣、有时略带嘲讽但富有建设性的评论。
请用中文回复，不超过一句话。
`;
