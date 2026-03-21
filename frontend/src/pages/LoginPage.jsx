import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const ROTATION_MS = 6000;

const FEATURES = [
  { icon: "ph-notepad", title: "Дошка", desc: "Оголошення та дедлайни", gif: "/gifs/board.gif" },
  { icon: "ph-calendar-blank", title: "Розклад", desc: "Пари, аудиторії, час", gif: "/gifs/schedule.gif" },
  { icon: "ph-users", title: "Явка", desc: "Відмічай присутність", gif: "/gifs/attendance.gif" },
  { icon: "ph-book-open", title: "Домашні завдання", desc: "ДЗ та дедлайни", gif: "/gifs/homework.gif" },
  { icon: "ph-folder", title: "Матеріали", desc: "Спільний доступ до файлів", gif: "/gifs/materials.gif" },
  { icon: "ph-list-numbers", title: "Черга", desc: "Електронна черга", gif: "/gifs/queue.gif" },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [gifError, setGifError] = useState({});
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, ROTATION_MS);
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const handleFeatureClick = (i) => {
    setActiveIndex(i);
    startTimer();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API}/auth/google`, {
        token: credentialResponse.credential,
      });
      login(res.data.user, res.data.access_token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Помилка авторизації:", error);
      alert("Не вдалося увійти. Перевірте консоль.");
    }
  };

  const active = FEATURES[activeIndex];
  const hasGif = !gifError[activeIndex];

  return (
    <div className="lp-page">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="logo-box">
            <div className="logo-square"></div>
            <span className="lp-logo-name">GroupManager</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <h1 className="lp-hero-title">Керуй групою — просто та зручно</h1>
        <p className="lp-hero-sub">
          Розклад, явка, ДЗ та оцінки в одному місці для старост та студентів
        </p>
        <div className="lp-auth-btn">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.log("Помилка при вході через Google")}
            size="large"
            shape="pill"
            text="signin_with"
            width="300"
          />
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="lp-showcase">
        <div className="lp-showcase-inner">
          {/* Left — feature list */}
          <div className="lp-features-list">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`lp-feature-item${i === activeIndex ? " active" : ""}`}
                onClick={() => handleFeatureClick(i)}
              >
                <div className="lp-feature-icon">
                  <i className={`ph ${f.icon}`} />
                </div>
                <div className="lp-feature-text">
                  <div className="lp-feature-title">{f.title}</div>
                  <div className="lp-feature-desc">{f.desc}</div>
                </div>
                {i === activeIndex && (
                  <div className="lp-feature-progress" key={`progress-${activeIndex}`} />
                )}
              </div>
            ))}
          </div>

          {/* Right — preview */}
          <div className="lp-preview">
            <div className="lp-preview-window">
              <div className="lp-preview-bar">
                <div className="lp-preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="lp-preview-bar-title">{active.title}</div>
              </div>
              <div className="lp-preview-content">
                {hasGif && (
                  <img
                    key={activeIndex}
                    className="lp-preview-img"
                    src={`${active.gif}?v=${activeIndex}-${Date.now()}`}
                    alt={active.title}
                    onError={() => setGifError((prev) => ({ ...prev, [activeIndex]: true }))}
                  />
                )}
                {!hasGif && (
                  <div className="lp-preview-placeholder">
                    <i className={`ph ${active.icon}`} />
                    <span>{active.title}</span>
                    <span className="lp-preview-placeholder-hint">Прев'ю з'явиться тут</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
