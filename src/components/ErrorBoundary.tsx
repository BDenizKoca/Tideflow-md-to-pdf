import React from 'react';
import './ErrorBoundary.css';
import { logger } from '../utils/logger';

const ErrorBoundaryLogger = logger.createScoped('ErrorBoundary');

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
  stack?: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    ErrorBoundaryLogger.error(`Caught error: ${error instanceof Error ? error.message : String(error)} | Component stack: ${info.componentStack || 'N/A'}`);
    this.setState({ stack: info.componentStack || undefined });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          {this.state.stack && (
            <pre className="error-boundary-stack">
              {this.state.stack}
            </pre>
          )}
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
