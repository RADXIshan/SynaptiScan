import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authApi = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username'
    formData.append('password', password);
    const response = await api.post('auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  register: async (email, password, data_consent = true) => {
    const response = await api.post('auth/register', {
      email,
      password,
      data_consent
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
  },

  updatePassword: async (old_password, new_password) => {
    const response = await api.put('auth/password', {
      old_password,
      new_password
    });
    return response.data;
  }
};

export const dashboardApi = {
  getSummary: async () => {
    const response = await api.get('dashboard/summary');
    return response.data;
  }
};

export const ingestionApi = {
  createSession: async () => {
    const response = await api.post('ingestion/sessions');
    if (response.data.id) {
        localStorage.setItem('sessionId', response.data.id);
    }
    return response.data;
  },

  uploadVoice: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);
    
    // Stub until the backend has the actual endpoint perfectly aligned.
    try {
      const response = await api.post('ingestion/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (e) {
      console.log("Mock uploaded Voice", file.size, "bytes");
      return { status: "success", mock_score: 0.1 };
    }
  },
  
  uploadKeystroke: async (sessionId, payload) => {
    const formData = new URLSearchParams();
    formData.append('session_id', sessionId);
    formData.append('payload', JSON.stringify(payload));
    
    try {
      const response = await api.post('ingestion/keystroke', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data;
    } catch(e) {
      console.log("Mock uploaded Keystroke", payload);
      return { status: "success", mock_score: 0.2 };
    }
  },
  
  uploadMouse: async (sessionId, payload) => {
    const formData = new URLSearchParams();
    formData.append('session_id', sessionId);
    formData.append('payload', JSON.stringify(payload));
    const response = await api.post('ingestion/mouse', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },
  
  uploadTremor: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);
    const response = await api.post('ingestion/tremor', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  uploadHandwriting: async (sessionId, payload) => {
    const formData = new URLSearchParams();
    formData.append('session_id', sessionId);
    formData.append('payload', JSON.stringify(payload));
    const response = await api.post('ingestion/handwriting', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }
};

export default api;
