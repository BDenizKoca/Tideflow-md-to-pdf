# Codebase Analysis & Improvement Recommendations

**Project:** Tideflow - Markdown to PDF Editor  
**Date:** October 8, 2025  
**Tech Stack:** React 19 + TypeScript + Tauri (Rust) + CodeMirror 6  

---

## Executive Summary

The codebase is well-structured with good separation of concerns, comprehensive logging, and solid error handling. However, there are opportunities for improvement in performance optimization, code maintainability, type safety, and reducing complexity in some hooks.

**Overall Code Health:** ⭐⭐⭐⭐ (4/5)

---

## 1. Architecture & Design Patterns

### ✅ Strengths
- Clean separation between frontend (React/TS) and backend (Rust/Tauri)
- Well-organized store architecture using Zustand
- Custom hooks for feature separation
- Centralized logging and error handling utilities
- Clear API layer abstracting Tauri invocations

### ⚠️ Areas for Improvement

#### 1.1 Complex Hook Dependencies
**Issue:** Some hooks have circular dependencies and complex inter-dependencies.

**File:** `src/hooks/usePdfRenderer.ts` (332 lines)
```typescript
// Too many refs being passed around (20+ parameters)
interface UsePdfRendererArgs {
  currentFile: string | null;
  compileStatus: { status: string; pdf_path?: string | null };
  pdfZoom: number;
  containerRef: React.RefObject<HTMLElement | null>;
  cancelRenderRef: { current: { canceled: boolean } };
  pdfMetricsRef: { current: { page: number; height: number; scale: number }[] };
  anchorOffsetsRef: { current: Map<string, number> };
  sourceMapRef: { current: SourceMap | null };
  // ... 12+ more refs
}
```

**Recommendation:** Create a context or consolidate related refs into grouped objects.

```typescript
// Suggested refactor:
interface PdfRenderContext {
  state: {
    currentFile: string | null;
    compileStatus: CompileStatus;
    pdfZoom: number;
  };
  refs: {
    container: React.RefObject<HTMLElement | null>;
    metrics: React.MutableRefObject<PageMetric[]>;
    anchors: React.MutableRefObject<Map<string, number>>;
    sourceMap: React.MutableRefObject<SourceMap | null>;
  };
  flags: {
    cancelRender: React.MutableRefObject<boolean>;
    programmaticScroll: React.MutableRefObject<boolean>;
    userInteracted: React.MutableRefObject<boolean>;
    isTyping: React.MutableRefObject<boolean>;
  };
  callbacks: {
    setRendering: (v: boolean) => void;
    setPdfError: (v: string | null) => void;
    recomputeAnchorOffsets: (map: SourceMap | null) => void;
    scrollToAnchor: (id: string, center?: boolean, force?: boolean) => void;
  };
}
```

**Impact:** Improved maintainability, easier testing, reduced parameter passing complexity.

---

#### 1.2 Store Optimization
**Issue:** Components subscribe to entire store objects, causing unnecessary re-renders.

**File:** `src/App.tsx`, `src/components/Editor.tsx`
```typescript
// Current - subscribes to entire editor object
const editor = useEditorStore((state) => state.editor);

// Better - selective subscription
const currentFile = useEditorStore((state) => state.editor.currentFile);
const modified = useEditorStore((state) => state.editor.modified);
```

**Recommendation:** Use selective subscriptions throughout the app to minimize re-renders.

**Impact:** Performance improvement, especially in Editor component with frequent updates.

---

## 2. Performance Optimizations

### 2.1 Memoization Opportunities

**File:** `src/components/PDFPreview.tsx`
**Issue:** Heavy computations in render path without memoization.

```typescript
// Add memoization for expensive operations
const computedAnchors = useMemo(() => {
  return computeAnchorOffsets(metrics, sourceMap);
}, [metrics, sourceMap]);

const fallbackOffsets = useMemo(() => {
  return computeFallbackOffsets(
    sourceMap?.anchors ?? [],
    scrollHeight,
    clientHeight
  );
}, [sourceMap?.anchors, scrollHeight, clientHeight]);
```

---

### 2.2 Debounce Consolidation

