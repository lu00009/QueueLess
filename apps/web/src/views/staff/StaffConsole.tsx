import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, LogOut, CheckCircle } from 'lucide-react';

export const StaffConsole: React.FC = () => {
  const { user, activeOrg, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">QueueLess Staff Console</h1>
            <p className="text-xs text-sky-400 mt-1">{activeOrg?.organizationName || 'Assigned Branch'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs font-medium text-white">{user?.fullName}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Console View */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Staff Member Authenticated</h2>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-white font-medium">{user?.fullName}</span> at <span className="text-sky-300 font-medium">{activeOrg?.organizationName}</span>.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">Organization</p>
              <p className="text-base font-bold text-white mt-1">{activeOrg?.organizationName || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">Permitted Role</p>
              <p className="text-base font-bold text-sky-400 mt-1">{activeOrg?.role || user?.role}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">Counter Access</p>
              <p className="text-base font-bold text-emerald-400 mt-1">Authorized</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
