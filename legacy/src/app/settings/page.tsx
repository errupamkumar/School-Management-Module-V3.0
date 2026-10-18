'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Settings,
  Building2,
  Calendar,
  Globe,
  Bell,
  Save,
  CheckCircle2,
  Shield,
  Clock,
  Phone,
  Mail,
  MapPin,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'notifications'>('general');

  // General state
  const [schoolName, setSchoolName] = useState('Vidyalaya Public School');
  const [affiliationNo, setAffiliationNo] = useState('UP-2024-1234');
  const [boardType, setBoardType] = useState('CBSE');
  const [principalName, setPrincipalName] = useState('Dr. Rajesh Kumar');
  const [email, setEmail] = useState('info@vidyalaya.com');
  const [phone, setPhone] = useState('0512-2345678');
  const [address, setAddress] = useState('123 Education Lane, Civil Lines, Kanpur, UP - 208001');

  // Academic state
  const [currentSession, setCurrentSession] = useState('2025-26');
  const [currency, setCurrency] = useState('INR');
  const [language, setLanguage] = useState('en');

  // Notifications
  const [smsGatewayActive, setSmsGatewayActive] = useState(true);
  const [autoAbsentAlert, setAutoAbsentAlert] = useState(true);
  const [autoFeeReminder, setAutoFeeReminder] = useState(true);

  const [notification, setNotification] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification('Institute and system configurations saved successfully!');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast */}
        {notification && (
          <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Settings size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">System & School Settings</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure institute profile, academic sessions, board affiliations, and notifications
            </p>
          </div>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Save size={15} />
            <span>Save Changes</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          {[
            { key: 'general', label: 'Institute Profile', icon: Building2 },
            { key: 'academic', label: 'Academic Sessions & Localization', icon: Calendar },
            { key: 'notifications', label: 'Automated SMS & Alerts', icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Institute Profile */}
        {activeTab === 'general' && (
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-900">Institute & Affiliation Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  School / Institute Name *
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Affiliation Board
                </label>
                <select
                  value={boardType}
                  onChange={(e) => setBoardType(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="CBSE">Central Board of Secondary Education (CBSE)</option>
                  <option value="ICSE">ICSE / ISC</option>
                  <option value="UP_BOARD">Uttar Pradesh State Board</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Board Affiliation Number
                </label>
                <input
                  type="text"
                  value={affiliationNo}
                  onChange={(e) => setAffiliationNo(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Principal / Head of Institution
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Campus Postal Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </form>
        )}

        {/* Tab 2: Academic & Localization */}
        {activeTab === 'academic' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-900">Academic Year & Region</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Current Academic Session
                </label>
                <select
                  value={currentSession}
                  onChange={(e) => setCurrentSession(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="2025-26">2025-26 (Active Current)</option>
                  <option value="2026-27">2026-27 (Upcoming)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Currency Display
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Default Interface Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Automated SMS & WhatsApp Alerts</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-gray-900">Free SMS Gateway Service</p>
                  <p className="text-[11px] text-gray-500">Enable broadcast engine for mobile alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsGatewayActive}
                  onChange={(e) => setSmsGatewayActive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-gray-900">Auto-Alert for Absent Students</p>
                  <p className="text-[11px] text-gray-500">Send instant SMS to parent when student is marked absent</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoAbsentAlert}
                  onChange={(e) => setAutoAbsentAlert(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-gray-900">Auto-Fee Due Reminders</p>
                  <p className="text-[11px] text-gray-500">Send WhatsApp reminder 3 days before due date</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoFeeReminder}
                  onChange={(e) => setAutoFeeReminder(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