**Files:** Multiple locations with inline debouncing
**Issue:** Inconsistent debounce implementations across the codebase.

**Recommendation:** Create a shared `useDebounce` hook:

```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}
```

**Usage:**
```typescript
// Replace inline setTimeout patterns
const debouncedRender = useDebounce(handleRender, preferences.render_debounce_ms);
```

---

## 3. Type Safety Improvements

### 3.1 Type Narrowing

**File:** `src/api.ts` lines 109-119
**Issue:** Type assertions and loose typing in PDF text extraction.

```typescript
// Current
type PdfTextItem = { str?: string; transform?: number[] };
const items = textContent.items as PdfTextItem[];

// Better - use proper pdfjs types
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
const items = textContent.items.filter(
  (item): item is TextItem => 'str' in item
);
```

---

### 3.2 Strict Event Types

**File:** `src/components/Editor.tsx` lines 176-248
**Issue:** Event payload types use `unknown` with manual type assertions.

```typescript
// Current
listen<{ paths: string[]; position: { x: number; y: number } }>(
  'tauri://drag-drop',
  async (event) => {
    const paths = event.payload?.paths || event.payload as unknown as string[];
    // ...
  }
);

// Better - define proper types
interface TauriFileDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

listen<TauriFileDropPayload>('tauri://drag-drop', async (event) => {
  const { paths, position } = event.payload;
  // Type-safe access
});
```

---

## 4. Error Handling & Resilience

### ✅ Strengths
- Centralized error handler with toast notifications
- Scoped logging throughout
- Graceful degradation in PDF rendering

### 4.1 Error Boundaries

**Recommendation:** Add error boundaries for major sections:

```typescript
// src/components/EditorErrorBoundary.tsx
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('EditorErrorBoundary', 'Caught error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Editor Error</h2>
          <p>The editor encountered an unexpected error.</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 4.2 API Error Handling

**File:** `src/api.ts`
**Issue:** Silent failures in some API calls.

```typescript
// Add retry logic for critical operations
export async function renderTypstWithRetry(
  content: string,
  format: string,
  currentFile: string | null,
  maxRetries = 3
): Promise<RenderedDocument> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await renderTypst(content, format, currentFile);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn('API', `Render attempt ${attempt + 1} failed`, err);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}
```

---

## 5. Code Quality & Maintainability

### 5.1 Magic Numbers

**Files:** Multiple locations
**Issue:** Hardcoded values without named constants.

```typescript
// Current - scattered magic numbers
setTimeout(() => { /* ... */ }, 500);
if (elapsed < 150) { /* ... */ }
const PAGE_GAP = 8;

// Better - centralize in constants
// src/constants/timing.ts (already exists, expand it)
export const TIMING = {
  // ... existing constants
  DEBOUNCE_RENDER_MS: 500,
  SCROLL_SETTLE_MS: 150,
  PAGE_GAP_PX: 8,
  RETRY_DELAY_BASE_MS: 1000,
} as const;
```

---

### 5.2 Function Length

**File:** `src/hooks/usePdfRenderer.ts` lines 116-298
**Issue:** 182-line function is difficult to test and understand.

**Recommendation:** Extract sub-functions:

```typescript
// Extract anchor computation logic
async function computeAndApplyAnchors(
  doc: PDFDocumentProxy,
  metrics: PageMetric[],
  sourceMap: SourceMap,
  context: {
    anchorOffsetsRef: MutableRefObject<Map<string, number>>;
    containerRef: RefObject<HTMLElement>;
    isTypingRef: MutableRefObject<boolean>;
    // ... other needed refs
  }
): Promise<void> {
  // Move extraction logic here
}

