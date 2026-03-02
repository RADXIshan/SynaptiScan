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
          localStorage.removeItem('username');
          localStorage.removeItem('sessionId');
          setLoading(false);
        } else {
          // Fetch /me to always get the latest username from the DB
          fetch('http://localhost:8000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.ok ? res.json() : null)
            .then(userData => {
              if (userData) {
                localStorage.setItem('username', userData.username || '');
                localStorage.setItem('email', userData.email || email);
                setUser({ authenticated: true, email: userData.email, username: userData.username });
              } else {
                // /me failed — use cached values
                setUser({ authenticated: true, email, username: localStorage.getItem('username') });
              }
            })
            .catch(() => {
              setUser({ authenticated: true, email, username: localStorage.getItem('username') });
            })
            .finally(() => setLoading(false));
          return; // setLoading(false) handled in the promise chain
        }
      } catch {
        // Malformed token — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('username');
        localStorage.removeItem('sessionId');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('email', email);
      // Fetch user profile to get username after login
      try {
        const meRes = await fetch('http://localhost:8000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${response.access_token}` }
        });
        if (meRes.ok) {
          const userData = await meRes.json();
          localStorage.setItem('username', userData.username);
          setUser({ authenticated: true, email, username: userData.username });
        } else {
          setUser({ authenticated: true, email });
        }
      } catch {
        setUser({ authenticated: true, email });
      }
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Login failed" };
    }
  };

  const register = async (email, password, dataConsent, username) => {
    try {
      await authApi.register(email, password, dataConsent, username);
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
    localStorage.removeItem('username');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
