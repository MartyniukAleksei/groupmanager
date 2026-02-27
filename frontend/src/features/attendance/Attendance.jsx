import React, { useState } from 'react';
import '../../styles/attendance.css';

const DAYS = [
  { id: 'monday', label: 'Понеділок', short: 'ПОН' },
  { id: 'tuesday', label: 'Вівторок', short: 'ВІВ' },
  { id: 'wednesday', label: 'Середа', short: 'СЕР' },
  { id: 'thursday', label: 'Четвер', short: 'ЧЕТ' },
  { id: 'friday', label: "П'ятниця", short: 'ПТ' },
  { id: 'saturday', label: 'Субота', short: 'СУБ' },
];

const INITIAL_ATTENDANCE = [
  {
    id: 1, day: 'monday', weekOffset: 0, subject: 'Теорія графів', time: '08:30',
    userVote: 'online', 
    online: ['Я (Ви)', 'Andrii', 'David', 'George', 'Ivan', 'Lida', 'Nestor', 'Roxanne', 'Sasha', 'Sophie', 'annziii', 'egor', 'nliakk', 'zelka', 'zoriana', 'Іва', 'Ігор', 'Богдан', 'Дмитро', 'Лєша', 'Максим', 'Уля'],
    offline: [],
    absent: []
  },
  {
    id: 2, day: 'monday', weekOffset: 0, subject: 'Алгебра і геометрія', time: '10:25',
    userVote: null, 
    online: ['Andrii', 'David', 'Ivan', 'Lida', 'Nestor', 'Sasha', 'Богдан', 'Дмитро', 'Лєша', 'Максим'],
    offline: ['egor', 'nliakk', 'zelka', 'Іва'],
    absent: []
  },
  {
    id: 3, day: 'wednesday', weekOffset: 1, subject: 'Дизайн систем (Майбутнє)', time: '12:20',
    userVote: null, 
    online: ['Andrii', 'Богдан'],
    offline: [],
    absent: []
  }
];

const getDayIndex = (dayId) => {
  const map = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
  return map[dayId];
};

