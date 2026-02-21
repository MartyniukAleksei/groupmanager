import React, { useState } from 'react';

// =========================================
// 1. ПІДКЛЮЧЕННЯ (СТИЛІВ)
// =========================================
// Рядок нижче каже: "Візьми всі класи з файлу schedule.css і застосуй їх тут".
import '../../styles/schedule.css';

// =========================================
// 2. СТАТИЧНІ ДАНІ (КОНСТАНТИ)
// =========================================
// Це дані, які ніколи не змінюються в процесі роботи. 
// Вони потрібні, щоб намалювати сітку таблиці (5 колонок та 5 рядків часу).

const DAYS = [
  { id: 'monday', label: 'ПОНЕДІЛОК' },
  { id: 'tuesday', label: 'ВІВТОРОК' },
  { id: 'wednesday', label: 'СЕРЕДА' },
  { id: 'thursday', label: 'ЧЕТВЕР' },
  { id: 'friday', label: "П'ЯТНИЦЯ" },
];

const TIMES = ['08:30', '10:25', '12:20', '14:15', '16:10'];

// Початкові фейкові дані розкладу (щоб таблиця не була порожньою).
// Пізніше ми видалимо це і будемо тягнути реальні дані з бекенда (FastAPI).
const INITIAL_SCHEDULE = [
  { id: 1, day: 'monday', time: '08:30', week: 'both', type: 'lecture', name: 'Теорія графів', teacher: 'Спекторський І.Я.', link: 'https://zoom.us/test' },
  { id: 2, day: 'tuesday', time: '08:30', week: 1, type: 'practice', name: 'Алгебра і геометрія', teacher: 'Подколзін Г.Б.', link: '' },
  { id: 3, day: 'wednesday', time: '12:20', week: 'both', type: 'lab', name: 'Програмування', teacher: 'Назарчук І.В.', link: '' },
];