// Use in main function
const tryComputeAndMaybeScroll = async () => {
  const map = sourceMapRef.current;
  if (!map) return;
  
  await computeAndApplyAnchors(doc, metrics, map, {
    anchorOffsetsRef,
    containerRef,
    isTypingRef,
    // ...
  });
  
  setRendering(false);
  // ... rest of logic
};
```

---

### 5.3 Code Duplication

**Files:** `src/hooks/useEditorToPdfSync.ts`, `src/hooks/usePdfToEditorSync.ts`
**Issue:** Similar guard checking patterns.

**Current Solution:** Already addressed in `src/utils/scrollGuards.ts` ✅

**Recommendation:** Ensure all guard checks use this utility consistently.

---

## 6. Testing Considerations

### 6.1 Missing Test Infrastructure

**Issue:** No test files found in the repository.

**Recommendation:** Add testing infrastructure:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom jsdom
```

Create test configuration:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Priority test candidates:**
1. `src/utils/offsets.ts` - Pure functions, easy to test
2. `src/utils/scrollGuards.ts` - Guard logic
3. `src/utils/scrubAnchors.ts` - String manipulation
4. `src/stores/*.ts` - State management logic

---

## 7. Documentation Improvements

### 7.1 Missing JSDoc

**Files:** Many utility functions lack documentation.

```typescript
// Add JSDoc to complex utilities
/**
 * Computes pixel offsets for PDF anchors based on page metrics and source map.
 * 
 * @param metrics - Array of page metrics (page number, height, scale)
 * @param map - Source map containing anchor positions from Typst
 * @returns Object containing offset map and sample entries for logging
 * 
 * @example
 * const result = computeAnchorOffsets(metrics, sourceMap);
 * console.log(result.offsets.get('anchor-1')); // 342 (pixels from top)
 */
export function computeAnchorOffsets(
  metrics: PageMetric[],
  map: SourceMap | null
): ComputeResult {
  // ...
}
```

---

### 7.2 Architecture Documentation

**Recommendation:** Add an architecture document:

```markdown
// docs/ARCHITECTURE.md
# Tideflow Architecture

## Component Hierarchy
- App
  - Toolbar
  - TabBar
  - Main Content
    - Editor (CodeMirror)
    - PDFPreview (pdf.js)
  - StatusBar
  - Modals (Design, Image, etc.)

## Data Flow
1. User types → Editor component
2. Content → EditorStore (Zustand)
3. Debounced render → Tauri backend
4. Typst compilation → PDF + SourceMap
5. PDF rendered → PDFPreview component
6. Scroll sync ↔ between Editor and PDF

## State Management
- EditorStore: Document content, compile status, scroll positions
- UIStore: UI flags, toasts, modals
- PreferencesStore: User settings, themes, layout preferences

## Synchronization Architecture
[Add diagram explaining the two-way sync mechanism]
```

---

## 8. Security Considerations

### 8.1 Input Sanitization

**File:** `src/api.ts` lines 414-433
**Current:** Good HTML escaping for image paths ✅

**Recommendation:** Extend to all user inputs that go into HTML/Typst:

```typescript
// src/utils/sanitize.ts
export function sanitizeForTypst(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#');
}

export function sanitizeForHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

---

### 8.2 Path Traversal Protection

**File:** `src-tauri/src/commands/file_ops.rs` (assumed)
**Recommendation:** Ensure Rust backend validates all file paths to prevent directory traversal attacks.

```rust
// Verify paths stay within allowed directories
fn validate_path(path: &Path, base: &Path) -> Result<(), Error> {
    let canonical = path.canonicalize()?;
    let canonical_base = base.canonicalize()?;
    
    if !canonical.starts_with(canonical_base) {
        return Err(Error::PathTraversal);
    }
    
    Ok(())
}
```

---

## 9. Dependency Management

### 9.1 Outdated Dependencies Check

**Current package.json looks up-to-date** ✅

**Recommendation:** Add automated dependency updates:

```json
// .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    
  - package-ecosystem: "cargo"
    directory: "/src-tauri"
    schedule:
      interval: "weekly"
```

---

### 9.2 Bundle Size Analysis

**Recommendation:** Add bundle analysis to build process:

```json
// package.json
{
  "scripts": {
    "analyze": "vite build --mode analyze",
    "build": "tsc -b && vite build",
    "build:report": "npm run build && vite-bundle-visualizer"
  },
  "devDependencies": {
    "vite-bundle-visualizer": "^1.0.0"
  }
}
```

---

## 10. Accessibility (a11y)

### 10.1 Keyboard Navigation

**File:** `src/components/Editor.tsx`
**Current:** Good Ctrl+F handling ✅

**Improvements needed:**
- Add ARIA labels to buttons
- Ensure all modals are keyboard-accessible
- Add skip-to-content links

```typescript
// Example improvements
<button 
  onClick={handleSave}
  aria-label="Save current file (Ctrl+S)"
  aria-keyshortcuts="Control+S"
