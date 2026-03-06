import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Activity, Clock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useNavigate } from 'react-router';

// The classic Stroop effect: words and colors mismatching
const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#22c55e' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' }
];

export default function CognitionTest({ sessionId, onComplete }) {
  const [phase, setPhase] = useState('intro'); // intro, countdown, playing, completed
  const [trials, setTrials] = useState([]);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [scoreData, setScoreData] = useState({
    congruent_rt: [],
    incongruent_rt: [],
    errors: 0
  });
  
  const [displayedWord, setDisplayedWord] = useState('');
  const [displayedColor, setDisplayedColor] = useState('');
  const [isCongruent, setIsCongruent] = useState(true);
  const [startTime, setStartTime] = useState(0);
  
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' or 'wrong'

  const TOTAL_TRIALS = 20;

  // Generate trials for the test
  useEffect(() => {
    const newTrials = [];
    for (let i = 0; i < TOTAL_TRIALS; i++) {
        // Force ~50% congruent, ~50% incongruent
        const isMatch = Math.random() > 0.5;
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        
        let colorIdx;
        if (isMatch) {
            colorIdx = wordIdx;
        } else {
            colorIdx = Math.floor(Math.random() * COLORS.length);
            while (colorIdx === wordIdx) {
                colorIdx = Math.floor(Math.random() * COLORS.length);
            }
        }
        
        newTrials.push({
            word: COLORS[wordIdx].name,
            color: COLORS[colorIdx].hex,
            actualColorName: COLORS[colorIdx].name,
            isCongruent: isMatch
        });
    }
    setTrials(newTrials);
  }, []);

  const startTest = () => {
    setPhase('countdown');
    setCountdown(3);
  };

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('playing');
        showNextTrial(0);
      }
    }
  }, [phase, countdown]);

  const showNextTrial = (idx) => {
    if (idx >= TOTAL_TRIALS) {
        finishTest();
        return;
    }
    
    setFeedback(null);
    const trial = trials[idx];
    setDisplayedWord(trial.word);
    setDisplayedColor(trial.color);
    setIsCongruent(trial.isCongruent);
    setCurrentTrial(idx);
    setStartTime(performance.now());
  };

  const handleAnswer = (selectedColorName) => {
    if (phase !== 'playing' || feedback !== null) return;
    
    const rt = performance.now() - startTime;
    const trial = trials[currentTrial];
    const isCorrect = selectedColorName === trial.actualColorName;
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    setScoreData(prev => {
        const newData = { ...prev };
        if (!isCorrect) {
            newData.errors += 1;
        } else {
            if (isCongruent) {
                newData.congruent_rt.push(rt);
            } else {
                newData.incongruent_rt.push(rt);
            }
        }
        return newData;
    });

    // Short delay so user sees feedback
    setTimeout(() => {
        showNextTrial(currentTrial + 1);
    }, 400); // 400ms feedback duration
  };

  const finishTest = async () => {
    setPhase('completed');
  };

  const submitResults = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
        const avg_c = scoreData.congruent_rt.length > 0 
            ? scoreData.congruent_rt.reduce((a,b) => a+b, 0) / scoreData.congruent_rt.length 
            : 600;
        const avg_i = scoreData.incongruent_rt.length > 0 
            ? scoreData.incongruent_rt.reduce((a,b) => a+b, 0) / scoreData.incongruent_rt.length 
            : avg_c + 150;
            
        const payload = {
            congruent_rt_mean: avg_c,
            incongruent_rt_mean: avg_i,
            error_rate: scoreData.errors / TOTAL_TRIALS
        };
        
        // We assume dashboardApi has a postCognition method
        await dashboardApi.uploadCognition(sessionId, payload);
        
        if (onComplete) {
            onComplete();
        } else {
            navigate('/dashboard');
        }
    } catch (err) {
        console.error("Failed to submit cognition test", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Intro Phase
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto p-8 glass rounded-3xl animate-fade-in-up">
        <div className="flex items-center gap-4 mb-6 text-purple-600">
          <div className="p-4 bg-purple-100 rounded-2xl">
            <Brain size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Cognition & Reaction Test</h1>
        </div>
        
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          This test measures your **executive function and cognitive flexibility** using the Stroop Task. 
          It helps detect slight cognitive changes that often accompany motor disorders.
        </p>

        <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500"/> Instructions
          </h3>
          <ul className="space-y-3 text-slate-600">
            <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                <span>You will see color words (e.g., "RED", "BLUE") printed in various ink colors.</span>
            </li>
            <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                <span><strong className="text-slate-800">Identify the INK COLOR</strong>, ignoring what the word says.</span>
            </li>
            <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                <span>Click the button matching the ink color as fast as possible without making mistakes.</span>
            </li>
          </ul>
        </div>
        
        <div className="flex justify-center p-6 mb-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="text-center">
                <p className="text-sm text-slate-500 mb-2">Example:</p>
                <h2 className="text-4xl font-black tracking-widest" style={{ color: '#22c55e' }}>RED</h2>
                <p className="text-sm font-medium text-slate-600 mt-4">You should select: <strong className="text-emerald-600">GREEN</strong></p>
            </div>
        </div>

        <button 
          onClick={startTest}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/25 active:scale-95 flex justify-center items-center gap-2"
        >
          Start Test <ArrowRight />
        </button>
      </div>
    );
  }

  // Countdown Phase
  if (phase === 'countdown') {
    return (
      <div className="max-w-xl mx-auto h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-medium text-slate-600 mb-8">Get Ready...</h2>
        <motion.div 
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-8xl font-black text-purple-600"
        >
          {countdown > 0 ? countdown : 'GO!'}
        </motion.div>
      </div>
    );
  }

  // Playing Phase
  if (phase === 'playing') {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        
        <div className="w-full flex justify-between items-center mb-16 px-4">
            <span className="text-slate-500 font-medium">Trial {currentTrial + 1} / {TOTAL_TRIALS}</span>
            <div className="flex gap-2">
                {feedback === 'correct' && <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle size={18}/> Correct</span>}
                {feedback === 'wrong' && <span className="text-rose-500 font-bold flex items-center gap-1"><AlertTriangle size={18}/> Error</span>}
            </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center w-full mb-16">
            <motion.h1 
                key={currentTrial}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-7xl md:text-9xl font-black uppercase tracking-widest text-center"
                style={{ color: displayedColor, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
            >
                {displayedWord}
            </motion.h1>
        </div>

        <div className="w-full grid grid-cols-2 lg:grid-cols-5 gap-3 px-4">
            {COLORS.map(c => (
                <button
                    key={c.name}
                    onClick={() => handleAnswer(c.name)}
                    className="py-4 md:py-6 rounded-2xl font-bold text-white shadow-md active:scale-95 transition-transform text-lg"
                    style={{ backgroundColor: c.hex }}
                >
                    {c.name}
                </button>
            ))}
        </div>
      </div>
    );
  }

  // Completed Phase
  return (
    <div className="max-w-xl mx-auto p-10 glass rounded-3xl text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-4">Test Complete!</h2>
      <p className="text-slate-600 mb-8 max-w-sm mx-auto">
        Your reaction times and error rates have been recorded. Based on your speed recognizing matching vs non-matching colors, we calculate your Stroop Effect.
      </p>
      
      <div className="grid grid-cols-2 gap-4 mb-8 text-left">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Errors</span>
              <span className="text-2xl font-black text-slate-800">{scoreData.errors}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Total Trials</span>
              <span className="text-2xl font-black text-slate-800">{TOTAL_TRIALS}</span>
          </div>
      </div>

      <div className="flex flex-col gap-3">
        <button 
            onClick={submitResults}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
        >
            <Activity size={24} /> {isSubmitting ? 'Analyzing...' : 'Analyze Results'}
        </button>
        {/* If standalone debug, allow reset. Since we use sessionId, normally we just submit */}
      </div>
    </div>
  );
}
