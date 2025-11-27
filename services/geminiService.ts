import { GoogleGenAI } from "@google/genai";
import { AI_PERSONA } from '../constants';

// Safely access process.env.API_KEY to prevent ReferenceError in browser environments
const getApiKey = () => {
  try {
    // Check global scope specifically for process
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env.API_KEY || '';
    }
    // Check window.process for polyfilled env
    if (typeof window !== 'undefined' && (window as any).process && (window as any).process.env) {
        return (window as any).process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore any access errors
  }
  return '';
};

const apiKey = getApiKey();
// Only initialize if key exists and is a non-empty string
const ai = apiKey && apiKey.length > 0 ? new GoogleGenAI({ apiKey }) : null;

// Local fallback comments to use when API quota is exceeded or offline
const getFallbackComment = (score: number): string => {
  if (score < 500) {
      const insults = [
          "就这？键盘上撒把米鸡都比你玩得好。",
          "你是来给地板抛光的吗？", 
          "甚至还没开始就结束了。",
          "建议先去洗把脸清醒一下。"
      ];
      return insults[Math.floor(Math.random() * insults.length)];
  } else if (score < 1500) {
      const encouragement = [
          "有点意思了，但还不够骚。",
          "手速还可以，反应慢了点。",
          "再接再厉，差点就破纪录了。",
          "不要停，感觉来了。"
      ];
      return encouragement[Math.floor(Math.random() * encouragement.length)];
  } else {
      const praise = [
          "神乎其技！请收下我的膝盖。",
          "你是人类吗？这也太强了。",
          "这操作，不仅是技术，更是艺术。",
          "几何冲刺的神！"
      ];
      return praise[Math.floor(Math.random() * praise.length)];
  }
};

export const getGameComment = async (score: number, deathReason: string): Promise<string> => {
  if (!ai) {
    // Fail silently to fallback
    return getFallbackComment(score);
  }

  try {
    const prompt = `
    玩家在“像素几何冲刺”游戏中结束了。
    得分: ${score} (距离)。
    死亡原因: ${deathReason}。
    
    请根据得分给予评价：
    - 0-500分：菜鸟，嘲讽一下。
    - 500-1500分：鼓励，但也指出不足。
    - 1500+分：赞赏，充满敬意。
    
    ${AI_PERSONA}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || getFallbackComment(score);
  } catch (error: any) {
    // Check for quota exceeded (429) or other common errors
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        console.warn("Quota exceeded, switching to local commentary.");
    }
    
    return getFallbackComment(score);
  }
};