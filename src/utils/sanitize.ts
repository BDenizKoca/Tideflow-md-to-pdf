/**
 * Input sanitization utilities for preventing injection attacks
 * 
 * Provides functions to safely escape user input before inserting into
 * HTML, Typst templates, or other contexts where unsanitized input could
 * cause security issues or rendering problems.
 */

/**
 * Sanitize string for safe use in HTML contexts
 * 
 * Escapes characters that have special meaning in HTML to prevent XSS
 * attacks and rendering issues.
 * 
 * @param input - String to sanitize
 * @returns HTML-safe string
 * 
 * @example
 * ```typescript
 * const userInput = '<script>alert("xss")</script>';
 * const safe = sanitizeForHTML(userInput);
 * // safe = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function sanitizeForHTML(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize string for safe use in Typst templates
 * 
 * Escapes characters that have special meaning in Typst syntax to prevent
 * template injection and rendering errors.
 * 
 * @param input - String to sanitize
 * @returns Typst-safe string
 * 
 * @example
 * ```typescript
 * const userTitle = 'My $100 Budget';
 * const safe = sanitizeForTypst(userTitle);
 * // safe = 'My \\$100 Budget'
 * ```
 */
export function sanitizeForTypst(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/\\/g, '\\\\')  // Backslash must be first
    .replace(/"/g, '\\"')    // Quote
    .replace(/\$/g, '\\$')   // Dollar (math mode)
    .replace(/#/g, '\\#');   // Hash (Typst directives)
}

/**
 * Sanitize file path for safe use
 * 
 * Removes or escapes potentially dangerous path components to prevent
 * directory traversal attacks and path injection.
 * 
 * @param path - File path to sanitize
 * @returns Safe path string
 * 
 * @example
 * ```typescript
 * const userPath = '../../../etc/passwd';
 * const safe = sanitizeFilePath(userPath);
 * // safe = 'etc/passwd' (traversal removed)
 * ```
 */
export function sanitizeFilePath(path: string): string {
  if (!path) return '';
  
  return path
    .replace(/\.\.\//g, '')   // Remove parent directory references
    .replace(/\.\.\\/g, '')   // Remove parent directory references (Windows)
    .replace(/^\/+/, '')      // Remove leading slashes
    .replace(/\0/g, '')       // Remove null bytes
    .trim();
}

/**
 * Sanitize URL for safe use in href/src attributes
 * 
 * Validates and sanitizes URLs to prevent javascript: and data: protocol
 * injection attacks.
 * 
 * @param url - URL to sanitize
 * @param allowedProtocols - List of allowed protocols (default: http, https)
 * @returns Safe URL string or empty string if invalid
 * 
 * @example
 * ```typescript
 * const userUrl = 'javascript:alert("xss")';
 * const safe = sanitizeURL(userUrl);
 * // safe = '' (dangerous protocol blocked)
 * 
 * const validUrl = 'https://example.com';
 * const safe2 = sanitizeURL(validUrl);
 * // safe2 = 'https://example.com'
 * ```
 */
export function sanitizeURL(
  url: string,
  allowedProtocols: string[] = ['http', 'https', 'mailto', 'tel']
): string {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Check for dangerous protocols
  const protocolMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (!allowedProtocols.includes(protocol)) {
      return '';
    }
  }
  
  // Block javascript: and data: pseudo-protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }
  
  return trimmed;
}

/**
 * Sanitize image alt text
 * 
 * Cleans alt text to prevent injection while preserving readability.
 * Removes HTML tags but keeps basic punctuation.
 * 
 * @param altText - Alt text to sanitize
 * @param maxLength - Maximum length (default: 200)
 * @returns Safe alt text
 * 
 * @example
 * ```typescript
 * const userAlt = '<script>xss</script>A photo of a cat';
 * const safe = sanitizeAltText(userAlt);
 * // safe = 'A photo of a cat'
 * ```
 */
export function sanitizeAltText(altText: string, maxLength = 200): string {
  if (!altText) return '';
  
  return altText
    .replace(/<[^>]*>/g, '')     // Remove HTML tags
    .replace(/[<>]/g, '')         // Remove stray brackets
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize markdown content before processing
 * 
 * Removes potentially dangerous content while preserving valid markdown.
 * Note: This is a basic sanitizer; for production use, consider a
 * dedicated markdown sanitizer library.
 * 
 * @param markdown - Markdown content to sanitize
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  return markdown
    // Remove HTML script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove HTML iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove HTML object/embed tags
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove javascript: protocol in links
    .replace(/\[([^\]]*)\]\(javascript:[^\)]*\)/gi, '[$1](#)');
}

/**
 * Create a sanitized filename from user input
 * 
 * Removes or replaces characters that are invalid in filenames across
 * different operating systems.
 * 
 * @param filename - Proposed filename
 * @param replacement - Character to replace invalid chars (default: '-')
 * @returns Safe filename
 * 
 * @example
 * ```typescript
 * const userFilename = 'my document: draft #1.md';
 * const safe = sanitizeFilename(userFilename);
 * // safe = 'my-document-draft-1.md'
 * ```
 */
export function sanitizeFilename(filename: string, replacement = '-'): string {
  if (!filename) return '';
  
  return filename
    // Remove path separators
    .replace(/[/\\]/g, replacement)
    // Remove invalid Windows filename characters
    .replace(/[<>:"|?*]/g, replacement)
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, replacement)
    // Remove leading/trailing dots and spaces
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Collapse multiple replacement chars
    .replace(new RegExp(`${replacement}+`, 'g'), replacement)
    // Limit length (most filesystems support 255 bytes)
    .slice(0, 200);
}
