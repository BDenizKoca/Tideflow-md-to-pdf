import { describe, expect, it } from 'vitest';
import { scrubRawTypstAnchors } from './scrubAnchors';

describe('scrubRawTypstAnchors', () => {
  it('removes raw typst anchor comments from markdown', () => {
    const input = '# Title\n<!--raw-typst #label("tf-1") -->\nBody\n<!-- raw-typst #text(size: 0.001pt)[TFANCHOR:tf-1] -->';

    expect(scrubRawTypstAnchors(input)).toBe('# Title\nBody');
  });

  it('collapses excessive blank lines after removing anchors', () => {
    const input = 'A\n\n<!--raw-typst #label("tf-1") -->\n\n\nB';

    expect(scrubRawTypstAnchors(input)).toBe('A\n\nB');
  });

  it('returns empty input unchanged', () => {
    expect(scrubRawTypstAnchors('')).toBe('');
  });
});