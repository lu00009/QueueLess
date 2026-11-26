import React, { useState, useEffect } from 'react';
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
  Calendar,
  AlertCircle
} from 'lucide-react';

type Tab = 'branches' | 'services' | 'counters' | 'staff' | 'queues';

export const AdminDashboard: React.FC = () => {
  const { user, activeOrg, memberships, setActiveOrgId, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('branches');

  // State data from backend
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [, setLoading] = useState<boolean>(true);
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

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterNumber, setNewCounterNumber] = useState('');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('ORG_STAFF');
  const [newStaffName, setNewStaffName] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeOrg?.organizationId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch branches
      const branchRes = await apiClient.get(`/organizations/${activeOrg.organizationId}/branches`);
      const branchList = branchRes.data.data;
      setBranches(branchList);

      const activeBId = selectedBranchId || (branchList.length > 0 ? branchList[0].id : '');
      setSelectedBranchId(activeBId);

      // 2. Fetch staff
      const staffRes = await apiClient.get(`/organizations/${activeOrg.organizationId}/staff`);
      setStaff(staffRes.data.data);

      if (activeBId) {
        // 3. Fetch services, counters, and queues for selected branch
        const [servRes, countRes, queueRes] = await Promise.all([
          apiClient.get(`/branches/${activeBId}/services`),
          apiClient.get(`/branches/${activeBId}/counters`),
          apiClient.get(`/branches/${activeBId}/queues`),
        ]);
        setServices(servRes.data.data);
        setCounters(countRes.data.data);
        setQueues(queueRes.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Error loading organization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg?.organizationId, selectedBranchId]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/organizations/${activeOrg!.organizationId}/branches`, {
        name: newBranchName,
        code: newBranchCode,
        address: newBranchAddress,
      });
      setShowBranchModal(false);
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create branch');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    try {
      await apiClient.post(`/branches/${selectedBranchId}/services`, {
        name: newServiceName,
        code: newServiceCode,
        estimatedDurationMinutes: Number(newServiceDuration),
      });
      setShowServiceModal(false);
      setNewServiceName('');
      setNewServiceCode('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create service');
    }
  };

  const handleCreateCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    try {
      await apiClient.post(`/branches/${selectedBranchId}/counters`, {
        name: newCounterName,
        number: newCounterNumber,
      });
      setShowCounterModal(false);
      setNewCounterName('');
      setNewCounterNumber('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create counter');
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/organizations/${activeOrg!.organizationId}/staff/invite`, {
        email: newStaffEmail,
        fullName: newStaffName,
        role: newStaffRole,
      });
      setShowStaffModal(false);
      setNewStaffEmail('');
      setNewStaffName('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to invite staff');
    }
  };

  const handleToggleQueueStatus = async (queueId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'PAUSED' : 'OPEN';
    try {
      await apiClient.patch(`/queues/${queueId}/status`, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update queue');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">QueueLess Admin</h1>
            <p className="text-xs text-indigo-400 mt-1">
              Tenant: <span className="font-semibold text-slate-200">{activeOrg?.organizationName || 'Global'}</span>
            </p>
          </div>
        </div>

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
                    {m.organizationName}
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

      {/* Admin Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex space-x-2 py-2 overflow-x-auto">
            {[
              { id: 'branches', label: 'Branches', icon: MapPin },
              { id: 'services', label: 'Services', icon: Layers },
              { id: 'counters', label: 'Service Counters', icon: Sliders },
              { id: 'staff', label: 'Staff & Team', icon: Users },
              { id: 'queues', label: 'Queue Rules', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as Tab)}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
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

          {/* Branch Selector for service-level tabs */}
          {branches.length > 0 && currentTab !== 'branches' && currentTab !== 'staff' && (
            <div className="flex items-center space-x-2 py-2">
              <span className="text-xs text-slate-400">Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-2.5 py-1 focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-950/40 border border-red-800/50 p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* 1. BRANCHES TAB */}
        {currentTab === 'branches' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Facility Branches</h2>
                <p className="text-xs text-slate-400 mt-1">Manage physical locations, codes, and 7-day operating hours.</p>
              </div>
              <button
                onClick={() => setShowBranchModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {branches.map((branch) => (
                <div key={branch.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {branch.code}
                        </span>
                        <h3 className="text-base font-bold text-white">{branch.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        <span>{branch.address || 'No address specified'}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  {/* Operating Hours Table Preview */}
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Operating Hours</span>
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => {
                        const h = branch.operatingHours?.find((item: any) => item.dayOfWeek === idx);
                        const isClosed = !h || h.isClosed;
                        return (
                          <div key={d} className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px]">
                            <p className="font-semibold text-slate-400">{d}</p>
                            <p className={`mt-0.5 font-mono ${isClosed ? 'text-red-400' : 'text-slate-300'}`}>
                              {isClosed ? 'Closed' : h.openTime}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. SERVICES TAB */}
        {currentTab === 'services' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Services & Treatments</h2>
                <p className="text-xs text-slate-400 mt-1">Configured services for {branches.find(b => b.id === selectedBranchId)?.name || 'Branch'}</p>
              </div>
              <button
                onClick={() => setShowServiceModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((s) => (
                <div key={s.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {s.code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description || 'Standard service'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/60">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Duration</span>
                      <p className="text-sm font-bold text-white mt-0.5">{s.estimatedDurationMinutes} mins</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Priority</span>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">Tier {s.priorityLevel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. COUNTERS TAB */}
        {currentTab === 'counters' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Service Counters</h2>
                <p className="text-xs text-slate-400 mt-1">Physical service desks and staff counter allocation.</p>
              </div>
              <button
                onClick={() => setShowCounterModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Counter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {counters.map((c) => (
                <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-white">
                        {c.number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{c.name}</h3>
                        <p className="text-xs text-slate-400">Desk #{c.number}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.status === 'SERVING'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : c.status === 'IDLE'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Supported Services</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.supportedServices?.map((cs: any) => (
                        <span key={cs.id} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                          {cs.service?.name}
                        </span>
                      ))}
                      {(!c.supportedServices || c.supportedServices.length === 0) && (
                        <span className="text-xs text-slate-500">All branch services</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. STAFF TAB */}
        {currentTab === 'staff' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Staff & Organization Members</h2>
                <p className="text-xs text-slate-400 mt-1">Manage personnel, role assignments, and team invitations.</p>
              </div>
              <button
                onClick={() => setShowStaffModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>Invite Staff</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/60">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Staff Member</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{m.user?.fullName}</div>
                        <div className="text-slate-400 text-[11px]">{m.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-emerald-400 font-medium">
                        Active
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. QUEUES TAB */}
        {currentTab === 'queues' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Queue Configurations & Rules</h2>
                <p className="text-xs text-slate-400 mt-1">Control queue admission status, waiting capacities, and buffer rules.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {queues.map((q) => (
                <div key={q.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{q.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Service: {q.service?.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleQueueStatus(q.id, q.status)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        q.status === 'OPEN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                      }`}
                    >
                      {q.status === 'OPEN' ? 'Queue is OPEN (Click to Pause)' : 'Queue is PAUSED (Click to Open)'}
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Max Waiting</span>
                      <p className="text-base font-bold text-white mt-1">{q.configuration?.maxWaitingCapacity || 100}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Geofence</span>
                      <p className="text-base font-bold text-white mt-1">{q.configuration?.geofenceRadiusMeters || 5000}m</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Buffer</span>
                      <p className="text-base font-bold text-white mt-1">{q.configuration?.bufferMinutes || 5} mins</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CREATE BRANCH MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uptown Clinic"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Branch Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPT1"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs uppercase"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Address</label>
                <input
                  type="text"
                  placeholder="e.g. 450 Broadway Ave"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SERVICE MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Service</h3>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dental Care"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Service Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DENT"
                  value={newServiceCode}
                  onChange={(e) => setNewServiceCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs uppercase"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Estimated Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUNTER MODAL */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Service Counter</h3>
            <form onSubmit={handleCreateCounter} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Counter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 3 (Triage)"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Counter Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3"
                  value={newCounterNumber}
                  onChange={(e) => setNewCounterNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Invite Staff Member</h3>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Emily Watson"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. emily@organization.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold uppercase">Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="ORG_STAFF">Staff (Counter Operator)</option>
                  <option value="ORG_ADMIN">Administrator (Branch Manager)</option>
                  <option value="ORG_OWNER">Organization Owner</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
