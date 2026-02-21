import React from "react";
import { Outlet, NavLink, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { groupId } = useParams(); // Дістаємо ID групи з URL

  return (
    <div className="app-container">
      <header>
        <div className="logo-box">
          <div className="logo-square"></div>
          <span>Projects Hub | {groupId.toUpperCase()}</span>
        </div>
        <div className="header-controls">
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="account-trigger">{user ? "👤" : "Увійти"}</button>
        </div>
      </header>

      {/* Використовуємо NavLink, він автоматично додає клас 'active' для поточного URL */}
      <nav className="tabs-nav">
        <NavLink to={`/g/${groupId}/board`} className="tab-btn">
          📝 Дошка
        </NavLink>
        <NavLink to={`/g/${groupId}/schedule`} className="tab-btn">
          📅 Розклад
        </NavLink>
        <NavLink to={`/g/${groupId}/homework`} className="tab-btn">
          🏠 ДЗ
        </NavLink>
        <NavLink to={`/g/${groupId}/materials`} className="tab-btn">
          📚 Матеріали
        </NavLink>
        <NavLink to={`/g/${groupId}/attendance`} className="tab-btn">
          📊 Явка
        </NavLink>
        <NavLink to={`/g/${groupId}/queue`} className="tab-btn">
          🚶‍♂️ Черга
        </NavLink>
      </nav>

      <main>
        {/* Сюди рендеряться компоненти фічей (Board, Schedule і т.д.) */}
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
