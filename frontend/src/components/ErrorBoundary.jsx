import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('=== REACT ERROR BOUNDARY CAUGHT ===');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#1a0000', color: '#ff6666', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>⚠ REACT CRASH DETECTED</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#0a0a0a', padding: '20px', border: '1px solid #ff4444', marginBottom: '20px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <h2 style={{ color: '#ff8888', marginBottom: '10px' }}>Component Stack:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#0a0a0a', padding: '20px', border: '1px solid #333', fontSize: '12px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '20px', padding: '10px 20px', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            RELOAD PAGE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
