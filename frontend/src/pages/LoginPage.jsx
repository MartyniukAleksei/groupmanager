import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API}/auth/google`, {
        token: credentialResponse.credential,
      });
      login(res.data.user, res.data.access_token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Помилка авторизації:", error);
      alert("Не вдалося увійти. Перевірте консоль.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-box" style={{ justifyContent: "center", marginBottom: "12px" }}>
          <div className="logo-square"></div>
          <span style={{ fontSize: 22, fontWeight: 700 }}>GroupManager</span>
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", marginTop: 4 }}>
          Увійдіть, щоб керувати групами
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.log("Помилка при вході через Google")}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
