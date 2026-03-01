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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden animate-fade-in-up">
      <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass rounded-3xl p-10 w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <Activity className="text-cyan-400 mb-4" size={48} />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-cyan-400">
            Create Account
          </h1>
          <p className="text-slate-400 mt-2 text-center text-sm">
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl py-3 pl-10 pr-12 text-white placeholder-slate-500 outline-none transition-all"
                placeholder="Create a strong password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-start gap-3 mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
             <div className="pt-0.5">
               <input 
                 type="checkbox"
                 checked={consent}
                 onChange={(e) => setConsent(e.target.checked)}
                 className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 accent-cyan-500 cursor-pointer"
               />
             </div>
             <p className="text-xs text-slate-400 leading-relaxed cursor-default">
               <strong className="text-slate-300 flex items-center gap-1 mb-1"><ShieldCheck size={14}/> Research Consent</strong>
               I agree to securely share my anonymized motor pathway interactions (timing, speed, video data processed on-device) for SynaptiScan's tracking. No content typed or spoken is stored verbatim.
             </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-violet-500/25 mt-4 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-8">
          Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
