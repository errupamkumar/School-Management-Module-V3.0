'use client';
import { useState } from 'react';
import {
  Bus, Plus, Search, Filter, Phone, MapPin, Users, Shield,
  Clock, Navigation, CheckCircle2, AlertTriangle, ArrowRight, X, MessageSquare
} from 'lucide-react';

interface TransportRouteItem {
  id: string;
  routeNo: string;
  routeName: string;
  vehicleNo: string;
  vehicleModel: string;
  capacity: number;
  assignedStudents: number;
  driverName: string;
  driverPhone: string;
  conductorName: string;
  monthlyFee: number;
  status: 'ACTIVE' | 'MAINTENANCE';
  stops: { name: string; pickupTime: string; dropTime: string }[];
}

const initialRoutes: TransportRouteItem[] = [
  {
    id: '1',
    routeNo: 'Route 01',
    routeName: 'Sector 62 Metro -> Indirapuram -> Main Campus',
    vehicleNo: 'UP-16-AT-9021',
    vehicleModel: 'Tata Starbus 42 Seater (AC)',
    capacity: 42,
    assignedStudents: 38,
    driverName: 'Ram Singh Yadav',
    driverPhone: '+91 98765 11223',
    conductorName: 'Dharmendra Kumar',
    monthlyFee: 2400,
    status: 'ACTIVE',
    stops: [
      { name: 'Sec 62 Metro Gate 2', pickupTime: '06:50 AM', dropTime: '02:30 PM' },
      { name: 'Shipra Mall Indirapuram', pickupTime: '07:05 AM', dropTime: '02:15 PM' },
      { name: 'Kala Pathar Road', pickupTime: '07:15 AM', dropTime: '02:05 PM' },
      { name: 'Main Campus Gate 1', pickupTime: '07:35 AM', dropTime: '01:45 PM' },
    ],
  },
  {
    id: '2',
    routeNo: 'Route 02',
    routeName: 'Vaishali -> Kaushambi -> Main Campus',
    vehicleNo: 'UP-14-BT-4412',
    vehicleModel: 'Ashok Leyland Sunshine 36 Seater',
    capacity: 36,
    assignedStudents: 32,
    driverName: 'Mohan Singh',
    driverPhone: '+91 98112 33445',
    conductorName: 'Mukesh Sharma',
    monthlyFee: 2200,
    status: 'ACTIVE',
    stops: [
      { name: 'Vaishali Sector 4 Central Park', pickupTime: '07:00 AM', dropTime: '02:25 PM' },
      { name: 'Kaushambi Wave Cinema', pickupTime: '07:12 AM', dropTime: '02:10 PM' },
      { name: 'Main Campus Gate 1', pickupTime: '07:40 AM', dropTime: '01:45 PM' },
    ],
  },
  {
    id: '3',
    routeNo: 'Route 03',
    routeName: 'Vasundhara Sector 1-16 Circuit',
    vehicleNo: 'UP-16-CT-7789',
    vehicleModel: 'Force Traveller 26 Seater',
    capacity: 26,
    assignedStudents: 24,
    driverName: 'Surender Rawat',
    driverPhone: '+91 98990 88776',
    conductorName: 'Pappu Lal',
    monthlyFee: 2000,
    status: 'ACTIVE',
    stops: [
      { name: 'Vasundhara Sector 1 Market', pickupTime: '07:05 AM', dropTime: '02:20 PM' },
      { name: 'Sector 9 Mother Dairy', pickupTime: '07:15 AM', dropTime: '02:10 PM' },
      { name: 'Main Campus Gate 1', pickupTime: '07:35 AM', dropTime: '01:45 PM' },
    ],
  },
  {
    id: '4',
    routeNo: 'Route 04',
    routeName: 'Crossings Republik -> Crossing Square',
    vehicleNo: 'UP-14-DT-1209',
    vehicleModel: 'Eicher Starline 32 Seater',
    capacity: 32,
    assignedStudents: 0,
    driverName: 'Satish Chand',
    driverPhone: '+91 97112 00998',
    conductorName: 'Jagdish Mehra',
    monthlyFee: 2500,
    status: 'MAINTENANCE',
    stops: [
      { name: 'Crossings Gate No 1', pickupTime: '06:45 AM', dropTime: '02:35 PM' },
      { name: 'Panchsheel Wellington', pickupTime: '07:00 AM', dropTime: '02:20 PM' },
      { name: 'Main Campus Gate 1', pickupTime: '07:35 AM', dropTime: '01:45 PM' },
    ],
  },
];

