import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchMyGroups } from "../../api/groups";
import { fetchLinks, createLink, deleteLink } from "../../api/links";
import "../../styles/links.css";

export default function Links() {
  const { groupId } = useParams();
  const { token } = useAuth();

  const [links, setLinks] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ emoji: "", title: "", url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, linksRes] = await Promise.all([
          fetchMyGroups(token),
          fetchLinks(token, groupId),
        ]);
        const match = groupsRes.data.find((g) => g.id === parseInt(groupId));
        setIsAdmin(match?.role === "admin");
        setLinks(linksRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, token]);

  const openModal = () => {
    setForm({ emoji: "", title: "", url: "" });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.emoji || !form.title || !form.url) return;
    setSaving(true);
    try {
      const res = await createLink(token, groupId, form);
      setLinks((prev) => [...prev, res.data]);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId) => {
    await deleteLink(token, groupId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const handleCardClick = (url) => {
    if (isEditMode) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div className="lnk-page">Завантаження...</div>;

  return (
    <div className="lnk-page">
      <div className="lnk-header">
        <h2>🔗 Корисні посилання</h2>
        {isAdmin && (
          <>
            <button className="lnk-btn lnk-btn-primary" onClick={openModal}>
              + Додати
            </button>
            <button
              className="lnk-btn lnk-btn-secondary"
              onClick={() => setIsEditMode((v) => !v)}
            >
              {isEditMode ? "Готово" : "Редагувати"}
            </button>
          </>
        )}
      </div>

      {links.length === 0 ? (
        <p className="lnk-empty">Поки що немає посилань.</p>
      ) : (
        <div className="lnk-grid">
          {links.map((link) => (
            <div
              key={link.id}
              className="lnk-card"
              onClick={() => handleCardClick(link.url)}
              title={link.url}
            >
              {isEditMode && (
                <button
                  className="lnk-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(link.id);
                  }}
                >
                  ×
                </button>
              )}
              <span className="lnk-emoji">{link.emoji}</span>
              <span className="lnk-title">{link.title}</span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="lnk-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lnk-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Нове посилання</h3>
            <form onSubmit={handleCreate} style={{ display: "contents" }}>
              <label>
                Емодзі
                <input
                  type="text"
                  placeholder="🔗"
                  maxLength={4}
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  autoFocus
                />
              </label>
              <label>
                Назва
                <input
                  type="text"
                  placeholder="Назва посилання"
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label>
                URL
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </label>
              <div className="lnk-modal-actions">
                <button
                  type="button"
                  className="lnk-btn lnk-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="lnk-btn lnk-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Зберігаю..." : "Додати"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
