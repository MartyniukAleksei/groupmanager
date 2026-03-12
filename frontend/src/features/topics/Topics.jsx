import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchMyGroups } from "../../api/groups";
import {
  fetchSubjects,
  fetchProjects,
  createProject,
  deleteProject,
  clearProjectEntries,
  fetchEntries,
  createEntry,
  deleteEntry,
} from "../../api/topics";
import "../../styles/topics.css";

export default function Topics() {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const { theme } = useTheme();

  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [topicText, setTopicText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Load admin status + subjects on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [groupsRes, subjectsRes] = await Promise.all([
          fetchMyGroups(token),
          fetchSubjects(token, groupId),
        ]);
        const grp = groupsRes.data.find((g) => g.id === Number(groupId));
        setIsAdmin(grp?.role === "admin");
        setSubjects(subjectsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId, token]);

  // Load projects when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setProjects([]);
      setSelectedProject(null);
      setEntries([]);
      return;
    }
    fetchProjects(token, groupId, selectedSubject)
      .then((res) => {
        setProjects(res.data);
        setSelectedProject(null);
        setEntries([]);
      })
      .catch(console.error);
  }, [selectedSubject, groupId, token]);

  // Load entries when project changes
  useEffect(() => {
    if (!selectedProject) {
      setEntries([]);
      return;
    }
    fetchEntries(token, groupId, selectedProject.id)
      .then((res) => setEntries(res.data))
      .catch(console.error);
  }, [selectedProject, groupId, token]);

  const reloadEntries = () =>
    fetchEntries(token, groupId, selectedProject.id)
      .then((res) => setEntries(res.data))
      .catch(console.error);

  const myEntry = entries.find((e) => e.user.id === user?.id);

  async function handleSubmit() {
    if (!topicText.trim() || !selectedProject) return;
    setSaving(true);
    try {
      await createEntry(token, groupId, {
        project_id: selectedProject.id,
        topic_text: topicText.trim(),
      });
      setTopicText("");
      await reloadEntries();
    } catch (e) {
      if (e.response?.status === 409) {
        alert("Ви вже забронювали тему для цього проекту.");
      } else {
        console.error(e);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!confirm("Видалити цей запис?")) return;
    try {
      await deleteEntry(token, groupId, entryId);
      await reloadEntries();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleClearEntries() {
    if (!confirm(`Очистити всі теми проекту "${selectedProject.name}"?`)) return;
    try {
      await clearProjectEntries(token, groupId, selectedProject.id);
      await reloadEntries();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteProject(project) {
    if (!confirm(`Видалити проект "${project.name}" та всі його теми?`)) return;
    try {
      await deleteProject(token, groupId, project.id);
      const res = await fetchProjects(token, groupId, selectedSubject);
      setProjects(res.data);
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setEntries([]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddProject() {
    if (!newProjectName.trim() || !selectedSubject) return;
    try {
      await createProject(token, groupId, {
        subject_name: selectedSubject,
        name: newProjectName.trim(),
      });
      setNewProjectName("");
      setShowAddProject(false);
      const res = await fetchProjects(token, groupId, selectedSubject);
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  const formattedDate = (iso) =>
    new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="topics-wrapper" data-theme={theme}>
      <div className="topics-card">
        <h2 className="topics-card-title">Теми</h2>

        {/* Selectors row */}
        <div className="topics-selectors">
          <select
            className="topics-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">-- Оберіть предмет --</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="topics-select"
            value={selectedProject?.id ?? ""}
            onChange={(e) => {
              const p = projects.find((p) => p.id === Number(e.target.value));
              setSelectedProject(p || null);
            }}
            disabled={!selectedSubject || projects.length === 0}
          >
            <option value="">-- Оберіть проект --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {isAdmin && selectedSubject && (
            <button className="topics-add-project-btn" onClick={() => setShowAddProject(true)}>
              + Проект
            </button>
          )}
        </div>

        {/* Admin: manage projects list */}
        {isAdmin && selectedSubject && projects.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {projects.map((p) => (
              <span
                key={p.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                {p.name}
                <button
                  onClick={() => handleDeleteProject(p)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#ef4444",
                    fontSize: "14px",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  title="Видалити проект"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Topic input — only if project selected and user hasn't booked yet */}
        {selectedProject && !myEntry && (
          <div className="topics-input-row">
            <input
              className="topics-text-input"
              type="text"
              placeholder="Введіть вашу тему..."
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              className="topics-submit-btn"
              onClick={handleSubmit}
              disabled={saving || !topicText.trim()}
            >
              {saving ? "..." : "Забронювати"}
            </button>
          </div>
        )}

        {/* Admin: clear all entries */}
        {isAdmin && selectedProject && entries.length > 0 && (
          <button className="topics-clear-btn" onClick={handleClearEntries}>
            Очистити всі теми
          </button>
        )}
      </div>

      {/* Table */}
      {selectedProject && (
        <div className="topics-card">
          {entries.length === 0 ? (
            <p className="topics-empty">Немає забронійованих тем для цього проекту.</p>
          ) : (
            <div className="topics-table-wrap">
              <table className="topics-table">
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Тема</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <div className="topics-user-cell">
                          {entry.user.avatar_url ? (
                            <img
                              className="topics-avatar"
                              src={entry.user.avatar_url}
                              alt={entry.user.name}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="topics-avatar-placeholder">
                              {entry.user.name?.[0] ?? "?"}
                            </div>
                          )}
                          {entry.user.name}
                        </div>
                      </td>
                      <td>{entry.topic_text}</td>
                      <td>
                        {(isAdmin || entry.user.id === user?.id) && (
                          <button
                            className="topics-delete-btn"
                            onClick={() => handleDeleteEntry(entry.id)}
                            title="Видалити"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="topics-modal-overlay" onClick={() => setShowAddProject(false)}>
          <div className="topics-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Новий проект</h3>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b" }}>
              Предмет: <strong>{selectedSubject}</strong>
            </p>
            <input
              type="text"
              placeholder="Назва проекту"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
              autoFocus
            />
            <div className="topics-modal-actions">
              <button
                className="topics-modal-cancel"
                onClick={() => { setShowAddProject(false); setNewProjectName(""); }}
              >
                Скасувати
              </button>
              <button
                className="topics-modal-confirm"
                onClick={handleAddProject}
                disabled={!newProjectName.trim()}
              >
                Додати
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <p style={{ textAlign: "center", color: "#94a3b8" }}>Завантаження...</p>
      )}
    </div>
  );
}
