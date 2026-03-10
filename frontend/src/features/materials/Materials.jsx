import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMaterials, createFolder, deleteFolder, createLink, deleteLink } from '../../api/materials';
import '../../styles/materials.css';

const getEmbedUrl = (url) => {
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('watch?v=', 'embed/');
  }
  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/');
  }
  return url;
};

const Materials = () => {
  const { groupId } = useParams();
  const { token } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [playingVideo, setPlayingVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials(token, groupId).then(({ data }) => {
      setSubjects(data.subjects);
      setIsAdmin(data.is_admin);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, groupId]);

  useEffect(() => {
    if (!selectedSubject) { setFolders([]); return; }
    fetchMaterials(token, groupId, selectedSubject).then(({ data }) => setFolders(data.folders));
  }, [token, groupId, selectedSubject]);

  const reloadFolders = async () => {
    const { data } = await fetchMaterials(token, groupId, selectedSubject);
    setFolders(data.folders);
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !newFolderName.trim()) return;
    await createFolder(token, groupId, { subject_name: selectedSubject, name: newFolderName.trim() });
    setNewFolderName('');
    await reloadFolders();
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!window.confirm('Видалити папку з усіма матеріалами?')) return;
    await deleteFolder(token, groupId, folderId);
    await reloadFolders();
  };

  const handleAddLink = async (folderId) => {
    const url = window.prompt('Введіть URL адресу:');
    if (!url) return;
    const title = window.prompt('Введіть назву запису:');
    if (!title) return;
    await createLink(token, groupId, folderId, { title, url });
    setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
    await reloadFolders();
  };

  const handleDeleteLink = async (folderId, linkId) => {
    await deleteLink(token, groupId, folderId, linkId);
    await reloadFolders();
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  if (loading) return <div className="mat-wrapper"><div className="mat-placeholder">Завантаження...</div></div>;

  return (
    <div className="mat-wrapper">

      {/* КАРТКА 1: Вибір предмета та створення папки */}
      <div className="mat-card">

        <div className="mat-card-header-top">
          <h2 className="mat-card-title">📁 Навчальні матеріали</h2>

          {isAdmin && (
            <button
              className={`mat-edit-btn ${isEditMode ? 'active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              ✏️ <span className="mat-edit-text">{isEditMode ? 'Готово' : 'Редагувати'}</span>
            </button>
          )}
        </div>

        <p className="mat-subtitle">Оберіть предмет для перегляду:</p>

        <div className="mat-controls">
          <select
            className="mat-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Оберіть предмет...</option>
            {subjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          {isEditMode && selectedSubject && (
            <form className="mat-folder-form" onSubmit={handleCreateFolder}>
              <input
                type="text"
                className="mat-input"
                placeholder="Нова папка (напр. Лекція 1)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <button type="submit" className="mat-btn-black">
                + Папка
              </button>
            </form>
          )}
        </div>
      </div>

      {/* КАРТКА 2: Список папок (Акордеон) */}
      {!selectedSubject ? (
        <div className="mat-placeholder">Оберіть предмет, щоб побачити матеріали</div>
      ) : (
        <div className="mat-folders-list">
          {folders.length === 0 ? (
            <div className="mat-empty">У цьому предметі ще немає папок.</div>
          ) : (
            folders.map(folder => (
              <div key={folder.id} className="mat-folder-item">

                <div className="mat-folder-header" onClick={() => toggleFolder(folder.id)}>
                  <div className="mat-folder-title">
                    <span className="mat-folder-icon">📁</span>
                    {folder.name}
                  </div>

                  <div className="mat-folder-actions">
                    {isEditMode && (
                      <button
                        className="mat-btn-delete-folder"
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        title="Видалити папку"
                      >
                        🗑️ Видалити
                      </button>
                    )}
                    <span className={`mat-arrow ${expandedFolders[folder.id] ? 'open' : ''}`}>▼</span>
                  </div>
                </div>

                {expandedFolders[folder.id] && (
                  <div className="mat-folder-content">
                    {folder.links.length === 0 && !isEditMode ? (
                      <div className="mat-empty-folder">Папка порожня</div>
                    ) : (
                      <div className="mat-links-list">
                        {folder.links.map(link => (
                          <div key={link.id} className="mat-link-row">
                            <button className="mat-link-btn" onClick={() => setPlayingVideo(link)}>
                              ▶ {link.title}
                            </button>
                            {isEditMode && (
                              <button className="mat-btn-delete-link" onClick={() => handleDeleteLink(folder.id, link.id)}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isEditMode && (
                      <button className="mat-btn-add-link" onClick={() => handleAddLink(folder.id)}>
                        + Додати посилання
                      </button>
                    )}
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* ВІДЕОПЛЕЄР (Модальне вікно) */}
      {playingVideo && (
        <div className="mat-modal-overlay" onClick={() => setPlayingVideo(null)}>
          <div className="mat-modal-content" onClick={e => e.stopPropagation()}>
            <div className="mat-modal-header">
              <h3>{playingVideo.title}</h3>
              <button className="mat-modal-close" onClick={() => setPlayingVideo(null)}>✕</button>
            </div>
            <div className="mat-video-container">
              <iframe
                src={getEmbedUrl(playingVideo.url)}
                title={playingVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Materials;
