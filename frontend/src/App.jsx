import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// В реальном проекте вы будете импортировать страницы из папки pages
// import HomePage from "./pages/Home";

function App() {
  return (
    <Router>
      <div style={{ padding: "20px" }}>
        {/* Навигация (меню) */}
        <nav>
          <Link to="/" style={{ marginRight: "10px" }}>
            Главная
          </Link>
          <Link to="/about">О нас</Link>
        </nav>

        <hr />

        {/* Здесь меняются страницы */}
        <Routes>
          <Route path="/" element={
            <div>
            <h1>Главная страница (Dashboard)</h1>
            <h2>Тестовий рядочок</h2>
          </div>
          }/>
          <Route
            path="/about"
            element={<h1>О проекте (Сделано 2 разработчиками)</h1>}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
