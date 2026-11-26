import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
  Users,
  Play,
  CheckCircle,
  SkipForward,
  RotateCcw,
  Pause,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Phone,
  User,
  Activity,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Counter {
  id: string;
  name: string;
  number: string;
  status: 'OFFLINE' | 'IDLE' | 'SERVING' | 'PAUSED' | 'CLOSED';
  currentStaffId?: string | null;
  supportedServices?: Array<{
    service: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone?: string | null;
  priorityScore: number;
  sequenceNumber: number;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  verificationCode: string;
  calledAt?: string | null;
  servingStartedAt?: string | null;
  createdAt: string;
  skipReason?: string | null;
  service: {
    id: string;
    name: string;
    code: string;
  };
}

interface QueueStats {
  waitingCount: number;
  servingCount: number;
  completedTodayCount: number;
  skippedTodayCount: number;
  avgServiceTimeSeconds: number;
  avgServiceTimeMinutes: number;
}

interface QueueItem {
  id: string;
  serviceId: string;
  service: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    tickets: number;
  };
}

export const StaffConsole: React.FC = () => {
  const { user, activeOrg, logout } = useAuth();

  // Selected scope
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string>('');

  // Active counter & ticket state
  const [currentCounter, setCurrentCounter] = useState<Counter | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Queue state
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [waitingList, setWaitingList] = useState<Ticket[]>([]);
  const [skippedTickets, setSkippedTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);

  // UI state
  const [, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState<boolean>(false);
  const [skipReason, setSkipReason] = useState<string>('Customer absent / No-show');

  const orgId = activeOrg?.organizationId;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // 1. Fetch Branches for this organization
  const fetchBranches = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await apiClient.get(`/organizations/${orgId}/branches`, {
        headers: { 'X-Organization-Id': orgId },
      });
      const branchList: Branch[] = res.data.data;
      setBranches(branchList);
      if (branchList.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branchList[0].id);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to fetch branches', true);
    }
  }, [orgId, selectedBranchId]);

  // 2. Fetch Counters and Queues for the selected Branch
  const fetchBranchResources = useCallback(async (branchId: string) => {
    if (!branchId || !orgId) return;
    try {
      const [countersRes, queuesRes, statsRes, skippedRes] = await Promise.all([
        apiClient.get(`/branches/${branchId}/counters`, {
          headers: { 'X-Organization-Id': orgId },
        }),
        apiClient.get(`/branches/${branchId}/queues`, {
          headers: { 'X-Organization-Id': orgId },
        }),
        apiClient.get(`/branches/${branchId}/stats`, {
          headers: { 'X-Organization-Id': orgId },
        }),
        apiClient.get(`/branches/${branchId}/skipped`, {
          headers: { 'X-Organization-Id': orgId },
        }),
      ]);

      const counterList: Counter[] = countersRes.data.data;
      const queueList: QueueItem[] = queuesRes.data.data;

      setCounters(counterList);
      setQueues(queueList);
      setStats(statsRes.data.data);
      setSkippedTickets(skippedRes.data.data);

      if (counterList.length > 0 && !selectedCounterId) {
        setSelectedCounterId(counterList[0].id);
        setCurrentCounter(counterList[0]);
      } else if (selectedCounterId) {
        const found = counterList.find((c) => c.id === selectedCounterId);
        if (found) setCurrentCounter(found);
      }

      if (queueList.length > 0 && !selectedQueueId) {
        setSelectedQueueId(queueList[0].id);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to fetch branch resources', true);
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedCounterId, selectedQueueId]);

  // 3. Fetch Waiting List for Selected Queue
  const fetchWaitingList = useCallback(async (queueId: string) => {
    if (!queueId || !orgId) return;
    try {
      const res = await apiClient.get(`/queues/${queueId}/waiting`, {
        headers: { 'X-Organization-Id': orgId },
      });
      setWaitingList(res.data.data);
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to fetch waiting tickets', true);
    }
  }, [orgId]);

  // 4. Fetch Current Ticket for Active Counter
  const fetchCurrentCounterTicket = useCallback(async (counterId: string) => {
    if (!counterId || !orgId) return;
    try {
      const res = await apiClient.get(`/counters/${counterId}/current`, {
        headers: { 'X-Organization-Id': orgId },
      });
      setActiveTicket(res.data.data);
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to fetch current ticket', true);
    }
  }, [orgId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchBranchResources(selectedBranchId);
    }
  }, [selectedBranchId, fetchBranchResources]);

  useEffect(() => {
    if (selectedQueueId) {
      fetchWaitingList(selectedQueueId);
    }
  }, [selectedQueueId, fetchWaitingList]);

  useEffect(() => {
    if (selectedCounterId) {
      const counter = counters.find((c) => c.id === selectedCounterId);
      if (counter) setCurrentCounter(counter);
      fetchCurrentCounterTicket(selectedCounterId);
    }
  }, [selectedCounterId, counters, fetchCurrentCounterTicket]);

  // Real-time Socket.IO Connection and Room Subscription
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const socket: Socket = io({
      auth: { token: token ? `Bearer ${token}` : undefined },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    if (selectedBranchId) {
      socket.emit('room:join', { room: `branch:${selectedBranchId}` });
    }
    if (selectedQueueId) {
      socket.emit('room:join', { room: `queue:${selectedQueueId}` });
    }

    // Live Queue Events
    const handleQueueChange = () => {
      refreshAll();
    };

    socket.on('queue:ticket:created', handleQueueChange);
    socket.on('queue:ticket:called', handleQueueChange);
    socket.on('queue:ticket:serving', handleQueueChange);
    socket.on('queue:ticket:completed', handleQueueChange);
    socket.on('queue:ticket:skipped', handleQueueChange);
    socket.on('queue:ticket:recalled', handleQueueChange);

    return () => {
      if (selectedBranchId) {
        socket.emit('room:leave', { room: `branch:${selectedBranchId}` });
      }
      if (selectedQueueId) {
        socket.emit('room:leave', { room: `queue:${selectedQueueId}` });
      }
      socket.disconnect();
    };
  }, [selectedBranchId, selectedQueueId]);

  const refreshAll = () => {
    if (selectedBranchId) {
      fetchBranchResources(selectedBranchId);
    }
    if (selectedQueueId) {
      fetchWaitingList(selectedQueueId);
    }
    if (selectedCounterId) {
      fetchCurrentCounterTicket(selectedCounterId);
    }
  };

  // Staff Actions
  const handleCallNext = async () => {
    if (!selectedCounterId || !orgId) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(
        `/counters/${selectedCounterId}/call-next`,
        {},
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Ticket ${res.data.data.ticketNumber} called to Counter!`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'No eligible tickets waiting to call', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallSpecific = async (ticketId: string) => {
    if (!selectedCounterId || !orgId) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(
        `/counters/${selectedCounterId}/call-ticket/${ticketId}`,
        {},
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Ticket ${res.data.data.ticketNumber} called successfully!`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to call ticket', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartServing = async () => {
    if (!activeTicket || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/tickets/${activeTicket.id}/start-serving`,
        {},
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Service started for Ticket ${activeTicket.ticketNumber}`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to start serving', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTicket = async () => {
    if (!activeTicket || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/tickets/${activeTicket.id}/complete`,
        {},
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Ticket ${activeTicket.ticketNumber} completed successfully!`);
      setActiveTicket(null);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to complete ticket', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipTicket = async () => {
    if (!activeTicket || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/tickets/${activeTicket.id}/skip`,
        { reason: skipReason },
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Ticket ${activeTicket.ticketNumber} skipped`);
      setSkipModalOpen(false);
      setActiveTicket(null);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to skip ticket', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecallTicket = async (ticketId: string) => {
    if (!selectedCounterId || !orgId) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(
        `/tickets/${ticketId}/recall`,
        { counterId: selectedCounterId },
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Ticket ${res.data.data.ticketNumber} recalled to counter!`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to recall ticket', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCounterStatus = async (newStatus: 'IDLE' | 'PAUSED') => {
    if (!selectedCounterId || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/counters/${selectedCounterId}/status`,
        { status: newStatus },
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Counter set to ${newStatus}`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to update counter status', true);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#14201A] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-[12px] bg-[#E8F3EC] text-[#1F5C3A] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-[#14201A] text-base tracking-tight">QueueLess Operational Staff Console</h1>
              <span className="px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                Staff Ops
              </span>
            </div>
            <p className="text-xs text-[#6B7A72]">
              {activeOrg?.organizationName || 'Assigned Organization'} • {branches.find((b) => b.id === selectedBranchId)?.name || 'Branch'}
            </p>
          </div>
        </div>

        {/* Top Controls & Staff Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-[12px] border border-[#E5E7EB] bg-white text-left">
            <div className="h-7 w-7 rounded-full bg-[#E8F3EC] text-[#1F5C3A] font-semibold text-xs flex items-center justify-center">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#14201A] leading-tight">{user?.fullName || 'Staff'}</p>
              <p className="text-[10px] text-[#6B7A72] leading-tight">{activeOrg?.role || 'Staff Operator'}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-[12px] text-xs font-semibold text-[#14201A] bg-white border border-[#E5E7EB] hover:bg-[#E8F3EC] hover:border-[#1F5C3A] transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Notifications Toast */}
      {errorMsg && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Main Operational Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Top Control Bar: Branch & Counter Selector */}
        <section className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Branch Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setSelectedCounterId('');
                  setSelectedQueueId('');
                }}
                className="bg-slate-800/90 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Counter Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Counter:</span>
              <select
                value={selectedCounterId}
                onChange={(e) => setSelectedCounterId(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 outline-none font-medium"
              >
                {counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Counter #{c.number} — {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Counter Status Badge */}
            {currentCounter && (
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    currentCounter.status === 'SERVING'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : currentCounter.status === 'IDLE'
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : currentCounter.status === 'PAUSED'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                    currentCounter.status === 'SERVING'
                      ? 'bg-emerald-400 animate-pulse'
                      : currentCounter.status === 'IDLE'
                      ? 'bg-sky-400'
                      : currentCounter.status === 'PAUSED'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`} />
                  {currentCounter.status}
                </span>

                {/* Pause / Resume Controls */}
                {currentCounter.status === 'IDLE' && (
                  <button
                    onClick={() => handleToggleCounterStatus('PAUSED')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 transition flex items-center space-x-1"
                  >
                    <Pause className="h-3 w-3" />
                    <span>Pause Counter</span>
                  </button>
                )}
                {currentCounter.status === 'PAUSED' && (
                  <button
                    onClick={() => handleToggleCounterStatus('IDLE')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 transition flex items-center space-x-1"
                  >
                    <Play className="h-3 w-3" />
                    <span>Resume Counter</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {stats && (
            <div className="flex items-center space-x-6 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Waiting</span>
                <span className="text-sm font-bold text-sky-400">{stats.waitingCount}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Served Today</span>
                <span className="text-sm font-bold text-emerald-400">{stats.completedTodayCount}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Avg Service</span>
                <span className="text-sm font-bold text-indigo-400">
                  {stats.avgServiceTimeMinutes > 0 ? `${stats.avgServiceTimeMinutes} min` : `${stats.avgServiceTimeSeconds}s`}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Operational 2-Column Split: Active Ticket Serving Card & Live Waiting Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Serving Station (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Ticket Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-1.5">
                  <Activity className="h-3.5 w-3.5 text-sky-400" />
                  <span>Active Customer Station</span>
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  {currentCounter ? `Counter #${currentCounter.number}` : 'No Counter'}
                </span>
              </div>

              {activeTicket ? (
                <div className="space-y-6">
                  {/* Big Boarding-Pass Header */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-center relative shadow-inner">
                    <span className="text-xs text-sky-400 font-semibold uppercase tracking-wider block mb-1">
                      {activeTicket.service.name}
                    </span>
                    <h2 className="text-5xl font-extrabold tracking-tight text-white font-mono my-2">
                      {activeTicket.ticketNumber}
                    </h2>
                    <div className="flex items-center justify-center space-x-2 mt-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          activeTicket.status === 'SERVING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {activeTicket.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded-md">
                        Pass Code: <strong className="text-white">{activeTicket.verificationCode}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>Customer Name</span>
                      </span>
                      <span className="font-semibold text-white">{activeTicket.customerName}</span>
                    </div>
                    {activeTicket.customerPhone && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <span>Phone Number</span>
                        </span>
                        <span className="font-mono text-slate-300">{activeTicket.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>Called At</span>
                      </span>
                      <span className="font-mono text-slate-300">
                        {activeTicket.calledAt ? new Date(activeTicket.calledAt).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    {activeTicket.priorityScore > 1 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-amber-400 flex items-center space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Priority Status</span>
                        </span>
                        <span className="font-bold text-amber-400">High Priority Tier</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="space-y-3">
                    {activeTicket.status === 'CALLED' && (
                      <button
                        onClick={handleStartServing}
                        disabled={actionLoading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>Start Serving Customer</span>
                      </button>
                    )}

                    {activeTicket.status === 'SERVING' && (
                      <button
                        onClick={handleCompleteTicket}
                        disabled={actionLoading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition flex items-center justify-center space-x-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Mark Customer as Served (Complete)</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSkipModalOpen(true)}
                        disabled={actionLoading}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        <span>Skip Customer</span>
                      </button>

                      <button
                        onClick={handleCallNext}
                        disabled={actionLoading}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span>Next in Queue</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Counter State: Ready to Call Next */
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 border border-slate-700/60 shadow-inner">
                    <User className="h-8 w-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Counter is Idle & Available</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Ready to serve waiting customers. Press the button below to summon the next priority ticket.
                    </p>
                  </div>
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || !selectedCounterId}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition inline-flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Call Next Customer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Recalls / Skipped Tickets Tray */}
            {skippedTickets.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                    <span>Recent Skipped Tickets ({skippedTickets.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Eligible for recall</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {skippedTickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white">{t.ticketNumber}</span>
                          <span className="text-[10px] text-slate-400">{t.customerName}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Reason: {t.skipReason || 'Absent'}</p>
                      </div>
                      <button
                        onClick={() => handleRecallTicket(t.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition flex items-center space-x-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Recall</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Waiting Queue List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
              {/* Queue Service Tabs */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-sky-400" />
                  <h3 className="font-bold text-white text-sm">Waiting Queue Inspection</h3>
                </div>

                {/* Queue Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Queue:</span>
                  <select
                    value={selectedQueueId}
                    onChange={(e) => setSelectedQueueId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none font-medium"
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.service.name} ({q._count.tickets} waiting)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Waiting Customers Table / List */}
              {waitingList.length > 0 ? (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {waitingList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-400">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white text-sm">{item.ticketNumber}</span>
                            {item.priorityScore > 1 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Priority
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{item.customerName}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right text-xs">
                          <span className="text-[10px] text-slate-500 block">Joined at</span>
                          <span className="text-slate-400 font-mono">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCallSpecific(item.id)}
                          disabled={actionLoading || !selectedCounterId}
                          title="Call this specific ticket to my counter"
                          className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Play className="h-3 w-3" />
                          <span>Call</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <CheckCircle className="h-10 w-10 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">Queue is Clear</p>
                  <p className="text-xs text-slate-500">There are currently no waiting tickets in this service queue.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Skip Customer Confirmation Modal */}
      {skipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Skip Customer Ticket</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to skip Ticket <strong className="text-white font-mono">{activeTicket?.ticketNumber}</strong>?
              A reason is required to maintain audit records.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Skip Reason:</label>
              <select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Customer absent / No-show">Customer absent / No-show</option>
                <option value="Missing required documentation">Missing required documentation</option>
                <option value="Customer requested later service">Customer requested later service</option>
                <option value="Wrong service selected">Wrong service selected</option>
                <option value="Other / Staff discretion">Other / Staff discretion</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                onClick={() => setSkipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipTicket}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
