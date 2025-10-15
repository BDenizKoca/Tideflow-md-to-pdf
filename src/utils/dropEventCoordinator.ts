/**
 * Drop Event Coordinator
 * Prevents conflicts between multiple Tauri file-drop listeners
 */

type DropEventListener = (shouldHandle: boolean) => void;

class DropEventCoordinator {
  private listeners: Set<DropEventListener> = new Set();
  private isModalHandling = false;

  /**
   * Register a listener to be notified when drop handling changes
   */
  addListener(listener: DropEventListener) {
    this.listeners.add(listener);
    // Immediately notify of current state
    listener(this.isModalHandling);
  }

  /**
   * Remove a listener
   */
  removeListener(listener: DropEventListener) {
    this.listeners.delete(listener);
  }

  /**
   * Set whether a modal is currently handling drops
   * When true, other listeners should ignore drop events
   */
  setModalHandling(isHandling: boolean) {
    this.isModalHandling = isHandling;
    this.notifyListeners();
  }

  /**
   * Check if a modal is currently handling drops
   */
  isHandling(): boolean {
    return this.isModalHandling;
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isModalHandling));
  }
}

// Singleton instance
export const dropEventCoordinator = new DropEventCoordinator();
