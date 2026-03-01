import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, ArrowLeft, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function TremorTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isRecording) return;
    
    // Simulate 10-second test
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          completeTest();
          return 100;
        }
        return p + 1; // 1% per 100ms = 10s total
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRecording]);

  const completeTest = async () => {
    setIsRecording(false);
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      await ingestionApi.uploadTremor(sessionId, { video_frames: [] });
      navigate('/test/handwriting');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col h-[700px] sm:h-[600px] bg-white/60">
        <header className="flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <Video size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Postural Tremor Test</h1>
              <p className="text-slate-600 text-sm mt-1">Hold your hands out steadily in front of the camera.</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Movement...</h2>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <Camera size={120} className="text-slate-400" />
            </div>
            
            <div className="relative z-10 text-center p-8 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl max-w-md">
              <h3 className="text-slate-900 font-semibold mb-2">Camera Access Required</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                This test records a 10-second clip of your hands to detect minute micro-tremors using MediaPipe posture mapping securely on your device.
              </p>
              
              {!isRecording ? (
                <button 
                  onClick={() => setIsRecording(true)}
                  className="cursor-pointer w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <Video size={18} /> Start Camera & Test
                </button>
              ) : (
                <div>
                  <div className="flex justify-between text-xs text-rose-400 font-medium mb-2 uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                       Recording Hands
                    </span>
                    <span>{10 - Math.floor(progress / 10)}s left</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-rose-500 to-pink-500 rounded-full transition-all ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
