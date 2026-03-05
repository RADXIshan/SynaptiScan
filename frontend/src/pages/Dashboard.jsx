import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Keyboard, MousePointer, Mic, Video, Edit3, ArrowRight, Activity, Download, Plus, BookOpen, Clock, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { dashboardApi } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    has_data: false,
    latest_score: 0,
    baseline_score: null,
    modality_breakdown: [],
    trend: []
  });
  
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalForm, setJournalForm] = useState({ type: 'symptom', content: '', severity: 5 });
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getSummary();
        
        const formattedTrend = (response.trend || []).map(item => {
          const d = new Date(item.date);
          return {
            ...item,
            date: d.toLocaleDateString(undefined, { weekday: 'short' })
          };
        });

        const iconMap = {
          keystroke: Keyboard,
          mouse: MousePointer,
          voice: Mic,
          tremor: Video,
          handwriting: Edit3
        };
        
        const defaultModalities = [
          { type: 'keystroke', icon: Keyboard, score: null },
          { type: 'mouse', icon: MousePointer, score: null },
          { type: 'voice', icon: Mic, score: null },
          { type: 'tremor', icon: Video, score: null },
          { type: 'handwriting', icon: Edit3, score: null }
        ];
        
        // Build a lookup from whatever the API returned, then fill all 5 slots.
        const apiMap = Object.fromEntries(
          (response.modality_breakdown || []).map(m => [m.type.toLowerCase(), m])
        );
        const mappedModality = defaultModalities.map(def => {
          const apiResult = apiMap[def.type];
          return apiResult
            ? { ...apiResult, icon: iconMap[apiResult.type.toLowerCase()] || Activity }
            : def;
        });
        
        setData({
          has_data: response.has_data,
          latest_score: response.latest_score || 0,
          baseline_score: response.baseline_score ?? null,
          modality_breakdown: mappedModality,
          trend: formattedTrend
        });
        
        // Fetch journal entries
        if (response.has_data) {
          const entries = await dashboardApi.getJournalEntries();
          setJournalEntries(entries || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await dashboardApi.exportCsv();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'SynaptiScan_Data.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV", err);
    }
    setIsExporting(false);
  };

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!journalForm.content.trim()) return;
    
    setIsSubmittingJournal(true);
    try {
      const newEntry = await dashboardApi.addJournalEntry({
        entry_type: journalForm.type,
        content: journalForm.content,
        severity: Number(journalForm.severity)
      });
      setJournalEntries([newEntry, ...journalEntries]);
      setJournalForm({ ...journalForm, content: '' });
    } catch (err) {
      console.error("Failed to save journal entry", err);
    } finally {
      setIsSubmittingJournal(false);
    }
  };

  return (
    <div id="dashboard-content" className="space-y-8 animate-fade-in-up pb-12">
      <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Motor Risk Dashboard</h1>
          <p className="text-slate-600 text-lg">Your combined multi-modal screening analysis.</p>
        </div>
        {!loading && data.has_data && (
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button 
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm disabled:opacity-50"
            >
              <Download size={18} /> {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <Link to="/test-select" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25 active:scale-95 group">
               <Activity size={18} className="group-hover:animate-pulse" /> Start New Assessment
            </Link>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64 mt-12 glass rounded-3xl border border-slate-200">
           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="text-emerald-600">
             <Activity size={48} />
           </motion.div>
        </div>
      ) : (
        <>
          {!data.has_data ? (
            <div className="text-center py-20 glass rounded-3xl mt-8 mb-8 border-t-4 border-t-emerald-600 shadow-xl">
              <Activity className="mx-auto text-emerald-600 mb-6" size={64} />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to SynaptiScan</h2>
              <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
                It looks like you haven't taken any screening tests yet. Start by taking a multi-modal assessment to get your first Motor Health Index score.
              </p>
              <Link to="/test-select" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/25">
                Take Your First Test <ArrowRight size={20} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass rounded-3xl p-8 flex flex-col justify-center col-span-1 border-t-4 border-t-emerald-600 relative overflow-hidden h-96 lg:h-[400px]"
            >
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />
              <div className="flex items-center gap-2 mb-4 group relative w-max">
                <h2 className="text-slate-700 font-semibold text-xl">Global PD-like Signal</h2>
                <Info size={18} className="text-slate-400 cursor-help" />
                <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl z-100 font-normal leading-relaxed text-left border border-slate-700 transition-opacity duration-200">
                  <strong>What this means:</strong>
                  <p className="mt-1 text-slate-300">
                    A composite score derived from all your modality assessments.
                  </p>
                  <p className="mt-2 text-slate-300">
                    Higher score = greater deviation from normal healthy baseline patterns (higher signal).
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-8xl font-bold text-slate-900 tracking-tighter">{(data.latest_score * 100).toFixed(0)}</span>
                <span className="text-2xl text-slate-500">/ 100</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-500 to-rose-600 rounded-full" 
                  style={{ width: `${Math.min(data.latest_score * 100, 100)}%` }}
                />
              </div>
              <p className="text-slate-600 text-base mt-6 leading-relaxed">
                Overall risk pattern derived from your recent assessments.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="glass rounded-3xl p-6 md:p-8 col-span-1 lg:col-span-2 flex flex-col min-w-0 min-h-0 overflow-hidden lg:h-[400px]"
            >
              <h2 className="text-slate-700 font-semibold mb-6 text-xl">Motor Health Index (Trend)</h2>
              <div className="w-full mt-4 flex-1 min-w-0 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#cbd5e1" tick={{ fill: '#64748b' }} />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b' }} domain={[0, 1]} />
                    {data.baseline_score !== null && (
                      <ReferenceLine 
                        y={data.baseline_score} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4" 
                        label={{ position: 'insideTopLeft', value: 'Baseline', fill: '#f43f5e', fontSize: 12 }} 
                      />
                    )}
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#4f46e5' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
          )}
          <div className="space-y-4 pt-6 relative z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Modality Breakdown</h2>
              <Link to="/test-select" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-500 transition text-sm font-semibold">
                {data.has_data ? "Take a New Test" : "Take Your First Test"} <ArrowRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {data.modality_breakdown.map((m, idx) => {
                const IconComponent = m.icon;
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className="glass p-5 rounded-2xl flex flex-col border border-slate-200 hover:border-emerald-300 transition-colors relative hover:z-50"
                  >
                    <div className="flex items-center justify-between mb-4 text-emerald-600 relative z-100">
                      <IconComponent size={24} />
                      <div className="flex items-center gap-2 group relative">
                        {m.score !== null && (
                          <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-56 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl z-100 font-normal leading-relaxed text-left border border-slate-700 transition-opacity duration-200">
                            <strong>What this means:</strong>
                            <p className="mt-1 text-slate-300">
                              Higher percentage = greater deviation from normal healthy patterns (higher signal).
                            </p>
                            <p className="mt-2 text-slate-300">
                              Lower percentage = closer to normal healthy baseline patterns.
                            </p>
                          </div>
                        )}
                        <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded-md text-slate-600 cursor-help flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                          {m.score !== null ? `${(m.score * 100).toFixed(0)}%` : 'N/A'}
                          {m.score !== null && <Info size={14} className="text-slate-400" />}
                        </span>
                      </div>
                    </div>
                    <h3 className="capitalize text-slate-800 font-medium mb-1">{m.type}</h3>
                    <p className="text-xs text-slate-500">
                      {m.score === null 
                        ? 'No data' 
                        : m.score < 0.3 
                        ? 'Normal pattern' 
                        : m.score < 0.6 
                        ? 'Slight deviation' 
                        : 'High signal detected'}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Medication & Symptom Journal Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 relative z-10">
            <div className="glass p-6 md:p-8 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="text-emerald-600" size={24} />
                <h2 className="text-2xl font-bold text-slate-900">Health Journal</h2>
              </div>
              <p className="text-slate-600 mb-6">Log your symptoms or medication intake to correlate with your motor assessments.</p>
              
              <form onSubmit={handleJournalSubmit} className="space-y-4">
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="journalType" 
                      value="symptom" 
                      checked={journalForm.type === 'symptom'}
                      onChange={(e) => setJournalForm({...journalForm, type: e.target.value})}
                      className="text-emerald-600 focus:ring-emerald-500" 
                    />
                    <span className="text-sm font-medium text-slate-700">Symptom</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="journalType" 
                      value="medication" 
                      checked={journalForm.type === 'medication'}
                      onChange={(e) => setJournalForm({...journalForm, type: e.target.value})}
                      className="text-emerald-600 focus:ring-emerald-500" 
                    />
                    <span className="text-sm font-medium text-slate-700">Medication</span>
                  </label>
                </div>

                <div>
                  <textarea 
                    rows="3" 
                    placeholder={journalForm.type === 'symptom' ? "Describe how you're feeling today..." : "E.g. Levodopa 100mg at 9:00 AM"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    value={journalForm.content}
                    onChange={(e) => setJournalForm({...journalForm, content: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      {journalForm.type === 'symptom' ? 'Severity (1-10)' : 'Dosage/Effect (1-10)'}
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={journalForm.severity}
                      onChange={(e) => setJournalForm({...journalForm, severity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                  <span className="text-lg font-bold text-slate-700 w-8 text-center">{journalForm.severity}</span>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingJournal || !journalForm.content.trim()}
                  className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={18} /> {isSubmittingJournal ? 'Saving...' : 'Add Entry'}
                </button>
              </form>
            </div>

            <div className="glass p-6 md:p-8 rounded-3xl border border-slate-200 flex flex-col h-full max-h-[500px]">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock size={20} className="text-slate-400" /> Recent Entries
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {journalEntries.length === 0 ? (
                  <div className="text-center text-slate-500 py-10">
                    No journal entries yet. Start logging above.
                  </div>
                ) : (
                  journalEntries.map(entry => (
                    <div key={entry.id} className="p-4 rounded-xl bg-white border border-slate-100 shadow-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          entry.entry_type === 'medication' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {entry.entry_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm mt-1">{entry.content}</p>
                      {entry.severity && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Intensity:</span>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`h-1.5 w-6 rounded-full ${i < Math.ceil(entry.severity / 2) ? (entry.entry_type === 'medication' ? 'bg-blue-400' : 'bg-rose-400') : 'bg-slate-100'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
