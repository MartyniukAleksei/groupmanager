import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyGroups, createGroup, joinGroup } from "../api/groups";
import UserDrawer from "../components/UserDrawer";
import "../styles/dashboard.css";

const ICONS = [
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
];

function IconPicker({ selected, onSelect }) {
  return (
    <div>
      <span className="dash-icon-picker-label">Іконка</span>
      <div className="dash-icon-picker">
        {ICONS.map((icon, i) => (
          <div
            key={i}
            className={`dash-icon-opt${selected === i ? " selected" : ""}`}
            onClick={() => onSelect(i)}
          >
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateGroupModal({ token, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [iconIdx, setIconIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createGroup(token, name.trim(), desc.trim() || null);
      onCreated({ ...res.data, _iconIdx: iconIdx });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Не вдалося створити групу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal">
        <div className="dash-modal-head">
          <h3>Нова група</h3>
          <button className="dash-modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <IconPicker selected={iconIdx} onSelect={setIconIdx} />
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="dash-form-group">
            <label className="dash-form-label">Назва групи</label>
            <input
              className="dash-form-in"
              placeholder="Наприклад: ІП-51"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Опис (необов'язково)</label>
            <textarea
              className="dash-form-in textarea"
              placeholder="Короткий опис групи..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="dash-modal-actions">
            <button type="button" className="dash-btn-cancel" onClick={onClose}>Скасувати</button>
            <button type="submit" className="dash-btn-create" disabled={loading}>
              {loading ? "..." : "Створити"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinModal({ token, groups, onClose, onJoined }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const raw = code.trim();
    if (!raw) return;
    const joinCode = raw.includes("/join/") ? raw.split("/join/").pop().trim() : raw;
    setJoining(true);
    try {
      const res = await joinGroup(token, joinCode);
      onClose();
      navigate(`/g/${res.data.id}/board`);
    } catch (err) {
      if (err.response?.status === 409) {
        const existing = groups.find((g) => g.join_code === joinCode);
        if (existing) { onClose(); navigate(`/g/${existing.id}/board`); }
        else alert("Ви вже є учасником цієї групи.");
      } else if (err.response?.status === 404) {
        alert("Групу не знайдено. Перевірте код.");
      } else {
        alert("Помилка. Спробуйте ще раз.");
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="dash-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal small">
        <div className="dash-modal-head">
          <h3>Приєднатись до групи</h3>
          <button className="dash-modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="dash-modal-hint">Введіть код запрошення або посилання, щоб приєднатись до групи.</p>
        <div className="dash-form-group">
          <label className="dash-form-label">Код або посилання</label>
          <input
            className="dash-form-in"
            placeholder="Наприклад: ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
          />
        </div>
        <div className="dash-modal-actions">
          <button className="dash-btn-cancel" onClick={onClose}>Скасувати</button>
          <button className="dash-btn-create" onClick={handleJoin} disabled={joining}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            {joining ? "..." : "Приєднатись"}
          </button>
        </div>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchMyGroups(token)
      .then((res) => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const copyInviteLink = (groupId, joinCode, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/join/${joinCode}`;
    const doFallback = () => {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(doFallback);
    } else {
      doFallback();
    }
    setCopiedId(groupId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIconIdx = (group) => {
    if (group._iconIdx !== undefined) return group._iconIdx;
    return group.id % ICONS.length;
  };

  return (
    <div className="dash-bg">
      {/* HEADER */}
      <div className="dash-header-wrap">
        <div className="dash-header-card">
          <div className="dash-logo-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <rect x="3" y="3" width="8" height="8" rx="2"/>
              <rect x="13" y="3" width="8" height="8" rx="2"/>
              <rect x="3" y="13" width="8" height="8" rx="2"/>
              <rect x="13" y="13" width="8" height="8" rx="2"/>
            </svg>
          </div>
          <span className="dash-logo-name">Group Manager</span>
          <div className="dash-header-actions">
            <button className="dash-btn-outline" onClick={() => setShowCreateModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Створити групу
            </button>
            <button className="dash-btn-outline" onClick={() => setShowJoinModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Приєднатись
            </button>
          </div>
          <button className="dash-avatar-btn" onClick={() => setDrawerOpen(true)}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer" />
              : <span>{user?.name?.[0] ?? "?"}</span>}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <main className="dash-main">
        <p className="dash-section-title">Мої групи</p>
        <div className="dash-grid">
          {loading ? (
            <div className="dash-empty">Завантаження...</div>
          ) : groups.length === 0 ? (
            <div className="dash-empty">У вас ще немає груп. Створіть або приєднайтесь!</div>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="dash-group-card" onClick={() => navigate(`/g/${g.id}/board`)}>
                <div className="dash-card-icon">{ICONS[getIconIdx(g)]}</div>
                <div className="dash-card-title">{g.name}</div>
                <div className="dash-card-meta">
                  <span className="dash-card-meta-row role">{g.role}</span>
                  {g.description && <span className="dash-card-meta-row">{g.description}</span>}
                  <span className="dash-card-meta-row members">{g.member_count} учасник(ів)</span>
                </div>
                <div className="dash-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="dash-card-btn-primary" onClick={() => navigate(`/g/${g.id}/board`)}>
                    Відкрити
                  </button>
                  <button
                    className="dash-card-btn-secondary"
                    title="Скопіювати посилання"
                    onClick={(e) => copyInviteLink(g.id, g.join_code, e)}
                    style={copiedId === g.id ? { color: "var(--success)", borderColor: "var(--success)" } : {}}
                  >
                    {copiedId === g.id
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    }
                  </button>
                </div>
              </div>
            ))
          )}

        </div>
      </main>

      {/* MODALS */}
      {showCreateModal && (
        <CreateGroupModal
          token={token}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newGroup) =>
            setGroups((prev) => [...prev, { ...newGroup, role: "admin", member_count: 1 }])
          }
        />
      )}

      {showJoinModal && (
        <JoinModal
          token={token}
          groups={groups}
          onClose={() => setShowJoinModal(false)}
        />
      )}

      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default DashboardPage;
