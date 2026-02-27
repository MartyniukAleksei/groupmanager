import React, { useState } from 'react';
import '../../styles/homework.css';

const DAYS = [
  { id: 'monday', label: 'ПОНЕДІЛОК', short: 'ПОН' },
  { id: 'tuesday', label: 'ВІВТОРОК', short: 'ВІВ' },
  { id: 'wednesday', label: 'СЕРЕДА', short: 'СЕР' },
  { id: 'thursday', label: 'ЧЕТВЕР', short: 'ЧЕТ' },
  { id: 'friday', label: "П'ЯТНИЦЯ", short: 'ПТ' },
  { id: 'saturday', label: 'СУБОТА', short: 'СУБ' },
];

const MOCK_SCHEDULE = [
  { day: 'monday', week: 'both', items: [{ name: 'Теорія графів' }] },
  { day: 'monday', week: 'both', items: [{ name: 'Алгебра і геометрія' }] },
  { day: 'monday', week: 'both', items: [{ name: 'Математичний аналіз' }] },
  { day: 'tuesday', week: 'both', items: [{ name: 'Алгебра і геометрія' }] },
  { day: 'wednesday', week: 1, items: [{ name: 'Дизайн систем (Група 1)' }] },
  { day: 'wednesday', week: 2, items: [{ name: 'Програмування (Лаб)' }] },
];

// Імітація бази даних тижнів від Олексія
const WEEKS_DB = [
  { id: 1, type: 1, label: 'Тиждень 10.02 - 16.02' },
  { id: 2, type: 2, label: 'Тиждень 17.02 - 23.02' },
  { id: 3, type: 1, label: 'Тиждень 24.02 - 02.03' },
  { id: 4, type: 2, label: 'Тиждень 03.03 - 09.03' },
];

// TODO: Цей ID має приходити з бекенду
const ACTUAL_CURRENT_WEEK_ID = 3; 

const Homework = () => {
  const [currentDay, setCurrentDay] = useState(() => {
    const dayIndex = new Date().getDay(); 
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[dayIndex];
    return today === 'sunday' ? 'monday' : today; 
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingWeekId, setViewingWeekId] = useState(ACTUAL_CURRENT_WEEK_ID);

  const [homeworkData, setHomeworkData] = useState({
    'wk3-monday-Алгебра і геометрія': 'Лекція 1(є запис) + перехідне дз з 1 семестру на укр.нет, за яке він колись спитає.',
    'wk3-monday-Математичний аналіз': 'Лекції 1,2 + реєстрація в клас рум.',
  });

  const handleHomeworkChange = (subjectName, text) => {
    const key = `wk${viewingWeekId}-${currentDay}-${subjectName}`;
    setHomeworkData(prev => ({ ...prev, [key]: text }));
  };

  const getSubjectsForDay = (dayId, targetWeekType) => {
    const dayClasses = MOCK_SCHEDULE.filter(c => c.day === dayId && (c.week === 'both' || c.week === targetWeekType));
    return [...new Set(dayClasses.flatMap(c => c.items.map(item => item.name)))];
  };

  const viewingWeek = WEEKS_DB.find(w => w.id === viewingWeekId);
  const activeDayObj = DAYS.find(d => d.id === currentDay);
  const activeSubjects = getSubjectsForDay(currentDay, viewingWeek.type);

  const goPrevWeek = () => { if (viewingWeekId > 1) setViewingWeekId(viewingWeekId - 1); };
  const goNextWeek = () => { if (viewingWeekId < WEEKS_DB.length) setViewingWeekId(viewingWeekId + 1); };
  const goCurrentWeek = () => { setViewingWeekId(ACTUAL_CURRENT_WEEK_ID); };

  const isNotCurrentWeek = viewingWeekId !== ACTUAL_CURRENT_WEEK_ID;

  return (
    <div className="hw-wrapper">
      
      {/* ВЕРХНЯ ПАНЕЛЬ ДІЙ: Олівець */}
      <div className="hw-header-actions">
        <button className={`hw-edit-btn ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>
          ✏️ <span className="btn-text" style={{ marginLeft: '6px' }}>{isEditMode ? 'Готово' : 'Редагувати'}</span>
        </button>
      </div>

      {/* НАВІГАЦІЯ ПО ТИЖНЯХ */}
      <div className="hw-week-nav-container">
        <div className="hw-week-nav-row">
          <button className="hw-nav-arrow" onClick={goPrevWeek} disabled={viewingWeekId === 1}>{'<'}</button>
          <div className="hw-week-title">{viewingWeek.label}</div>
          <button className="hw-nav-arrow" onClick={goNextWeek} disabled={viewingWeekId === WEEKS_DB.length}>{'>'}</button>
        </div>
        
        {/* Кнопка повернення. Займає 0 пікселів, коли її немає */}
        <div style={{ height: isNotCurrentWeek ? '28px' : '0', marginTop: isNotCurrentWeek ? '5px' : '0', overflow: 'hidden' }}>
          {isNotCurrentWeek && (
            <button className="hw-return-btn" onClick={goCurrentWeek}>
              Поверн. на пот. тиждень
            </button>
          )}
        </div>
      </div>

      {/* ПАНЕЛЬ ВИБОРУ ДНЯ */}
      <div className="hw-day-picker">
        {DAYS.map(day => (
          <button 
            key={day.id} 
            className={`hw-day-btn ${currentDay === day.id ? 'active' : ''}`}
            onClick={() => setCurrentDay(day.id)}
          >
            <span className="hw-day-full">{day.label}</span>
            <span className="hw-day-short">{day.short}</span>
          </button>
        ))}
      </div>

      {/* КАРТКА З ПРЕДМЕТАМИ */}
      <div className="hw-day-card">
        <h3 className="hw-day-title">{activeDayObj?.label}</h3>
        
        {activeSubjects.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
            На цей день пар немає 🎉
          </div>
        ) : (
          <div className="hw-subjects-list">
            {activeSubjects.map((subject, idx) => {
              const hwKey = `wk${viewingWeekId}-${currentDay}-${subject}`;
              return (
                <div key={idx} className="hw-subject-item">
                  <div className="hw-subject-name">{subject}</div>
                  <textarea 
                    className="hw-textarea" 
                    placeholder={isEditMode ? "Введіть завдання..." : "Завдань немає"}
                    value={homeworkData[hwKey] || ''}
                    onChange={(e) => handleHomeworkChange(subject, e.target.value)}
                    rows={isEditMode ? 3 : 1}
                    readOnly={!isEditMode}
                    style={{ height: !isEditMode && !homeworkData[hwKey] ? 'auto' : undefined }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Homework;