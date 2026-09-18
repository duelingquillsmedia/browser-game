import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches errors thrown during rendering so the app shows a message
 * instead of a blank page. Only rendering errors reach this — a throw
 * during module import (before React mounts) can't be caught here, which
 * is why supabaseClient.ts must never throw at import time.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error in app:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="screen intro-screen">
          <h1>Something Went Wrong</h1>
          <p className="subtitle">{this.state.error.message}</p>
          <button type="button" className="primary" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
