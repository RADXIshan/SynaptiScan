import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, ArrowLeft, Camera, CheckCircle, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ingestionApi } from '../../services/api';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
export default function TremorTest() {
  const [step, setStep] = useState('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
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
    let active = true;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        if (!active) return;
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        if (!active) return;
        handLandmarkerRef.current = handLandmarker;
      } catch (e) {
        console.error("Failed to load hand landmarker", e);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (step === 'test' && stream && videoRef.current) {
       videoRef.current.srcObject = stream;

       const video = videoRef.current;
       const canvas = canvasRef.current;
       const ctx = canvas ? canvas.getContext("2d") : null;
       let drawingUtils = null;
       if (ctx) drawingUtils = new DrawingUtils(ctx);

       const predictWebcam = () => {
         if (video.readyState >= 2 && handLandmarkerRef.current && canvas && ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const startTimeMs = performance.now();
            const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (results.landmarks) {
              for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                  color: "#00FF00",
                  lineWidth: 3
                });
                drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1, radius: 2 });
              }
            }
            ctx.restore();
         }
         animationFrameRef.current = requestAnimationFrame(predictWebcam);
       };

       video.addEventListener("loadeddata", predictWebcam);
       
       return () => {
           video.removeEventListener("loadeddata", predictWebcam);
           if (animationFrameRef.current) {
               cancelAnimationFrame(animationFrameRef.current);
           }
       };
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
      <div className="max-w-6xl mx-auto animate-fade-in-up">
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
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <Link to="/test-select" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} /> Restart Assessment
      </Link>
      
      <div className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col min-h-[800px] bg-white/60">
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
          <div className="flex flex-col gap-4 flex-1">
            {/* Full-frame video — no overlay */}
            <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-inner min-h-[480px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${stream ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Camera size={120} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Controls card — below the video */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-slate-900 font-semibold mb-1">Camera Active</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Ensure both hands are visible in the frame, then start the 10-second recording.
                </p>
              </div>

              <div className="sm:w-56 shrink-0">
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
                        <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
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
          </div>
        )}
      </div>
    </div>
  );
}