// =========================================
// 3. ГОЛОВНИЙ КОМПОНЕНТ
// =========================================
const Schedule = () => {
  // --- ПАМ'ЯТЬ КОМПОНЕНТА (State) ---
  // useState дозволяє React запам'ятовувати дані і миттєво оновлювати екран, коли вони змінюються.

  const [activeWeek, setActiveWeek] = useState(1); // Пам'ятає, який зараз обрано тиждень (1 або 2)
  const [scheduleData, setScheduleData] = useState(INITIAL_SCHEDULE); // Пам'ятає весь список пар
  
  // Ці два стани відповідають за те, чи відкриті зараз модальні вікна (попапи)
  const [viewClassModal, setViewClassModal] = useState(null); // Якщо тут об'єкт пари — відкриється вікно перегляду
  const [addClassModal, setAddClassModal] = useState(null); // Якщо тут є {day, time} — відкриється вікно додавання

  // Цей стан пам'ятає все, що ти вводиш у форму додавання нової пари
  const [formData, setFormData] = useState({
    name: '', teacher: '', type: 'lecture', link: '', week: 'both'
  });


  // --- ФУНКЦІЇ (ЛОГІКА) ---

  // Функція, яка спрацьовує, коли ти натискаєш кнопку "Додати" у формі
  const handleAddSubmit = (e) => {
    e.preventDefault(); // Забороняє сторінці перезавантажуватись (стандартна поведінка форм)
    
    // Створюємо нову пару з унікальним ID (поточний час у мілісекундах)
    const newClass = {
      id: Date.now(),
      day: addClassModal.day,
      time: addClassModal.time,
      ...formData // Беремо всі дані з форми (назву, викладача, тип)
    };
    
    setScheduleData([...scheduleData, newClass]); // Додаємо нову пару до старого списку
    setAddClassModal(null); // Закриваємо модалку
    setFormData({ name: '', teacher: '', type: 'lecture', link: '', week: 'both' }); // Очищуємо форму
  };

  // Функція для видалення пари "Тільки на цей тиждень"
  const handleDeleteOnce = (classItem) => {
    if (classItem.week === 'both') {
      // Якщо пара була на обидва тижні, ми залишаємо її тільки на іншому тижні
      const otherWeek = activeWeek === 1 ? 2 : 1;
      setScheduleData(prev => prev.map(c => c.id === classItem.id ? { ...c, week: otherWeek } : c));
    } else {
      // Якщо вона і так була тільки на цей тиждень, видаляємо повністю
      setScheduleData(prev => prev.filter(c => c.id !== classItem.id));
    }
    setViewClassModal(null); // Закриваємо модалку
  };

  // Функція для повного видалення пари назавжди
  const handleDeleteForever = (id) => {
    setScheduleData(prev => prev.filter(c => c.id !== id)); // Фільтруємо список: залишаємо всі пари, крім цієї
    setViewClassModal(null); // Закриваємо модалку
  };

  // Функція-помічник: підбирає правильні кольори та текст залежно від типу пари
  const getTypeStyles = (type) => {
    switch (type) {
      case 'lecture': return { bg: '#e8f5e9', text: '#2e7d32', label: 'ЛЕКЦІЯ' };
      case 'practice': return { bg: '#ffebee', text: '#c62828', label: 'ПРАКТИКА' };
      case 'lab': return { bg: '#fff8e1', text: '#f57f17', label: 'ЛАБ' };
      default: return { bg: '#eee', text: '#333', label: 'ІНШЕ' };
    }
  };


  // =========================================
  // 4. ВІЗУАЛЬНА ЧАСТИНА (Що малюється на екрані)
  // =========================================
  return (
    <div className="schedule-wrapper">
      
      {/* --- БЛОК 1: Кнопки перемикання тижнів --- */}
      <div className="week-toggle-container">
        <div className="week-toggle-bg">
          <button 
            className={`week-btn ${activeWeek === 1 ? 'active' : ''}`}
            onClick={() => setActiveWeek(1)} // При кліку міняємо активний тиждень на 1
          >
            1-й Тиждень
          </button>
          <button 
            className={`week-btn ${activeWeek === 2 ? 'active' : ''}`}
            onClick={() => setActiveWeek(2)} // При кліку міняємо активний тиждень на 2
          >
            2-й Тиждень
          </button>
        </div>
      </div>

      {/* --- БЛОК 2: Сітка розкладу (Зі скролом для мобілок) --- */}
      <div className="schedule-scroll-area">
        <div className="schedule-grid">
          
          {/* Ми беремо масив DAYS і для кожного дня створюємо колонку */}
          {DAYS.map(dayObj => (
            <div key={dayObj.id} className="day-column">
              <div className="day-header">{dayObj.label}</div> {/* Виводимо "ПОНЕДІЛОК" */}

              {/* Далі всередині дня беремо масив TIMES і малюємо слоти часу */}
              {TIMES.map(time => {
                
                // Шукаємо, чи є в нашій пам'яті (scheduleData) пара на ЦЕЙ день, на ЦЕЙ час і на ЦЕЙ тиждень
                const classObj = scheduleData.find(c => 
                  c.day === dayObj.id && 
                  c.time === time && 
                  (c.week === 'both' || c.week === activeWeek)
                );

                return (
                  <div key={`${dayObj.id}-${time}`} className="time-slot-wrapper">
                    <div className="time-label">{time}</div> {/* Виводимо час, напр. "08:30" */}
                    
                    {classObj ? (
                      /* ЯКЩО ПАРА Є: Малюємо її картку */
                      <div className="class-card" onClick={() => setViewClassModal(classObj)}>
                        <span 
                          className="class-type-badge"
                          style={{ background: getTypeStyles(classObj.type).bg, color: getTypeStyles(classObj.type).text, border: `1px solid ${getTypeStyles(classObj.type).bg}` }}
                        >
                          {getTypeStyles(classObj.type).label}
                        </span>
                        <div className="class-name">{classObj.name}</div>
                        <div className="class-teacher">{classObj.teacher}</div>
                      </div>
                    ) : (
                      /* ЯКЩО ПАРИ НЕМАЄ: Малюємо порожній слот з плюсиком */
                      <div className="empty-slot" onClick={() => setAddClassModal({ day: dayObj.id, time })} title="Додати пару">
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>


      {/* --- БЛОК 3: МОДАЛКА ПЕРЕГЛЯДУ ПАРИ --- */}
      {/* Цей шматок коду з'являється тільки тоді, коли viewClassModal не дорівнює null */}
      {viewClassModal && (
        <div className="modal-overlay" onClick={() => setViewClassModal(null)}> {/* Клік по темному фону закриває вікно */}
          <div className="modal-content" onClick={e => e.stopPropagation()}> {/* Забороняємо закриття при кліку на саму білу модалку */}
            
            <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '15px', color: '#333' }}>
              {getTypeStyles(viewClassModal.type).label}
            </div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>{viewClassModal.name}</h2>
            <p style={{ color: '#666', margin: '0 0 25px 0', fontSize: '14px' }}>{viewClassModal.teacher}</p>

            {/* Якщо є лінк на Зум — показуємо кнопку, якщо ні — просто текст */}
            {viewClassModal.link ? (
               <a href={viewClassModal.link} target="_blank" rel="noreferrer" className="btn-primary" style={{marginBottom: '20px'}}>
                 Увійти 🔗
               </a>
            ) : (
               <div style={{ padding: '14px', background: '#f8f9fa', color: '#666', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>
                 Посилання не додано
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
               <button onClick={() => handleDeleteOnce(viewClassModal)} className="btn-outline-danger">
                 Видалити (Тільки цей тиждень)
               </button>
               <button onClick={() => handleDeleteForever(viewClassModal.id)} className="btn-danger">
                 Видалити назавжди
               </button>
            </div>

            <button onClick={() => setViewClassModal(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold' }}>
              Закрити
            </button>
          </div>
        </div>
      )}


      {/* --- БЛОК 4: МОДАЛКА ДОДАВАННЯ ПАРИ --- */}
      {/* З'являється, коли ми клікнули на порожній слот і в addClassModal записався день і час */}
      {addClassModal && (
        <div className="modal-overlay" onClick={() => setAddClassModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Додати пару</h3>
            <p style={{ color: '#666', fontSize: '12px' }}>
              {DAYS.find(d => d.id === addClassModal.day)?.label}, {addClassModal.time}
            </p>

            {/* Форма: коли натискаємо "Додати", спрацьовує handleAddSubmit */}
            <form onSubmit={handleAddSubmit} className="modal-form">
              {/* onChange записує кожну введену літеру в пам'ять formData */}
              <input className="modal-input" type="text" placeholder="Назва предмета" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="modal-input" type="text" placeholder="ПІБ Викладача" required value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} />
              <input className="modal-input" type="url" placeholder="Посилання (Zoom/Meet)" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
              
              <select className="modal-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="lecture">Лекція</option>
                <option value="practice">Практика</option>
                <option value="lab">Лабораторна</option>
              </select>

              <select className="modal-input" value={formData.week} onChange={e => setFormData({...formData, week: e.target.value === 'both' ? 'both' : Number(e.target.value)})}>
                <option value="both">Кожен тиждень</option>
                <option value={1}>Тільки 1-й тиждень</option>
                <option value={2}>Тільки 2-й тиждень</option>
              </select>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setAddClassModal(null)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Скасувати</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Додати</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
