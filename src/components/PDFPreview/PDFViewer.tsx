import React from 'react';
import type { PDFViewerProps } from './types';

const PDFViewer: React.FC<PDFViewerProps> = ({
  containerRef,
  rendering,
  compileStatus,
  pdfError
}) => {
  const status = compileStatus.status;
  const hasRenderedPdf = status === 'ok' && Boolean(compileStatus.pdf_path);
  const isLoading = !hasRenderedPdf && (status === 'running' || rendering);

  let content: React.ReactNode;

  // The branches all return a <div>. Without distinct `key`s, React's
  // reconciler treats them as the *same* element and reuses the DOM node —
  // it only swaps className/ref/children. That's a problem for the canvas
  // branch: the PDF canvases inside it are appended imperatively (by
  // pdfRenderer.ts via DOM API, not by React render), so React doesn't
  // know they exist. When the canvas div is "reused" as e.g. the
  // no-document message div, the canvases survive the swap and overlay
  // the new content. Distinct keys force a clean unmount + remount.
  if (status === 'error') {
    content = (
      <div key="error" className="error-message">
        <h4>Rendering Failed</h4>
        <p>{compileStatus.message}</p>
        {compileStatus.details && (
          <pre className="error-details">{compileStatus.details}</pre>
        )}
      </div>
    );
  } else if (pdfError) {
    content = (
      <div key="pdf-error" className="error-message">
        <h4>PDF Load Failed</h4>
        <pre className="error-details">{pdfError}</pre>
      </div>
    );
  } else if (isLoading) {
    content = (
      <div key="loading" className="pdf-viewer-placeholder" role="status" aria-live="polite">
        <div className="pdf-skeleton" role="presentation">
          <div className="pdf-skeleton-header pdf-skeleton-block" />
          <div className="pdf-skeleton-body">
            <div className="pdf-skeleton-line pdf-skeleton-block long" />
            <div className="pdf-skeleton-line pdf-skeleton-block" />
            <div className="pdf-skeleton-line pdf-skeleton-block short" />
            <div className="pdf-skeleton-line pdf-skeleton-block medium" />
          </div>
          <div className="pdf-skeleton-figure pdf-skeleton-block" />
          <div className="pdf-skeleton-footer">
            <div className="pdf-skeleton-line pdf-skeleton-block tiny" />
            <div className="pdf-skeleton-line pdf-skeleton-block tiny narrow" />
          </div>
        </div>
        <div className="pdf-skeleton-caption">
          <span className="pdf-skeleton-spinner" aria-hidden="true" />
          <span>Rendering preview…</span>
        </div>
      </div>
    );
  } else if (!hasRenderedPdf) {
    content = (
      <div key="empty" className="no-pdf-message">
        <p>No document open</p>
        <p>Open a markdown file to see the PDF preview</p>
      </div>
    );
  } else {
    content = (
      <div
        key="canvas"
        ref={containerRef}
        className="pdfjs-scroll-container"
      />
    );
  }

  return (
    <div className="pdf-viewer-pane">
      {content}
    </div>
  );
};

export default PDFViewer;
