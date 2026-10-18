'use client';
import { useState } from 'react';
import {
  CreditCard, Printer, Download, Search, Filter, CheckSquare,
  Square, RefreshCw, UserCheck, ShieldCheck, QrCode, Phone,
  Droplet, Calendar, School
} from 'lucide-react';

interface CardHolder {
  id: string;
  code: string;
  name: string;
  type: 'STUDENT' | 'STAFF';
  subText: string; // Class 10-A or PGT Physics
  guardianOrDept: string;
  bloodGroup: string;
  emergencyPhone: string;
  validUpto: string;
  avatarBg: string;
}

const initialHolders: CardHolder[] = [
  { id: '1', code: 'ADM-2026-001', name: 'Aarav Sharma', type: 'STUDENT', subText: 'Class 10-A (Roll 01)', guardianOrDept: "Father: Rajesh Sharma", bloodGroup: 'B+', emergencyPhone: '+91 98765 43210', validUpto: 'Mar 2027', avatarBg: 'from-blue-600 to-indigo-600' },
  { id: '2', code: 'ADM-2026-002', name: 'Ananya Patel', type: 'STUDENT', subText: 'Class 10-A (Roll 02)', guardianOrDept: "Father: Bhavesh Patel", bloodGroup: 'O+', emergencyPhone: '+91 98111 22334', validUpto: 'Mar 2027', avatarBg: 'from-purple-600 to-pink-600' },
  { id: '3', code: 'ADM-2026-003', name: 'Rohan Gupta', type: 'STUDENT', subText: 'Class 10-A (Roll 03)', guardianOrDept: "Father: Sanjay Gupta", bloodGroup: 'A+', emergencyPhone: '+91 97234 56789', validUpto: 'Mar 2027', avatarBg: 'from-emerald-600 to-teal-600' },
  { id: '4', code: 'ADM-2026-004', name: 'Pooja Verma', type: 'STUDENT', subText: 'Class 10-A (Roll 04)', guardianOrDept: "Mother: Sunita Verma", bloodGroup: 'AB+', emergencyPhone: '+91 99887 76655', validUpto: 'Mar 2027', avatarBg: 'from-amber-600 to-orange-600' },
  { id: '5', code: 'EMP-T101', name: 'Dr. Rajesh Khanna', type: 'STAFF', subText: 'Senior PGT Physics', guardianOrDept: "Dept: Science Faculty", bloodGroup: 'O+', emergencyPhone: '+91 94123 45678', validUpto: 'Lifetime / 2030', avatarBg: 'from-indigo-600 to-purple-800' },
  { id: '6', code: 'EMP-T102', name: 'Sunita Sharma', type: 'STAFF', subText: 'TGT Mathematics', guardianOrDept: "Dept: Mathematics", bloodGroup: 'B+', emergencyPhone: '+91 98990 12345', validUpto: 'Lifetime / 2030', avatarBg: 'from-purple-700 to-pink-700' },
  { id: '7', code: 'EMP-T103', name: 'Anil Deshmukh', type: 'STAFF', subText: 'PGT English Literature', guardianOrDept: "Dept: Humanities", bloodGroup: 'A+', emergencyPhone: '+91 98712 34567', validUpto: 'Lifetime / 2030', avatarBg: 'from-teal-600 to-cyan-700' },
  { id: '8', code: 'EMP-A201', name: 'Ramesh Gupta', type: 'STAFF', subText: 'Chief Accountant', guardianOrDept: "Dept: Accounts & Admin", bloodGroup: 'O-', emergencyPhone: '+91 98100 99887', validUpto: 'Lifetime / 2030', avatarBg: 'from-rose-600 to-red-700' },
];

