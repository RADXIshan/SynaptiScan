import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Keyboard, MousePointer, Mic, Video, Edit3, ArrowRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    has_data: false,
    latest_score: 0,
    modality_breakdown: [],
    trend: []
  });

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
        
        const mappedModality = response.modality_breakdown && response.modality_breakdown.length > 0 
          ? response.modality_breakdown.map(m => ({
              ...m,
              icon: iconMap[m.type.toLowerCase()] || Activity
            }))
          : defaultModalities;
        
        setData({
          has_data: response.has_data,
          latest_score: response.latest_score || 0,
          modality_breakdown: mappedModality,
          trend: formattedTrend
        });
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Motor Risk Dashboard</h1>
        <p className="text-slate-600 text-lg">Your combined multi-modal screening analysis.</p>
        <div className="mt-4 inline-flex items-center rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
          Research & Screening Support Only
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass rounded-3xl p-8 flex flex-col justify-between col-span-1 border-t-4 border-t-emerald-600 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />
              <h2 className="text-slate-700 font-semibold mb-2 text-lg">Global PD-like Signal</h2>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-7xl font-bold text-slate-900 tracking-tighter">{(data.latest_score * 100).toFixed(0)}</span>
                <span className="text-xl text-slate-500">/ 100</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-500 to-rose-600 rounded-full" 
                  style={{ width: `${Math.min(data.latest_score * 100, 100)}%` }}
                />
              </div>
              <p className="text-slate-600 text-sm mt-4 leading-relaxed">
                Overall risk pattern derived from your recent assessments.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="glass rounded-3xl p-6 col-span-1 md:col-span-2 flex flex-col"
            >
              <h2 className="text-slate-700 font-semibold mb-6 text-lg">Motor Health Index (Trend)</h2>
              <div className="w-full h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#cbd5e1" tick={{ fill: '#64748b' }} />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b' }} domain={[0, 1]} />
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

          <div className="space-y-4 pt-6">
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
                    className="glass p-5 rounded-2xl flex flex-col border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4 text-emerald-600">
                      <IconComponent size={24} />
                      <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                        {m.score !== null ? `${(m.score * 100).toFixed(0)}%` : 'N/A'}
                      </span>
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
        </>
      )}
    </div>
  );
}
