import React, { useEffect, useMemo, useState } from 'react';
import MarkdownIt from 'markdown-it';
import mdKatex from '@vscode/markdown-it-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useActiveContent, useActiveFile } from '../hooks/useActiveDocument';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import './MarkdownPreview.css';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
});

md.use(mdKatex, {
  throwOnError: false,
  enableBareBlocks: true,
  enableFencedBlocks: true,
  katex,
});

const MARKDOWN_DEBOUNCE_MS = 120;

const MarkdownPreview: React.FC = () => {
  const activeFile = useActiveFile();
  const content = useActiveContent();
  const [debouncedContent, setDebouncedContent] = useState(content);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedContent(content), MARKDOWN_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [content]);

  const renderedHtml = useMemo(() => {
    if (!debouncedContent) return '';
    try {
      const cleaned = scrubRawTypstAnchors(debouncedContent);
      return md.render(cleaned);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `<pre class="md-preview-error">Render error: ${message}</pre>`;
    }
  }, [debouncedContent]);

  if (!activeFile) {
    return (
      <div className="md-preview">
        <div className="md-preview-header">Live Preview</div>
        <div className="md-preview-empty">
          <p>No file open</p>
          <p className="md-preview-empty-sub">The Markdown preview will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md-preview">
      <div className="md-preview-header">Live Preview</div>
      <div
        className="md-preview-content markdown-body"
        // markdown-it output is from trusted local content; HTML in source is
        // already disabled via `html: false` on the renderer.
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};

export default MarkdownPreview;
