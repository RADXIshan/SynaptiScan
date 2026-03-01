import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit3, ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';

export default function HandwritingTest() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pointsCount, setPointsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []); 

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    setPointsCount(p => p + 1);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
    
    // Auto-complete if enough strokes are logged
    if (pointsCount > 50) {
      completeTest();
    }
  };

  const completeTest = async () => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Payload can hold X, Y coordinations, velocity, and pressure. We send stroke count
      await ingestionApi.uploadHandwriting(sessionId, { strokes: pointsCount });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to submit data.");
      setLoading(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPointsCount(0);
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col h-[700px] bg-white/60">
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
          <button onClick={clearCanvas} className="cursor-pointer p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors">
            <RotateCcw size={20} />
          </button>
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
