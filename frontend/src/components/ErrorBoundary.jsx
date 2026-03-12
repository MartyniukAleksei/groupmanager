import React from "react";
import ErrorPage from "../pages/ErrorPage";

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError
      ? <ErrorPage code={500} />
      : this.props.children;
  }
}

export default ErrorBoundary;
