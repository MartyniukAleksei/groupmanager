import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchQueue, joinQueue, leaveQueue, clearQueue } from '../../api/queue';
import '../../styles/queue.css';

const Queue = () => {
  const { groupId } = useParams();
  const { token, user } = useAuth();

  const [queueType, setQueueType] = useState('full');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [queues, setQueues] = useState({ full: [], group1: [], group2: [] });
  const [inQueue, setInQueue] = useState({ full: false, group1: false, group2: false });

  // Load subjects + admin status on mount
  useEffect(() => {
    fetchQueue(token, groupId).then(({ data }) => {
      setSubjects(data.subjects);
      setIsAdmin(data.is_admin);
    });
  }, [token, groupId]);

  // Load queue state when subject changes
  useEffect(() => {
    if (!selectedSubjectName) {
      setQueues({ full: [], group1: [], group2: [] });
      setInQueue({ full: false, group1: false, group2: false });
      return;
    }
    fetchQueue(token, groupId, selectedSubjectName).then(({ data }) => {
      setQueues({ full: data.full, group1: data.group1, group2: data.group2 });
      setInQueue({
        full: data.my_queues.includes('full'),
        group1: data.my_queues.includes('group1'),
        group2: data.my_queues.includes('group2'),
      });
    });
  }, [token, groupId, selectedSubjectName]);

  const reload = async () => {
    const { data } = await fetchQueue(token, groupId, selectedSubjectName);
    setQueues({ full: data.full, group1: data.group1, group2: data.group2 });
    setInQueue({
      full: data.my_queues.includes('full'),
      group1: data.my_queues.includes('group1'),
      group2: data.my_queues.includes('group2'),
    });
  };

  const handleJoinQueue = async (targetQueue) => {
    if (!selectedSubjectName) return;
    await joinQueue(token, groupId, { subject_name: selectedSubjectName, queue_type: targetQueue });
    await reload();
  };

  const handleLeaveQueue = async (targetQueue) => {
    await leaveQueue(token, groupId, { subject_name: selectedSubjectName, queue_type: targetQueue });
    await reload();
  };

  const handleClearQueue = async (targetQueue) => {
    if (!window.confirm('Очистити чергу?')) return;
    await clearQueue(token, groupId, { subject_name: selectedSubjectName, queue_type: targetQueue });
    await reload();
  };

  const QueueList = ({ title, listKey, data }) => (
    <div className="q-list-section">
      <div className="q-list-header">
        <h3 className="q-list-title">{title}</h3>
        {isAdmin && selectedSubjectName && (
          <button className="q-btn-clear" onClick={() => handleClearQueue(listKey)}>
            🗑 Очистити
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="q-empty-text">Черга порожня</div>
      ) : (
        <div className="q-table">
          {data.map((entry, idx) => (
            <div key={entry.user_id} className={`q-table-row ${entry.user_id === user?.id ? 'my-turn' : ''}`}>
              <div className="q-row-left">
                <span className="q-row-number">{idx + 1}</span>
                <span className="q-row-name">{entry.name}</span>
              </div>
              {entry.user_id === user?.id && (
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
          {subjects.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {!selectedSubjectName ? (
          <div className="q-placeholder">Оберіть предмет</div>
        ) : (
          <div className="q-active-zone">
            {queueType === 'full' ? (
              <QueueList
                title="Спільна черга"
                listKey="full"
                data={queues.full}
              />
            ) : (
              <div className="q-group-container">
                <QueueList
                  title="Група 1"
                  listKey="group1"
                  data={queues.group1}
                />
                <QueueList
                  title="Група 2"
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
