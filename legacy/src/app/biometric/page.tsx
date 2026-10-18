'use client';
import { useState } from 'react';
import {
  Fingerprint, Plus, RefreshCw, Wifi, WifiOff, Search,
  CheckCircle2, Clock, ShieldCheck, Radio, AlertCircle, Laptop,
  Activity, X
} from 'lucide-react';

interface BiometricDeviceItem {
  id: string;
  name: string;
  model: string;
  ipAddress: string;
  port: number;
  location: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSync: string;
  totalPunchesToday: number;
}

interface PunchLog {
  id: string;
  time: string;
  personName: string;
  role: 'STAFF' | 'STUDENT';
  empOrAdmNo: string;
  direction: 'IN' | 'OUT';
  method: 'FINGERPRINT' | 'FACE' | 'RFID';
  deviceName: string;
}

const initialDevices: BiometricDeviceItem[] = [
  { id: '1', name: 'Main Gate Terminal 1', model: 'eSSL SilkBio-101TC (Face + Fingerprint)', ipAddress: '192.168.1.201', port: 4370, location: 'Campus Main Entry Turnstile', status: 'ONLINE', lastSync: 'Just now (16:29)', totalPunchesToday: 482 },
  { id: '2', name: 'Staff Room Entry Unit', model: 'ZKTeco K40 Pro Bio-Reader', ipAddress: '192.168.1.202', port: 4370, location: 'Faculty Administrative Wing', status: 'ONLINE', lastSync: '2 mins ago', totalPunchesToday: 84 },
  { id: '3', name: 'Junior Wing Entrance', model: 'Realtime T502 Hybrid', ipAddress: '192.168.1.203', port: 4370, location: 'Primary School Block Gate', status: 'ONLINE', lastSync: '5 mins ago', totalPunchesToday: 215 },
  { id: '4', name: 'Sports Complex Gate', model: 'ZKTeco InBio 260 Door Controller', ipAddress: '192.168.1.204', port: 4370, location: 'Gymnasium & Indoor Arena', status: 'OFFLINE', lastSync: '4 hours ago', totalPunchesToday: 12 },
];

const initialLogs: PunchLog[] = [
  { id: '1', time: '04:28:15 PM', personName: 'Dr. Rajesh Khanna', role: 'STAFF', empOrAdmNo: 'EMP-T101', direction: 'OUT', method: 'FACE', deviceName: 'Staff Room Entry Unit' },
  { id: '2', time: '04:26:40 PM', personName: 'Sunita Sharma', role: 'STAFF', empOrAdmNo: 'EMP-T102', direction: 'OUT', method: 'FINGERPRINT', deviceName: 'Staff Room Entry Unit' },
  { id: '3', time: '02:05:12 PM', personName: 'Aarav Sharma', role: 'STUDENT', empOrAdmNo: 'ADM2026001', direction: 'OUT', method: 'RFID', deviceName: 'Main Gate Terminal 1' },
  { id: '4', time: '02:03:55 PM', personName: 'Priya Verma', role: 'STUDENT', empOrAdmNo: 'ADM2026008', direction: 'OUT', method: 'RFID', deviceName: 'Main Gate Terminal 1' },
  { id: '5', time: '07:54:21 AM', personName: 'Dr. Rajesh Khanna', role: 'STAFF', empOrAdmNo: 'EMP-T101', direction: 'IN', method: 'FACE', deviceName: 'Main Gate Terminal 1' },
  { id: '6', time: '07:48:30 AM', personName: 'Aarav Sharma', role: 'STUDENT', empOrAdmNo: 'ADM2026001', direction: 'IN', method: 'RFID', deviceName: 'Main Gate Terminal 1' },
];

