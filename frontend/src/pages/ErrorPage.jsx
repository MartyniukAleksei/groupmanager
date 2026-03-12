import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/error.css";

const ErrorPage = ({ code = 404 }) => {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-code">{code}</div>
        <p className="error-title">щось пішло не так</p>
        <div className="error-actions">
          <button className="btn-retry" onClick={() => window.location.reload()}>
            спробувати знову
          </button>
          <a
            className="btn-report"
            href="https://t.me/alekseimartyniuk"
            target="_blank"
            rel="noopener noreferrer"
          >
            повідомте нам
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
