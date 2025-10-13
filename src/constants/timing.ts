/**
 * Timing constants used throughout the application.
 * Centralized here for easy tuning and documentation.
 */

export const TIMING = {
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
