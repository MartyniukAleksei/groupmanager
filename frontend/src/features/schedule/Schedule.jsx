import React, { useState } from 'react';
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

const INITIAL_SCHEDULE = [
  {
    id: 1, day: 'monday', time: '08:30', week: 'both', isOneTime: false, classFormat: 'standard',
    items: [{ type: 'lecture', name: 'Дизайн систем машинного навчання', teacher: 'Андросов Дмитро Васильович', room: '101', link: '' }]
  },
  {
    id: 2, day: 'tuesday', time: '08:30', week: 'both', isOneTime: false, classFormat: 'standard',
    items: [{ type: 'practice', name: 'Математичний аналіз', teacher: 'Чаповський Ю.А.', room: '205-А', link: '' }]
  },
  {
    id: 3, day: 'wednesday', time: '10:25', week: 'both', isOneTime: false, classFormat: 'groups',
    items: [
      { type: 'practice', name: 'Дизайн систем (Група 1)', teacher: 'Андросов Д.В.', room: '302', link: '' },
      { type: 'practice', name: 'Дизайн систем (Група 2)', teacher: 'Петров І.І.', room: '303', link: '' }
    ]
  },
  {
    id: 4, day: 'thursday', time: '12:20', week: 'both', isOneTime: false, classFormat: 'standard',
    items: [{ type: 'lab', name: 'Програмування', teacher: 'Назарчук І.В.', room: 'Комп. клас 1', link: '' }]
  }
];

const EMPTY_FORM = { id: null, week: 'both', isOneTime: false, classFormat: 'standard', items: [{ name: '', teacher: '', room: '', type: 'lecture', link: '' }] };

const Schedule = () => {
  const [activeWeek, setActiveWeek] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [scheduleData, setScheduleData] = useState(INITIAL_SCHEDULE);
  
  const [viewClassModal, setViewClassModal] = useState(null); 
  const [addClassModal, setAddClassModal] = useState(null); 
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [currentDay, setCurrentDay] = useState(() => {
    const dayIndex = new Date().getDay(); 
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[dayIndex];
    return today === 'sunday' ? 'monday' : today; 
  });

  const handleAddSubItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { name: '', teacher: '', room: '', type: 'lecture', link: '' }] }));
  const handleUpdateSubItem = (index, field, value) => { const newItems = [...formData.items]; newItems[index][field] = value; setFormData({ ...formData, items: newItems }); };
  const handleRemoveSubItem = (index) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

  const handleFormatChange = (e) => {
    const format = e.target.value;
    setFormData(prev => ({ ...prev, classFormat: format, items: format === 'standard' ? [prev.items[0]] : prev.items }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    let finalWeek = formData.week;
    let finalIsOneTime = false;

    if (formData.week === 'once') {
      finalWeek = activeWeek;
      finalIsOneTime = true;
    }

    const classDataToSave = {
      ...formData,
      day: addClassModal.day,
      time: addClassModal.time,
      week: finalWeek,
      isOneTime: finalIsOneTime
    };

    if (formData.id) {
      setScheduleData(prev => prev.map(c => c.id === formData.id ? classDataToSave : c));
    } else {
      setScheduleData([...scheduleData, { ...classDataToSave, id: Date.now() }]);
    }
    setAddClassModal(null);
    setFormData(EMPTY_FORM); 
  };

  const handleEditClick = (classObj) => {
    setViewClassModal(null); 
    setFormData({ 
      ...classObj, 
      week: classObj.isOneTime ? 'once' : classObj.week 
    }); 
    setAddClassModal({ day: classObj.day, time: classObj.time }); 
  };

  const handleDeleteOnce = (classItem) => {
    if (classItem.week === 'both') {
      const otherWeek = activeWeek === 1 ? 2 : 1;
      setScheduleData(prev => prev.map(c => c.id === classItem.id ? { ...c, week: otherWeek } : c));
    } else {
      setScheduleData(prev => prev.filter(c => c.id !== classItem.id));
    }
    setViewClassModal(null);
  };
  const handleDeleteForever = (id) => { setScheduleData(prev => prev.filter(c => c.id !== id)); setViewClassModal(null); };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'lecture': return { text: '#047857', border: '#047857', label: 'ЛЕКЦІЯ', className: 'lecture' };
      case 'practice': return { text: '#dc2626', border: '#dc2626', label: 'ПРАКТИКА', className: 'practice' };
      case 'lab': return { text: '#a16207', border: '#a16207', label: 'ЛАБ', className: 'lab' };
      default: return { text: '#475569', border: '#475569', label: 'ІНШЕ', className: '' };
    }
  };

  return (
    <div className="sch-wrapper">
      
      {/* ВЕРХНЯ ПАНЕЛЬ: Перемикач тижнів + Кнопка редагування */}
      <div className="sch-top-header">
        
        {/* НОВИЙ ПЕРЕМИКАЧ ТИЖНІВ */}
        <div className="sch-week-toggle">
          <button 
            className={`sch-week-btn ${activeWeek === 1 ? 'active' : ''}`} 
            onClick={() => setActiveWeek(1)}
          >
            1-й Тиждень
          </button>
          <button 
            className={`sch-week-btn ${activeWeek === 2 ? 'active' : ''}`} 
            onClick={() => setActiveWeek(2)}
          >
            2-й Тиждень
          </button>
        </div>
        
        <button className={`hw-edit-btn ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>
          ✏️ <span className="btn-text" style={{ marginLeft: '6px' }}>{isEditMode ? 'Готово' : 'Редагувати'}</span>
        </button>
      </div>

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
            const classObj = scheduleData.find(c => c.day === dayObj.id && c.time === time && (c.week === 'both' || c.week === activeWeek));
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
                  const val = e.target.value;
                  setFormData({...formData, week: (val === 'both' || val === 'once') ? val : Number(val)});
                }}>
                <option value="both">Кожен тиждень</option>
                <option value={1}>Тільки 1-й тиждень</option>
                <option value={2}>Тільки 2-й тиждень</option>
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
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Зберегти</button>
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
            
            {isEditMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', marginBottom: '15px' }}>
                 <button onClick={() => handleEditClick(viewClassModal)} className="btn-primary" style={{ boxSizing: 'border-box', width: '100%' }}>✏️ Редагувати пару</button>
                 <div style={{ display: 'flex', gap: '10px' }}>
                   <button onClick={() => handleDeleteOnce(viewClassModal)} className="btn-outline-danger" style={{ flex: 1 }}>
                     {viewClassModal.isOneTime ? 'Видалити' : 'Видалити (Цей тиждень)'}
                   </button>
                   {!viewClassModal.isOneTime && (
                     <button onClick={() => handleDeleteForever(viewClassModal.id)} className="btn-danger" style={{ flex: 1 }}>Видалити назавжди</button>
                   )}
                 </div>
              </div>
            )}
            
            <button onClick={() => setViewClassModal(null)} className="btn-secondary" style={{ boxSizing: 'border-box', width: '100%', background: isEditMode ? '#e2e8f0' : 'transparent', color: isEditMode ? '#333' : '#64748b', marginTop: isEditMode ? '0' : '10px' }}>Закрити</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;