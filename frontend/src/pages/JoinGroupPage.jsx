import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGroupPreview, joinGroup } from "../api/groups";

const JoinGroupPage = () => {
  const { joinCode } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [groupInfo, setGroupInfo] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | preview | error
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getGroupPreview(token, joinCode)
      .then((res) => {
        setGroupInfo(res.data);
        setStatus("preview");
      })
      .catch(() => setStatus("error"));
  }, [token, joinCode]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await joinGroup(token, joinCode);
      navigate(`/g/${res.data.id}/board`);
    } catch (err) {
      if (err.response?.status === 409) {
        navigate(`/g/${groupInfo.id}/board`);
      } else {
        alert("Помилка при приєднанні.");
        setJoining(false);
      }
    }
  };

  if (status === "loading") {
    return <div style={styles.center}><p>Завантаження...</p></div>;
  }

  if (status === "error") {
    return (
      <div style={styles.center}>
        <h2>Групу не знайдено</h2>
        <p>Перевірте посилання або попросіть нове у адміністратора.</p>
        <button style={styles.btn} onClick={() => navigate("/dashboard")}>
          На головну
        </button>
      </div>
    );
  }

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h2>Запрошення до групи</h2>
        <h3 style={styles.groupName}>{groupInfo.name}</h3>
        {groupInfo.description && <p style={styles.desc}>{groupInfo.description}</p>}
        <p style={styles.code}>Код: <b>{joinCode}</b></p>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => navigate("/dashboard")}>
            Скасувати
          </button>
          <button style={styles.btn} onClick={handleJoin} disabled={joining}>
            {joining ? "..." : "Приєднатись"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  center: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", fontFamily: "sans-serif", flexDirection: "column",
  },
  card: {
    background: "#fff", borderRadius: "8px", padding: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,.15)", textAlign: "center", minWidth: "300px",
  },
  groupName: { fontSize: "22px", margin: "8px 0" },
  desc: { color: "#666", marginBottom: "12px" },
  code: { color: "#999", fontSize: "14px", marginBottom: "24px" },
  actions: { display: "flex", gap: "12px", justifyContent: "center" },
  btn: {
    padding: "10px 24px", cursor: "pointer", background: "#1890ff",
    color: "#fff", border: "none", borderRadius: "5px", fontSize: "15px",
  },
  cancelBtn: {
    padding: "10px 24px", cursor: "pointer", background: "#fff",
    color: "#666", border: "1px solid #ddd", borderRadius: "5px", fontSize: "15px",
  },
};

export default JoinGroupPage;
