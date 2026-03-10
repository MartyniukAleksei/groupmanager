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
    <div style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Group Manager</h1>
      <p>Увійдіть, щоб керувати групами</p>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => console.log("Помилка при вході через Google")}
        />
      </div>
    </div>
  );
};

export default LoginPage;