export default function BiometricPage() {
  const [devices, setDevices] = useState<BiometricDeviceItem[]>(initialDevices);
  const [logs, setLogs] = useState<PunchLog[]>(initialLogs);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    model: 'eSSL SilkBio-101TC',
    ipAddress: '192.168.1.',
    port: 4370,
    location: '',
  });

  const totalPunches = devices.reduce((sum, d) => sum + d.totalPunchesToday, 0);
  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setDevices(devices.map(d => ({
        ...d,
        lastSync: 'Just now',
        totalPunchesToday: d.totalPunchesToday + Math.floor(Math.random() * 5),
      })));
    }, 1500);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ipAddress) return;

    const newDev: BiometricDeviceItem = {
      id: String(Date.now()),
      name: formData.name,
      model: formData.model,
      ipAddress: formData.ipAddress,
      port: Number(formData.port) || 4370,
      location: formData.location || 'Campus Gate',
      status: 'ONLINE',
      lastSync: 'Just registered',
      totalPunchesToday: 0,
    };

    setDevices([...devices, newDev]);
    setShowAddModal(false);
    setFormData({
      name: '',
      model: 'eSSL SilkBio-101TC',
      ipAddress: '192.168.1.',
      port: 4370,
      location: '',
    });
  };

  const filteredLogs = logs.filter(l => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.personName.toLowerCase().includes(q) ||
        l.empOrAdmNo.toLowerCase().includes(q) ||
        l.deviceName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Fingerprint size={16} />
              <span>Hardware IoT Hub • बायोमेट्रिक उपकरण</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Biometric Attendance Devices
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Real-time TCP/IP sync with eSSL, ZKTeco and Realtime fingerprint, facial recognition, and RFID turnstile punch machines.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing Terminals...' : 'Sync All Devices'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs sm:text-sm backdrop-blur-sm border border-white/20 transition-all"
            >
              <Plus size={16} />
              <span>Add Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Devices</span>
          <p className="text-2xl font-black text-gray-900 mt-2">{devices.length} Units</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">ZKTeco & eSSL protocol</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Online Status</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{onlineCount} / {devices.length} Online</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(onlineCount / devices.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Total Punches</span>
          <p className="text-2xl font-black text-purple-700 mt-2">{totalPunches.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">Auto-marked in attendance ledger</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Network Health</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">99.4%</p>
          <p className="text-xs text-gray-400 mt-1">Avg response latency: 18ms</p>
        </div>
      </div>

      {/* Hardware Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {devices.map((device) => (
          <div
            key={device.id}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">{device.name}</h3>
                    <p className="text-[11px] text-gray-400">{device.location}</p>
                  </div>
                </div>

                {device.status === 'ONLINE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-100">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Offline
                  </span>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Model:</span>
                  <span className="font-semibold text-gray-800">{device.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IP & Port:</span>
                  <span className="font-mono font-bold text-purple-700">{device.ipAddress}:{device.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Synced:</span>
                  <span className="font-semibold text-gray-700">{device.lastSync}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Punches Today: <strong className="text-purple-700">{device.totalPunchesToday}</strong>
              </span>

              <button
                onClick={() => {
                  setDevices(devices.map(d => d.id === device.id ? { ...d, lastSync: 'Just now' } : d));
                  alert(`Terminal ${device.name} synchronized successfully.`);
                }}
                className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Ping Device</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Punch Logs Stream */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <div>
              <h3 className="font-bold text-gray-900 text-base">Live Attendance Stream</h3>
              <p className="text-xs text-gray-400">Real-time biometric punch stream from turnstiles</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person or ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">Name & ID</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Direction</th>
                <th className="px-5 py-3.5">Verification Mode</th>
                <th className="px-5 py-3.5">Device Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-900">{log.time}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-gray-900">{log.personName}</div>
                    <div className="text-[11px] text-gray-400">{log.empOrAdmNo}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold">
                      {log.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {log.direction === 'IN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Check-IN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        Check-OUT
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-purple-700">{log.method}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{log.deviceName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Configure Biometric Terminal</h3>
                  <p className="text-xs text-gray-400">Connect attendance reader over local network</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Terminal Identifier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Wing Entrance Biometric"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hardware Model / Make</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                >
                  <option value="eSSL SilkBio-101TC">eSSL SilkBio-101TC (Face + Fingerprint)</option>
                  <option value="ZKTeco K40 Pro">ZKTeco K40 Pro (Fingerprint + RFID)</option>
                  <option value="Realtime T502">Realtime T502 Hybrid Facial Reader</option>
                  <option value="ZKTeco InBio 260">ZKTeco InBio 260 Turnstile Controller</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">IP Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.205"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">TCP Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 4370 })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. Science Block Ground Floor Lobby"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
