import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAttendance, castVote } from '../../api/attendance';
import '../../styles/attendance.css';

const DAYS = [
  { id: 'monday', label: 'Понеділок', short: 'ПОН' },
  { id: 'tuesday', label: 'Вівторок', short: 'ВІВ' },
  { id: 'wednesday', label: 'Середа', short: 'СЕР' },
  { id: 'thursday', label: 'Четвер', short: 'ЧЕТ' },
  { id: 'friday', label: "П'ятниця", short: 'ПТ' },
  { id: 'saturday', label: 'Субота', short: 'СУБ' },
];

const DAY_IDX_MAP = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5 };

const getDateForDay = (dayId, offset) => {
  const today = new Date();
  const dow = today.getDay();
  const mondayDiff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDiff + offset * 7);
  monday.setDate(monday.getDate() + (DAY_IDX_MAP[dayId] ?? 0));
  return monday.toISOString().split('T')[0];
};

const CategoryItem = ({ label, type, students, totalStudents, userVote, canVote, onVote, currentUserId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasStudents = students.length > 0;
  const isMyVote = userVote === type;

  const percent = totalStudents > 0 ? Math.round((students.length / totalStudents) * 100) + '%' : '0%';

  const handleRowClick = () => {
    if (!canVote) return;
    onVote(type);
  };

  const handleEyeClick = (e) => {
    e.stopPropagation();
    if (hasStudents) setIsExpanded(!isExpanded);
  };

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

          <div className="att-eye-badge" onClick={handleEyeClick} title="Переглянути список">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3" fill="#9f1239"></circle>
            </svg>
            <span style={{ marginLeft: '4px' }}>{students.length}</span>
          </div>
        </div>
      </div>

      {isExpanded && hasStudents && (
        <div className="att-students-grid" onClick={(e) => e.stopPropagation()}>
          {students.map((student) => (
            <div key={student.id} className="att-student-item">
              <div className="att-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>
              <span className="att-student-name" style={{ fontWeight: student.id === currentUserId ? 800 : 400 }}>
                {student.name}{student.id === currentUserId ? ' (Ви)' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Attendance = () => {
  const { groupId } = useParams();
  const { token, user } = useAuth();

  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [canVote, setCanVote] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentDay, setCurrentDay] = useState(() => {
    const dayIndex = new Date().getDay();
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[dayIndex];
    return today === 'sunday' ? 'monday' : today;
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const dateStr = getDateForDay(currentDay, weekOffset);
        const { data } = await fetchAttendance(token, groupId, dateStr);
        setSessions(data.sessions);
        setCanVote(data.can_vote);
      } catch (e) {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, groupId, currentDay, weekOffset]);

  const handleVote = async (sessionId, voteType) => {
    const session = sessions.find(s => s.id === sessionId);
    const newType = session.user_vote === voteType ? null : voteType;
    try {
      const { data } = await castVote(token, groupId, sessionId, newType);
      setSessions(prev => prev.map(s => s.id === sessionId ? data : s));
    } catch (e) {
      console.error(e);
    }
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

  return (
    <div className="att-wrapper">

      <div className="att-top-header">
        <div className="att-week-toggle-container">
          <div className="att-week-toggle">
            <button className="att-week-btn side-btn" onClick={() => setWeekOffset(prev => prev - 1)}>
              Минулий
            </button>
            <button className="att-week-btn center-active" onClick={() => setWeekOffset(0)} title="На поточний">
              {getWeekDates(weekOffset)}
            </button>
          </div>
          {weekOffset < 0 && (
            <button className="att-current-week-btn" onClick={() => setWeekOffset(0)}>
              ↩ На поточний тиждень
            </button>
          )}
        </div>
      </div>

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

      {!canVote && (
        <div className="att-future-warning">
          ⏳ Це заняття в майбутньому. Голосування ще не відкрито.
        </div>
      )}

      <div className="att-content">
        {loading ? (
          <div className="att-empty-state">Завантаження...</div>
        ) : sessions.length === 0 ? (
          <div className="att-empty-state">
            🎉 На цей день пар немає!
          </div>
        ) : (
          <div className="att-list">
            {sessions.map((item) => {
              const total = item.online.length + item.offline.length + item.absent.length;
              return (
                <div key={item.id} className="att-card">
                  <div className="att-card-header">
                    <h2 className="att-subject-title">{item.subject_name}</h2>
                    <span className="att-time">({item.time})</span>
                  </div>

                  <div className="att-categories-list">
                    <CategoryItem
                      label="Я онлайн" type="online" students={item.online}
                      totalStudents={total} userVote={item.user_vote}
                      canVote={canVote} onVote={(type) => handleVote(item.id, type)}
                      currentUserId={user?.id}
                    />
                    <CategoryItem
                      label="Я оффлайн" type="offline" students={item.offline}
                      totalStudents={total} userVote={item.user_vote}
                      canVote={canVote} onVote={(type) => handleVote(item.id, type)}
                      currentUserId={user?.id}
                    />
                    <CategoryItem
                      label="Мене немає" type="absent" students={item.absent}
                      totalStudents={total} userVote={item.user_vote}
                      canVote={canVote} onVote={(type) => handleVote(item.id, type)}
                      currentUserId={user?.id}
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
