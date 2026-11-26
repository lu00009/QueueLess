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
    const wsUrl = import.meta.env.VITE_WS_URL || 'https://queueless-swh4.onrender.com';
    const socket: Socket = io(wsUrl, {
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
      showNotification(`Ticket ${res.data.data.ticketNumber} called to counter`);
      refreshAll();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'No eligible tickets waiting in queue', true);
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
      showNotification(`Ticket ${res.data.data.ticketNumber} called`);
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
      showNotification(`Service started for ticket ${activeTicket.ticketNumber}`);
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
      showNotification(`Ticket ${activeTicket.ticketNumber} completed`);
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
      showNotification(`Ticket ${activeTicket.ticketNumber} marked as skipped`);
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
      showNotification(`Ticket ${res.data.data.ticketNumber} recalled to counter`);
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
      showNotification(`Counter set to ${newStatus.toLowerCase()}`);
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
        <div className="bg-[#FFF5F5] border-b border-[#FED7D7] px-6 py-2.5 flex items-center justify-between text-xs text-[#C53030] animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-[#E53E3E] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#C53030] hover:text-[#9B2C2C]">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-[#E8F3EC] border-b border-[#C6E2D0] px-6 py-2.5 flex items-center justify-between text-xs text-[#1F5C3A] animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-[#1F5C3A] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#1F5C3A] hover:text-[#18482E]">✕</button>
        </div>
      )}

      {/* Main Operational Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Top Control Bar: Branch & Counter Selector */}
        <section className="bg-white border border-[#E5E7EB] rounded-[16px] p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Branch Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-[#6B7A72]">Branch</span>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setSelectedCounterId('');
                  setSelectedQueueId('');
                }}
                className="bg-[#FAFAF7] border border-[#E5E7EB] text-[#14201A] text-xs font-medium rounded-[12px] px-3 py-2 focus:ring-1 focus:ring-[#1F5C3A] outline-none"
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
              <span className="text-xs font-medium text-[#6B7A72]">Counter</span>
              <select
                value={selectedCounterId}
                onChange={(e) => setSelectedCounterId(e.target.value)}
                className="bg-[#FAFAF7] border border-[#E5E7EB] text-[#14201A] text-xs font-medium rounded-[12px] px-3 py-2 focus:ring-1 focus:ring-[#1F5C3A] outline-none"
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
                  className={`inline-flex items-center px-2.5 py-1 rounded-[12px] text-xs font-medium ${
                    currentCounter.status === 'SERVING'
                      ? 'bg-[#E8F3EC] text-[#1F5C3A] border border-[#C6E2D0]'
                      : currentCounter.status === 'IDLE'
                      ? 'bg-[#E8F3EC] text-[#1F5C3A] border border-[#C6E2D0]'
                      : currentCounter.status === 'PAUSED'
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-[#F3F4F6] text-[#6B7A72] border border-[#E5E7EB]'
                  }`}
                >
                  {/* Single lime accent on active state */}
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${
                    currentCounter.status === 'SERVING' || currentCounter.status === 'IDLE'
                      ? 'bg-[#B7E36B]'
                      : currentCounter.status === 'PAUSED'
                      ? 'bg-amber-400'
                      : 'bg-[#9CA3AF]'
                  }`} />
                  {currentCounter.status === 'SERVING' ? 'Serving' : currentCounter.status === 'IDLE' ? 'Idle' : currentCounter.status === 'PAUSED' ? 'Paused' : currentCounter.status}
                </span>

                {/* Pause / Resume Controls */}
                {currentCounter.status === 'IDLE' && (
                  <button
                    onClick={() => handleToggleCounterStatus('PAUSED')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-medium bg-white hover:bg-[#FAFAF7] text-[#6B7A72] border border-[#E5E7EB] transition flex items-center space-x-1.5"
                  >
                    <Pause className="h-3 w-3" />
                    <span>Pause counter</span>
                  </button>
                )}
                {currentCounter.status === 'PAUSED' && (
                  <button
                    onClick={() => handleToggleCounterStatus('IDLE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18482E] text-white transition flex items-center space-x-1.5"
                  >
                    <Play className="h-3 w-3" />
                    <span>Resume counter</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metrics */}
          {stats && (
            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className="text-[#6B7A72] block text-[11px]">Waiting</span>
                <span className="text-base font-semibold text-[#14201A]">{stats.waitingCount}</span>
              </div>
              <div className="h-6 w-px bg-[#E5E7EB]" />
              <div>
                <span className="text-[#6B7A72] block text-[11px]">Served today</span>
                <span className="text-base font-semibold text-[#1F5C3A]">{stats.completedTodayCount}</span>
              </div>
              <div className="h-6 w-px bg-[#E5E7EB]" />
              <div>
                <span className="text-[#6B7A72] block text-[11px]">Average service</span>
                <span className="text-base font-semibold text-[#14201A]">
                  {stats.avgServiceTimeMinutes > 0 ? `${stats.avgServiceTimeMinutes} min` : `${stats.avgServiceTimeSeconds}s`}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Operational 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Customer Station (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-[#1F5C3A]" />
                  <h2 className="text-sm font-semibold text-[#14201A]">Active Customer Station</h2>
                </div>
                <span className="text-xs font-medium text-[#6B7A72] bg-[#FAFAF7] px-2.5 py-1 rounded-[8px] border border-[#E5E7EB]">
                  {currentCounter ? `Counter #${currentCounter.number}` : 'No counter'}
                </span>
              </div>

              {activeTicket ? (
                <div className="space-y-5">
                  {/* Ticket Card */}
                  <div className="p-6 rounded-[12px] bg-[#FAFAF7] border border-[#E5E7EB] text-center">
                    <span className="text-xs text-[#6B7A72] font-medium block mb-1">
                      {activeTicket.service.name}
                    </span>
                    <h3 className="text-4xl font-bold tracking-tight text-[#14201A] my-2">
                      {activeTicket.ticketNumber}
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mt-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-[8px] text-xs font-semibold ${
                          activeTicket.status === 'SERVING'
                            ? 'bg-[#E8F3EC] text-[#1F5C3A]'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {activeTicket.status === 'SERVING' ? 'Serving now' : 'Called'}
                      </span>
                      <span className="text-xs text-[#6B7A72] bg-white border border-[#E5E7EB] px-2.5 py-0.5 rounded-[8px]">
                        Pass code: <strong className="text-[#14201A] font-semibold">{activeTicket.verificationCode}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Customer Information List */}
                  <div className="rounded-[12px] border border-[#E5E7EB] divide-y divide-[#E5E7EB] bg-white text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-[#6B7A72] flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-[#6B7A72]" />
                        <span>Customer</span>
                      </span>
                      <span className="font-medium text-[#14201A]">{activeTicket.customerName}</span>
                    </div>
                    {activeTicket.customerPhone && (
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-[#6B7A72] flex items-center space-x-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#6B7A72]" />
                          <span>Phone</span>
                        </span>
                        <span className="text-[#14201A] font-medium">{activeTicket.customerPhone}</span>
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-[#6B7A72] flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#6B7A72]" />
                        <span>Called at</span>
                      </span>
                      <span className="text-[#14201A]">
                        {activeTicket.calledAt ? new Date(activeTicket.calledAt).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    {activeTicket.priorityScore > 1 && (
                      <div className="p-3 flex items-center justify-between bg-[#E8F3EC]/50">
                        <span className="text-[#1F5C3A] font-medium flex items-center space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Priority tier</span>
                        </span>
                        <span className="font-semibold text-[#1F5C3A]">High priority</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    {activeTicket.status === 'CALLED' && (
                      <button
                        onClick={handleStartServing}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18482E] text-white font-semibold text-xs transition flex items-center justify-center space-x-2"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>Start serving customer</span>
                      </button>
                    )}

                    {activeTicket.status === 'SERVING' && (
                      <button
                        onClick={handleCompleteTicket}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18482E] text-white font-semibold text-xs transition flex items-center justify-center space-x-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Complete service</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setSkipModalOpen(true)}
                        disabled={actionLoading}
                        className="py-2.5 rounded-[12px] bg-white hover:bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7] text-xs font-medium transition flex items-center justify-center space-x-1.5"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        <span>Skip customer</span>
                      </button>

                      <button
                        onClick={handleCallNext}
                        disabled={actionLoading}
                        className="py-2.5 rounded-[12px] bg-white hover:bg-[#FAFAF7] text-[#14201A] border border-[#E5E7EB] text-xs font-medium transition flex items-center justify-center space-x-1.5"
                      >
                        <Play className="h-3 w-3 text-[#1F5C3A]" />
                        <span>Call next ticket</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Counter State */
                <div className="text-center py-10 px-4 rounded-[12px] bg-[#FAFAF7] border border-[#E5E7EB] space-y-4">
                  <div className="h-12 w-12 mx-auto rounded-full bg-[#E8F3EC] flex items-center justify-center text-[#1F5C3A]">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#14201A]">Counter is idle and available</h3>
                    <p className="text-xs text-[#6B7A72] mt-1 max-w-xs mx-auto">
                      Ready to serve waiting customers. Press the button below to summon the next priority ticket.
                    </p>
                  </div>
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || !selectedCounterId}
                    className="px-5 py-2.5 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18482E] text-white font-semibold text-xs transition inline-flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Call next customer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Recalls / Skipped Tickets Tray */}
            {skippedTickets.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#14201A] flex items-center space-x-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-[#6B7A72]" />
                    <span>Recently skipped tickets ({skippedTickets.length})</span>
                  </span>
                  <span className="text-[11px] text-[#6B7A72]">Eligible for recall</span>
                </div>
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-[12px] overflow-hidden max-h-48 overflow-y-auto">
                  {skippedTickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-white flex items-center justify-between text-xs hover:bg-[#FAFAF7] transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-[#14201A]">{t.ticketNumber}</span>
                          <span className="text-[#6B7A72]">{t.customerName}</span>
                        </div>
                        <p className="text-[11px] text-[#6B7A72] mt-0.5">Reason: {t.skipReason || 'Absent'}</p>
                      </div>
                      <button
                        onClick={() => handleRecallTicket(t.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 rounded-[8px] bg-[#E8F3EC] hover:bg-[#D5EADF] text-[#1F5C3A] text-xs font-semibold transition flex items-center space-x-1"
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
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-6 shadow-sm">
              {/* Queue Header & Filter */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-[#1F5C3A]" />
                  <h3 className="font-semibold text-[#14201A] text-sm">Waiting queue inspection</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#6B7A72]">Queue</span>
                  <select
                    value={selectedQueueId}
                    onChange={(e) => setSelectedQueueId(e.target.value)}
                    className="bg-[#FAFAF7] border border-[#E5E7EB] text-[#14201A] text-xs rounded-[12px] px-3 py-1.5 outline-none font-medium"
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.service.name} ({q._count.tickets} waiting)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Waiting Customers List */}
              {waitingList.length > 0 ? (
                <div className="border border-[#E5E7EB] rounded-[12px] divide-y divide-[#E5E7EB] max-h-[600px] overflow-y-auto">
                  {waitingList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white hover:bg-[#FAFAF7] transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="h-8 w-8 rounded-[8px] bg-[#FAFAF7] border border-[#E5E7EB] flex items-center justify-center font-semibold text-xs text-[#6B7A72]">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#14201A] text-sm">{item.ticketNumber}</span>
                            {item.priorityScore > 1 && (
                              <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                                Priority
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6B7A72] mt-0.5">{item.customerName}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right text-xs">
                          <span className="text-[11px] text-[#6B7A72] block">Joined</span>
                          <span className="text-[#14201A]">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCallSpecific(item.id)}
                          disabled={actionLoading || !selectedCounterId}
                          title="Call this specific ticket to my counter"
                          className="px-3 py-1.5 rounded-[12px] bg-white hover:bg-[#E8F3EC] text-[#1F5C3A] border border-[#E5E7EB] text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Play className="h-3 w-3" />
                          <span>Call</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-[#6B7A72] space-y-2">
                  <CheckCircle className="h-10 w-10 mx-auto text-[#1F5C3A]" />
                  <p className="text-sm font-semibold text-[#14201A]">Queue is clear</p>
                  <p className="text-xs text-[#6B7A72]">There are currently no waiting tickets in this service queue.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Skip Customer Confirmation Modal */}
      {skipModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#14201A]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-[#14201A]">Skip customer ticket</h3>
            <p className="text-xs text-[#6B7A72]">
              Are you sure you want to skip ticket <strong className="text-[#14201A] font-semibold">{activeTicket?.ticketNumber}</strong>?
              A reason is required to maintain accurate queue records.
            </p>

            <div>
              <label className="text-xs font-medium text-[#6B7A72] block mb-1.5">Reason for skipping</label>
              <select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full bg-[#FAFAF7] border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:ring-1 focus:ring-[#1F5C3A]"
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
                className="px-4 py-2 rounded-[12px] text-xs font-medium bg-white text-[#6B7A72] border border-[#E5E7EB] hover:bg-[#FAFAF7] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipTicket}
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#C53030] hover:bg-[#9B2C2C] text-white transition"
              >
                Confirm skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
