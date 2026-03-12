import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import JoinGroupPage from "./pages/JoinGroupPage";
import AppLayout from "./components/layout/AppLayout";
import Board from "./features/board/Board";
import Schedule from "./features/schedule/Schedule";
import Homework from "./features/homework/Homework";
import Materials from "./features/materials/Materials";
import Attendance from "./features/attendance/Attendance";
import Queue from "./features/queue/Queue";
import Links from "./features/links/Links";
import Students from "./features/students/Students";
import Topics from "./features/topics/Topics";

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:joinCode"
        element={
          <ProtectedRoute>
            <JoinGroupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/g/:groupId"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="board" replace />} />
        <Route path="board" element={<Board />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="homework" element={<Homework />} />
        <Route path="materials" element={<Materials />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="queue" element={<Queue />} />
        <Route path="links" element={<Links />} />
        <Route path="students" element={<Students />} />
        <Route path="topics" element={<Topics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
