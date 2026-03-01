import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Keyboard, ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function KeystrokeTest() {
  const [text, setText] = useState('');
  const [targetText] = useState("The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step.");
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const completeTest = async (finalText) => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        await ingestionApi.uploadKeystroke(sessionId, { text: finalText });
      }
      navigate('/test/mouse');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Rough check
    if (e.target.value === targetText) {
      setIsDone(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden bg-white/60">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-300/30 rounded-full blur-[80px] pointer-events-none" />
        
        <header className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Keyboard size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Keystroke Dynamics</h1>
            <p className="text-slate-600 mt-1">Type the paragraph below as naturally as possible.</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing...</h2>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 font-medium text-lg leading-relaxed select-none">
              {targetText}
            </div>
            
            <textarea
              className="w-full h-48 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-6 text-slate-900 text-lg resize-none transition-all outline-none"
              placeholder="Start typing here..."
              value={text}
              onChange={handleChange}
              spellCheck="false"
            />
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">
                Progress: {Math.min(100, (text.length / targetText.length) * 100).toFixed(0)}%
              </span>
              <button 
                onClick={() => completeTest(text)}
                disabled={text.length < 10}
                className="cursor-pointer text-emerald-600 font-medium flex items-center gap-2 hover:text-emerald-500 disabled:opacity-50"
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
