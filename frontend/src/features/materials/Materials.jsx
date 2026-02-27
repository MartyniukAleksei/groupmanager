import React, { useState } from 'react';
import '../../styles/materials.css';

const SUBJECTS = [
  'Алгебра і геометрія',
  'Математичний аналіз',
  'Програмування',
  'Дизайн систем'
];

const INITIAL_FOLDERS = [
  {
    id: 1,
    subject: 'Алгебра і геометрія',
    name: 'Лекція 1',
    links: [{ id: 101, title: 'Запис лекції (Вступ)', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
  },
  {
    id: 2,
    subject: 'Алгебра і геометрія',
    name: 'Лекція 2',
    links: []
  },
  {
    id: 3,
    subject: 'Алгебра і геометрія',
    name: 'Практика 1',
    links: []
  }
];

// Допоміжна функція для перетворення звичайного лінка YouTube на лінк для плеєра (embed)
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [expandedFolders, setExpandedFolders] = useState({}); 
  
  const [playingVideo, setPlayingVideo] = useState(null); 

  const activeFolders = folders.filter(f => f.subject === selectedSubject);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!selectedSubject) return alert('Спочатку оберіть предмет!');
    if (!newFolderName.trim()) return alert('Введіть назву папки!');

    const newFolder = {
      id: Date.now(),
      subject: selectedSubject,
      name: newFolderName.trim(),
      links: []
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderId, e) => {
    e.stopPropagation(); 
    if (window.confirm('Ви впевнені, що хочете видалити цю папку з усіма матеріалами?')) {
      setFolders(folders.filter(f => f.id !== folderId));
    }
  };

  const handleAddLink = (folderId) => {
    const url = window.prompt('Введіть URL адресу на відео (наприклад, YouTube):');
    if (!url) return;

    const title = window.prompt('Введіть назву запису, яка буде відображатися:');
    if (!title) return;

    const newLink = { id: Date.now(), title, url };

    setFolders(folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, links: [...folder.links, newLink] };
      }
      return folder;
    }));
    
    setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
  };

  const handleDeleteLink = (folderId, linkId) => {
    setFolders(folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, links: folder.links.filter(l => l.id !== linkId) };
      }
      return folder;
    }));
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  return (
    <div className="mat-wrapper">
      
      {/* КАРТКА 1: Вибір предмета та створення папки */}
      <div className="mat-card">
        
        {/* Заголовок по центру, олівець - справа */}
        <div className="mat-card-header-top">
          <h2 className="mat-card-title">📁 Навчальні матеріали</h2>
          
          <button 
            className={`mat-edit-btn ${isEditMode ? 'active' : ''}`} 
            onClick={() => setIsEditMode(!isEditMode)}
          >
            ✏️ <span className="mat-edit-text">{isEditMode ? 'Готово' : 'Редагувати'}</span>
          </button>
        </div>

        <p className="mat-subtitle">Оберіть предмет для перегляду:</p>

        <div className="mat-controls">
          <select 
            className="mat-select" 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Оберіть предмет...</option>
            {SUBJECTS.map(sub => (
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
          {activeFolders.length === 0 ? (
            <div className="mat-empty">У цьому предметі ще немає папок.</div>
          ) : (
            activeFolders.map(folder => (
              <div key={folder.id} className="mat-folder-item">
                
                {/* Шапка папки */}
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

                {/* Вміст папки (Розгортається) */}
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

                    {/* Кнопка додавання посилання в режимі редагування */}
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