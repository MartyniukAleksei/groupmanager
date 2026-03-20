import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user_session");
      return saved ? JSON.parse(saved).user : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem("user_session");
      return saved ? JSON.parse(saved).token : null;
    } catch { return null; }
  });

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem("user_session", JSON.stringify({ user: userData, token: accessToken }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user_session");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
