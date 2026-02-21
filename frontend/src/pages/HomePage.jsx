import React from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <main style={{ padding: "20px", textAlign: "center" }}>
      <h1>Ваші Групи</h1>
      <button
        className="btn-main"
        onClick={() => navigate("/g/kpi-sa-11/board")}
        style={{ maxWidth: "300px", margin: "0 auto" }}
      >
        Перейти в СА-11
      </button>
    </main>
  );
};

export default HomePage;
