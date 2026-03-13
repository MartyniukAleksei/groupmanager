import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, Link, useParams, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import UserDrawer from "../UserDrawer";

const navItems = [
  { path: "board",      icon: "ph-notepad",        label: "Дошка" },
  { path: "schedule",   icon: "ph-calendar-blank",  label: "Розклад" },
  { path: "homework",   icon: "ph-book-open",       label: "ДЗ" },
  { path: "materials",  icon: "ph-folder",          label: "Файли" },
  { path: "attendance", icon: "ph-users",           label: "Явка" },
  { path: "queue",      icon: "ph-list-numbers",    label: "Черга" },
  { path: "links",      icon: "ph-link",            label: "Лінки" },
  { path: "students",   icon: "ph-student",         label: "Студенти" },
  { path: "topics",     icon: "ph-rocket",          label: "Теми" },
];

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { groupId } = useParams();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef(null);
  const indicatorRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const activeItem = nav.querySelector(".nav-item.active");
    if (!activeItem) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    requestAnimationFrame(() => {
      indicator.style.width = `${itemRect.width}px`;
      indicator.style.transform = `translateX(${itemRect.left - navRect.left}px)`;
    });
  }, [location.pathname]);

  return (
    <div className="app-container">
      {/* Mobile-only header */}
      <header className="mobile-only-header">
        <div className="logo-box">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="logo-square"></div>
            <span>GroupManager</span>
          </Link>
        </div>
        <div className="action-pill">
          <button className="action-btn" onClick={toggleTheme}>
            <i className={`ph ${theme === "dark" ? "ph-sun" : "ph-moon"}`}></i>
          </button>
        </div>
      </header>

      {/* Floating nav — bottom on mobile, top on desktop */}
      <div className="floating-ui-container">
        <div className="desktop-logo-pill pc-only">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="logo-square"></div>
            <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
              {groupId?.toUpperCase()}
            </span>
          </Link>
        </div>

        <div className="nav-scroll-wrapper">
          <nav className="nav-bar" ref={navRef}>
            <div className="nav-indicator" ref={indicatorRef}></div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={`/g/${groupId}/${item.path}`}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <i className={`ph ${item.icon}`}></i>
                <span className="text">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="action-pill">
          <button className="action-btn pc-only" onClick={toggleTheme}>
            <i className={`ph ${theme === "dark" ? "ph-sun" : "ph-moon"}`}></i>
          </button>
          <button className="action-btn" onClick={() => setDrawerOpen(true)}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : <i className="ph ph-user-circle"></i>}
          </button>
        </div>
      </div>

      <main>
        <Outlet />
      </main>

      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default AppLayout;
