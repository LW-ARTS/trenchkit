import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { ErrorBox } from "./ErrorBox.js";

export type PanelErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string | number | undefined;
};

type State = {
  error: Error | null;
};

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[PanelErrorBoundary] panel crashed:", error, info.componentStack);
  }

  override componentDidUpdate(prevProps: PanelErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return <ErrorBox message={this.state.error.message} />;
    }
    return this.props.children;
  }
}
