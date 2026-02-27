import React, { useState } from 'react';
import '../../styles/projects.css';

const SUBJECTS = [
  'Програмування Курсова',
  'Бази даних Курсова',
  'Дизайн систем',
  'Математичне моделювання'
];

const INITIAL_PROJECTS = [
  { id: 1, student: 'Sasha', subject: 'Програмування Курсова', topic: 'Гра "Вірус"' },
  { id: 2, student: 'David', subject: 'Програмування Курсова', topic: 'Гра "Життя"' },
  { id: 3, student: 'Богдан', subject: 'Програмування Курсова', topic: 'Гра "Сокобан"' },
  { id: 4, student: 'Roxanne', subject: 'Програмування Курсова', topic: 'Психологічні тести' },
  { id: 5, student: 'nastia', subject: 'Програмування Курсова', topic: 'Пакет роботи з векторами і матрицями' }
];

const Projects = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topicInput, setTopicInput] = useState('');
  
  const [projectsList, setProjectsList] = useState(INITIAL_PROJECTS);
  const [filterSubject, setFilterSubject] = useState('Всі предмети');

  const handleBookProject = (e) => {
    e.preventDefault();
    if (!selectedSubject || !topicInput.trim()) {
      return alert('Будь ласка, оберіть предмет та введіть тему!');
    }

    const newProject = {
      id: Date.now(),
      student: 'Я (Ви)', 
      subject: selectedSubject,
      topic: topicInput.trim()
    };

    setProjectsList([newProject, ...projectsList]);
    setTopicInput(''); 
  };

  const handleDelete = (id) => {
    setProjectsList(projectsList.filter(p => p.id !== id));
  };

  const displayedProjects = filterSubject === 'Всі предмети' 
    ? projectsList 
    : projectsList.filter(p => p.subject === filterSubject);

  return (
    <div className="proj-wrapper">
      
      {/* ФОРМА БРОНЮВАННЯ */}
      <div className="proj-card top-card">
        <form onSubmit={handleBookProject} className="proj-form">
          <select 
            className="proj-input" 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Оберіть предмет...</option>
            {SUBJECTS.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <input 
            type="text" 
            className="proj-input" 
            placeholder="Ваша тема проекту" 
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
          />

          <button type="submit" className="proj-btn-book">
            Забронювати
          </button>
        </form>
      </div>

      {/* ТАБЛИЦЯ ПРОЕКТІВ */}
      {/* ЗМІНЕНО КЛАС ТУТ: proj-table-card замість proj-card */}
      <div className="proj-table-card">
        
        {/* Заголовок таблиці з сірим фоном */}
        <div className="proj-table-header">
          <div className="proj-col-student">СТУДЕНТ</div>
          
          <div className="proj-col-subject-header">
            ПРЕДМЕТ
            <select 
              className="proj-filter-select" 
              value={filterSubject} 
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="Всі предмети">Всі предмети</option>
              {SUBJECTS.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="proj-col-topic">ТЕМА</div>
          <div className="proj-col-action"></div>
        </div>

        {/* Список проектів */}
        <div className="proj-list">
          {displayedProjects.length === 0 ? (
            <div className="proj-empty">Немає заброньованих тем</div>
          ) : (
            displayedProjects.map((project) => (
              <div key={project.id} className="proj-list-item">
                
                <div className="proj-col-student">
                  <div className="proj-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <span className={`proj-student-name ${project.student === 'Я (Ви)' ? 'my-project' : ''}`}>
                    {project.student}
                  </span>
                </div>

                <div className="proj-col-subject item-text">
                  {project.subject}
                </div>

                <div className="proj-col-topic item-text">
                  {project.topic}
                </div>

                <div className="proj-col-action">
                  <button className="proj-btn-delete" onClick={() => handleDelete(project.id)} title="Скасувати бронювання">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default Projects;