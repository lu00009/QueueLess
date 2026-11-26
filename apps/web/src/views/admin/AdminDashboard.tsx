import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
  ShieldCheck,
  Building2,
  LogOut,
  MapPin,
  Clock,
  Layers,
  Users,
  Plus,
  Sliders,
  AlertCircle,
  BarChart3,
  FileText,
  Activity,
  CheckCircle2,
  Trash2,
  Power,
  RefreshCw,
} from 'lucide-react';

type Tab = 'overview' | 'branches' | 'services' | 'counters' | 'staff' | 'queues' | 'reports' | 'audit';

export const AdminDashboard: React.FC = () => {
  const { user, activeOrg, memberships, setActiveOrgId, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('overview');

  // State data from backend
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const [, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Modals state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCode, setNewServiceCode] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(15);
  const [newServicePriority, setNewServicePriority] = useState(1);

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterNumber, setNewCounterNumber] = useState('');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('ORG_STAFF');
  const [newStaffName, setNewStaffName] = useState('');

  // Queue config modal
  const [showQueueConfigModal, setShowQueueConfigModal] = useState(false);
  const [activeQueueConfig, setActiveQueueConfig] = useState<any>(null);
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [bufferMins, setBufferMins] = useState(5);
  const [allowRemote, setAllowRemote] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // 1. Fetch branches
      const branchRes = await apiClient.get(`/organizations/${orgId}/branches`, {
        headers: { 'X-Organization-Id': orgId },
      });
      const branchList = branchRes.data.data;
      setBranches(branchList);

      const activeBId = selectedBranchId || (branchList.length > 0 ? branchList[0].id : '');
      if (!selectedBranchId && activeBId) {
        setSelectedBranchId(activeBId);
      }

      // 2. Fetch staff
      const staffRes = await apiClient.get(`/organizations/${orgId}/staff`, {
        headers: { 'X-Organization-Id': orgId },
      });
      setStaff(staffRes.data.data);

      // 3. Fetch branch resources if branch exists
      if (activeBId) {
        const [servRes, countRes, queueRes] = await Promise.all([
          apiClient.get(`/branches/${activeBId}/services`, {
            headers: { 'X-Organization-Id': orgId },
          }),
          apiClient.get(`/branches/${activeBId}/counters`, {
            headers: { 'X-Organization-Id': orgId },
          }),
          apiClient.get(`/branches/${activeBId}/queues`, {
            headers: { 'X-Organization-Id': orgId },
          }),
        ]);
        setServices(servRes.data.data);
        setCounters(countRes.data.data);
        setQueues(queueRes.data.data);
      }

      // 4. Fetch Analytics and Audit logs
      const [analyticsRes, auditRes] = await Promise.all([
        apiClient.get(`/organizations/${orgId}/analytics`, {
          headers: { 'X-Organization-Id': orgId },
        }),
        apiClient.get(`/organizations/${orgId}/audit-logs`, {
          headers: { 'X-Organization-Id': orgId },
        }),
      ]);
      setAnalytics(analyticsRes.data.data);
      setAuditLogs(auditRes.data.data);
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Error loading organization data', true);
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler functions
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/organizations/${orgId}/branches`,
        {
          name: newBranchName,
          code: newBranchCode,
          address: newBranchAddress,
        },
        { headers: { 'X-Organization-Id': orgId } }
      );
      setShowBranchModal(false);
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      showNotification('Branch created successfully!');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to create branch', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/branches/${selectedBranchId}/services`,
        {
          name: newServiceName,
          code: newServiceCode,
          estimatedDurationMinutes: Number(newServiceDuration),
          priorityLevel: Number(newServicePriority),
        },
        { headers: { 'X-Organization-Id': orgId } }
      );
      setShowServiceModal(false);
      setNewServiceName('');
      setNewServiceCode('');
      showNotification('Service and Queue created successfully!');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to create service', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/branches/${selectedBranchId}/counters`,
        {
          name: newCounterName,
          number: newCounterNumber,
        },
        { headers: { 'X-Organization-Id': orgId } }
      );
      setShowCounterModal(false);
      setNewCounterName('');
      setNewCounterNumber('');
      showNotification('Service counter registered!');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to create counter', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setActionLoading(true);
    try {
      await apiClient.post(
        `/organizations/${orgId}/staff/invite`,
        {
          email: newStaffEmail,
          fullName: newStaffName,
          role: newStaffRole,
        },
        { headers: { 'X-Organization-Id': orgId } }
      );
      setShowStaffModal(false);
      setNewStaffEmail('');
      setNewStaffName('');
      showNotification('Staff member invited successfully!');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to invite staff', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleQueueStatus = async (queueId: string, currentStatus: string) => {
    if (!orgId) return;
    const nextStatus = currentStatus === 'OPEN' ? 'PAUSED' : 'OPEN';
    try {
      await apiClient.patch(
        `/queues/${queueId}/status`,
        { status: nextStatus },
        { headers: { 'X-Organization-Id': orgId } }
      );
      showNotification(`Queue is now ${nextStatus}`);
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to update queue', true);
    }
  };

  const handleSaveQueueConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQueueConfig || !orgId) return;
    setActionLoading(true);
    try {
      await apiClient.put(
        `/queues/${activeQueueConfig.id}/config`,
        {
          maxWaitingCapacity: Number(maxCapacity),
          bufferMinutes: Number(bufferMins),
          allowRemoteJoin: allowRemote,
        },
        { headers: { 'X-Organization-Id': orgId } }
      );
      setShowQueueConfigModal(false);
      showNotification('Queue configuration updated!');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to update configuration', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!orgId || !confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await apiClient.delete(`/organizations/${orgId}/staff/${userId}`, {
        headers: { 'X-Organization-Id': orgId },
      });
      showNotification('Staff member removed');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to remove staff', true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-white text-base tracking-tight">QueueLess Administration Portal</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tenant: <span className="font-semibold text-slate-200">{activeOrg?.organizationName || 'Global'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {memberships.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <select
                value={activeOrg?.organizationId || ''}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId} className="bg-slate-900 text-white">
                    {m.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
          >
            <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="text-right">
            <p className="text-xs font-semibold text-white">{user?.fullName}</p>
            <p className="text-[10px] text-slate-400">{activeOrg?.role || user?.role}</p>
          </div>

          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Admin Tabs Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 sticky top-[57px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex space-x-1.5 py-2.5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'branches', label: 'Branches', icon: MapPin },
              { id: 'services', label: 'Services', icon: Layers },
              { id: 'counters', label: 'Counters', icon: Sliders },
              { id: 'staff', label: 'Staff & Team', icon: Users },
              { id: 'queues', label: 'Queue Rules', icon: Clock },
              { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
              { id: 'audit', label: 'Audit Logs', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as Tab)}
                  className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Notifications Toast */}
      {errorMsg && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Branch Context Selector (for branch-specific views) */}
        {['services', 'counters', 'queues'].includes(currentTab) && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-3">
              <MapPin className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">Managing Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 outline-none font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400">
              {counters.length} Counters • {services.length} Services • {queues.length} Active Queues
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Branches</span>
                <p className="text-3xl font-extrabold text-white mt-2">{branches.length}</p>
                <span className="text-[10px] text-emerald-400 mt-1 block">Active service locations</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-xs text-slate-400 font-semibold uppercase">Staff Members</span>
                <p className="text-3xl font-extrabold text-indigo-400 mt-2">{staff.length}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Assigned operators & admins</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-xs text-slate-400 font-semibold uppercase">Tickets Issued</span>
                <p className="text-3xl font-extrabold text-sky-400 mt-2">{analytics?.summary?.totalTicketsIssued || 0}</p>
                <span className="text-[10px] text-sky-400 mt-1 block">Across all active branches</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-xs text-slate-400 font-semibold uppercase">Average Service Time</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {analytics?.summary?.avgServiceMinutes || 0} <span className="text-sm font-normal text-slate-400">min</span>
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Completed visit average</span>
              </div>
            </div>

            {/* Overview Quick Actions & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Branch Operations Snapshot</h3>
                  <button
                    onClick={() => setCurrentTab('branches')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    View All Branches →
                  </button>
                </div>
                <div className="divide-y divide-slate-800/80">
                  {branches.map((b) => (
                    <div key={b.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{b.name}</p>
                        <p className="text-xs text-slate-400">{b.address || 'Standard Location'} • Code: {b.code}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-base">Quick Administrative Tasks</h3>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setShowBranchModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center space-x-2 border border-slate-700/80"
                  >
                    <Plus className="h-4 w-4 text-indigo-400" />
                    <span>Create New Branch</span>
                  </button>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center space-x-2 border border-slate-700/80"
                  >
                    <Users className="h-4 w-4 text-sky-400" />
                    <span>Invite Staff Member</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('reports')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center space-x-2 border border-slate-700/80"
                  >
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                    <span>Generate Operational Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRANCHES */}
        {currentTab === 'branches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Facility Branches</h2>
                <p className="text-xs text-slate-400">Manage physical service centers, operating hours, and location data.</p>
              </div>
              <button
                onClick={() => setShowBranchModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{b.name}</h3>
                      <span className="font-mono text-xs text-indigo-400">Code: {b.code}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {b.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{b.address || 'Address not configured'}</span>
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>{b.phone || 'No phone'}</span>
                    <button
                      onClick={() => {
                        setSelectedBranchId(b.id);
                        setCurrentTab('services');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Manage Services →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES */}
        {currentTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Department Services</h2>
                <p className="text-xs text-slate-400">Create customer service offerings with automatic queue provisioning.</p>
              </div>
              <button
                onClick={() => setShowServiceModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="p-4">Service Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Est. Duration</th>
                    <th className="p-4">Priority Level</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white">{s.name}</td>
                      <td className="p-4 font-mono text-indigo-400">{s.code}</td>
                      <td className="p-4 text-slate-300">{s.estimatedDurationMinutes} minutes</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Tier {s.priorityLevel}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {s.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COUNTERS */}
        {currentTab === 'counters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Physical & Virtual Service Counters</h2>
                <p className="text-xs text-slate-400">Configure operator stations, status, and supported services.</p>
              </div>
              <button
                onClick={() => setShowCounterModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>Add Counter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counters.map((c) => (
                <div key={c.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">Counter #{c.number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.status === 'SERVING'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : c.status === 'IDLE'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">{c.name}</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Current Operator: <strong className="text-slate-200">{c.currentStaff?.fullName || 'Unassigned'}</strong></p>
                    <p>Supported Services: <span className="text-indigo-400">{c.supportedServices?.length || 0} configured</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF */}
        {currentTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Team Members & Role Access</h2>
                <p className="text-xs text-slate-400">Invite operators, grant RBAC permissions, and review memberships.</p>
              </div>
              <button
                onClick={() => setShowStaffModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>Invite Staff</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white">{m.user?.fullName}</td>
                      <td className="p-4 text-slate-300 font-mono">{m.user?.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {m.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {m.role !== 'ORG_OWNER' && (
                          <button
                            onClick={() => handleRemoveStaff(m.user?.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                            title="Remove staff member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: QUEUE RULES */}
        {currentTab === 'queues' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Queue Rules & Policies</h2>
                <p className="text-xs text-slate-400">Configure remote join policies, wait capacities, and pause/open controls.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queues.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{q.service?.name}</h3>
                      <span className="font-mono text-xs text-slate-400">Prefix: {q.prefix || 'Auto'}</span>
                    </div>
                    <button
                      onClick={() => handleToggleQueueStatus(q.id, q.status)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                        q.status === 'OPEN'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      <span>{q.status}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Waiting Count</span>
                      <strong className="text-white">{q._count?.tickets || 0} customers</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Max Capacity</span>
                      <strong className="text-white">{q.configuration?.maxWaitingCapacity || 100}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Buffer Time</span>
                      <strong className="text-white">{q.configuration?.bufferMinutes || 5} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Remote Join</span>
                      <strong className="text-emerald-400">{q.configuration?.allowRemoteJoin ? 'Enabled' : 'Disabled'}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveQueueConfig(q);
                      setMaxCapacity(q.configuration?.maxWaitingCapacity || 100);
                      setBufferMins(q.configuration?.bufferMinutes || 5);
                      setAllowRemote(q.configuration?.allowRemoteJoin ?? true);
                      setShowQueueConfigModal(true);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition border border-slate-700"
                  >
                    Edit Queue Configuration
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: REPORTS & ANALYTICS */}
        {currentTab === 'reports' && analytics && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Performance Reports & Analytics</h2>
                <p className="text-xs text-slate-400">Historical queue volumes, wait time trends, and status distribution.</p>
              </div>
            </div>

            {/* Status Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Completed Visits</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {analytics.summary.completedTicketsCount}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Successfully served</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Average Handling Time</span>
                <p className="text-3xl font-extrabold text-indigo-400 mt-2">
                  {analytics.summary.avgServiceMinutes} min
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Per customer consultation</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Active Counter Fleet</span>
                <p className="text-3xl font-extrabold text-sky-400 mt-2">
                  {analytics.summary.totalCounters}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Provisioned service counters</span>
              </div>
            </div>

            {/* Service Volume Breakdown */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base">Service Volume Breakdown</h3>
              <div className="space-y-3">
                {analytics.servicePerformance.map((sp: any) => (
                  <div key={sp.code} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{sp.name} ({sp.code})</span>
                      <span className="text-slate-400">{sp.ticketCount} tickets</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(10, (sp.ticketCount / (analytics.summary.totalTicketsIssued || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT LOGS */}
        {currentTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">System Audit Trail</h2>
                <p className="text-xs text-slate-400">Complete immutable record of all administrative, configuration, and security events.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-white font-semibold">
                          {log.user?.fullName || log.user?.email || 'System'}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">{log.entityType}</td>
                        <td className="p-4 font-mono text-slate-500">{log.entityId}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No audit events recorded yet for this organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE BRANCH MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateBranch} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New Branch</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Branch Name</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g. Downtown Central"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Branch Code</label>
              <input
                type="text"
                required
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                placeholder="e.g. DT01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Address</label>
              <input
                type="text"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                placeholder="123 Main Street"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE SERVICE MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateService} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add New Service</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Service Name</label>
              <input
                type="text"
                required
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. Pediatric Consultation"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Service Code (Prefix)</label>
              <input
                type="text"
                required
                value={newServiceCode}
                onChange={(e) => setNewServiceCode(e.target.value.toUpperCase())}
                placeholder="e.g. PED"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Est. Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Priority Tier</label>
                <select
                  value={newServicePriority}
                  onChange={(e) => setNewServicePriority(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>Tier 1 (Normal)</option>
                  <option value={2}>Tier 2 (High / Urgent)</option>
                  <option value={3}>Tier 3 (Emergency)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Create Service
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE COUNTER MODAL */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCounter} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Register Service Counter</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Counter Name</label>
              <input
                type="text"
                required
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                placeholder="e.g. Express Station A"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Counter Number</label>
              <input
                type="text"
                required
                value={newCounterNumber}
                onChange={(e) => setNewCounterNumber(e.target.value)}
                placeholder="e.g. 03"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCounterModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Create Counter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleInviteStaff} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Invite Staff Member</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Dr. Alice Smith"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="alice@metrohealth.org"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Role Assignment</label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ORG_STAFF">Staff Operator</option>
                <option value="ORG_ADMIN">Organization Administrator</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT QUEUE CONFIG MODAL */}
      {showQueueConfigModal && activeQueueConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveQueueConfig} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Queue Configuration</h3>
            <p className="text-xs text-slate-400">Settings for {activeQueueConfig.service?.name}</p>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Max Waiting Capacity</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Buffer Minutes Between Tickets</label>
              <input
                type="number"
                min="0"
                max="60"
                value={bufferMins}
                onChange={(e) => setBufferMins(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="allowRemote"
                checked={allowRemote}
                onChange={(e) => setAllowRemote(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="allowRemote" className="text-xs font-semibold text-slate-300">
                Allow Remote Joining from Customer Mobile App
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowQueueConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
