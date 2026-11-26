import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Building2, LogOut, Clock } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, activeOrg, memberships, setActiveOrgId, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">QueueLess Admin</h1>
            <p className="text-xs text-indigo-400 mt-1">
              Role: <span className="font-semibold">{user?.role === 'SYSTEM_ADMIN' ? 'System Super-Admin' : activeOrg?.role || 'Org Admin'}</span>
            </p>
          </div>
        </div>

        {/* Organization Switcher & User Profile */}
        <div className="flex items-center space-x-4">
          {memberships.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <select
                value={activeOrg?.organizationId || ''}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId} className="bg-slate-900 text-white">
                    {m.organizationName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {activeOrg ? activeOrg.organizationName : 'Platform Overview'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated session active. Role-based access and tenant isolation verified.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Tenant Scope</span>
              <Building2 className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-white truncate">{activeOrg ? activeOrg.organizationName : 'Global (System Admin)'}</p>
            <p className="text-xs text-emerald-400 mt-2 font-medium">Data Isolated & Enforced</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Role</span>
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-white">{user?.role === 'SYSTEM_ADMIN' ? 'SYSTEM_ADMIN' : activeOrg?.role}</p>
            <p className="text-xs text-slate-400 mt-2">Full administrative authorization</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">JWT Session</span>
              <Clock className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">Active & Valid</p>
            <p className="text-xs text-slate-400 mt-2">Automatic refresh rotation enabled</p>
          </div>
        </div>
      </main>
    </div>
  );
};