export default function IdCardPage() {
  const [targetType, setTargetType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [selectedClass, setSelectedClass] = useState('Class 10-A');
  const [cardLayout, setCardLayout] = useState<'VERTICAL' | 'HORIZONTAL'>('VERTICAL');
  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2', '3', '4']);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHolders = initialHolders.filter(h => {
    if (h.type !== targetType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.subText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filteredHolders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHolders.map(h => h.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <CreditCard size={16} />
              <span>Identity & Access • पहचान पत्र निर्माण</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Student & Staff ID Card Studio
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Design, batch generate, and print thermal RFID and barcode smart ID cards formatted for standard CR-80 PVC card printers or 8-per-page A4 sheets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Printer size={16} />
              <span>Print {selectedIds.length} Selected Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Type & Layout Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => { setTargetType('STUDENT'); setSelectedIds(['1', '2', '3', '4']); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                targetType === 'STUDENT' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Student Cards
            </button>
            <button
              onClick={() => { setTargetType('STAFF'); setSelectedIds(['5', '6', '7', '8']); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                targetType === 'STAFF' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Staff Cards
            </button>
          </div>

          <div className="flex items-center p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setCardLayout('VERTICAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cardLayout === 'VERTICAL' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Vertical (Lanyard)
            </button>
            <button
              onClick={() => setCardLayout('HORIZONTAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cardLayout === 'HORIZONTAL' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Horizontal (Badge)
            </button>
          </div>

          {targetType === 'STUDENT' && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
            >
              <option value="Class 10-A">Class 10-A</option>
              <option value="Class 10-B">Class 10-B</option>
              <option value="Class 9-A">Class 9-A</option>
            </select>
          )}
        </div>

        {/* Selection & Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={selectAll}
            className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {selectedIds.length === filteredHolders.length ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>Select All ({filteredHolders.length})</span>
          </button>

          <div className="relative flex-1 lg:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, code..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      {/* ID Cards Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredHolders.map((holder) => {
          const isSelected = selectedIds.includes(holder.id);
          return (
            <div
              key={holder.id}
              onClick={() => toggleSelect(holder.id)}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-4 ring-purple-500/40 transform -translate-y-1' : 'opacity-85 hover:opacity-100'
              }`}
            >
              {cardLayout === 'VERTICAL' ? (
                /* Vertical Lanyard Layout */
                <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-md relative flex flex-col h-[400px]">
                  {/* Lanyard Hole */}
                  <div className="w-8 h-2 bg-gray-200 rounded-full mx-auto mt-2" />

                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-3 text-center mt-1">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-purple-200">Vidyalaya Public School</p>
                    <p className="text-[9px] text-gray-300">CBSE Affiliation No: 2130894</p>
                  </div>

                  {/* Photo & Badge */}
                  <div className="flex flex-col items-center pt-4 pb-2">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${holder.avatarBg} text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white`}>
                      {holder.name[0]}
                    </div>
                    <span className="mt-2 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {holder.type}
                    </span>
                  </div>

                  {/* Particulars */}
                  <div className="text-center px-4 space-y-1">
                    <h4 className="font-extrabold text-gray-900 text-base">{holder.name}</h4>
                    <p className="text-xs font-semibold text-purple-700">{holder.subText}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{holder.code}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="mx-4 my-2 p-2.5 bg-gray-50 rounded-2xl border border-gray-100 text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Blood Group:</span>
                      <span className="font-bold text-rose-600">{holder.bloodGroup}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emergency:</span>
                      <span className="font-bold text-gray-700">{holder.emergencyPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valid Till:</span>
                      <span className="font-bold text-gray-700">{holder.validUpto}</span>
                    </div>
                  </div>

                  {/* Barcode Strip Footer */}
                  <div className="mt-auto p-2 bg-gray-100 flex items-center justify-between px-4 border-t border-gray-200 text-[9px] text-gray-500 font-mono">
                    <span>||| | | |||| || | |||</span>
                    <span className="font-bold text-purple-800">PRINCIPAL SEAL</span>
                  </div>
                </div>
              ) : (
                /* Horizontal Badge Layout */
                <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-md relative flex flex-col h-[230px]">
                  <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black tracking-wide">VIDYALAYA PUBLIC SCHOOL</p>
                      <p className="text-[9px] text-purple-200">Institutional Identity Card</p>
                    </div>
                    <span className="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold">
                      {holder.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 flex-1">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${holder.avatarBg} text-white flex items-center justify-center font-bold text-xl shadow flex-shrink-0`}>
                      {holder.name[0]}
                    </div>
                    <div className="space-y-0.5 text-xs flex-1">
                      <h4 className="font-extrabold text-gray-900">{holder.name}</h4>
                      <p className="text-purple-700 font-bold text-[11px]">{holder.subText}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{holder.code}</p>
                      <p className="text-[10px] text-gray-500">{holder.guardianOrDept}</p>
                      <div className="flex gap-3 text-[10px] pt-1">
                        <span>Blood: <strong className="text-rose-600">{holder.bloodGroup}</strong></span>
                        <span>Emerg: <strong className="text-gray-800">{holder.emergencyPhone}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-500 font-mono border-t border-gray-200">
                    <span>VALID: {holder.validUpto}</span>
                    <span>||| | |||| ||| ||</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
