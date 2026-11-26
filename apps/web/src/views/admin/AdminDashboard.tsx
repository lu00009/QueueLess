import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
  ShieldCheck,
  Building2,
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
  X,
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
  const [showProfileModal, setShowProfileModal] = useState(false);
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
      try {
        const staffRes = await apiClient.get(`/organizations/${orgId}/staff`, {
          headers: { 'X-Organization-Id': orgId },
        });
        setStaff(staffRes.data.data);
      } catch (e) {
        // graceful fallback if staff list is restricted
      }

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

      // 4. Fetch Analytics and Audit logs gracefully
      const [analyticsResult, auditResult] = await Promise.allSettled([
        apiClient.get(`/organizations/${orgId}/analytics`, {
          headers: { 'X-Organization-Id': orgId },
        }),
        apiClient.get(`/organizations/${orgId}/audit-logs`, {
          headers: { 'X-Organization-Id': orgId },
        }),
      ]);

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value.data.data);
      }
      if (auditResult.status === 'fulfilled') {
        setAuditLogs(auditResult.value.data.data);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Error loading organization data', true);
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleActivateStaff = async (userId: string) => {
    if (!orgId) return;
    try {
      await apiClient.post(`/organizations/${orgId}/staff/${userId}/activate`, {}, {
        headers: { 'X-Organization-Id': orgId },
      });
      showNotification('Staff member activated successfully');
      loadData();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to activate staff', true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#14201A] flex flex-col font-sans">
      {/* Top Header - Simple & Professional */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-[12px] bg-[#E8F3EC] text-[#1F5C3A] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-[#14201A] text-base tracking-tight">QueueLess Administration Portal</h1>
              <span className="px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                Admin
              </span>
            </div>
            <p className="text-xs text-[#6B7A72]">
              Tenant: <span className="font-medium text-[#14201A]">{activeOrg?.organizationName || 'Global'}</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          {memberships.length > 1 && (
            <div className="flex items-center space-x-2 bg-white border border-[#E5E7EB] rounded-[12px] px-3 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-[#6B7A72]" />
              <select
                value={activeOrg?.organizationId || ''}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="bg-transparent text-[#14201A] font-medium focus:outline-none cursor-pointer text-xs"
              >
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-[12px] border border-[#E5E7EB] bg-white hover:bg-[#E8F3EC] transition text-left"
            title="Account Profile"
          >
            <div className="h-7 w-7 rounded-full bg-[#E8F3EC] text-[#1F5C3A] font-semibold text-xs flex items-center justify-center">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#14201A] leading-tight">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-[#6B7A72] leading-tight">{activeOrg?.role || user?.role || 'Staff'}</p>
            </div>
          </button>

          {/* Logout Text Button - Clean & Professional (No Icon) */}
          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-[12px] text-xs font-semibold text-[#14201A] bg-white border border-[#E5E7EB] hover:bg-[#E8F3EC] hover:border-[#1F5C3A] transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Admin Tabs Navigation */}
      <div className="border-b border-[#E5E7EB] bg-[#FAFAF7] px-6 sticky top-[57px] z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex space-x-1 py-2 overflow-x-auto">
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
                  className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-[12px] text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#1F5C3A] text-white shadow-sm'
                      : 'text-[#6B7A72] hover:text-[#14201A] hover:bg-[#E8F3EC]'
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
        <div className="bg-[#FEF2F2] border-b border-[#FCA5A5] px-6 py-2.5 flex items-center justify-between text-xs text-[#991B1B]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#DC2626] hover:text-[#991B1B]">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-[#E8F3EC] border-b border-[#A7D7B5] px-6 py-2.5 flex items-center justify-between text-xs text-[#1F5C3A]">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-[#1F5C3A] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#1F5C3A] hover:text-[#14201A]">✕</button>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Branch Context Selector (for branch-specific views) */}
        {['services', 'counters', 'queues'].includes(currentTab) && (
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-white border border-[#E5E7EB]">
            <div className="flex items-center space-x-3">
              <MapPin className="h-4 w-4 text-[#1F5C3A]" />
              <span className="text-xs font-semibold text-[#14201A]">Managing Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-white border border-[#E5E7EB] text-[#14201A] text-xs rounded-[12px] px-3 py-1.5 outline-none font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#6B7A72]">
              {counters.length} Counters • {services.length} Services • {queues.length} Active Queues
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Total Branches</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">{branches.length}</p>
                <span className="text-xs text-[#1F5C3A] mt-1 block">Active service locations</span>
              </div>
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Staff Members</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">{staff.length}</p>
                <span className="text-xs text-[#6B7A72] mt-1 block">Assigned operators & admins</span>
              </div>
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Tickets Issued</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">{analytics?.summary?.totalTicketsIssued || 0}</p>
                <span className="text-xs text-[#6B7A72] mt-1 block">Across all active branches</span>
              </div>
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Average Service Time</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">
                  {analytics?.summary?.avgServiceMinutes || 0} <span className="text-sm font-normal text-[#6B7A72]">min</span>
                </p>
                <span className="text-xs text-[#6B7A72] mt-1 block">Completed visit average</span>
              </div>
            </div>

            {/* Overview Quick Actions & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-6 rounded-[16px] bg-white border border-[#E5E7EB] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#14201A] text-base">Branch Operations Snapshot</h3>
                  <button
                    onClick={() => setCurrentTab('branches')}
                    className="text-xs text-[#1F5C3A] hover:underline font-semibold"
                  >
                    View All Branches →
                  </button>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  {branches.map((b) => (
                    <div key={b.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#14201A]">{b.name}</p>
                        <p className="text-xs text-[#6B7A72]">{b.address || 'Standard Location'} • Code: {b.code}</p>
                      </div>
                      {/* One small lime accent for operational state */}
                      <span className="px-2.5 py-1 rounded-[8px] text-xs font-semibold bg-[#B7E36B] text-[#14201A]">
                        Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 p-6 rounded-[16px] bg-white border border-[#E5E7EB] space-y-4">
                <h3 className="font-semibold text-[#14201A] text-base">Quick Administrative Tasks</h3>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setShowBranchModal(true)}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#FAFAF7] hover:bg-[#E8F3EC] text-[#14201A] text-xs font-semibold transition flex items-center space-x-2 border border-[#E5E7EB]"
                  >
                    <Plus className="h-4 w-4 text-[#1F5C3A]" />
                    <span>Create New Branch</span>
                  </button>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#FAFAF7] hover:bg-[#E8F3EC] text-[#14201A] text-xs font-semibold transition flex items-center space-x-2 border border-[#E5E7EB]"
                  >
                    <Users className="h-4 w-4 text-[#1F5C3A]" />
                    <span>Invite Staff Member</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('reports')}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#FAFAF7] hover:bg-[#E8F3EC] text-[#14201A] text-xs font-semibold transition flex items-center space-x-2 border border-[#E5E7EB]"
                  >
                    <BarChart3 className="h-4 w-4 text-[#1F5C3A]" />
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
                <h2 className="text-lg font-semibold text-[#14201A]">Facility Branches</h2>
                <p className="text-xs text-[#6B7A72]">Manage physical service centers, operating hours, and location data.</p>
              </div>
              <button
                onClick={() => setShowBranchModal(true)}
                className="px-4 py-2 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18472D] text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="p-5 rounded-[16px] bg-white border border-[#E5E7EB] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#14201A] text-sm">{b.name}</h3>
                      <span className="font-mono text-xs text-[#6B7A72]">Code: {b.code}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                      {b.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7A72] flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#6B7A72] shrink-0" />
                    <span>{b.address || 'Address not configured'}</span>
                  </p>
                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7A72]">
                    <span>{b.phone || 'No phone'}</span>
                    <button
                      onClick={() => {
                        setSelectedBranchId(b.id);
                        setCurrentTab('services');
                      }}
                      className="text-[#1F5C3A] hover:underline font-semibold"
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
                <h2 className="text-lg font-semibold text-[#14201A]">Department Services</h2>
                <p className="text-xs text-[#6B7A72]">Create customer service offerings with automatic queue provisioning.</p>
              </div>
              <button
                onClick={() => setShowServiceModal(true)}
                className="px-4 py-2 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18472D] text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E7EB] text-[#6B7A72] font-semibold uppercase">
                  <tr>
                    <th className="p-4">Service Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Est. Duration</th>
                    <th className="p-4">Priority Level</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAFAF7] transition">
                      <td className="p-4 font-semibold text-[#14201A]">{s.name}</td>
                      <td className="p-4 font-mono text-[#1F5C3A] font-semibold">{s.code}</td>
                      <td className="p-4 text-[#6B7A72]">{s.estimatedDurationMinutes} minutes</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                          Tier {s.priorityLevel}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
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
                <h2 className="text-lg font-semibold text-[#14201A]">Service Counters</h2>
                <p className="text-xs text-[#6B7A72]">Configure operator stations, status, and supported services.</p>
              </div>
              <button
                onClick={() => setShowCounterModal(true)}
                className="px-4 py-2 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18472D] text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Counter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counters.map((c) => (
                <div key={c.id} className="p-5 rounded-[16px] bg-white border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#6B7A72]">Counter #{c.number}</span>
                    <span className={`px-2 py-0.5 rounded-[8px] text-[10px] font-semibold ${
                      c.status === 'SERVING'
                        ? 'bg-[#E8F3EC] text-[#1F5C3A]'
                        : c.status === 'IDLE'
                        ? 'bg-[#E8F3EC] text-[#1F5C3A]'
                        : 'bg-gray-100 text-[#6B7A72]'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#14201A] text-base">{c.name}</h3>
                  <div className="text-xs text-[#6B7A72] space-y-1">
                    <p>Current Operator: <strong className="text-[#14201A]">{c.currentStaff?.fullName || 'Unassigned'}</strong></p>
                    <p>Supported Services: <span className="text-[#1F5C3A] font-semibold">{c.supportedServices?.length || 0} configured</span></p>
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
                <h2 className="text-lg font-semibold text-[#14201A]">Team Members & Role Access</h2>
                <p className="text-xs text-[#6B7A72]">Invite operators, grant RBAC permissions, and review memberships.</p>
              </div>
              <button
                onClick={() => setShowStaffModal(true)}
                className="px-4 py-2 rounded-[12px] bg-[#1F5C3A] hover:bg-[#18472D] text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Invite Staff</span>
              </button>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E7EB] text-[#6B7A72] font-semibold uppercase">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FAFAF7] transition">
                      <td className="p-4 font-semibold text-[#14201A]">{m.user?.fullName}</td>
                      <td className="p-4 text-[#6B7A72] font-mono">{m.user?.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                          {m.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-[8px] text-[10px] font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-[#E8F3EC] text-[#1F5C3A]'
                            : m.status === 'INVITED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {m.status === 'INVITED' && (
                            <button
                              onClick={() => handleActivateStaff(m.user?.id)}
                              className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[#E8F3EC] text-[#1F5C3A] hover:bg-[#D5EADF] transition"
                              title="Activate staff member"
                            >
                              Activate
                            </button>
                          )}
                          {m.role !== 'ORG_OWNER' && (
                            <button
                              onClick={() => handleRemoveStaff(m.user?.id)}
                              className="p-1.5 rounded-[8px] text-red-600 hover:bg-red-50 transition"
                              title="Remove staff member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
                <h2 className="text-lg font-semibold text-[#14201A]">Queue Rules & Policies</h2>
                <p className="text-xs text-[#6B7A72]">Configure remote join policies, wait capacities, and pause/open controls.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queues.map((q) => (
                <div key={q.id} className="p-5 rounded-[16px] bg-white border border-[#E5E7EB] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#14201A] text-base">{q.service?.name}</h3>
                      <span className="font-mono text-xs text-[#6B7A72]">Prefix: {q.prefix || 'Auto'}</span>
                    </div>
                    <button
                      onClick={() => handleToggleQueueStatus(q.id, q.status)}
                      className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition flex items-center space-x-1.5 ${
                        q.status === 'OPEN'
                          ? 'bg-[#E8F3EC] text-[#1F5C3A] hover:bg-[#D0E6D8]'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      <span>{q.status}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7A72] p-3 rounded-[12px] bg-[#FAFAF7] border border-[#E5E7EB]">
                    <div>
                      <span className="text-[10px] text-[#6B7A72] block">Waiting Count</span>
                      <strong className="text-[#14201A]">{q._count?.tickets || 0} customers</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A72] block">Max Capacity</span>
                      <strong className="text-[#14201A]">{q.configuration?.maxWaitingCapacity || 100}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A72] block">Buffer Time</span>
                      <strong className="text-[#14201A]">{q.configuration?.bufferMinutes || 5} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A72] block">Remote Join</span>
                      <strong className="text-[#1F5C3A]">{q.configuration?.allowRemoteJoin ? 'Enabled' : 'Disabled'}</strong>
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
                    className="w-full py-2 rounded-[12px] bg-white hover:bg-[#E8F3EC] text-xs font-semibold text-[#14201A] transition border border-[#E5E7EB]"
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
                <h2 className="text-lg font-semibold text-[#14201A]">Performance Reports & Analytics</h2>
                <p className="text-xs text-[#6B7A72]">Historical queue volumes, wait time trends, and status distribution.</p>
              </div>
            </div>

            {/* Status Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Total Completed Visits</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">
                  {analytics.summary.completedTicketsCount}
                </p>
                <span className="text-xs text-[#1F5C3A] mt-1 block">Successfully served</span>
              </div>
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Average Handling Time</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">
                  {analytics.summary.avgServiceMinutes} min
                </p>
                <span className="text-xs text-[#6B7A72] mt-1 block">Per customer consultation</span>
              </div>
              <div className="p-5 rounded-[16px] bg-white border border-[#E5E7EB]">
                <span className="text-xs text-[#6B7A72] font-semibold uppercase">Active Counter Fleet</span>
                <p className="text-3xl font-semibold text-[#14201A] mt-2">
                  {analytics.summary.totalCounters}
                </p>
                <span className="text-xs text-[#6B7A72] mt-1 block">Provisioned service counters</span>
              </div>
            </div>

            {/* Service Volume Breakdown */}
            <div className="p-6 rounded-[16px] bg-white border border-[#E5E7EB] space-y-4">
              <h3 className="font-semibold text-[#14201A] text-base">Service Volume Breakdown</h3>
              <div className="space-y-3">
                {analytics.servicePerformance?.map((sp: any) => (
                  <div key={sp.code} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#14201A] font-medium">{sp.name} ({sp.code})</span>
                      <span className="text-[#6B7A72]">{sp.ticketCount} tickets</span>
                    </div>
                    <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1F5C3A] rounded-full"
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
                <h2 className="text-lg font-semibold text-[#14201A]">System Audit Trail</h2>
                <p className="text-xs text-[#6B7A72]">Complete immutable record of administrative, configuration, and security events.</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E7EB] text-[#6B7A72] font-semibold uppercase">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAFAF7] transition">
                        <td className="p-4 text-[#6B7A72] font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-[#14201A] font-semibold">
                          {log.user?.fullName || log.user?.email || 'System'}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#E8F3EC] text-[#1F5C3A]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-[#6B7A72]">{log.entityType}</td>
                        <td className="p-4 font-mono text-[#6B7A72]">{log.entityId}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#6B7A72]">
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

      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-sm w-full p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#14201A]">Account Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-[#6B7A72] hover:text-[#14201A] p-1 rounded-[8px]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-[12px] bg-[#E8F3EC] space-y-1">
              <p className="text-sm font-semibold text-[#14201A]">{user?.fullName || 'Administrator'}</p>
              <p className="text-xs text-[#6B7A72]">{user?.email}</p>
              <p className="text-xs text-[#1F5C3A] font-medium pt-1">
                Role: {activeOrg?.role || user?.role}
              </p>
            </div>

            <div className="space-y-2 text-xs text-[#6B7A72]">
              <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                <span>Organization</span>
                <span className="font-semibold text-[#14201A]">{activeOrg?.organizationName || 'Global'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                <span>User ID</span>
                <span className="font-mono text-[#6B7A72]">{user?.id || '—'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] hover:bg-[#E8F3EC] text-[#14201A] border border-[#E5E7EB]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateBranch} className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-[#14201A]">Create New Branch</h3>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Branch Name</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g. Downtown Central"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Branch Code</label>
              <input
                type="text"
                required
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                placeholder="e.g. DT01"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Address</label>
              <input
                type="text"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                placeholder="123 Main Street"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] text-[#6B7A72] hover:text-[#14201A] border border-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18472D] text-white shadow-sm"
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE SERVICE MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateService} className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-[#14201A]">Add New Service</h3>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Service Name</label>
              <input
                type="text"
                required
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. General Consultation"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Service Code (Prefix)</label>
              <input
                type="text"
                required
                value={newServiceCode}
                onChange={(e) => setNewServiceCode(e.target.value.toUpperCase())}
                placeholder="e.g. GEN"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A] font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Est. Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Priority Tier</label>
                <select
                  value={newServicePriority}
                  onChange={(e) => setNewServicePriority(Number(e.target.value))}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
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
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] text-[#6B7A72] hover:text-[#14201A] border border-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18472D] text-white shadow-sm"
              >
                Create Service
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE COUNTER MODAL */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCounter} className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-[#14201A]">Register Service Counter</h3>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Counter Name</label>
              <input
                type="text"
                required
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                placeholder="e.g. Express Station A"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Counter Number</label>
              <input
                type="text"
                required
                value={newCounterNumber}
                onChange={(e) => setNewCounterNumber(e.target.value)}
                placeholder="e.g. 01"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A] font-mono"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCounterModal(false)}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] text-[#6B7A72] hover:text-[#14201A] border border-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18472D] text-white shadow-sm"
              >
                Create Counter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleInviteStaff} className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-[#14201A]">Invite Staff Member</h3>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Full Name</label>
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="jane@metrohealth.org"
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Role Assignment</label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              >
                <option value="ORG_STAFF">Staff Operator</option>
                <option value="ORG_ADMIN">Organization Administrator</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] text-[#6B7A72] hover:text-[#14201A] border border-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18472D] text-white shadow-sm"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT QUEUE CONFIG MODAL */}
      {showQueueConfigModal && activeQueueConfig && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveQueueConfig} className="bg-white border border-[#E5E7EB] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-[#14201A]">Queue Configuration</h3>
            <p className="text-xs text-[#6B7A72]">Settings for {activeQueueConfig.service?.name}</p>

            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Max Waiting Capacity</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#6B7A72] block mb-1">Buffer Minutes Between Tickets</label>
              <input
                type="number"
                min="0"
                max="60"
                value={bufferMins}
                onChange={(e) => setBufferMins(Number(e.target.value))}
                className="w-full bg-white border border-[#E5E7EB] rounded-[12px] p-2.5 text-xs text-[#14201A] outline-none focus:border-[#1F5C3A]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="allowRemote"
                checked={allowRemote}
                onChange={(e) => setAllowRemote(e.target.checked)}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#1F5C3A] focus:ring-[#1F5C3A]"
              />
              <label htmlFor="allowRemote" className="text-xs font-semibold text-[#14201A]">
                Allow Remote Joining from Customer Mobile App
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowQueueConfigModal(false)}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#FAFAF7] text-[#6B7A72] hover:text-[#14201A] border border-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-[#1F5C3A] hover:bg-[#18472D] text-white shadow-sm"
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
