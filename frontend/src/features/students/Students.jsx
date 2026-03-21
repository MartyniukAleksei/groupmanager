import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchMembers, updateMemberRole, removeMember } from "../../api/members";
import Spinner from "../../components/ui/Spinner";
import PageHint from "../../components/ui/PageHint";
import "../../styles/students.css";

const ROLES = ["admin", "user"];

const ROLE_META = {
  admin:    { label: "Адмін",     icon: "ph-crown",        cls: "admin"    },
  starosta: { label: "Cтароста",  icon: "ph-star",         cls: "starosta" },
  editor:   { label: "Редактор",  icon: "ph-pencil-simple",cls: "editor"   },
  user:     { label: "Учасник",   icon: "ph-user",         cls: "user"     },
};

const ROLE_LABELS = { admin: "Адмін", user: "Учасник" };

function formatBirthday(iso) {
  if (!iso) return null;
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

export default function Students() {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(new Set());
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);

  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";

  useEffect(() => {
    fetchMembers(token, groupId)
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, groupId]);

  // close menu on outside click
  useEffect(() => {
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  async function handleRoleChange(userId, newRole) {
    setSaving((prev) => new Set(prev).add(userId));
    setMenuOpen(null);
    try {
      const res = await updateMemberRole(token, groupId, userId, newRole);
      setMembers((prev) =>
        prev
          .map((m) => (m.user_id === userId ? { ...m, role: res.data.role } : m))
          .sort((a, b) => {
            const order = { admin: 0, starosta: 1, editor: 2, user: 3 };
            return (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name);
          })
      );
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Помилка при зміні ролі");
    } finally {
      setSaving((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    }
  }

  async function handleRemove(userId, name) {
    if (!confirm(`Видалити ${name} з групи?`)) return;
    setMenuOpen(null);
    try {
      await removeMember(token, groupId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Помилка при видаленні");
    }
  }

  const filtered = members.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="std-loading"><Spinner /></div>;

  return (
    <div className="std-page">
      <PageHint page="students" />
      <div className="std-card">
        {/* Header */}
        <div className="std-header">
          <div className="std-header-left">
            <span className="std-members-label">
              <i className="ph ph-users"></i> Учасники
            </span>
            <span className="std-count">{members.length}</span>
          </div>
          <div className="std-search-wrap">
            <i className="ph ph-magnifying-glass std-search-icon"></i>
            <input
              className="std-search"
              placeholder="Пошук..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="std-search-hint">⌘ F</span>
          </div>
        </div>

        {/* List */}
        <div className="std-list">
          {filtered.length === 0 && (
            <div className="std-empty">Нікого не знайдено</div>
          )}
          {filtered.map((m) => {
            const isSelf = m.user_id === user?.id;
            const meta = ROLE_META[m.role] ?? ROLE_META.user;
            const bday = formatBirthday(m.birthday);
            const isMenuOpen = menuOpen === m.user_id;

            return (
              <div key={m.user_id} className={`std-row${isSelf ? " std-row-self" : ""}`}>
                {/* Avatar */}
                <div className="std-avatar-wrap">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.name} referrerPolicy="no-referrer" className="std-avatar-img" />
                    : <div className="std-avatar-fallback">{m.name?.[0] ?? "?"}</div>
                  }
                  {isSelf && <span className="std-online-dot"></span>}
                </div>

                {/* Info */}
                <div className="std-info">
                  <div className="std-name">
                    {m.name}
                    {isSelf && <span className="std-you-badge">Ви</span>}
                  </div>
                  <div className="std-sub">
                    {bday ? `🎂 ${bday}` : m.email}
                    {m.telegram && <span className="std-tg">· @{m.telegram}</span>}
                  </div>
                </div>

                {/* Role badge */}
                <div className={`std-role-badge std-role-${meta.cls}`}>
                  <i className={`ph ${meta.icon}`}></i>
                  {meta.label}
                </div>

                {/* Admin menu */}
                {isAdmin && !isSelf && (
                  <div className="std-menu-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="std-menu-btn"
                      onClick={() => setMenuOpen(isMenuOpen ? null : m.user_id)}
                      disabled={saving.has(m.user_id)}
                      title="Дії"
                    >
                      {saving.has(m.user_id)
                        ? <i className="ph ph-circle-notch" style={{ animation: "spin 0.8s linear infinite" }}></i>
                        : <i className="ph ph-dots-three"></i>
                      }
                    </button>
                    {isMenuOpen && (
                      <div className="std-dropdown">
                        <div className="std-dropdown-label">Змінити роль</div>
                        {ROLES.map((r) => (
                          <button
                            key={r}
                            className={`std-dropdown-item${m.role === r ? " active" : ""}`}
                            onClick={() => handleRoleChange(m.user_id, r)}
                          >
                            <i className={`ph ${ROLE_META[r]?.icon}`}></i>
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                        <div className="std-dropdown-divider"></div>
                        <button
                          className="std-dropdown-item std-dropdown-danger"
                          onClick={() => handleRemove(m.user_id, m.name)}
                        >
                          <i className="ph ph-user-minus"></i> Видалити
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
