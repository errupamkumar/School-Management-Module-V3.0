'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  User, Shield, Key, Bell, Smartphone, Mail, Phone,
  CheckCircle2, Lock, Camera, Save, ArrowLeft, History, Laptop
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SECURITY' | 'PERMISSIONS' | 'LOGS'>('PERSONAL');
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Administrator',
    email: user?.email || 'admin@school.com',
    phone: '+91 98765 43210',
    designation: 'Super Administrator & Director',
    institute: user?.campusName || 'Vidyalaya Senior Secondary Campus',
    bio: 'Overseeing institutional operations, CBSE compliance, staff excellence, and financial governance.',
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: true,
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }
    alert('Security credentials updated successfully.');
    setSecurityData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      twoFactorEnabled: securityData.twoFactorEnabled,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-purple-900 to-indigo-900 rounded-3xl border-4 border-white/20 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {profileData.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <button
                title="Change Photo"
                className="absolute -bottom-1 -right-1 p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow border-2 border-white transition-all"
              >
                <Camera size={14} />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1">
                <Shield size={14} />
                <span>{user?.role?.replace('_', ' ') || 'SUPER ADMIN'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {profileData.name}
              </h1>
              <p className="text-purple-100/90 text-xs sm:text-sm mt-0.5">
                {profileData.email} • {profileData.designation}
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs sm:text-sm backdrop-blur-sm border border-white/20 transition-all self-start md:self-auto"
          >
            <ArrowLeft size={16} />
            <span>School Settings</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl p-2 border border-gray-100 shadow-sm flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PERSONAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'PERSONAL'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <User size={15} />
          <span>Personal Details</span>
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'SECURITY'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Key size={15} />
          <span>Security & Passwords</span>
        </button>

        <button
          onClick={() => setActiveTab('PERMISSIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'PERMISSIONS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Shield size={15} />
          <span>Access Rights & Role</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'LOGS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <History size={15} />
          <span>Active Sessions & Audit</span>
        </button>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'PERSONAL' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm animate-in fade-in">
          <h3 className="font-extrabold text-gray-900 text-base mb-1">Personal Account Details</h3>
          <p className="text-xs text-gray-400 mb-6">Update your administrative contact information and credentials</p>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Designation Title</label>
                <input
                  type="text"
                  value={profileData.designation}
                  onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Primary Campus Institute</label>
              <input
                type="text"
                disabled
                value={profileData.institute}
                className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Professional Bio</label>
              <textarea
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              {isSaved ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Profile updated successfully!
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Save size={16} />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm animate-in fade-in space-y-6">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base mb-1">Password & Authentication</h3>
            <p className="text-xs text-gray-400">Manage master password and multi-factor authentication</p>
          </div>

          <form onSubmit={handleSecuritySubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Current Password *</label>
              <input
                type="password"
                required
                value={securityData.currentPassword}
                onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={securityData.newPassword}
                onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={securityData.confirmPassword}
                onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-purple-400"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Update Password
            </button>
          </form>

          {/* 2FA Card */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Two-Factor Authentication (2FA)</h4>
              <p className="text-xs text-gray-400 mt-0.5">Enforce SMS OTP or Authenticator app at login</p>
            </div>
            <button
              onClick={() => setSecurityData({ ...securityData, twoFactorEnabled: !securityData.twoFactorEnabled })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                securityData.twoFactorEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {securityData.twoFactorEnabled ? 'Enabled (Active)' : 'Disabled'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Role & Permissions */}
      {activeTab === 'PERMISSIONS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm animate-in fade-in space-y-4">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base mb-1">Administrative Privileges</h3>
            <p className="text-xs text-gray-400">Assigned role: <strong>Super Administrator</strong></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              'Full CRUD Access on Students & Staff',
              'Fee Structure & Accounting Ledger Control',
              'CBSE Exam Grade Card Publishing',
              'Biometric Hardware & IoT Device Sync',
              'Staff Payroll & Direct NEFT Approvals',
              'Multi-Campus Switching & Institution Setup',
              'Audit Log & Financial P&L Access',
              'System Settings, SMS Gateway & Backups',
            ].map((perm, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 bg-purple-50/50 border border-purple-100/60 rounded-2xl text-xs font-semibold text-gray-800">
                <CheckCircle2 size={16} className="text-purple-600 flex-shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Activity Logs */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm animate-in fade-in space-y-4">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base mb-1">Recent Login & Session History</h3>
            <p className="text-xs text-gray-400">Security audit trail of active authenticated sessions</p>
          </div>

          <div className="divide-y divide-gray-100">
            {[
              { device: 'Windows 11 PC (Chrome 128)', ip: '122.161.49.20 (Noida, UP)', time: 'Active Now (Current Session)', isCurrent: true },
              { device: 'Android 14 (Mobile App)', ip: '103.21.144.98 (Delhi)', time: 'Yesterday at 08:45 PM', isCurrent: false },
              { device: 'MacBook Pro (Safari)', ip: '122.161.49.20 (Noida, UP)', time: '20 Sep 2026 at 10:14 AM', isCurrent: false },
            ].map((sess, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">{sess.device}</h5>
                    <p className="text-[11px] text-gray-400 font-mono">{sess.ip} • {sess.time}</p>
                  </div>
                </div>

                {sess.isCurrent ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Current
                  </span>
                ) : (
                  <button className="text-xs text-rose-600 hover:underline font-semibold">
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
