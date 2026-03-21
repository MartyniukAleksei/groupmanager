import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchMembers, updateMemberRole, removeMember } from "../../api/members";
import Spinner from "../../components/ui/Spinner";
import PageHint from "../../components/ui/PageHint";
import "../../styles/students.css";

const ROLES = ["admin", "user"];

const ROLE_LABELS = {
  admin: "Адмін",
  user: "Учасник",
};

function formatBirthday(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function Students() {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(new Set());

  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";

  useEffect(() => {
    fetchMembers(token, groupId)
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, groupId]);

  async function handleRoleChange(userId, newRole) {
    setSaving((prev) => new Set(prev).add(userId));
    try {
      const res = await updateMemberRole(token, groupId, userId, newRole);
      setMembers((prev) =>
        prev
          .map((m) => (m.user_id === userId ? { ...m, role: res.data.role } : m))
          .sort((a, b) => {
            const order = { admin: 0, user: 1 };
            return (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name);
          })
      );
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Помилка при зміні ролі");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  async function handleRemove(userId, name) {
    if (!confirm(`Видалити ${name} з групи?`)) return;
    try {
      await removeMember(token, groupId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Помилка при видаленні");
    }
  }

  if (loading) return <div className="std-loading"><Spinner /></div>;

  return (
    <div className="std-wrapper">
      <PageHint page="students" />

      <div className="std-card">
        <h2 className="std-card-title">Учасники групи</h2>
        <div className="std-count">{members.length} учасників</div>

        {/* Скролюваний контейнер таблиці */}
        <div className="std-scroll-area">

        {/* Заголовок колонок */}
        <div className="std-header">
          <div className="std-col-num">#</div>
          <div className="std-col-user">Ім'я</div>
          <div className="std-col-email">Email</div>
          <div className="std-col-tg">Telegram</div>
          <div className="std-col-bday">Д. народження</div>
          <div className="std-col-role">Роль</div>
          {isAdmin && <div className="std-col-actions">Дії</div>}
        </div>

        {/* Список учасників */}
        {members.length === 0 ? (
          <div className="std-empty">Ще немає учасників</div>
        ) : (
          members.map((m, idx) => {
            const isSelf = m.user_id === user?.id;
            return (
              <div
                key={m.user_id}
                className={`std-row${isSelf ? " std-current" : ""}`}
              >
                <div className="std-col-num">{idx + 1}</div>

                <div className="std-col-user">
                  <div className="std-avatar">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="std-avatar-fallback">{m.name?.[0] ?? "?"}</div>
                    )}
                  </div>
                  <div className="std-user-info">
                    <div className="std-user-name">{m.name}</div>
                  </div>
                </div>

                <div className="std-col-email">{m.email}</div>
                <div className="std-col-tg">{m.telegram ?? "—"}</div>
                <div className="std-col-bday">{formatBirthday(m.birthday)}</div>

                <div className="std-col-role">
                  <span className={`std-role-badge std-role-${m.role}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>

                {isAdmin && (
                  <div className="std-col-actions">
                    {!isSelf && (
                      <>
                        <select
                          className="std-role-select"
                          value={m.role}
                          disabled={saving.has(m.user_id)}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button
                          className="std-remove-btn"
                          onClick={() => handleRemove(m.user_id, m.name)}
                          title="Видалити"
                        >
                          &#10005;
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>{/* /std-scroll-area */}
      </div>
    </div>
  );
}
