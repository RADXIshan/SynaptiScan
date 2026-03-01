import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Activity, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) {
      setError("Please agree to the research consent terms.");
      return;
    }
    setError('');
    setLoading(true);
    const result = await register(email, password, consent);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden animate-fade-in-up bg-slate-50">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-xl font-bold text-slate-800 hover:opacity-80 transition-opacity z-20">
        <img src="/logo.png" alt="SynaptiScan Logo" className="w-8 h-8" />
        SynaptiScan
      </Link>
      <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-indigo-200/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-blue-200/50 blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass rounded-3xl p-10 w-full max-w-md z-10 bg-white/80"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="SynaptiScan Logo" className="w-16 h-16 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">
            Create Account
          </h1>
          <p className="text-slate-600 mt-2 text-center text-sm">
            Join the digital motor assessment study safely and securely.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 pl-10 pr-12 text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
                placeholder="Create a strong password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-start gap-3 mt-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
             <div className="pt-0.5">
               <input 
                 type="checkbox"
                 checked={consent}
                 onChange={(e) => setConsent(e.target.checked)}
                 className="w-4 h-4 rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white accent-indigo-600 cursor-pointer"
               />
             </div>
             <p className="text-xs text-slate-600 leading-relaxed cursor-default">
               <strong className="text-slate-800 flex items-center gap-1 mb-1"><ShieldCheck size={14}/> Research Consent</strong>
               I agree to securely share my anonymized motor pathway interactions (timing, speed, video data processed on-device) for SynaptiScan's tracking. No content typed or spoken is stored verbatim.
             </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/25 mt-4 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-8">
          Already have an account? <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
