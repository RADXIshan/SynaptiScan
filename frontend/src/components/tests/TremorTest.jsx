import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, ArrowLeft, Camera, CheckCircle, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function TremorTest() {
  const [step, setStep] = useState('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const navigate = useNavigate();

  const requestCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
      setStep('test');
    } catch (err) {
      console.error('Camera permission denied', err);
      alert('Camera access is required for this assessment.');
    }
  };

  const startTestPhase = () => {
    requestCamera();
  };

  useEffect(() => {
    if (step === 'test' && stream && videoRef.current) {
       videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  useEffect(() => {
    if (!isRecording) return;
    
    // Simulate 10-second test progress line
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

  const startRecording = () => {
    if (!stream) return;
    setIsRecording(true);
    setProgress(0);
    videoChunksRef.current = [];
    
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        videoChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorderRef.current.onstop = uploadRecording;
    mediaRecorderRef.current.start();
  };

  const completeTest = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setLoading(true);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadRecording = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      const videoFile = new File([videoBlob], "tremor.webm", { type: 'video/webm' });
      
      await ingestionApi.uploadTremor(sessionId, videoFile);
      navigate('/test/handwriting');
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
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Video size={48} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Postural Tremor Test</h1>
          <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg leading-relaxed">
            This test uses your device's camera to detect minute micro-tremors in your hands using secure on-device posture mapping.
          </p>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 w-full max-w-md text-left shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-rose-500" /> Instructions
            </h3>
            <ul className="text-slate-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span>We will request access to your camera on the next screen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span>Hold your hands out steadily in front of the camera, palms down.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span>Maintain this position for 10 seconds while the recording takes place.</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={startTestPhase} 
            className="cursor-pointer py-4 px-8 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition-colors flex items-center gap-3 text-lg shadow-lg shadow-rose-600/20 active:scale-95 transform"
          >
            <Play size={20} fill="currentColor" /> Grant Camera permission & Start
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
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover ${stream ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`} 
            />
            
            {!stream && (
               <div className="absolute inset-0 flex items-center justify-center opacity-20">
                 <Camera size={120} className="text-slate-400" />
               </div>
            )}
            
            <div className="relative z-10 text-center p-8 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl max-w-md">
              <h3 className="text-slate-900 font-semibold mb-2">Camera Active</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Ensure both hands are visible in the frame, then start the 10-second recording.
              </p>
              
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="cursor-pointer w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <Video size={18} /> Start Recording
                </button>
              ) : (
                <div>
                  <div className="flex justify-between text-xs text-rose-600 font-bold mb-2 uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
                       Recording Hands
                    </span>
                    <span>{10 - Math.floor(progress / 10)}s left</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
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
