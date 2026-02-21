import React, { useState } from 'react';
import '../../styles/schedule.css';

// 1. ОНОВЛЕНІ ДАНІ: Додали Суботу
const DAYS = [
  { id: 'monday', label: 'ПОНЕДІЛОК' },
  { id: 'tuesday', label: 'ВІВТОРОК' },
  { id: 'wednesday', label: 'СЕРЕДА' },
  { id: 'thursday', label: 'ЧЕТВЕР' },
  { id: 'friday', label: "П'ЯТНИЦЯ" },
  { id: 'saturday', label: 'СУБОТА' },
];

// ОНОВЛЕНІ ДАНІ: 7 пар
const TIMES = ['08:30', '10:25', '12:20', '14:15', '16:10', '18:05', '19:50'];

// Універсальна структура даних. items - це масив предметів у слоті (для груп)
const INITIAL_SCHEDULE = [
  {
    id: 1, day: 'monday', time: '08:30', week: 'both', isComplex: false,
    items: [{ type: 'lecture', name: 'Теорія графів', teacher: 'Спекторський І.Я.', room: '1-201', link: 'https://zoom.us/test' }]
  },
  {
    id: 2, day: 'thursday', time: '12:20', week: 'both', isComplex: true, complexTitle: 'Програмування (Групи)',
    items: [
      { type: 'lab', name: 'Програмування. Група 1', teacher: 'Назарчук І.В.', room: '35-306', link: '' },
      { type: 'lab', name: 'Програмування. Група 2', teacher: 'Канцедал Г.О.', room: '35-306', link: '' }
    ]
  }
];