export default function TransportPage() {
  const [routes, setRoutes] = useState<TransportRouteItem[]>(initialRoutes);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    routeNo: '',
    routeName: '',
    vehicleNo: '',
    vehicleModel: 'Tata Starbus 40 Seater',
    capacity: 40,
    driverName: '',
    driverPhone: '',
    conductorName: '',
    monthlyFee: 2200,
  });

  const totalCapacity = routes.reduce((acc, r) => acc + r.capacity, 0);
  const totalEnrolled = routes.reduce((acc, r) => acc + r.assignedStudents, 0);

  const filteredRoutes = routes.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.routeNo.toLowerCase().includes(q) ||
        r.routeName.toLowerCase().includes(q) ||
        r.vehicleNo.toLowerCase().includes(q) ||
        r.driverName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.routeNo || !formData.routeName || !formData.vehicleNo) return;

    const newR: TransportRouteItem = {
      id: String(Date.now()),
      routeNo: formData.routeNo,
      routeName: formData.routeName,
      vehicleNo: formData.vehicleNo,
      vehicleModel: formData.vehicleModel,
      capacity: Number(formData.capacity) || 30,
      assignedStudents: 0,
      driverName: formData.driverName || 'Designated Driver',
      driverPhone: formData.driverPhone || '+91 98000 00000',
      conductorName: formData.conductorName || 'Staff Conductor',
      monthlyFee: Number(formData.monthlyFee) || 2000,
      status: 'ACTIVE',
      stops: [
        { name: 'Route Origin Hub', pickupTime: '07:00 AM', dropTime: '02:30 PM' },
        { name: 'Main Campus', pickupTime: '07:35 AM', dropTime: '01:45 PM' },
      ],
    };

    setRoutes([...routes, newR]);
    setShowAddModal(false);
    setFormData({
      routeNo: '',
      routeName: '',
      vehicleNo: '',
      vehicleModel: 'Tata Starbus 40 Seater',
      capacity: 40,
      driverName: '',
      driverPhone: '',
      conductorName: '',
      monthlyFee: 2200,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Bus size={16} />
              <span>Fleet Operations • परिवहन प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              School Transport & Bus Fleet
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Real-time route management, stop sequence monitoring, vehicle fitness compliance, and emergency driver/parent communication.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Add New Bus Route</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Routes</span>
          <p className="text-2xl font-black text-gray-900 mt-2">{routes.length} Routes</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">Covering 18 suburban sectors</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commuting Students</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalEnrolled} Students</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(totalEnrolled / totalCapacity) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fleet Utilization</span>
          <p className="text-2xl font-black text-blue-600 mt-2">
            {Math.round((totalEnrolled / totalCapacity) * 100)}% Occupancy
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalCapacity} Total seat capacity</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GPS & Safety Trackers</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">All Live</p>
          <p className="text-xs text-gray-400 mt-1">Speed governors & CCTV active</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search route name, bus number, driver..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
        <span className="text-xs font-bold text-gray-500 hidden sm:inline">
          Showing {filteredRoutes.length} Fleet Vehicles
        </span>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-xl">
                    {route.routeNo}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {route.vehicleNo}
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  route.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {route.status}
                </span>
              </div>

              {/* Route Name */}
              <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                {route.routeName}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{route.vehicleModel}</p>

              {/* Occupancy Bar */}
              <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600">Student Capacity</span>
                  <span className="text-purple-700">{route.assignedStudents} / {route.capacity} Seats</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (route.assignedStudents / route.capacity) > 0.9 ? 'bg-amber-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${(route.assignedStudents / route.capacity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Crew Particulars */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/60">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Driver</p>
                  <p className="font-bold text-gray-900 mt-0.5">{route.driverName}</p>
                  <a
                    href={`tel:${route.driverPhone}`}
                    className="mt-1 text-purple-700 font-semibold inline-flex items-center gap-1 hover:underline text-[11px]"
                  >
                    <Phone size={11} /> {route.driverPhone}
                  </a>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Conductor</p>
                  <p className="font-bold text-gray-900 mt-0.5">{route.conductorName}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Fee: ₹{route.monthlyFee}/mo</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedRoute(route)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
              >
                <span>View {route.stops.length} Route Stops</span>
                <ArrowRight size={13} />
              </button>

              <a
                href={`https://wa.me/${route.driverPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <MessageSquare size={13} />
                <span>Driver WhatsApp</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Route Stops Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedRoute.routeNo} Stops & Schedule</h3>
                <p className="text-xs text-gray-400">{selectedRoute.routeName}</p>
              </div>
              <button
                onClick={() => setSelectedRoute(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 my-5">
              {selectedRoute.stops.map((stop, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    {idx < selectedRoute.stops.length - 1 && (
                      <div className="w-0.5 h-8 bg-purple-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <h5 className="font-bold text-gray-900 text-xs">{stop.name}</h5>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span>Pickup: <strong className="text-purple-700">{stop.pickupTime}</strong></span>
                      <span>Drop: <strong className="text-gray-700">{stop.dropTime}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedRoute(null)}
                className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Bus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Add Transport Route</h3>
                  <p className="text-xs text-gray-400">Register new bus or van transit itinerary</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Route Identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Route 05"
                    value={formData.routeNo}
                    onChange={(e) => setFormData({ ...formData, routeNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Reg No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UP-16-EK-5544"
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Route Title / Circuit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raj Nagar Extension -> DPS Chowk -> Main Campus"
                  value={formData.routeName}
                  onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    min="10"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Suraj Pal"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
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
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
