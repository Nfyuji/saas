'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** يمنع انهيار الصفحة كاملة عند خطأ في جزء منها */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="page-wrap">
            <div className="alert-err">
              حدث خطأ في الواجهة. حدّث الصفحة أو عد لاحقاً.
              {this.state.message ? (
                <span className="block text-xs mt-1 opacity-80">{this.state.message}</span>
              ) : null}
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
