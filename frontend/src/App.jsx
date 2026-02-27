import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Контексты (создадим их позже)
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Лейаут
import AppLayout from "./components/layout/AppLayout";

// Страницы
import HomePage from "./pages/HomePage"; // Страница выбора/создания группы

// Фичи (заглушки для функционала из твоего HTML)
import Board from "./features/board/Board";
import Schedule from "./features/schedule/Schedule";
import Homework from "./features/homework/Homework";
import Materials from "./features/materials/Materials";
import Attendance from "./features/attendance/Attendance";
import Queue from "./features/queue/Queue";
// ДОДАНО: Імпорт нової сторінки Проектів
import Projects from "./features/projects/Projects"; 

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Глобальная страница: юзер видит свои группы или может присоединиться к новой */}
            <Route path="/" element={<HomePage />} />

            {/* Роуты конкретной группы. AppLayout содержит Header, Drawer и навигацию (табы) */}
            <Route path="/g/:groupId" element={<AppLayout />}>
              {/* Если юзер зашел просто по ссылке группы, кидаем его на доску */}
              <Route index element={<Navigate to="board" replace />} />

              {/* Вложенные роуты фичей */}
              <Route path="board" element={<Board />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="homework" element={<Homework />} />
              <Route path="materials" element={<Materials />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="queue" element={<Queue />} />
              {/* ДОДАНО: Маршрут для Проектів */}
              <Route path="projects" element={<Projects />} /> 
            </Route>

            {/* Обработка несуществующих ссылок */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;