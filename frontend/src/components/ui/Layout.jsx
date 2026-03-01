import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-3 text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-cyan-400">
          <Activity className="text-cyan-400" size={28} />
          SynaptiScan
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link to="/dashboard" className={`hover:text-cyan-300 transition-colors ${location.pathname === '/dashboard' ? 'text-cyan-400' : 'text-slate-400'}`}>Dashboard</Link>
          <Link to="/test-select" className={`hover:text-cyan-300 transition-colors ${location.pathname === '/test-select' ? 'text-cyan-400' : 'text-slate-400'}`}>New Test</Link>
          
          <div className="h-4 w-px bg-slate-700 mx-2"></div>
          
          {user?.email && (
            <div className="flex items-center gap-2 text-slate-400 hidden sm:flex">
              <User size={16} />
              <span className="truncate max-w-[150px]">{user.email}</span>
            </div>
          )}
          
          <button 
            onClick={logout} 
            className="flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-12 relative overflow-x-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>
      
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px]" />
      </div>
    </div>
  );
}
