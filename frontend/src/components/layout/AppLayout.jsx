import React, { useState } from "react";
import { Outlet, NavLink, Link, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import UserDrawer from "../UserDrawer";

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { groupId } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <button className="avatar-btn" onClick={() => setDrawerOpen(true)}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer" />
              : <span>{user?.name?.[0] ?? "?"}</span>}
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
        <NavLink to={`/g/${groupId}/links`} className="tab-btn">
          🔗 Посилання
        </NavLink>
        <NavLink to={`/g/${groupId}/students`} className="tab-btn">
          👥 Студенти
        </NavLink>
        <NavLink to={`/g/${groupId}/topics`} className="tab-btn">
          📌 Теми
        </NavLink>
      </nav>

      <main>
        <Outlet />
      </main>

      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default AppLayout;
