import React from 'react';
import { Menu, Bell, User, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();

  const todayStr = new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: user?.timezone || 'Africa/Nairobi',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 lg:hidden"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-slate-200 hidden sm:block">
            {todayStr}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-brand-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Schedule Engine: Active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick notification indicator */}
        <button
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500"></span>
        </button>

        {/* User context & logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium text-xs">
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                {user?.display_name || 'Student'}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {user?.email || 'student@jkuat.ac.ke'}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
