import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowLeft, Square } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function VoiceTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(50);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isRecording) return;
    
    // Fake volume visualizer
    const interval = setInterval(() => {
      setVolume(30 + Math.random() * 50);
    }, 100);
    
    // Auto stop after 5 seconds
    const timeout = setTimeout(() => {
      stopRecording();
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setLoading(true);
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Hack: Mocking file for now:
      const dummyBlob = new Blob(["mock-audio"], { type: 'audio/webm' });
      const dummyFile = new File([dummyBlob], "audio.webm", { type: 'audio/webm' });
      
      await ingestionApi.uploadVoice(sessionId, dummyFile);
      navigate('/test/tremor');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden text-center bg-white/60">
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-200/40 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="w-20 h-20 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 z-10 relative">
          <Mic size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2 relative z-10">Voice Analysis</h1>
        <p className="text-slate-600 mb-8 max-w-sm mx-auto relative z-10">
          Take a deep breath and say <strong className="text-slate-900">"Aaahh"</strong> at a steady pitch for 5 seconds.
        </p>

        {loading ? (
          <div className="relative z-10">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Analyzing Audio...</h2>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            {isRecording ? (
              <motion.div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8 h-20">
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: `${volume * (0.3 + Math.random() * 0.7)}%` }}
                      className="w-3 bg-linear-to-t from-amber-500 to-amber-300 rounded-full"
                    />
                  ))}
                </div>
                <button 
                  onClick={stopRecording}
                  className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse"
                >
                  <Square size={24} fill="currentColor" />
                </button>
                <p className="text-rose-600 mt-4 font-medium animate-pulse">Recording...</p>
              </motion.div>
            ) : (
              <button 
                onClick={startRecording}
                className="w-20 h-20 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-400 transition shadow-[0_0_30px_rgba(245,158,11,0.3)] group"
              >
                <Mic size={32} className="group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
