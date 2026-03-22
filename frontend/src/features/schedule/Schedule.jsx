import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchSchedule, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry, setCurrentWeek, importKpiSchedule } from '../../api/schedule';
import { fetchMyGroups } from '../../api/groups';
import Spinner from '../../components/ui/Spinner';
import PageHint from '../../components/ui/PageHint';
import '../../styles/schedule.css';

const DAYS = [
  { id: 'monday', label: 'Понеділок', short: 'ПОН' },
  { id: 'tuesday', label: 'Вівторок', short: 'ВІВ' },
  { id: 'wednesday', label: 'Середа', short: 'СЕР' },
  { id: 'thursday', label: 'Четвер', short: 'ЧЕТ' },
  { id: 'friday', label: "П'ятниця", short: 'ПТ' },
  { id: 'saturday', label: 'Субота', short: 'СУБ' },
];

const TIMES = ['08:30', '10:25', '12:20', '14:15', '16:10', '18:30', '20:20'];

const EMPTY_FORM = { id: null, week: 'both', isOneTime: false, classFormat: 'standard', items: [{ name: '', teacher: '', room: '', type: 'lecture', link: '' }] };

const Schedule = () => {
  const { groupId } = useParams();
  const { token } = useAuth();

  const [activeWeek, setActiveWeek] = useState(1);
  const [serverWeek, setServerWeek] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [viewClassModal, setViewClassModal] = useState(null);
  const [addClassModal, setAddClassModal] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [currentDay, setCurrentDay] = useState(() => {
    const dayIndex = new Date().getDay();
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[dayIndex];
    return today === 'sunday' ? 'monday' : today;
  });

  const loadSchedule = async () => {
    const { data } = await fetchSchedule(token, groupId);
    setScheduleData(data.entries.map(e => ({
      id: e.id, day: e.day, time: e.time, week: e.week,
      isOneTime: e.is_one_time, classFormat: e.class_format, items: e.items,
    })));
    setServerWeek(data.current_week);
    setActiveWeek(data.current_week);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: groups } = await fetchMyGroups(token);
        const grp = groups.find(g => g.id === Number(groupId));
        setIsAdmin(grp?.role === 'admin');
        await loadSchedule();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, groupId]);

  const handleAddSubItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { name: '', teacher: '', room: '', type: 'lecture', link: '' }] }));
  const handleUpdateSubItem = (index, field, value) => { const newItems = [...formData.items]; newItems[index][field] = value; setFormData({ ...formData, items: newItems }); };
  const handleRemoveSubItem = (index) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

  const handleFormatChange = (e) => {
    const format = e.target.value;
    setFormData(prev => ({ ...prev, classFormat: format, items: format === 'standard' ? [prev.items[0]] : prev.items }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        day: addClassModal.day,
        time: addClassModal.time,
        week: formData.week,
        is_one_time: formData.isOneTime,
        class_format: formData.classFormat,
        items: formData.items,
      };

      if (formData.id) {
        await updateScheduleEntry(token, groupId, formData.id, payload);
      } else {
        await createScheduleEntry(token, groupId, payload);
      }
      await loadSchedule();
      setAddClassModal(null);
      setFormData(EMPTY_FORM);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (classObj) => {
    setViewClassModal(null);
    setFormData({
      ...classObj,
      week: classObj.isOneTime ? 'once' : classObj.week,
    });
    setAddClassModal({ day: classObj.day, time: classObj.time });
  };

  const handleDeleteOnce = async (classItem) => {
    setSaving(true);
    try {
      if (classItem.week === 'both') {
        const otherWeek = activeWeek === 1 ? 2 : 1;
        await updateScheduleEntry(token, groupId, classItem.id, { week: String(otherWeek) });
      } else {
        await deleteScheduleEntry(token, groupId, classItem.id);
      }
      await loadSchedule();
      setViewClassModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteForever = async (id) => {
    setSaving(true);
    try {
      await deleteScheduleEntry(token, groupId, id);
      await loadSchedule();
      setViewClassModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSetServerWeek = async (week) => {
    try {
      await setCurrentWeek(token, groupId, week);
      setServerWeek(week);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportKpi = async () => {
    try {
      const url = new URL(importUrl);
      const kpiGroupId = url.searchParams.get('groupId');
      if (!kpiGroupId) {
        alert('Невірне посилання. Потрібен параметр groupId.');
        return;
      }
      if (!confirm('Існуючий розклад буде замінено. Продовжити?')) return;
      setImportLoading(true);
      await importKpiSchedule(token, groupId, kpiGroupId);
      await loadSchedule();
      setImportUrl('');
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Не вдалося імпортувати розклад. Перевірте посилання.');
    } finally {
      setImportLoading(false);
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'lecture': return { text: '#047857', border: '#047857', label: 'ЛЕКЦІЯ', className: 'lecture' };
      case 'practice': return { text: '#dc2626', border: '#dc2626', label: 'ПРАКТИКА', className: 'practice' };
      case 'lab': return { text: '#a16207', border: '#a16207', label: 'ЛАБ', className: 'lab' };
      default: return { text: '#475569', border: '#475569', label: 'ІНШЕ', className: '' };
    }
  };

  if (loading) return <div className="sch-wrapper"><Spinner /></div>;

  return (
    <div className="sch-wrapper">
      <PageHint page="schedule" />

      {isAdmin && isEditMode && (
        <div className="sch-import-block">
          <div className="sch-import-title">Імпорт розкладу з КПІ</div>
          <div className="sch-import-row">
            <input
              className="sch-import-input"
              type="url"
              placeholder="https://schedule.kpi.ua/?groupId=5339"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
            />
            <button
              className="btn-primary sch-import-btn"
              onClick={handleImportKpi}
              disabled={importLoading || !importUrl}
            >
              {importLoading ? 'Імпорт...' : 'Імпортувати'}
            </button>
          </div>
          <div className="sch-import-warning">Увага: існуючий розклад буде замінено</div>
        </div>
      )}

      {/* ВЕРХНЯ ПАНЕЛЬ */}
      <div className="sch-top-header">

        <div className="sch-week-toggle">
          <button
            className={`sch-week-btn ${activeWeek === 1 ? 'active' : ''}`}
            onClick={() => setActiveWeek(1)}
          >
            {serverWeek === 1 ? '★ ' : ''}1-й Тиждень
          </button>
          <button
            className={`sch-week-btn ${activeWeek === 2 ? 'active' : ''}`}
            onClick={() => setActiveWeek(2)}
          >
            {serverWeek === 2 ? '★ ' : ''}2-й Тиждень
          </button>
        </div>

        {isAdmin && (
          <button className={`hw-edit-btn ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>
            ✏️ <span className="btn-text" style={{ marginLeft: '6px' }}>{isEditMode ? 'Готово' : 'Редагувати'}</span>
          </button>
        )}
      </div>

      {/* АДМІН: встановити поточний тиждень */}
      {isAdmin && isEditMode && (
        <div style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#475569' }}>Поточний тиждень для всіх:</span>
          <button
            onClick={() => handleSetServerWeek(1)}
            className={serverWeek === 1 ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 14px', fontSize: '13px' }}
          >
            1-й
          </button>
          <button
            onClick={() => handleSetServerWeek(2)}
            className={serverWeek === 2 ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 14px', fontSize: '13px' }}
          >
            2-й
          </button>
        </div>
      )}

      {/* ПАНЕЛЬ ВИБОРУ ДНЯ */}
      <div className="sch-day-picker">
        {DAYS.map(day => (
          <button
            key={day.id}
            className={`sch-day-btn ${currentDay === day.id ? 'active' : ''}`}
            onClick={() => setCurrentDay(day.id)}
          >
            <span className="sch-day-full">{day.label.toUpperCase()}</span>
            <span className="sch-day-short">{day.short}</span>
          </button>
        ))}
      </div>

      {/* СІТКА РОЗКЛАДУ */}
      <div className="sch-grid">
        {TIMES.map(time => (
          DAYS.map(dayObj => {
            const classObj = scheduleData.find(c =>
              c.day === dayObj.id && c.time === time &&
              (c.week === 'both' || c.week === String(activeWeek))
            );
            const isActiveCol = currentDay === dayObj.id;

            return (
              <div key={`${dayObj.id}-${time}`} className={`sch-cell ${isActiveCol ? 'active-col' : 'hidden-col'}`}>
                <div className="sch-time">{time}</div>

                {classObj ? (
                  <div className="sch-card" onClick={() => setViewClassModal(classObj)}>
                    {classObj.isOneTime && <div className="sch-now-badge" style={{ color: '#e11d48' }}>Одноразово</div>}

                    {classObj.items.map((item, idx) => (
                      <div key={idx} className={classObj.items.length > 1 ? "sch-sub-item" : ""}>
                        <span className={`sch-tag ${getTypeStyles(item.type).className}`}>
                          {getTypeStyles(item.type).label}
                        </span>
                        <div className="sch-subject">{item.name}</div>
                        <div className="sch-teacher">{item.teacher}</div>
                        {item.room && <div className="sch-room">Ауд. {item.room}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  isEditMode ? (
                    <div className="sch-card-empty edit-active" onClick={() => { setFormData(EMPTY_FORM); setAddClassModal({ day: dayObj.id, time }); }} title="Додати пару">
                      +
                    </div>
                  ) : (
                    <div className="sch-card-empty"></div>
                  )
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* МОДАЛКА: ДОДАВАННЯ ТА РЕДАГУВАННЯ */}
      {addClassModal && (
        <div className="modal-overlay" onClick={() => setAddClassModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{formData.id ? 'Редагувати пару' : 'Додати пару'}</h3>
            <p style={{ color: '#666', fontSize: '12px' }}>{DAYS.find(d => d.id === addClassModal.day)?.label}, {addClassModal.time}</p>

            <form onSubmit={handleAddSubmit} className="modal-form">
              <select className="modal-input" value={formData.week} onChange={e => {
                setFormData({ ...formData, week: e.target.value });
              }}>
                <option value="both">Кожен тиждень</option>
                <option value="1">Тільки 1-й тиждень</option>
                <option value="2">Тільки 2-й тиждень</option>
                <option value="once">Одноразово (на поточний тиждень)</option>
              </select>

              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#333', display: 'block', marginBottom: '8px' }}>Тип заняття:</label>
                <select className="modal-input" value={formData.classFormat} onChange={handleFormatChange}>
                  <option value="standard">Звичайна пара (Вся група)</option>
                  <option value="groups">Поділ на підгрупи</option>
                  <option value="electives">Вибіркові предмети</option>
                </select>
              </div>

              <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '5px', marginTop: '10px' }}>
                {formData.items.map((item, index) => (
                  <div key={index} className="sub-item-box">
                    {formData.classFormat !== 'standard' && formData.items.length > 1 && <button type="button" className="remove-sub-btn" onClick={() => handleRemoveSubItem(index)}>✕</button>}

                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>
                      {formData.classFormat === 'groups' ? `Підгрупа ${index + 1}` : formData.classFormat === 'electives' ? `Вибірковий предмет ${index + 1}` : 'Деталі пари'}
                    </div>

                    <input className="modal-input" type="text" placeholder="Назва предмета" required value={item.name} onChange={e => handleUpdateSubItem(index, 'name', e.target.value)} />

                    <div className="form-row">
                      <input className="modal-input" type="text" placeholder="Викладач (необов'язково)" value={item.teacher} onChange={e => handleUpdateSubItem(index, 'teacher', e.target.value)} />
                      <input className="modal-input" type="text" placeholder="Аудиторія" value={item.room} onChange={e => handleUpdateSubItem(index, 'room', e.target.value)} style={{ width: '120px' }} />
                    </div>

                    <div className="form-row">
                      <select className="modal-input" value={item.type} onChange={e => handleUpdateSubItem(index, 'type', e.target.value)}>
                        <option value="lecture">Лекція</option><option value="practice">Практика</option><option value="lab">Лабораторна</option>
                      </select>
                      <input className="modal-input" type="url" placeholder="Zoom/Meet" value={item.link} onChange={e => handleUpdateSubItem(index, 'link', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              {formData.classFormat !== 'standard' && (
                <button type="button" className="btn-secondary" onClick={handleAddSubItem}>
                  + Додати ще {formData.classFormat === 'groups' ? 'підгрупу' : 'предмет'}
                </button>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setAddClassModal(null); setFormData(EMPTY_FORM); }} className="btn-secondary" style={{ flex: 1 }}>Скасувати</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА: ПЕРЕГЛЯД ТА ДІЇ */}
      {viewClassModal && (
        <div className="modal-overlay" onClick={() => setViewClassModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 20px' }}>

            {viewClassModal.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <span className={`sch-tag ${getTypeStyles(item.type).className}`}>
                    {getTypeStyles(item.type).label}
                  </span>
                  {viewClassModal.isOneTime && (
                    <span className="sch-tag" style={{ background: '#ffe4e6', color: '#e11d48' }}>ОДНОРАЗОВО</span>
                  )}
                </div>

                <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#111' }}>{item.name}</h2>
                {item.teacher && <p style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#666' }}>{item.teacher}</p>}
                {item.room && <p style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>Аудиторія: {item.room}</p>}
                {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="btn-primary" style={{ boxSizing: 'border-box', width: '100%', marginBottom: '15px', padding: '14px', fontSize: '16px' }}>Увійти 🔗</a>}
              </div>
            ))}

            {isEditMode && isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', marginBottom: '15px' }}>
                <button onClick={() => handleEditClick(viewClassModal)} className="btn-primary" style={{ boxSizing: 'border-box', width: '100%' }}>✏️ Редагувати пару</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleDeleteOnce(viewClassModal)} className="btn-outline-danger" style={{ flex: 1 }} disabled={saving}>
                    {viewClassModal.isOneTime ? 'Видалити' : 'Видалити (Цей тиждень)'}
                  </button>
                  {!viewClassModal.isOneTime && (
                    <button onClick={() => handleDeleteForever(viewClassModal.id)} className="btn-danger" style={{ flex: 1 }} disabled={saving}>Видалити назавжди</button>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setViewClassModal(null)} className="btn-secondary" style={{ boxSizing: 'border-box', width: '100%', background: (isEditMode && isAdmin) ? '#e2e8f0' : 'transparent', color: (isEditMode && isAdmin) ? '#333' : '#64748b', marginTop: (isEditMode && isAdmin) ? '0' : '10px' }}>Закрити</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
