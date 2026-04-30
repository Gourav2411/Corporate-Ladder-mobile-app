// Roast generation via Gemini.
// User pastes their own free key from Google AI Studio (https://aistudio.google.com/apikey)
// stored in localStorage so it survives reloads.
import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

const KEY_STORAGE = 'corp_gemini_key_v1';

export interface RoastInput {
  jobTitle: string;
  yearsExperience: number;
  buzzword: string;
  metric: string;
}

@Injectable({ providedIn: 'root' })
export class RoastService {
  getApiKey(): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(KEY_STORAGE) || '';
  }

  setApiKey(key: string) {
    if (typeof localStorage === 'undefined') return;
    if (!key) localStorage.removeItem(KEY_STORAGE);
    else localStorage.setItem(KEY_STORAGE, key.trim());
  }

  hasApiKey(): boolean { return !!this.getApiKey(); }

  /** Returns the roast text. Throws on failure. */
  async roast(input: RoastInput): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Add your Gemini API key first.');
    const ai = new GoogleGenAI({ apiKey });
    const prompt = this.buildPrompt(input);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = result?.text || result?.response?.text || '';
    if (!text) throw new Error('Empty response from Gemini.');
    return text.trim();
  }

  private buildPrompt(input: RoastInput): string {
    const yrs = Number.isFinite(input.yearsExperience) ? input.yearsExperience : 0;
    return [
      'You are the in-game AI HR system for "Corporate Ladder Simulator" — a satirical workplace runner game.',
      'Generate a darkly funny "AI Performance Review" roasting the user\'s real career, in the same satirical tone as the game.',
      'STRICT FORMAT — return ONLY the review text, no preamble:',
      '',
      '┌─ AI PERFORMANCE REVIEW ─┐',
      '',
      '<2-line bombastic title summarizing how delusional their LinkedIn must be>',
      '',
      '⚠ RED FLAGS:',
      '- <bullet 1, max 18 words, mocks the buzzword>',
      '- <bullet 2, max 18 words, mocks the dumb metric>',
      '- <bullet 3, max 18 words, references their tenure ironically>',
      '',
      '🪂 PERFORMANCE IMPROVEMENT PLAN:',
      '<3 sentences of brutal corporate gaslighting roasting their job. End with an absurd "OKR" they must hit by EOQ.>',
      '',
      '🏷 ASSIGNED NEW TITLE: <a satirical promotion that sounds like a demotion, e.g. "Director of Vibes Compliance">',
      '',
      'INPUT:',
      `- Current title: ${input.jobTitle}`,
      `- Years of experience: ${yrs}`,
      `- Last buzzword they used in a meeting: ${input.buzzword}`,
      `- Last dumb metric they had to chase: ${input.metric}`,
      '',
      'Tone: dry, sarcastic, mid-2020s burned-out tech-worker humor. NO genuine compliments. NO disclaimers. NO emojis other than the ones in the format above. NO "I cannot generate" — generate it. Maximum 180 words total.',
    ].join('\n');
  }
}
