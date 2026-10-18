'use client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { StatCard } from '@/components/ui';
import { Users, CheckSquare, BookOpen, ClipboardList, Video, FileText, Bell, Calendar, CalendarCheck } from 'lucide-react';

export default function TeacherDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">Welcome, Teacher!</h2>
          <p className="text-emerald-100 mt-1">Manage your classes and students efficiently.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My Students" value="45" icon={<Users size={24} />} color="blue" />
          <StatCard title="Today's Attendance" value="92%" icon={<CheckSquare size={24} />} color="green" />
          <StatCard title="Pending Homework" value="3" icon={<BookOpen size={24} />} color="yellow" />
          <StatCard title="Upcoming Exams" value="2" icon={<ClipboardList size={24} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={20} /> Today&apos;s Schedule</h3>
            <div className="space-y-3">
              {[
                { time: '08:00 - 08:45', class: 'Class 10-A', subject: 'Mathematics', room: 'Room 201' },
                { time: '08:45 - 09:30', class: 'Class 9-B', subject: 'Mathematics', room: 'Room 105' },
                { time: '10:00 - 10:45', class: 'Class 8-A', subject: 'Mathematics', room: 'Room 302' },
                { time: '11:30 - 12:15', class: 'Class 10-B', subject: 'Mathematics', room: 'Room 201' },
                { time: '12:15 - 01:00', class: 'Class 7-A', subject: 'Mathematics', room: 'Room 103' },
              ].map((slot, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
                  <div className="text-xs font-mono text-gray-500 w-28">{slot.time}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{slot.class} — {slot.subject}</p>
                    <p className="text-xs text-gray-500">{slot.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions for Teacher */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mark Attendance', href: '/attendance', icon: <CheckSquare size={20} /> },
                { label: 'Teacher Parent Meeting (PTM)', href: '/meetings', icon: <CalendarCheck size={20} /> },
                { label: 'Marks Entry', href: '/exams/marks', icon: <FileText size={20} /> },
                { label: 'Assign Homework', href: '/homework', icon: <BookOpen size={20} /> },
                { label: 'Online Class', href: '/online-class', icon: <Video size={20} /> },
                { label: 'View Students', href: '/students', icon: <Users size={20} /> },
                { label: 'Attendance Report', href: '/reports', icon: <ClipboardList size={20} /> },
                { label: 'Noticeboard', href: '/notices', icon: <Bell size={20} /> },
                { label: 'Study Material', href: '/lms', icon: <BookOpen size={20} /> },
              ].map((action) => (
                <a key={action.label} href={action.href} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 text-center">
                  <div className="text-primary-600">{action.icon}</div>
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
