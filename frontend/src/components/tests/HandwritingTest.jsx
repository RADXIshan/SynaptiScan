import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit3, ArrowLeft, CheckCircle, RotateCcw, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function HandwritingTest() {
  const [step, setStep] = useState('demo');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [testStartTime, setTestStartTime] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 'test') {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#818cf8';
      }
    }
  }, [step]); 

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    
    if (!testStartTime) setTestStartTime(Date.now());
    setCurrentStroke([{ x: offsetX, y: offsetY, t: Date.now() }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    
    setCurrentStroke(prev => [...prev, { x: offsetX, y: offsetY, t: Date.now() }]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
    
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const handleFinishEarly = () => {
    if (strokes.length > 0 || currentStroke.length > 0) {
      if (isDrawing) stopDrawing();
      completeTest();
    }
  };

  const completeTest = async () => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Ensure the final stroke is included if just lifted
      const finalStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;
      const testDurationMs = testStartTime ? (Date.now() - testStartTime) : 0;
      
      await ingestionApi.uploadHandwriting(sessionId, { 
        strokes: finalStrokes,
        test_duration_ms: testDurationMs,
        canvas_width: canvasRef.current.width,
        canvas_height: canvasRef.current.height
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setStrokes([]);
      setCurrentStroke([]);
      setTestStartTime(null);
    }
  };

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: event.nativeEvent.offsetX || event.clientX - rect.left,
      offsetY: event.nativeEvent.offsetY || event.clientY - rect.top
    };
  };

  if (step === 'demo') {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} /> Restart Assessment
        </Link>
        
        <div className="glass rounded-3xl p-8 md:py-12 relative overflow-hidden flex flex-col min-h-[700px] sm:min-h-[600px] h-auto bg-white/60 items-center justify-center text-center">
           <div className="w-24 h-24 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Edit3 size={48} />
           </div>
           <h1 className="text-3xl font-bold text-slate-900 mb-4">Spiral Drawing Test</h1>
           <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg leading-relaxed">
             In this assessment, you will draw an outward spiral starting from the center of the canvas. This helps evaluate fine motor control.
           </p>
           
           <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 w-full max-w-md text-left shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-violet-500" /> Instructions
              </h3>
              <ul className="text-slate-600 space-y-3">
                 <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <span>Use your mouse, trackpad, or touch screen.</span>
                 </li>
                 <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <span>Start from the center and draw outwards continuously.</span>
                 </li>
                 <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <span>Try to maintain a steady speed and even spacing between loops.</span>
                 </li>
              </ul>
           </div>
           
           <button 
              onClick={() => setStep('test')} 
              className="cursor-pointer py-4 px-8 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center gap-3 text-lg shadow-lg shadow-violet-600/20 active:scale-95 transform"
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
            <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
              <Edit3 size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Spiral Drawing Test</h1>
              <p className="text-slate-600 text-sm mt-1">Trace an outward spiral starting from the center.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={clearCanvas} className="cursor-pointer p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors" title="Clear Canvas">
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={handleFinishEarly}
              disabled={strokes.length === 0 && currentStroke.length === 0}
              className="cursor-pointer px-5 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Drawing
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Strokes...</h2>
          </div>
        ) : (
          <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-200 relative overflow-hidden cursor-crosshair flex items-center justify-center shadow-inner">
            <canvas 
              ref={canvasRef}
              className="w-full h-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        )}
      </div>
    </div>
  );
}
