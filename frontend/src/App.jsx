import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import Layout from './components/ui/Layout';
import Dashboard from './pages/Dashboard';
import TestSelect from './pages/TestSelect';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import KeystrokeTest from './components/tests/KeystrokeTest';
import MouseTest from './components/tests/MouseTest';
import VoiceTest from './components/tests/VoiceTest';
import TremorTest from './components/tests/TremorTest';
import HandwritingTest from './components/tests/HandwritingTest';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/test-select" element={<TestSelect />} />
            <Route path="/test/keystroke" element={<KeystrokeTest />} />
            <Route path="/test/mouse" element={<MouseTest />} />
            <Route path="/test/voice" element={<VoiceTest />} />
            <Route path="/test/tremor" element={<TremorTest />} />
            <Route path="/test/handwriting" element={<HandwritingTest />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}