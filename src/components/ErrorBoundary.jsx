import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console for debugging; in production you'd send to a logger
    console.error("[CryptoKit] Tool render error:", error, info.componentStack);
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", maxWidth: 520 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
          <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 6, fontSize: 14 }}>
            This tool encountered an error
          </div>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "10px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#f87171",
            marginBottom: 16,
            wordBreak: "break-all",
          }}>
            {this.state.error.message || String(this.state.error)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => this.reset()}>
              Try again
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
            If this keeps happening, try a different input or check the browser console for details.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
