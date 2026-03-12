import React, { createContext, useState, useContext } from "react";

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
