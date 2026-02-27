import React, { useState } from 'react';
import '../../styles/queue.css';

// Тепер предмети "розумні" і знають своїх викладачів
const SUBJECTS_DATA = [
  { 
    name: 'Програмування', 
    teacherFull: 'Назарчук І.В.', 
    teacherG1: 'Назарчук І.В.', 
    teacherG2: 'Коваленко О.П.' 
  },
  { 
    name: 'Математичний аналіз', 
    teacherFull: 'Чаповський Ю.А.', 
    teacherG1: 'Чаповський Ю.А.', 
    teacherG2: 'Смірнов О.М.' 
  },
  { 
    name: 'Дизайн систем', 
    teacherFull: 'Андросов Д.В.', 
    teacherG1: 'Андросов Д.В.', 
    teacherG2: 'Петров І.І.' 
  },
  { 
    name: 'Теорія графів', 
    teacherFull: 'Степанюк О.І.', 
    teacherG1: 'Степанюк О.І.', 
    teacherG2: 'Кравченко В.І.' 
  }
];

const INITIAL_QUEUES = {
  full: ['Андрій', 'Іван', 'Софія'],
  group1: ['Андрій', 'Нестор'],
  group2: ['Іван', 'Олександр', 'Лідія']
};

const Queue = () => {
  const [queueType, setQueueType] = useState('full'); 
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  
  const [queues, setQueues] = useState(INITIAL_QUEUES);
  const [inQueue, setInQueue] = useState({ full: false, group1: false, group2: false });

  // Знаходимо об'єкт обраного предмета, щоб дістати викладачів
  const activeSubject = SUBJECTS_DATA.find(sub => sub.name === selectedSubjectName);

  const handleJoinQueue = (targetQueue) => {
    if (!selectedSubjectName) return alert('Спочатку оберіть предмет!');
    setQueues(prev => ({
      ...prev,
      [targetQueue]: [...prev[targetQueue], 'Я (Ви)']
    }));
    setInQueue(prev => ({ ...prev, [targetQueue]: true }));
  };

  const handleLeaveQueue = (targetQueue) => {
    setQueues(prev => ({
      ...prev,
      [targetQueue]: prev[targetQueue].filter(name => name !== 'Я (Ви)')
    }));
    setInQueue(prev => ({ ...prev, [targetQueue]: false }));
  };

  const QueueList = ({ title, listKey, data }) => (
    <div className="q-list-section">
      <h3 className="q-list-title">{title}</h3>
      
      {data.length === 0 ? (
        <div className="q-empty-text">Черга порожня</div>
      ) : (
        <div className="q-table">
          {data.map((student, idx) => (
            <div key={idx} className={`q-table-row ${student === 'Я (Ви)' ? 'my-turn' : ''}`}>
              <div className="q-row-left">
                <span className="q-row-number">{idx + 1}</span>
                <span className="q-row-name">{student}</span>
              </div>
              {student === 'Я (Ви)' && (
                <button className="q-btn-leave" onClick={() => handleLeaveQueue(listKey)}>
                  Вийти
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!inQueue[listKey] && selectedSubjectName && (
        <button className="q-btn-join" onClick={() => handleJoinQueue(listKey)}>
          ✋ Встати в чергу
        </button>
      )}
    </div>
  );

  return (
    <div className="q-wrapper">
      
      <div className="q-top-header">
        <div className="q-toggle-container">
          <div className="q-toggle" data-active={queueType}>
            <div className="q-slider"></div>
            <button 
              className={`q-toggle-btn ${queueType === 'full' ? 'active' : ''}`} 
              onClick={() => setQueueType('full')}
            >
              Повна
            </button>
            <button 
              className={`q-toggle-btn ${queueType === 'group' ? 'active' : ''}`} 
              onClick={() => setQueueType('group')}
            >
              Групова
            </button>
          </div>
        </div>
      </div>

      <div className="q-card">
        <h2 className="q-card-title">Електронна Черга</h2>
        
        <select 
          className="q-select" 
          value={selectedSubjectName} 
          onChange={(e) => setSelectedSubjectName(e.target.value)}
        >
          <option value="">Оберіть предмет...</option>
          {SUBJECTS_DATA.map(sub => (
            <option key={sub.name} value={sub.name}>{sub.name}</option>
          ))}
        </select>

        {!selectedSubjectName ? (
          <div className="q-placeholder">Оберіть предмет</div>
        ) : (
          <div className="q-active-zone">
            
            {queueType === 'full' ? (
              <QueueList 
                title={<span>Спільна черга <span className="q-teacher">({activeSubject.teacherFull})</span></span>} 
                listKey="full" 
                data={queues.full} 
              />
            ) : (
              <div className="q-group-container">
                <QueueList 
                  title={<span>Група 1 <span className="q-teacher">({activeSubject.teacherG1})</span></span>} 
                  listKey="group1" 
                  data={queues.group1} 
                />
                <QueueList 
                  title={<span>Група 2 <span className="q-teacher">({activeSubject.teacherG2})</span></span>} 
                  listKey="group2" 
                  data={queues.group2} 
                />
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};

export default Queue;