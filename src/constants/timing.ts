/**
 * Timing constants used throughout the application.
 * Centralized here for easy tuning and documentation.
 * 
 * All timing values are in milliseconds unless otherwise specified.
 * Centralizing these values makes it easier to tune performance and
 * maintain consistency across the application.
 */

export const TIMING = {
  // Scroll and sync timing
  /** Debounce delay for scroll event handlers to avoid excessive computations */
  SCROLL_DEBOUNCE_MS: 50,
  
  /** Interval for polling operations (offset computation, anchor detection) */
  OFFSET_POLL_INTERVAL_MS: 120,
  
  /** Delay to wait before considering a scroll as user-initiated (not programmatic) */
  PROGRAMMATIC_SCROLL_GUARD_MS: 150,
  
  /** Idle threshold after last keystroke before considering user stopped typing */
  TYPING_IDLE_THRESHOLD_MS: 800,
  
  /** Default debounce for rendering Typst PDFs after content changes */
  RENDER_DEBOUNCE_DEFAULT_MS: 400,
  
  /** Delay before clearing programmatic scroll flag */
  PROGRAMMATIC_SCROLL_CLEAR_MS: 60,
  
  /** Short delay for animations and transitions */
  ANIMATION_DELAY_MS: 150,
  
  /** Delay to determine if user interaction happened right after mount */
  USER_INTERACTION_MOUNT_GUARD_MS: 200,
  
  /** Timeout for startup sync attempts before giving up */
  STARTUP_SYNC_TIMEOUT_MS: 5000,
  
  /** Delay between rendering and final sync event dispatch */
  FINAL_SYNC_DELAY_MS: 150,
  
  /** Additional delay for startup refresh operations */
  STARTUP_REFRESH_DELAY_MS: 200,
  
  /** Timeout for offset transition watcher */
  OFFSET_POLL_TIMEOUT_MS: 200,
  
  /** Maximum polling attempts for offset detection */
  MAX_OFFSET_POLL_ATTEMPTS: 8,
  
  /** One-shot timeout for pending scroll anchor registration */
  PENDING_SCROLL_ONE_SHOT_MS: 600,
  
  // Additional timing constants
  /** Delay for startup render to ensure full initialization */
  STARTUP_RENDER_DELAY_MS: 500,
  
  /** Delay for file switch render to avoid race conditions */
  FILE_SWITCH_RENDER_DELAY_MS: 100,
  
  /** Debounce delay for session persistence to prevent high-frequency writes */
  SESSION_SAVE_DEBOUNCE_MS: 500,
  
  // Retry timing
  /** Base delay for retry attempts (exponential backoff) */
  RETRY_DELAY_BASE_MS: 1000,
  
  /** Maximum number of retry attempts for critical operations */
  MAX_RETRY_ATTEMPTS: 3,
  
  // Anchor computation debouncing
  /** Debounce delay for anchor computation during scrolling */
  ANCHOR_COMPUTATION_DEBOUNCE_MS: 150,
  
  /** Shorter debounce for scroll events to keep sync responsive */
  ANCHOR_COMPUTATION_DEBOUNCE_SCROLL_MS: 50,
} as const;

/**
 * UI-related constants
 */
export const UI = {
  /** Minimum offset to avoid jumping to exact top (better UX) */
  MIN_OFFSET_FROM_TOP_PX: 8,
  
  /** Scroll threshold to consider user significantly scrolled away from top */
  SCROLL_AWAY_FROM_TOP_THRESHOLD_PX: 20,
  
  /** Threshold for considering scrollTop positions as "close enough" */
  SCROLL_POSITION_TOLERANCE_PX: 3,
  
  /** Threshold for scroll delta to be considered "no movement" */
  SCROLL_NO_MOVEMENT_THRESHOLD_PX: 2,
  
  /** Visual gap between PDF pages in pixels */
  PAGE_GAP_PX: 8,
  
  /** Focus delay for input elements when modals open */
  MODAL_FOCUS_DELAY_MS: 100,
  
  /** Delay before generating PDF thumbnails after render complete */
  THUMBNAIL_GENERATION_DELAY_MS: 1000,
  
  /** Default duration for toast notifications */
  TOAST_DEFAULT_DURATION_MS: 4000,
  
  /** Zoom percentage multiplier for display */
  ZOOM_PERCENTAGE_MULTIPLIER: 100,
} as const;

/**
 * Layout constants (alias for easier access)
 * Use LAYOUT instead of UI for layout-specific values
 */
export const LAYOUT = {
  /** Visual gap between PDF pages in pixels */
  PAGE_GAP_PX: UI.PAGE_GAP_PX,
  
  /** Minimum position offset to avoid top edge (better UX) */
  MIN_POSITION_OFFSET_PX: UI.MIN_OFFSET_FROM_TOP_PX,
} as const;

/**
 * Anchor selection and positioning constants
 */
export const ANCHOR = {
  /** Position for smart fallback anchor (25% into document shows content without going too far) */
  SMART_FALLBACK_POSITION: 0.25,
  
  /** Nearby anchor search window (lines before/after viewport) */
  NEARBY_SEARCH_WINDOW: 50,
  
  /** Score penalty for anchors outside viewport but nearby */
  NEARBY_SCORE_PENALTY: 10,
} as const;

/**
 * Default values for user preferences and UI elements
 */
export const DEFAULTS = {
  /** Default image width for inserted images */
  IMAGE_WIDTH: '80%',
  
  /** Default zoom level (1.0 = 100%) */
  PDF_ZOOM: 1.0,
  
  /** Available image width presets */
  IMAGE_WIDTH_PRESETS: ['25%', '40%', '60%', '80%', '100%'] as const,
} as const;

/**
 * Performance thresholds for monitoring and logging
 */
export const PERFORMANCE = {
  /** Operations slower than this are logged as warnings (ms) */
  SLOW_OPERATION_THRESHOLD_MS: 100,
  
  /** Maximum number of performance samples to keep per metric */
  MAX_PERFORMANCE_SAMPLES: 100,
} as const;
