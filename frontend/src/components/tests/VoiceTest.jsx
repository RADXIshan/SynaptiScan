import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowLeft, Square, CheckCircle, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function VoiceTest() {
  const [step, setStep] = useState('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0);
  const [stream, setStream] = useState(null);
  
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  const requestMicrophone = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      setStep('test');
    } catch (err) {
      console.error('Microphone permission denied', err);
      alert('Microphone access is required for this assessment.');
    }
  };

  const startTestPhase = () => {
    requestMicrophone();
  };

  useEffect(() => {
    if (!isRecording) return;
    
    // Set up AudioContext and Analyser for live volume
    if (stream) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize 0-255 to 0-100 roughly
        const normalizedVolume = Math.min(100, Math.max(5, (average / 255) * 200));
        setVolume(normalizedVolume);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
    }

    // Auto stop after 5 seconds
    const timeout = setTimeout(() => {
      stopRecording();
    }, 5000);
    
    return () => {
      clearTimeout(timeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, stream]);

  const startRecording = () => {
    if (!stream) return;
    setIsRecording(true);
    audioChunksRef.current = [];
    
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorderRef.current.onstop = uploadRecording;
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setLoading(true);
    
    // Stop tracks to release microphone
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const uploadRecording = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Prepare blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], "audio.webm", { type: 'audio/webm' });
      
      await ingestionApi.uploadVoice(sessionId, audioFile);
      navigate('/test/tremor');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  if (step === 'demo') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
          <ArrowLeft size={20} /> Restart Assessment
        </Link>
        
        <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden bg-white/60 flex flex-col items-center justify-center text-center">
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-200/40 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-sm z-10 relative">
            <Mic size={48} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4 relative z-10">Voice Analysis</h1>
          <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg leading-relaxed relative z-10">
            This test analyzes your vocal characteristics. You will be asked to sustain a sound into your microphone.
          </p>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 w-full max-w-md text-left shadow-sm relative z-10">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-amber-500" /> Instructions
            </h3>
            <ul className="text-slate-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>We will request access to your microphone on the next screen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>When ready, click to start recording.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <div>Take a deep breath and say <strong>"Aaahh"</strong> at a steady pitch for 5 seconds.</div>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={startTestPhase} 
            className="cursor-pointer py-4 px-8 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-medium transition-colors flex items-center gap-3 text-lg shadow-lg shadow-amber-500/30 active:scale-95 transform relative z-10"
          >
            <Play size={20} fill="currentColor" /> Grant Microphone permission & Start
          </button>
        </div>
      </div>
    );
  }

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
                  className="cursor-pointer w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse"
                >
                  <Square size={24} fill="currentColor" />
                </button>
                <p className="text-rose-600 mt-4 font-medium animate-pulse">Recording ({Math.round(5 - (new Date().getTime() % 5000) / 1000)}s left)...</p>
              </motion.div>
            ) : (
              <button 
                onClick={startRecording}
                className="cursor-pointer w-20 h-20 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-400 transition shadow-[0_0_30px_rgba(245,158,11,0.3)] group"
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
