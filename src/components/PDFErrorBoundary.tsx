import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';
import './PDFErrorBoundary.css';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for PDF preview component.
 * Catches rendering errors and provides UI for recovery.
 */
class PDFErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('PDFErrorBoundary', 'PDF preview rendering failed', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="pdf-error-boundary">
          <div className="pdf-error-content">
            <h3>⚠️ PDF Preview Error</h3>
            <p>The PDF preview encountered an error and couldn't render.</p>
            
            <div className="pdf-error-actions">
              <button 
                onClick={this.handleReset}
                className="pdf-error-button primary"
              >
                Try Again
              </button>
            </div>

            <details className="pdf-error-details">
              <summary>Error Details</summary>
              <div className="pdf-error-stack">
                <strong>Error:</strong>
                <pre>{this.state.error?.message || 'Unknown error'}</pre>
                
                {this.state.error?.stack && (
                  <>
                    <strong>Stack Trace:</strong>
                    <pre>{this.state.error.stack}</pre>
                  </>
                )}
              </div>
            </details>
            
            <p className="pdf-error-help">
              If this persists, try:
              <ul>
                <li>Saving your document (Ctrl+S)</li>
                <li>Reloading the application</li>
                <li>Checking the console for additional errors</li>
              </ul>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PDFErrorBoundary;
