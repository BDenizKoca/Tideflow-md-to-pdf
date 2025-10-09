import React from 'react';
import type { PDFViewerProps } from './types';

const PDFViewer: React.FC<PDFViewerProps> = ({
  containerRef,
  rendering,
  compileStatus,
  pdfError
}) => {
  let content: React.ReactNode;

  if (compileStatus.status === 'error') {
    content = (
      <div className="error-message">
        <h4>Rendering Failed</h4>
        <p>{compileStatus.message}</p>
        {compileStatus.details && (
          <pre className="error-details">{compileStatus.details}</pre>
        )}
      </div>
    );
  } else if (pdfError) {
    content = (
      <div className="error-message">
        <h4>PDF Load Failed</h4>
        <pre className="error-details">{pdfError}</pre>
      </div>
    );
  } else if (compileStatus.status === 'ok' && compileStatus.pdf_path) {
    content = (
      <>
        <div ref={containerRef} className="pdfjs-scroll-container" />
        {rendering && (
          <div className="pdfjs-loading-overlay">Rendering pages...</div>
        )}
      </>
    );
  } else {
    content = (
      <div className="no-pdf-message">
        <p>No document open</p>
        <p>Open a markdown file to see the PDF preview</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-pane">
      {content}
    </div>
  );
};

export default PDFViewer;
