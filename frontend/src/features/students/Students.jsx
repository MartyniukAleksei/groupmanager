import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchMembers, updateMemberRole, removeMember } from "../../api/members";
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

  if (loading) return <div className="std-loading">Завантаження...</div>;

  return (
    <div className="std-page">
      <h2 className="std-title">Учасники групи</h2>
      <table className="std-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ім'я</th>
            <th>Email</th>
            <th>Telegram</th>
            <th>День народження</th>
            <th>Роль</th>
            {isAdmin && <th>Дії</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m, idx) => {
            const isSelf = m.user_id === user?.id;
            return (
              <tr key={m.user_id} className={isSelf ? "std-current-row" : ""}>
                <td className="std-num">{idx + 1}</td>
                <td className="std-name-cell">
                  <div className="std-avatar">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="std-avatar-fallback">{m.name?.[0] ?? "?"}</div>
                    )}
                  </div>
                  <span>{m.name}</span>
                </td>
                <td>{m.email}</td>
                <td>{m.telegram ?? "—"}</td>
                <td>{formatBirthday(m.birthday)}</td>
                <td>
                  <span className={`std-role-badge std-role-${m.role}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </td>
                {isAdmin && (
                  <td className="std-actions">
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
                          🗑
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
