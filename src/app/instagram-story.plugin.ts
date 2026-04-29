// Small TS facade for the custom Capacitor InstagramStory plugin.
// Only registered on native Android — falls back gracefully on web.
import { registerPlugin, Capacitor } from '@capacitor/core';

interface InstagramStoryPlugin {
  share(opts: { filePath: string }): Promise<{ ok: boolean }>;
  isAvailable(): Promise<{ available: boolean }>;
}

export const InstagramStory = Capacitor.isNativePlatform()
  ? registerPlugin<InstagramStoryPlugin>('InstagramStory')
  : null;