>
  Save
</button>

<div 
  role="tablist" 
  aria-label="Open files"
>
  {openFiles.map(file => (
    <button 
      role="tab"
      aria-selected={file === currentFile}
      aria-controls={`panel-${file}`}
    >
      {file}
    </button>
  ))}
</div>
```

---

## 11. Build & Development Experience

### 11.1 Development Scripts

**Recommendation:** Add helpful development scripts:

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "dev:debug": "TAURI_DEBUG=1 vite",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\""
  }
}
```

---

### 11.2 Pre-commit Hooks

**Recommendation:** Add Husky for pre-commit quality checks:

```bash
npm install --save-dev husky lint-staged
npx husky install
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,md,json}": [
      "prettier --write"
    ]
  }
}
```

---

## 12. Specific Refactoring Recommendations

### Priority 1 (High Impact, Low Effort)

1. **Add selective store subscriptions** - Reduce re-renders
   - Files: `src/App.tsx`, `src/components/Editor.tsx`
   - Effort: 2 hours
   - Impact: Performance improvement

2. **Extract constants from magic numbers**
   - Files: Multiple
   - Effort: 1 hour
   - Impact: Maintainability

3. **Add missing TypeScript type definitions**
   - Files: `src/api.ts`, event handlers
   - Effort: 2 hours
   - Impact: Type safety

### Priority 2 (High Impact, Medium Effort)

4. **Consolidate hook parameters**
   - Files: `src/hooks/usePdfRenderer.ts`, `src/hooks/useFileOperations.ts`
   - Effort: 4 hours
   - Impact: Maintainability, testability

5. **Add error boundaries**
   - Files: Create new error boundary components
   - Effort: 3 hours
   - Impact: Stability

6. **Break down large functions**
   - Files: `src/hooks/usePdfRenderer.ts`, `src/components/Editor.tsx`
   - Effort: 4 hours
   - Impact: Testability, maintainability

### Priority 3 (Medium Impact, High Effort)

7. **Add test infrastructure and tests**
   - Effort: 8+ hours
   - Impact: Quality assurance, confidence in refactoring

8. **Add comprehensive JSDoc documentation**
   - Effort: 6 hours
   - Impact: Onboarding, maintainability

---

## 13. Performance Metrics to Track

**Recommendation:** Add performance monitoring:

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  measure(label: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Performance', `${label}: ${duration.toFixed(2)}ms`);
    }
  }
  
  async measureAsync(label: string, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Performance', `${label}: ${duration.toFixed(2)}ms`);
    }
  }
  
  getStats(label: string): { avg: number; min: number; max: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;
    
    return {
      avg: values.reduce((a, b) => a + b) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

export const perfMonitor = new PerformanceMonitor();
```

---

## 14. Conclusion

The Tideflow codebase demonstrates solid engineering practices with room for improvement in:

1. **Performance**: Store optimization, memoization
2. **Maintainability**: Hook simplification, function decomposition
3. **Type Safety**: Stricter types, better type narrowing
4. **Testing**: Add test infrastructure
5. **Documentation**: JSDoc, architecture docs

### Estimated Refactoring Effort
- **Priority 1 items:** ~5 hours → Immediate performance gains
- **Priority 2 items:** ~11 hours → Significant maintainability improvement
- **Priority 3 items:** ~14 hours → Long-term quality investment

**Total:** ~30 hours for comprehensive improvements

### Next Steps
1. Start with Priority 1 items (store optimizations, constants)
2. Add error boundaries and improve type safety
3. Set up testing infrastructure
4. Gradually refactor complex hooks
5. Add comprehensive documentation

The codebase is in good shape overall. These improvements will enhance long-term maintainability and performance.
