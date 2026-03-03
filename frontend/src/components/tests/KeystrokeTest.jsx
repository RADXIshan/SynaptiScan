import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Keyboard, ArrowLeft, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function KeystrokeTest() {
  const [step, setStep] = useState('demo');
  const [text, setText] = useState('');
  const [targetText] = useState("The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step.");
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keystrokes, setKeystrokes] = useState([]);
  const activeKeys = useRef({});
  const navigate = useNavigate();
  
  const completeTest = async (finalText, recordedStrokes) => {
    setLoading(true);
    try {
      const session = await ingestionApi.createSession();
      const sessionId = session.id;
      await ingestionApi.uploadKeystroke(sessionId, { 
        text: finalText,
        keystrokes: recordedStrokes
      });
      navigate('/test/mouse');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'test') return;

    const handleKeyDown = (e) => {
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      
      const keyId = e.code + e.key;
      // Prevent repeated keydown triggers from holding a key
      if (!activeKeys.current[keyId]) {
        activeKeys.current[keyId] = Date.now();
      }
    };

    const handleKeyUp = (e) => {
      const keyId = e.code + e.key;
      const downTime = activeKeys.current[keyId];
      if (downTime) {
        const upTime = Date.now();
        setKeystrokes(prev => [...prev, {
          key: e.key,
          down: downTime,
          up: upTime
        }]);
        delete activeKeys.current[keyId];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [step]);

  const handleChange = (e) => {
    setText(e.target.value);
    // Rough check
    if (e.target.value === targetText) {
      setIsDone(true);
    }
  };

  if (step === 'demo') {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
          <ArrowLeft size={20} /> Restart Assessment
        </Link>
        
        <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden bg-white/60 flex flex-col items-center justify-center text-center">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-300/30 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
            <Keyboard size={48} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4 z-10">Keystroke Dynamics</h1>
          <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg leading-relaxed z-10">
            This test measures your natural typing rhythm and speed. You'll be asked to type a short paragraph.
          </p>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 w-full max-w-md text-left shadow-sm z-10">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" /> Instructions
            </h3>
            <ul className="text-slate-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>Read the provided paragraph carefully.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>Type the paragraph into the text box as naturally as possible.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>Don't worry about minor mistakes; just type at your normal pace.</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => setStep('test')} 
            className="cursor-pointer py-4 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-3 text-lg shadow-lg shadow-emerald-600/20 active:scale-95 transform z-10"
          >
            <Play size={20} fill="currentColor" /> Start Assessment
          </button>
        </div>
      </div>
    );
  }

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
                onClick={() => completeTest(text, keystrokes)}
                disabled={text.length < 10}
                className="cursor-pointer text-emerald-600 font-medium flex items-center gap-2 hover:text-emerald-500 disabled:opacity-50 transition-opacity"
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
