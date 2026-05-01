// Utility to remove raw-typst anchor comments inserted for preview/sync
// These markers look like: <!--raw-typst #label("...") --> and
// <!--raw-typst #text(size: 0.001pt)[TFANCHOR:...] --> and similar.
// We strip them before saving/exporting so the user-visible markdown remains clean
// and copying text from the saved file doesn't include invisible tokens.

export function scrubRawTypstAnchors(markdown: string): string {
  if (!markdown) return markdown;

  // Remove any <!--raw-typst ... --> comments in a robust way.
  // We allow arbitrary whitespace and attributes inside the marker.
  // Match sequences like:
  // <!--raw-typst #label("tf-1") -->
  // <!--raw-typst #text(size: 0.001pt)[TFANCHOR:tf-1] -->
  // We remove them entirely. Keep surrounding newlines tidy by collapsing
  // multiple consecutive newlines into a single newline after removal.

  // Remove standalone raw-typst comment lines first so they do not leave empty gaps.
  const withoutStandaloneComments = markdown.replace(/^[ \t]*<!--\s*raw-typst[\s\S]*?-->[ \t]*(?:\r?\n)?/gim, '');

  // Remove any remaining inline raw-typst comments.
  const withoutComments = withoutStandaloneComments.replace(/<!--\s*raw-typst[\s\S]*?-->/gi, '');

  // Collapse more than 2 consecutive newlines into just 2 (preserve paragraph spacing)
  const collapsed = withoutComments.replace(/\n{3,}/g, '\n\n');

  return collapsed.trimEnd();
}
