import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/** Without this, any uncaught render error anywhere in the tree unmounts the whole app and leaves a
 * blank screen with no clue what happened — this catches that and shows the real error instead. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          background: "var(--color-bg, #0b0c11)",
          color: "var(--color-text, #eee)",
        }}
      >
        <i className="ph ph-warning-circle" style={{ fontSize: 20, color: "var(--color-accent-400, #f2a65a)" }} />
        <div style={{ fontSize: 16, fontFamily: "var(--font-heading)", fontWeight: 600 }}>Something went wrong</div>
        <div
          style={{
            fontSize: 12.5,
            fontFamily: "monospace",
            opacity: 0.75,
            maxWidth: 340,
            wordBreak: "break-word",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {error.message || String(error)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" style={{ height: 36, padding: "0 18px" }} onClick={() => window.location.reload()}>
            Reload
          </button>
          {/* Reload on its own loops forever when the crash belongs to the route rather than to the app --
              a bad day id, a program that failed to hydrate. Going home first escapes that; the session is
              left alone, because losing it is not the fix for a render error. */}
          <button
            className="btn btn-secondary"
            style={{ height: 36, padding: "0 18px" }}
            onClick={() => {
              window.location.hash = "#/";
              window.location.reload();
            }}
          >
            Back to start
          </button>
        </div>
      </div>
    );
  }
}
