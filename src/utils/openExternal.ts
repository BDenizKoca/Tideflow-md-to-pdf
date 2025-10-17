import { open } from '@tauri-apps/plugin-shell';

/**
 * Opens a URL in the system's default browser
 * @param url - The URL to open
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    console.error('Failed to open external URL:', error);
  }
}