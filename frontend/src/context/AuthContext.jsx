import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { useNavigate } from 'react-router';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if token exists and is not expired on load
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    if (token) {
      try {
        // Decode the JWT payload (base64url) without a library
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        if (isExpired) {
          // Token has expired — clear storage so user is prompted to log in again
          localStorage.removeItem('token');
          localStorage.removeItem('email');
          localStorage.removeItem('sessionId');
        } else {
          setUser({ authenticated: true, email });
        }
      } catch {
        // Malformed token — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('sessionId');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('email', email);
      setUser({ authenticated: true, email });
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Login failed" };
    }
  };

  const register = async (email, password, dataConsent) => {
    try {
      await authApi.register(email, password, dataConsent);
      // Auto-login after register
      await login(email, password);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('email');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
