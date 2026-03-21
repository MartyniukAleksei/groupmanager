import React, { useState, useRef, useEffect } from "react";
import {
  Outlet,
  NavLink,
  Link,
  useParams,
  useLocation,
} from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useBoardEdit } from "../../context/BoardEditContext";
import UserDrawer from "../UserDrawer";

const navItems = [
  { path: "board",      icon: "ph-notepad",          label: "Дошка"       },
  { path: "homework",   icon: "ph-book-open",         label: "ДЗ"          },
  { path: "schedule",   icon: "ph-calendar-blank",    label: "Розклад"     },
  { path: "attendance", icon: "ph-users",             label: "Явка"        },
  { path: "topics",     icon: "ph-rocket",            label: "Теми"        },
  { path: "materials",  icon: "ph-folder",            label: "Файли"       },
  { path: "queue",      icon: "ph-list-numbers",      label: "Черга"       },
  { path: "students",   icon: "ph-student",           label: "Студенти"    },
  { path: "links",      icon: "ph-link",              label: "Лінки"       },
];

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { groupId } = useParams();
  const location = useLocation();
  const { editMode, setEditMode } = useBoardEdit();
  const isBoard = location.pathname.endsWith("/board");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef(null);
  const indicatorRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    let frame;
    const start = performance.now();

    function track(now) {
      const activeItem = nav.querySelector(".nav-item.active");
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        indicator.style.width = `${itemRect.width}px`;
        indicator.style.transform = `translateX(${itemRect.left - navRect.left + nav.scrollLeft}px)`;
      }
      if (now - start < 450) frame = requestAnimationFrame(track);
    }
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || window.innerWidth >= 950) return;
    const activeItem = nav.querySelector(".nav-item.active");
    if (activeItem) {
      const scrollLeft = activeItem.offsetLeft - (nav.clientWidth / 2) + (activeItem.clientWidth / 2);
      nav.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [location.pathname]);

  return (
    <div className="app-container">
      <header className="mobile-only-header">
        <div className="logo-box">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "10px" }}>
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

      <div className="floating-ui-container">
        <Link to="/dashboard" className="desktop-logo-pill pc-only" style={{ textDecoration: "none" }}>
          <div className="logo-square"></div>
          <span>GroupManager</span>
        </Link>

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
          {isBoard && (
            <button
              className="action-btn"
              onClick={() => setEditMode(v => !v)}
              style={editMode ? { color: "var(--primary)" } : {}}
              title="Редагувати дедлайни"
            >
              <i className="ph ph-pencil-simple"></i>
            </button>
          )}
          <button className="action-btn" onClick={() => setDrawerOpen(true)}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <i className="ph ph-user-circle"></i>
            )}
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
