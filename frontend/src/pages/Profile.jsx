import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, AlertTriangle, Loader2, Lock, X, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Password edit state
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await fetch('http://localhost:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data_consent: !user.data_consent })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/auth/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem('token');
      localStorage.removeItem('sessionId');
      navigate('/');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await authApi.updatePassword(oldPassword, newPassword);
      setPasswordSuccess("Password updated successfully.");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsEditingPassword(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || "Failed to update password. Please check your old password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setIsEditingPassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Profile Settings</h1>
        <p className="text-slate-600 text-lg">Manage your account and data preferences.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Account Details */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-3xl p-8 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <User className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-semibold text-slate-900">Account Details</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Mail className="text-slate-400" size={20} />
                <span className="text-slate-900 font-medium">{user?.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Password</label>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Lock className="text-slate-400" size={20} />
                  <span className="text-slate-900 font-medium tracking-widest text-lg leading-none mt-1">••••••••</span>
                </div>
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="cursor-pointer text-sm text-emerald-600 font-medium hover:text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors"
                >
                  Edit Password
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Member Since</label>
              <div className="p-4 rounded-xl text-slate-700 bg-slate-50 border border-slate-200 inline-block w-full">
                {new Date(user?.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-3xl p-8 border border-rose-100 bg-rose-50/50 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="text-rose-600" size={24} />
            <h2 className="text-2xl font-semibold text-rose-900">Danger Zone</h2>
          </div>
          
          <p className="text-rose-700/80 mb-6 leading-relaxed max-w-xl">
            Permanently delete your account and all associated screening data. This action is irreversible and all historical trend data will be lost immediately.
          </p>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="cursor-pointer bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            Delete Account
          </button>
        </motion.div>
      </div>

      {/* Password Edit Modal */}
      {createPortal(
        <AnimatePresence>
          {isEditingPassword && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
              >
            <button 
              onClick={closePasswordModal}
              className="cursor-pointer absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Lock className="text-emerald-600" size={24} /> Update Password
            </h3>

            {passwordError && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 flex items-start gap-3 text-sm">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-start gap-3 text-sm">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <p>{passwordSuccess}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Old Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="cursor-pointer flex-1 px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword || passwordSuccess}
                  className="cursor-pointer flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white px-4 py-3 rounded-xl font-medium shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {updatingPassword ? <Loader2 size={18} className="animate-spin" /> : null}
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Account Modal */}
      {createPortal(
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
              >
            <button 
              onClick={() => !deleting && setShowDeleteModal(false)}
              disabled={deleting}
              className="cursor-pointer absolute top-6 right-6 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold text-rose-600 mb-4 flex items-center gap-2">
              <AlertTriangle size={24} /> Delete Account
            </h3>

            <p className="text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete your account and all associated screening data? <strong className="text-rose-600 font-semibold">This action cannot be undone.</strong>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="cursor-pointer flex-1 px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="cursor-pointer flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-70 text-white px-4 py-3 rounded-xl font-medium shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : null}
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
