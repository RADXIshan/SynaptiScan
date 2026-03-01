import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, ShieldCheck, BrainCircuit, Scan, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden animate-fade-in-up">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-3xl p-10 md:p-16 w-full max-w-4xl z-10 text-center border-t-4 border-indigo-500 shadow-2xl shadow-indigo-500/10"
      >
        <div className="mx-auto w-24 h-24 bg-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-0">
          <Activity size={48} />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-cyan-400 leading-tight">
          Detect Motor<br />Patterns Early.
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
          SynaptiScan uses multi-modal AI to invisibly screen for early signs of motor-pathway disorders through your everyday interactions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto text-left">
           <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <BrainCircuit className="text-violet-400 mb-4" size={28} />
              <h3 className="text-white font-semibold mb-2">Cognitive Dynamics</h3>
              <p className="text-slate-500 text-sm">Passive monitoring of keystroke typing speed and variation.</p>
           </div>
           <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <Scan className="text-cyan-400 mb-4" size={28} />
              <h3 className="text-white font-semibold mb-2">Micro-Tremor Video</h3>
              <p className="text-slate-500 text-sm">Computer vision mapping for nuanced postural instability.</p>
           </div>
           <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <Mic className="text-emerald-400 mb-4" size={28} />
              <h3 className="text-white font-semibold mb-2">Vocal Tonality</h3>
              <p className="text-slate-500 text-sm">Frequency isolation to detect dysarthria and vocal cord strain.</p>
           </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium mb-10 bg-emerald-500/10 py-2 px-5 rounded-full w-max mx-auto border border-emerald-500/20">
          <ShieldCheck size={16} /> Privacy-First Architecture
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/signup"
            className="group w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            Create Account
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </Link>
          <Link 
            to="/login"
            className="group w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
      
      <div className="mt-12 text-slate-500 text-sm flex items-center gap-2 z-10 transition-opacity hover:text-slate-400 cursor-default">
         <strong className="text-slate-400">Disclaimer:</strong> For research and screening support only. Not a medical diagnosis. 
      </div>
    </div>
  );
}
