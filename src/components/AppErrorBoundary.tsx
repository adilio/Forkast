import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Forkast failed to render', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <img src="/forkast-mark.svg" alt="" width="48" height="48" />
          <h1>Forkast needs a fresh start</h1>
          <p>Your saved household data is untouched. Reload the app to try again.</p>
          <button className="button button--primary" onClick={() => location.reload()}>
            Reload Forkast
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
