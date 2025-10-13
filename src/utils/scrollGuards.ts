/**
 * Shared guard utilities for scroll synchronization.
 * Reduces code duplication across useEditorToPdfSync and usePdfToEditorSync.
 */

import { TIMING } from '../constants/timing';

export interface GuardCheckParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  anchorOffsetsRef?: React.MutableRefObject<Map<string, number>>;
  programmaticScrollRef?: React.MutableRefObject<boolean>;
  lastProgrammaticScrollAt?: React.MutableRefObject<number | null>;
  renderingRef?: React.MutableRefObject<boolean>;
  isTypingRef?: React.MutableRefObject<boolean>;
  syncModeRef?: React.MutableRefObject<string>;
  userManuallyPositionedPdfRef?: React.MutableRefObject<boolean>;
  mountedAt?: React.MutableRefObject<number>;
  syncEnabled?: boolean; // Global sync toggle
}

export interface GuardResult {
  passed: boolean;
  reason?: string;
}

/**
 * Check if container element is valid and attached to DOM
 */
export function checkContainer(containerRef: React.RefObject<HTMLDivElement | null>): GuardResult {
  const el = containerRef.current;
  if (!el || !el.parentNode || !el.isConnected) {
    return { passed: false, reason: 'Container not attached to DOM' };
  }
  return { passed: true };
}

/**
 * Check if anchor offsets are ready for synchronization
 */
export function checkOffsetsReady(anchorOffsetsRef: React.MutableRefObject<Map<string, number>>): GuardResult {
  if (anchorOffsetsRef.current.size === 0) {
    return { passed: false, reason: 'Anchor offsets not computed yet' };
  }
  return { passed: true };
}

/**
 * Check if this is a programmatic scroll (should be ignored)
 * Uses timestamp-based guard to prevent processing scroll events during animations
 */
export function checkProgrammaticScroll(
  lastProgrammaticScrollAt: React.MutableRefObject<number | null>
): GuardResult {
  const now = Date.now();
  const lastProg = lastProgrammaticScrollAt.current ?? 0;

  if (now - lastProg < TIMING.PROGRAMMATIC_SCROLL_GUARD_MS) {
    return {
      passed: false,
      reason: `Within programmatic scroll guard (${now - lastProg}ms < ${TIMING.PROGRAMMATIC_SCROLL_GUARD_MS}ms)`
    };
  }

  return { passed: true };
}

/**
 * Check if PDF is currently rendering (should ignore scroll events during render)
 */
export function checkRendering(renderingRef: React.MutableRefObject<boolean>): GuardResult {
  if (renderingRef.current) {
    return { passed: false, reason: 'PDF rendering in progress' };
  }
  return { passed: true };
}

/**
 * Check if user is currently typing (TEXT EDITOR FIRST principle)
 * Never scroll PDF during typing to avoid jarring interruptions
 */
export function checkTyping(isTypingRef: React.MutableRefObject<boolean>): GuardResult {
  if (isTypingRef.current) {
    return { passed: false, reason: 'User is typing - TEXT EDITOR FIRST' };
  }
  return { passed: true };
}

/**
 * Check if scroll lock is active (auto mode + user manually positioned PDF)
 * PDF stays frozen until user scrolls editor or releases lock
 */
export function checkScrollLock(
  syncModeRef: React.MutableRefObject<string>,
  userManuallyPositionedPdfRef: React.MutableRefObject<boolean>
): GuardResult {
  if (syncModeRef.current === 'auto' && userManuallyPositionedPdfRef.current) {
    return { passed: false, reason: 'Scroll lock active - PDF frozen until released' };
  }
  return { passed: true };
}

/**
 * Check if within mount guard period (prevents false triggers during initialization)
 */
export function checkMountGuard(mountedAt: React.MutableRefObject<number>): GuardResult {
  const now = Date.now();
  const elapsed = now - mountedAt.current;

  if (elapsed < TIMING.USER_INTERACTION_MOUNT_GUARD_MS) {
    return {
      passed: false,
      reason: `Within mount guard (${elapsed}ms < ${TIMING.USER_INTERACTION_MOUNT_GUARD_MS}ms)`
    };
  }

  return { passed: true };
}

/**
 * Check if scroll synchronization is globally enabled
 */
export function checkSyncEnabled(syncEnabled?: boolean): GuardResult {
  if (syncEnabled === false) {
    return { passed: false, reason: 'Scroll sync globally disabled' };
  }
  return { passed: true };
}

/**
 * Run all guards for Editor → PDF sync
 */
export function checkEditorToPdfGuards(params: GuardCheckParams): GuardResult {
  const guards = [
    () => checkSyncEnabled(params.syncEnabled),
    () => checkContainer(params.containerRef),
    params.anchorOffsetsRef ? () => checkOffsetsReady(params.anchorOffsetsRef!) : null,
    params.isTypingRef ? () => checkTyping(params.isTypingRef!) : null,
    params.syncModeRef && params.userManuallyPositionedPdfRef
      ? () => checkScrollLock(params.syncModeRef!, params.userManuallyPositionedPdfRef!)
      : null,
  ].filter(Boolean) as (() => GuardResult)[];

  for (const guard of guards) {
    const result = guard();
    if (!result.passed) {
      return result;
    }
  }

  return { passed: true };
}

/**
 * Run all guards for PDF → Editor sync (scroll event)
 */
export function checkPdfToEditorGuards(params: GuardCheckParams): GuardResult {
  const guards = [
    () => checkSyncEnabled(params.syncEnabled),
    params.lastProgrammaticScrollAt ? () => checkProgrammaticScroll(params.lastProgrammaticScrollAt!) : null,
    params.renderingRef ? () => checkRendering(params.renderingRef!) : null,
    params.isTypingRef ? () => checkTyping(params.isTypingRef!) : null,
  ].filter(Boolean) as (() => GuardResult)[];

  for (const guard of guards) {
    const result = guard();
    if (!result.passed) {
      return result;
    }
  }

  return { passed: true };
}

/**
 * Run all guards for pointer/wheel events (user interaction detection)
 */
export function checkInteractionGuards(params: GuardCheckParams): GuardResult {
  const guards = [
    params.lastProgrammaticScrollAt ? () => checkProgrammaticScroll(params.lastProgrammaticScrollAt!) : null,
    params.mountedAt ? () => checkMountGuard(params.mountedAt!) : null,
  ].filter(Boolean) as (() => GuardResult)[];

  for (const guard of guards) {
    const result = guard();
    if (!result.passed) {
      return result;
    }
  }

  return { passed: true };
}
