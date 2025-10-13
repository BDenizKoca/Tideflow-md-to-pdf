/**
 * Unified export of all markdown editing commands
 * Organized by category: formatting, structure, blocks, images
 */
import { formattingCommands } from "./formatting";
import { structureCommands } from "./structure";
import { blockCommands } from "./blocks";
import { imageCommands } from "./images";

// Re-export helper functions for direct use
export { wrapSel, toggleInline, toggleLinePrefix, getImageAtCursor, insertAtCursor, stripTypstWrappers } from "./helpers";

/**
 * All markdown editing commands in a single object
 * Maintains backward compatibility with original MarkdownCommands.ts
 */
export const cmd = {
  // Text formatting
  ...formattingCommands,

  // Document structure
  ...structureCommands,

  // Block elements
  ...blockCommands,

  // Image handling
  ...imageCommands
};