// --- КОМПОНЕНТ КАТЕГОРІЇ ---
const CategoryItem = ({ label, type, students, totalStudents, userVote, canVote, onVote }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasStudents = students.length > 0;
  const isMyVote = userVote === type;

  const percent = totalStudents > 0 ? Math.round((students.length / totalStudents) * 100) + '%' : '0%';

  // Клік по всьому рядку ТІЛЬКИ для голосування
  const handleRowClick = () => {
    if (!canVote) return; // Якщо не можна голосувати - нічого не робимо
    onVote(type);
  };

  // Клік спеціально по оку ТІЛЬКИ для розгортання
  const handleEyeClick = (e) => {
    e.stopPropagation(); // Зупиняє подію, щоб не зарахувався голос при кліку на око
    if (hasStudents) setIsExpanded(!isExpanded);
  };

  // Підбираємо колір за твоїм новим правилом
  let bgClass = 'att-cat-gray';
  if (isMyVote) {
    if (type === 'online' || type === 'offline') bgClass = 'att-cat-green';
    if (type === 'absent') bgClass = 'att-cat-red';
  }

  return (
    <div 
      className={`att-category ${bgClass} ${canVote ? 'clickable' : ''}`} 
      onClick={handleRowClick}
    >
      <div className="att-category-header">
        <span className="att-cat-label">{label}</span>
        
        <div className="att-cat-stats">
          <span className="att-cat-percent">{percent}</span>
          
          {/* Бейджик з оком - тепер це єдина кнопка для розгортання */}
          <div className="att-eye-badge" onClick={handleEyeClick} title="Переглянути список">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3" fill="#9f1239"></circle>
            </svg>
            <span style={{ marginLeft: '4px' }}>{students.length}</span>
          </div>
        </div>
      </div>

      {/* Список студентів */}
      {isExpanded && hasStudents && (
        <div className="att-students-grid" onClick={(e) => e.stopPropagation()}>
          {students.map((student, idx) => (
            <div key={idx} className="att-student-item">
              <div className="att-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <span className="att-student-name" style={{ fontWeight: student === 'Я (Ви)' ? 800 : 400 }}>
                {student}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Attendance = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendanceData, setAttendanceData] = useState(INITIAL_ATTENDANCE);
  
  const [currentDay, setCurrentDay] = useState(() => {
    const dayIndex = new Date().getDay();
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[dayIndex];
    return today === 'sunday' ? 'monday' : today;
  });

  const actualDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  const actualDayIdx = getDayIndex(actualDayName);
  
  const canVoteNow = weekOffset < 0 || (weekOffset === 0 && getDayIndex(currentDay) <= actualDayIdx);

  const handleVote = (classId, newVoteType) => {
    setAttendanceData(prev => prev.map(item => {
      if (item.id !== classId) return item;

      const isRemoving = item.userVote === newVoteType;
      const finalVoteType = isRemoving ? null : newVoteType;

      const cleanOnline = item.online.filter(name => name !== 'Я (Ви)');
      const cleanOffline = item.offline.filter(name => name !== 'Я (Ви)');
      const cleanAbsent = item.absent.filter(name => name !== 'Я (Ви)');

      if (finalVoteType === 'online') cleanOnline.unshift('Я (Ви)');
      if (finalVoteType === 'offline') cleanOffline.unshift('Я (Ви)');
      if (finalVoteType === 'absent') cleanAbsent.unshift('Я (Ви)');

      return {
        ...item,
        userVote: finalVoteType,
        online: cleanOnline,
        offline: cleanOffline,
        absent: cleanAbsent
      };
    }));
  };

  const getWeekDates = (offset) => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(date.setDate(diff));
    monday.setDate(monday.getDate() + offset * 7); 
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6); 
    const format = (d) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return (
      <>
        <span className="att-hide-mobile">Тиждень </span>
        {format(monday)} - {format(sunday)}
      </>
    );
  };

  const activeClasses = attendanceData.filter(
    (item) => item.day === currentDay && item.weekOffset === weekOffset
  );

  return (
    <div className="att-wrapper">
      
      {/* ВЕРХНЯ ПАНЕЛЬ: Пилюля тижнів */}
      <div className="att-top-header">
        <div className="att-week-toggle-container">
          <div className="att-week-toggle">
            <button className="att-week-btn side-btn" onClick={() => setWeekOffset(prev => prev - 1)}>
              Минулий
            </button>
            <button className="att-week-btn center-active" onClick={() => setWeekOffset(0)} title="На поточний">
              {getWeekDates(weekOffset)}
            </button>
            <button className="att-week-btn side-btn" onClick={() => setWeekOffset(prev => prev + 1)}>
              Наступний
            </button>
          </div>
        </div>
      </div>

      {/* ПАНЕЛЬ ВИБОРУ ДНЯ */}
      <div className="att-day-picker">
        {DAYS.map((day) => (
          <button 
            key={day.id} 
            className={`att-day-btn ${currentDay === day.id ? 'active' : ''}`}
            onClick={() => setCurrentDay(day.id)}
          >
            <span className="att-day-full">{day.label.toUpperCase()}</span>
            <span className="att-day-short">{day.short}</span>
          </button>
        ))}
      </div>

      {!canVoteNow && (
        <div className="att-future-warning">
          ⏳ Це заняття в майбутньому. Голосування ще не відкрито.
        </div>
      )}

      {/* СПИСОК КАРТОК ЯВКИ */}
      <div className="att-content">
        {activeClasses.length === 0 ? (
          <div className="att-empty-state">
            🎉 На цей день пар немає!
          </div>
        ) : (
          <div className="att-list">
            {activeClasses.map((item) => {
              const total = item.online.length + item.offline.length + item.absent.length;

              return (
                <div key={item.id} className="att-card">
                  <div className="att-card-header">
                    <h2 className="att-subject-title">{item.subject}</h2>
                    <span className="att-time">({item.time})</span>
                  </div>

                  <div className="att-categories-list">
                    <CategoryItem 
                      label="Я онлайн" type="online" students={item.online} 
                      totalStudents={total} userVote={item.userVote} 
                      canVote={canVoteNow} onVote={(type) => handleVote(item.id, type)} 
                    />
                    <CategoryItem 
                      label="Я оффлайн" type="offline" students={item.offline} 
                      totalStudents={total} userVote={item.userVote} 
                      canVote={canVoteNow} onVote={(type) => handleVote(item.id, type)} 
                    />
                    <CategoryItem 
                      label="Мене немає" type="absent" students={item.absent} 
                      totalStudents={total} userVote={item.userVote} 
                      canVote={canVoteNow} onVote={(type) => handleVote(item.id, type)} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Attendance;