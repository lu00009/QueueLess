import { useState, useEffect } from 'react';
import { fetchHealth } from './api/client';
import { HealthCheckResponse } from '@queueless/shared-types';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, Users } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to QueueLess Backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-indigo-800/40 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              QueueLess
            </h1>
            <p className="text-xs text-indigo-300/80 font-medium">Real-Time Smart Queue Management Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Staff & Admin Console
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            System Foundation & Health
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            QueueLess core services, database connections, and real-time gateways are active and monitored.
          </p>
        </div>

        {/* Backend & DB Health Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Backend API Connectivity</h3>
                <p className="text-xs text-slate-400">Express + Neon PostgreSQL Health Ping</p>
              </div>
            </div>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Connecting to Backend API...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-200">Connection Failed</h4>
                <p className="text-xs text-red-300/90 mt-1">{error}</p>
              </div>
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-xs text-slate-400 font-medium">System Status</p>
                <div className="flex items-center space-x-2 mt-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-base font-bold text-white uppercase">{health.status}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-xs text-slate-400 font-medium">PostgreSQL Database</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-base font-bold text-white capitalize">{health.database}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-xs text-slate-400 font-medium">API Version & Uptime</p>
                <p className="text-base font-bold text-white mt-2">
                  v{health.version} <span className="text-xs font-normal text-slate-400">({Math.round(health.uptime)}s uptime)</span>
                </p>
              </div>
            </div>
          ) : null}

          {/* Module Roles Preview */}
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 flex items-start space-x-3">
              <ShieldCheck className="h-5 w-5 text-indigo-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-indigo-200">Admin Dashboard Module</h4>
                <p className="text-xs text-slate-400 mt-1">Multi-branch management, service counters, queue rules, and staff assignments.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-900/30 flex items-start space-x-3">
              <Users className="h-5 w-5 text-sky-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-sky-200">Staff Operational Console</h4>
                <p className="text-xs text-slate-400 mt-1">Real-time counter calling, ticket transitions, skip/recall, and waiting customer monitoring.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        QueueLess Platform Foundation • Production-Ready Multi-Tenant Architecture
      </footer>
    </div>
  );
}
