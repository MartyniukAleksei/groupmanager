import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyGroups, createGroup, joinGroup } from "../api/groups";
import UserDrawer from "../components/UserDrawer";

function CreateGroupModal({ token, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createGroup(token, name.trim(), desc.trim() || null);
      onCreated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Не вдалося створити групу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Створити групу</h2>
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            placeholder="Назва групи"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea
            style={{ ...styles.input, height: "80px", resize: "vertical" }}
            placeholder="Опис (необов'язково)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div style={styles.modalButtons}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" style={styles.primaryBtn} disabled={loading}>
              {loading ? "..." : "Створити"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchMyGroups(token)
      .then((res) => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    const raw = joinInput.trim();
    if (!raw) return;
    const code = raw.includes("/join/") ? raw.split("/join/").pop().trim() : raw;
    setJoining(true);
    try {
      const res = await joinGroup(token, code);
      navigate(`/g/${res.data.id}/board`);
    } catch (err) {
      if (err.response?.status === 409) {
        const existing = groups.find((g) => g.join_code === code);
        if (existing) navigate(`/g/${existing.id}/board`);
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

  const copyInviteLink = (joinCode) => {
    const link = `${window.location.origin}/join/${joinCode}`;
    navigator.clipboard.writeText(link);
  };

  const roleBadgeStyle = (role) => ({
    ...styles.badge,
    background: role === "admin" ? "#ff4d4f" : "#52c41a",
  });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Group Manager</h1>
        <div style={styles.headerRight}>
          <span style={styles.greeting}>Привіт, {user?.name}</span>
          <button style={styles.avatarBtn} onClick={() => setDrawerOpen(true)}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" referrerPolicy="no-referrer" style={styles.avatarImg} />
              : <span>{user?.name?.[0] ?? "?"}</span>}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section>
          <h2 style={styles.sectionTitle}>Мої групи</h2>
          {loading ? (
            <p>Завантаження...</p>
          ) : groups.length === 0 ? (
            <p style={styles.empty}>У вас ще немає груп. Створіть або приєднайтесь!</p>
          ) : (
            <div style={styles.grid}>
              {groups.map((g) => (
                <div key={g.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardName}>{g.name}</span>
                    <span style={roleBadgeStyle(g.role)}>{g.role}</span>
                  </div>
                  {g.description && <p style={styles.cardDesc}>{g.description}</p>}
                  <p style={styles.memberCount}>{g.member_count} учасник(ів)</p>
                  <div style={styles.cardActions}>
                    <button
                      style={styles.primaryBtn}
                      onClick={() => navigate(`/g/${g.id}/board`)}
                    >
                      Відкрити
                    </button>
                    <button
                      style={styles.secondaryBtn}
                      title="Скопіювати посилання"
                      onClick={() => copyInviteLink(g.join_code)}
                    >
                      Копіювати посилання
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button style={styles.primaryBtn} onClick={() => setShowModal(true)}>
            + Створити групу
          </button>
        </section>

        <section style={{ marginTop: "40px" }}>
          <h2 style={styles.sectionTitle}>Приєднатись до групи</h2>
          <div style={styles.joinRow}>
            <input
              style={styles.input}
              placeholder="Код або посилання"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button style={styles.primaryBtn} onClick={handleJoin} disabled={joining}>
              {joining ? "..." : "Приєднатись"}
            </button>
          </div>
        </section>
      </main>

      {showModal && (
        <CreateGroupModal
          token={token}
          onClose={() => setShowModal(false)}
          onCreated={(newGroup) => setGroups((prev) => [...prev, { ...newGroup, role: "admin", member_count: 1 }])}
        />
      )}

      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", fontFamily: "sans-serif", background: "#f5f5f5" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.1)",
  },
  title: { margin: 0, fontSize: "22px" },
  headerRight: { display: "flex", alignItems: "center", gap: "16px" },
  greeting: { fontSize: "16px" },
  avatarBtn: {
    width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer",
    background: "#1890ff", color: "#fff", border: "none", fontWeight: 700,
    fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", padding: 0,
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  main: { maxWidth: "900px", margin: "0 auto", padding: "32px 16px" },
  sectionTitle: { marginBottom: "16px" },
  empty: { color: "#999" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" },
  card: { background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,.1)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  cardName: { fontWeight: 600, fontSize: "16px" },
  badge: { padding: "2px 8px", borderRadius: "12px", color: "#fff", fontSize: "12px" },
  cardDesc: { color: "#666", fontSize: "14px", margin: "4px 0 8px" },
  memberCount: { color: "#999", fontSize: "13px", margin: "0 0 12px" },
  cardActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  primaryBtn: {
    padding: "8px 16px", cursor: "pointer", background: "#1890ff",
    color: "#fff", border: "none", borderRadius: "5px",
  },
  secondaryBtn: {
    padding: "8px 16px", cursor: "pointer", background: "#fff",
    color: "#1890ff", border: "1px solid #1890ff", borderRadius: "5px",
  },
  cancelBtn: {
    padding: "8px 16px", cursor: "pointer", background: "#fff",
    color: "#666", border: "1px solid #ddd", borderRadius: "5px",
  },
  joinRow: { display: "flex", gap: "8px", alignItems: "center" },
  input: {
    padding: "8px 12px", border: "1px solid #ddd", borderRadius: "5px",
    fontSize: "14px", width: "100%", boxSizing: "border-box",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: "8px", padding: "24px",
    width: "360px", display: "flex", flexDirection: "column", gap: "12px",
  },
  modalButtons: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" },
};

export default DashboardPage;
