import React from "react";
import { Outlet, NavLink, Link, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { groupId } = useParams();

  return (
    <div className="app-container">
      <header>
        <div className="logo-box">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="logo-square"></div>
            <span>Projects Hub | {groupId.toUpperCase()}</span>
          </Link>
        </div>
        <div className="header-controls">
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="account-trigger" onClick={logout}>
            {user ? "Вийти" : "Увійти"}
          </button>
        </div>
      </header>

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
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
