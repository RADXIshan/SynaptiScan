import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { ingestionApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function TestSelect() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startAssessment = async () => {
    setLoading(true);
    try {
      const response = await ingestionApi.createSession();
      localStorage.setItem('sessionId', response.session_id);
      // Sequentially, the first test is Keystroke
      navigate('/test/keystroke');
    } catch (err) {
      console.error(err);
      alert("Failed to create session. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in-up flex flex-col items-center justify-center min-h-[70vh]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-emerald-200/50 blur-[150px] pointer-events-none" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass p-10 md:p-16 rounded-3xl text-center max-w-2xl relative z-10 border-t-4 border-emerald-600"
      >
        <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/10">
          <Activity size={40} />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900">
          Digital Motor Assessment
        </h1>
        
        <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-8">
          You will now complete 5 short activities assessing your micro-motor functions, typing rhythm, vocal patterns, and postural stability.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium mb-10 bg-emerald-50 py-2 px-4 rounded-full w-max mx-auto border border-emerald-200">
          <ShieldCheck size={16} /> Data is anonymized and securely processed
        </div>

        <button 
          onClick={startAssessment}
          disabled={loading}
          className="group w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
        >
          {loading ? 'Initializing Session...' : 'Start Assessment'}
          {!loading && <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
        </button>
      </motion.div>
    </div>
  );
}