const Schedule = () => {
  const [activeWeek, setActiveWeek] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false); // РЕЖИМ РЕДАГУВАННЯ
  const [scheduleData, setScheduleData] = useState(INITIAL_SCHEDULE);
  
  const [viewClassModal, setViewClassModal] = useState(null); 
  const [addClassModal, setAddClassModal] = useState(null); 
  const [expandedCards, setExpandedCards] = useState({}); // Які картки розгорнуті

  // Стан для нової складної форми
  const [formData, setFormData] = useState({
    week: 'both',
    isComplex: false,
    complexTitle: '', // Назва для блоку (напр. "Іноземна мова (На вибір)")
    items: [{ name: '', teacher: '', room: '', type: 'lecture', link: '' }] // Масив підгруп
  });

  const toggleExpand = (e, id) => {
    e.stopPropagation(); // Щоб не відкривалась модалка перегляду
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- ЛОГІКА ДОДАВАННЯ ПАРИ ---
  const handleAddSubItem = () => {
    setFormData(prev => ({
      ...prev, items: [...prev.items, { name: '', teacher: '', room: '', type: 'lecture', link: '' }]
    }));
  };

  const handleUpdateSubItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveSubItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const newClass = {
      id: Date.now(),
      day: addClassModal.day,
      time: addClassModal.time,
      week: formData.week,
      isComplex: formData.isComplex,
      complexTitle: formData.complexTitle,
      items: formData.items
    };
    setScheduleData([...scheduleData, newClass]);
    setAddClassModal(null);
    setFormData({ week: 'both', isComplex: false, complexTitle: '', items: [{ name: '', teacher: '', room: '', type: 'lecture', link: '' }] }); 
  };

  // --- ЛОГІКА ВИДАЛЕННЯ ---
  const handleDeleteOnce = (classItem) => {
    if (classItem.week === 'both') {
      const otherWeek = activeWeek === 1 ? 2 : 1;
      setScheduleData(prev => prev.map(c => c.id === classItem.id ? { ...c, week: otherWeek } : c));
    } else {
      setScheduleData(prev => prev.filter(c => c.id !== classItem.id));
    }
    setViewClassModal(null);
  };

  const handleDeleteForever = (id) => {
    setScheduleData(prev => prev.filter(c => c.id !== id));
    setViewClassModal(null);
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'lecture': return { bg: '#e8f5e9', text: '#2e7d32', label: 'ЛЕКЦІЯ' };
      case 'practice': return { bg: '#ffebee', text: '#c62828', label: 'ПРАКТИКА' };
      case 'lab': return { bg: '#fff8e1', text: '#f57f17', label: 'ЛАБ' };
      default: return { bg: '#eee', text: '#333', label: 'ІНШЕ' };
    }
  };

  return (
    <div className="schedule-wrapper">
      
      {/* ХЕДЕР З КНОПКОЮ РЕДАГУВАННЯ */}
      <div className="schedule-header">
        <div className="week-toggle-bg">
          <button className={`week-btn ${activeWeek === 1 ? 'active' : ''}`} onClick={() => setActiveWeek(1)}>1-й Тиждень</button>
          <button className={`week-btn ${activeWeek === 2 ? 'active' : ''}`} onClick={() => setActiveWeek(2)}>2-й Тиждень</button>
        </div>
        
        <button 
          className={`edit-mode-btn ${isEditMode ? 'active' : ''}`} 
          onClick={() => setIsEditMode(!isEditMode)}
        >
          ✏️ {isEditMode ? 'Готово' : 'Редагувати'}
        </button>
      </div>

      {/* СІТКА РОЗКЛАДУ */}
      <div className="schedule-scroll-area">
        <div className="schedule-grid">
          {DAYS.map(dayObj => (
            <div key={dayObj.id} className="day-column">
              <div className="day-header">{dayObj.label}</div>

              {TIMES.map(time => {
                const classObj = scheduleData.find(c => 
                  c.day === dayObj.id && c.time === time && (c.week === 'both' || c.week === activeWeek)
                );

                return (
                  <div key={`${dayObj.id}-${time}`} className="time-slot-wrapper">
                    <div className="time-label">{time}</div>
                    
                    {classObj ? (
                      /* КАРТКА ПАРИ */
                      <div className="class-card" onClick={() => setViewClassModal(classObj)}>
                        
                        {/* Якщо це проста пара (1 предмет) */}
                        {!classObj.isComplex && classObj.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="class-type-badge" style={{ background: getTypeStyles(item.type).bg, color: getTypeStyles(item.type).text, border: `1px solid ${getTypeStyles(item.type).bg}` }}>
                              {getTypeStyles(item.type).label}
                            </span>
                            <div className="class-name">{item.name}</div>
                            <div className="class-details">
                              <span>🎓 {item.teacher}</span>
                              {item.room && <span className="class-room">📍 {item.room}</span>}
                            </div>
                          </div>
                        ))}

                        {/* Якщо це складна пара (Групи / Вибіркові) */}
                        {classObj.isComplex && (
                          <div>
                            <div className="class-name" style={{ color: '#007bff', marginBottom: '8px' }}>{classObj.complexTitle}</div>
                            
                            {/* Показуємо тільки перший елемент, якщо картка не розгорнута */}
                            {(expandedCards[classObj.id] ? classObj.items : classObj.items.slice(0, 1)).map((item, idx) => (
                              <div key={idx} className="sub-class-item">
                                <span className="class-type-badge" style={{ background: getTypeStyles(item.type).bg, color: getTypeStyles(item.type).text }}>{getTypeStyles(item.type).label}</span>
                                <div className="class-name" style={{ fontSize: '12px' }}>{item.name}</div>
                                <div className="class-details" style={{ fontSize: '10px' }}>
                                  <span>🎓 {item.teacher}</span>
                                  {item.room && <span className="class-room">📍 {item.room}</span>}
                                </div>
                              </div>
                            ))}
                            
                            <button className="complex-card-toggle" onClick={(e) => toggleExpand(e, classObj.id)}>
                              {expandedCards[classObj.id] ? 'Меньше інформації ∧' : 'Більше інформації ∨'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ПОРОЖНІЙ СЛОТ (ПОКАЗУЄМО ТІЛЬКИ В РЕЖИМІ РЕДАГУВАННЯ) */
                      isEditMode && (
                        <div className="empty-slot" onClick={() => setAddClassModal({ day: dayObj.id, time })} title="Додати пару">
                          +
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* МОДАЛКА ДОДАВАННЯ ПАРИ */}
      {addClassModal && (
        <div className="modal-overlay" onClick={() => setAddClassModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Додати пару</h3>
            <p style={{ color: '#666', fontSize: '12px' }}>{DAYS.find(d => d.id === addClassModal.day)?.label}, {addClassModal.time}</p>

            <form onSubmit={handleAddSubmit} className="modal-form">
              <select className="modal-input" value={formData.week} onChange={e => setFormData({...formData, week: e.target.value === 'both' ? 'both' : Number(e.target.value)})}>
                <option value="both">Кожен тиждень</option>
                <option value={1}>Тільки 1-й тиждень</option>
                <option value={2}>Тільки 2-й тиждень</option>
              </select>

              {/* Галочка "Пара групами / На вибір" */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                <input type="checkbox" checked={formData.isComplex} onChange={e => setFormData({...formData, isComplex: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                Складна пара (Розділення на групи / Предмети на вибір)
              </label>

              {formData.isComplex && (
                <input className="modal-input" type="text" placeholder="Спільна назва (напр. 'Іноземна мова')" required value={formData.complexTitle} onChange={e => setFormData({...formData, complexTitle: e.target.value})} />
              )}

              {/* Рендеримо підгрупи */}
              <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '5px' }}>
                {formData.items.map((item, index) => (
                  <div key={index} className="sub-item-box">
                    {formData.isComplex && formData.items.length > 1 && (
                      <button type="button" className="remove-sub-btn" onClick={() => handleRemoveSubItem(index)}>✕</button>
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#007bff' }}>{formData.isComplex ? `Підгрупа / Предмет ${index + 1}` : 'Деталі пари'}</div>
                    
                    <input className="modal-input" type="text" placeholder="Назва предмета/групи" required value={item.name} onChange={e => handleUpdateSubItem(index, 'name', e.target.value)} />
                    
                    <div className="form-row">
                      <input className="modal-input" type="text" placeholder="Викладач" required value={item.teacher} onChange={e => handleUpdateSubItem(index, 'teacher', e.target.value)} />
                      <input className="modal-input" type="text" placeholder="Аудиторія (напр. 35-10)" value={item.room} onChange={e => handleUpdateSubItem(index, 'room', e.target.value)} style={{ width: '120px' }} />
                    </div>
                    
                    <div className="form-row">
                      <select className="modal-input" value={item.type} onChange={e => handleUpdateSubItem(index, 'type', e.target.value)}>
                        <option value="lecture">Лекція</option>
                        <option value="practice">Практика</option>
                        <option value="lab">Лабораторна</option>
                      </select>
                      <input className="modal-input" type="url" placeholder="Zoom/Meet" value={item.link} onChange={e => handleUpdateSubItem(index, 'link', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              {formData.isComplex && (
                <button type="button" className="btn-secondary" onClick={handleAddSubItem}>+ Додати ще групу/предмет</button>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setAddClassModal(null)} className="btn-secondary" style={{ flex: 1 }}>Скасувати</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПЕРЕГЛЯДУ ПАРИ */}
      {viewClassModal && (
        <div className="modal-overlay" onClick={() => setViewClassModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            {viewClassModal.isComplex && <h2 style={{ color: '#007bff' }}>{viewClassModal.complexTitle}</h2>}
            
            {viewClassModal.items.map((item, idx) => (
              <div key={idx} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '15px', textAlign: 'left' }}>
                <span className="class-type-badge" style={{ background: getTypeStyles(item.type).bg, color: getTypeStyles(item.type).text }}>{getTypeStyles(item.type).label}</span>
                <h3 style={{ margin: '5px 0' }}>{item.name}</h3>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#555' }}>🎓 {item.teacher}</p>
                {item.room && <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#007bff' }}>📍 Аудиторія: {item.room}</p>}
                
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '8px', fontSize: '14px' }}>Увійти 🔗</a>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '20px 0' }}>
               <button onClick={() => handleDeleteOnce(viewClassModal)} className="btn-outline-danger">Видалити (Тільки цей тиждень)</button>
               <button onClick={() => handleDeleteForever(viewClassModal.id)} className="btn-danger">Видалити назавжди</button>
            </div>
            <button onClick={() => setViewClassModal(null)} className="btn-secondary" style={{ width: '100%' }}>Закрити</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;