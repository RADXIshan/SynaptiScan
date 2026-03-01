import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MousePointer, ArrowLeft, CheckCircle, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function MouseTest() {
  const [step, setStep] = useState('demo');
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const TOTAL_TARGETS = 10;
  
  useEffect(() => {
    if (step === 'test') {
      nextTarget();
    }
  }, [step]);

  const nextTarget = () => {
    if (score >= TOTAL_TARGETS - 1) {
      setScore(s => s + 1);
      completeTest();
      return;
    }
    setTargets([{
      id: Date.now(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
    }]);
  };

  const handleClick = (id) => {
    if (score < TOTAL_TARGETS) {
      setScore(s => s + 1);
      if (score < TOTAL_TARGETS - 1) {
        nextTarget();
      } else {
        completeTest();
      }
    }
  };

  const completeTest = async () => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      await ingestionApi.uploadMouse(sessionId, { score_time: Date.now() });
      navigate('/test/voice');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  if (step === 'demo') {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} /> Restart Assessment
        </Link>
        
        <div className="glass rounded-3xl p-8 md:py-12 relative overflow-hidden flex flex-col min-h-[700px] sm:min-h-[600px] h-auto bg-white/60 items-center justify-center text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <MousePointer size={48} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Mouse Control</h1>
          <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg leading-relaxed">
            This assessment measures your hand-eye coordination and reaction time by tracking your mouse movements and clicks.
          </p>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 w-full max-w-md text-left shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" /> Instructions
            </h3>
            <ul className="text-slate-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>Small circular targets will appear on the screen one by one.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>Move your cursor and click on each target as quickly and accurately as possible.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>There will be exactly {TOTAL_TARGETS} targets to click.</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => setStep('test')} 
            className="cursor-pointer py-4 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-3 text-lg shadow-lg shadow-emerald-600/20 active:scale-95 transform"
          >
            <Play size={20} fill="currentColor" /> Start Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col min-h-[700px] sm:min-h-[600px] bg-white/60">
        <header className="flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <MousePointer size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mouse Control</h1>
              <p className="text-slate-600 text-sm mt-1">Click the appearing targets as quickly and accurately as possible.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 mb-1">Progress</div>
            <div className="text-xl font-bold text-slate-900">{score} / {TOTAL_TARGETS}</div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing...</h2>
          </div>
        ) : (
          <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-200 relative overflow-hidden cursor-crosshair">
            {targets.map(t => (
              <motion.button
                key={t.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onPointerDown={() => handleClick(t.id)}
                className="absolute w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 outline-none cursor-crosshair"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
              >
                <div className="w-4 h-4 rounded-full bg-white/50 pointer-events-none" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
