import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Shield, AlertTriangle, Loader2 } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // In a real app we'd add an authApi.getMe() or similar.
      // Since it's not in the mocked api.js yet, we use fetch directly for now or assume it exists
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
    if (!window.confirm("Are you sure you want to permanently delete your account and all associated screening data? This action cannot be undone.")) {
      return;
    }
    
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
              <label className="block text-sm font-medium text-slate-500 mb-1">Member Since</label>
              <div className="p-4 rounded-xl text-slate-700 bg-slate-50 border border-slate-200 inline-block w-full">
                {new Date(user?.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-semibold text-slate-900">Data & Privacy</h2>
          </div>
          
          <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Research Data Consent</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Allow internal researchers to use anonymized motor metrics to improve early-detection ML models. We never share raw identifiable inputs.
              </p>
              <button
                onClick={handleConsentChange}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                  user?.data_consent 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {user?.data_consent ? 'Consent Granted (Click to Revoke)' : 'Grant Consent'}
              </button>
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
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : null}
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
