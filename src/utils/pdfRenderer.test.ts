import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOutputScale } from './pdfRenderer';

// A4 at zoom 1.0, in CSS pixels.
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

function withDevicePixelRatio(dpr: number) {
  vi.stubGlobal('window', { devicePixelRatio: dpr });
}

describe('getOutputScale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders at CSS resolution on a non-HiDPI display', () => {
    withDevicePixelRatio(1);

    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 10)).toBe(1);
  });

  it('matches the device pixel ratio on a HiDPI display', () => {
    withDevicePixelRatio(2);

    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 10)).toBe(2);
  });

  it('honours fractional scaling', () => {
    withDevicePixelRatio(1.5);

    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 10)).toBe(1.5);
  });

  it('caps at 3x however dense the display claims to be', () => {
    withDevicePixelRatio(8);

    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 1)).toBe(3);
  });

  it('trades sharpness for memory on a long document', () => {
    withDevicePixelRatio(2);
    const pageCount = 100;

    const scale = getOutputScale(A4_WIDTH, A4_HEIGHT, pageCount);
    const totalDevicePixels = A4_WIDTH * A4_HEIGHT * scale * scale * pageCount;

    expect(scale).toBeGreaterThan(1);
    expect(scale).toBeLessThan(2);
    expect(totalDevicePixels).toBeLessThanOrEqual(64_000_000);
  });

  // The budget can only be honoured down to CSS resolution: past that, going
  // lower would make the preview worse than it was before HiDPI rendering
  // existed, so the floor wins and the document simply costs what it costs.
  it('never renders below CSS resolution, however long the document', () => {
    withDevicePixelRatio(2);

    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 100_000)).toBe(1);
  });

  it('falls back to CSS resolution for a degenerate page size', () => {
    withDevicePixelRatio(2);

    expect(getOutputScale(0, 0, 1)).toBe(1);
  });

  it('assumes a non-HiDPI display when there is no window', () => {
    expect(getOutputScale(A4_WIDTH, A4_HEIGHT, 1)).toBe(1);
  });
});
