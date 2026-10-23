import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('healpath_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('healpath_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    const userData = {
      username,
      role: res.role,
      name: res.name,
      doctor_id: res.doctor_id,
    };
    setToken(res.access_token);
    setUser(userData);
    localStorage.setItem('healpath_token', res.access_token);
    localStorage.setItem('healpath_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('healpath_token');
    localStorage.removeItem('healpath_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
