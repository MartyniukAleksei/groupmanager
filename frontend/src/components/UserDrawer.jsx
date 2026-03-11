import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, updateProfile } from "../api/profile";
import "../styles/profile.css";

const UserDrawer = ({ isOpen, onClose }) => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", text: string }

  useEffect(() => {
    if (!isOpen || !token) return;
    fetchProfile(token)
      .then((res) => {
        const p = res.data;
        setName(p.name || "");
        setTelegram(p.telegram || "");
        setBirthday(p.birthday || "");
        setStatus(null);
      })
      .catch(() => setStatus({ type: "error", text: "Не вдалося завантажити профіль" }));
  }, [isOpen, token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateProfile(token, {
        name: name || undefined,
        telegram: telegram || null,
        birthday: birthday || null,
      });
      const updated = res.data;
      // Sync name in AuthContext
      login({ ...user, name: updated.name }, token);
      setStatus({ type: "success", text: "Збережено!" });
    } catch (err) {
      const msg = err.response?.data?.detail || "Помилка збереження";
      setStatus({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/");
  };

  return (
    <>
      {isOpen && <div className="prf-overlay" onClick={onClose} />}
      <div className={`prf-drawer${isOpen ? " open" : ""}`}>
        <div className="prf-header">
          <h2>Профіль</h2>
          <button className="prf-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="prf-body">
          <div className="prf-avatar-section">
            {user?.avatar_url ? (
              <img className="prf-avatar" src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="prf-avatar-fallback">{user?.name?.[0] ?? "?"}</div>
            )}
            <span className="prf-email">{user?.email}</span>
          </div>

          <form className="prf-form" onSubmit={handleSave}>
            <div className="prf-field">
              <label>Ім'я</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше ім'я"
              />
            </div>
            <div className="prf-field">
              <label>Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="prf-field">
              <label>День народження</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            {status && (
              <span className={status.type === "success" ? "prf-success" : "prf-error"}>
                {status.text}
              </span>
            )}

            <div className="prf-actions">
              <button type="submit" className="prf-save-btn" disabled={saving}>
                {saving ? "Збереження..." : "Зберегти"}
              </button>
              <button type="button" className="prf-logout-btn" onClick={handleLogout}>
                Вийти
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserDrawer;
