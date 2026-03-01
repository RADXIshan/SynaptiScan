import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MousePointer, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ingestionApi } from '../../services/api';

export default function MouseTest() {
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const TOTAL_TARGETS = 10;
  
  useEffect(() => {
    nextTarget();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col h-[700px] sm:h-[600px]">
        <header className="flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <MousePointer size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mouse Control</h1>
              <p className="text-slate-400 text-sm mt-1">Click the appearing targets as quickly and accurately as possible.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">Progress</div>
            <div className="text-xl font-bold text-white">{score} / {TOTAL_TARGETS}</div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing...</h2>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-700 relative overflow-hidden cursor-crosshair">
            {targets.map(t => (
              <motion.button
                key={t.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onPointerDown={() => handleClick(t.id)}
                className="absolute w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 outline-none"
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
