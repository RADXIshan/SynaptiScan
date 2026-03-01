import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Activity, ArrowRight, ShieldCheck, BrainCircuit, Scan, Mic, 
  Keyboard, MousePointer2, PenTool, CheckCircle2, ChevronDown 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Accordion from '../components/ui/Accordion';

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const yHeroOffset = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const opacityHeroOffset = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const features = [
    { icon: <Keyboard size={32} />, title: "Keystroke Dynamics", desc: "Monitors typing rhythm, dwell time, and precision to detect subtle motor variations.", color: "text-violet-400" },
    { icon: <MousePointer2 size={32} />, title: "Mouse Tracking", desc: "Analyzes cursor trajectories, click accuracy, and movement latency in real-time.", color: "text-blue-400" },
    { icon: <Mic size={32} />, title: "Vocal Analysis", desc: "Detects micro-tremors and hesitations in voice recordings indicative of dysarthria.", color: "text-emerald-400" },
    { icon: <Scan size={32} />, title: "Postural Stability", desc: "Uses computer vision to map resting and active micro-tremors from device cameras.", color: "text-cyan-400" },
    { icon: <PenTool size={32} />, title: "Digital Handwriting", desc: "Evaluates spiral drawing algorithms for spatial memory and kinetic decline.", color: "text-pink-400" },
    { icon: <BrainCircuit size={32} />, title: "Multi-Modal AI", desc: "Aggregates data points into a cohesive early warning score using advanced ML models.", color: "text-indigo-400" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <img src="/logo.png" alt="SynaptiScan Logo" className="w-8 h-8" />
            SynaptiScan
          </Link>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm">
            <a href="#features" className="relative transition-colors font-medium pb-1 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:origin-left before:scale-x-0 before:bg-indigo-600 before:transition-transform before:duration-300 hover:before:scale-x-100 text-slate-600 hover:text-indigo-600">Features</a>
            <a href="#how-it-works" className="relative transition-colors font-medium pb-1 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:origin-left before:scale-x-0 before:bg-indigo-600 before:transition-transform before:duration-300 hover:before:scale-x-100 text-slate-600 hover:text-indigo-600">How it Works</a>
            <a href="#faq" className="relative transition-colors font-medium pb-1 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:origin-left before:scale-x-0 before:bg-indigo-600 before:transition-transform before:duration-300 hover:before:scale-x-100 text-slate-600 hover:text-indigo-600">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-sm font-medium hover:text-indigo-600 transition-colors">Sign In</Link>
            <Link to="/signup" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full transition-all shadow-lg shadow-indigo-600/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 flex flex-col items-center justify-center min-h-screen">
        <div className="absolute top-1/4 left-1/4 w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />
        
        <motion.div 
          style={{ y: yHeroOffset, opacity: opacityHeroOffset }}
          className="max-w-4xl mx-auto px-6 text-center z-10"
        >

          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 text-slate-900 leading-tight"
          >
            Detect Motor <br/>
            <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-indigo-400">Patterns Early.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            SynaptiScan uses multi-modal AI to invisibly screen for early signs of motor-pathway disorders through your everyday digital interactions.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup" className="group w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 active:scale-95">
              Start Screening Now
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
          </motion.div>

          {/* Scrolling indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
          >
            <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
            <motion.div 
              animate={{ y: [0, 8, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown size={20} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">Comprehensive Assessment</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Our test suite measures nuanced motor and cognitive responses that often precede clinical symptoms.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="group bg-slate-50 p-8 rounded-3xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-xs hover:shadow-md hover:shadow-indigo-500/5 cursor-default"
              >
                <div className={`mb-6 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm inline-block group-hover:scale-110 transition-transform ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 relative z-10 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">Screening without <br/><span className="text-indigo-600">the clinical anxiety.</span></h2>
              <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                Take assessments from the comfort of your own home using the devices you already own. Our platform guides you through simple interactions.
              </p>
              
              <div className="space-y-8">
                {[
                  { title: "Create a Secure Profile", desc: "Your data is anonymized and encrypted." },
                  { title: "Complete Brief Interactions", desc: "No complex instructions, just natural movement." },
                  { title: "Review Assessment Results", desc: "Get an easy-to-understand motor pathway index." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h4>
                      <p className="text-slate-600">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-tr from-indigo-500/20 to-cyan-500/20 rounded-3xl blur-[80px]" />
              <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={24}/>
                    <span className="font-semibold text-slate-900">Privacy Guarantee</span>
                  </div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">End-to-End Encrypted</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-600">
                  <li className="flex items-start gap-3"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={18}/> <span>We only record metadata (speed, trajectory, variation), never the actual keystroke content or audio transcriptions.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={18}/> <span>Video processing for tremors happens locally on your device where possible.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={18}/> <span>Raw audio patterns are immediately converted into non-reversible frequency spectrograms.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">Frequently Asked Questions</h2>
            <p className="text-slate-600">Everything you need to know about the platform and how it works.</p>
          </div>

          <div className="space-y-1">
            <Accordion title="Is this a medical diagnosis tool?">
              No. SynaptiScan is designed for research, screening support, and tracking motor variations over time. It provides a "risk index" that can be shared with a qualified neurologist, but it does not replace professional medical diagnosis or clinical judgment.
            </Accordion>
            <Accordion title="What data do you actually store?">
              We store abstract metadata. For typing, we store the time between keystrokes, not the letters you typed. For voice, we extract frequency data (pitch, jitter, shimmer) without recording the words. Your privacy and security are our foundational principles.
            </Accordion>
            <Accordion title="How long do the tests take?">
              The entire suite of 5 tests (Keystroke, Mouse, Voice, Tremor, Handwriting) takes roughly 3-5 minutes to complete. We recommend taking the assessments in a quiet environment.
            </Accordion>
            <Accordion title="Can I use this on my phone?">
              Currently, the Keystroke and Mouse tests require a desktop or laptop environment to accurately capture nuanced peripheral data. We are working on touch-screen specific kinematics for mobile devices.
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-indigo-50/50" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 leading-tight">Ready to begin your <br/>digital assessment?</h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Join our research platform today to start capturing your baseline motor metrics. Registration takes less than a minute.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl shadow-indigo-600/40 transition-all hover:-translate-y-1">
            Create Free Account <ArrowRight size={24} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <img src="/logo.png" alt="SynaptiScan Logo" className="w-6 h-6 grayscale opacity-80" />
            SynaptiScan
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} SynaptiScan Research. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="#" className="hover:text-slate-800 transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-slate-800 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
