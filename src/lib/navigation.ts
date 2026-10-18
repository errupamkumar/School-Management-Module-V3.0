import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  AppWindow,
  BriefcaseBusiness,
  DoorOpen,
  FolderOpen,
  Gavel,
  Images,
  ListTodo,
  MonitorCheck,
  Newspaper,
  Contact,
  Vote,
  Award,
  BadgeIndianRupee,
  Banknote,
  BedDouble,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  Briefcase,
  Bus,
  Navigation,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  FileText,
  GraduationCap,
  HeartHandshake,
  History,
  IdCard,
  Landmark,
  LayoutDashboard,
  Library,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Package,
  School,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Timer,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import { hasPerm, type AppRole, type ModuleGroup, type ModuleKey, type PermissionMap } from './modules';

export interface NavItem {
  href: string;
  label: string;
  labelHi: string;
  icon: LucideIcon;
  module: ModuleKey;
  /** Only show to these roles (portal-specific screens). */
  roles?: AppRole[];
  /** Hide from these roles. */
  hideFor?: AppRole[];
  /** Shown to a vehicle's assigned driver (and Transport editors) when live tracking is on. */
  driver?: boolean;
  /** Only shown when the school has added apps for this role (App Frame). */
  apps?: boolean;
  group: ModuleGroup | 'My School';
}

const FAMILY: AppRole[] = ['PARENT', 'STUDENT'];

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard, module: 'dashboard', group: 'Overview' },
  { href: '/apps', label: 'Apps', labelHi: 'ऐप्स', icon: AppWindow, module: 'apps', apps: true, group: 'Overview' },

  // ---------------- Family portal ----------------
  { href: '/attendance', label: 'Attendance', labelHi: 'उपस्थिति', icon: UserCheck, module: 'attendance', roles: FAMILY, group: 'My School' },
  { href: '/homework', label: 'Homework', labelHi: 'गृहकार्य', icon: BookMarked, module: 'homework', roles: FAMILY, group: 'My School' },
  { href: '/timetable', label: 'Timetable', labelHi: 'समय सारणी', icon: CalendarDays, module: 'timetable', roles: FAMILY, group: 'My School' },
  { href: '/exams', label: 'Results', labelHi: 'परिणाम', icon: Award, module: 'exams', roles: FAMILY, group: 'My School' },
  { href: '/class-tests', label: 'Class Tests', labelHi: 'कक्षा परीक्षण', icon: ClipboardCheck, module: 'class_tests', roles: FAMILY, group: 'My School' },
  { href: '/fees', label: 'Fees', labelHi: 'शुल्क', icon: BadgeIndianRupee, module: 'fees', roles: FAMILY, group: 'My School' },
  { href: '/lms', label: 'Study Material', labelHi: 'अध्ययन सामग्री', icon: BookOpen, module: 'lms', roles: FAMILY, group: 'My School' },
  { href: '/live-classes', label: 'Live Classes', labelHi: 'लाइव कक्षाएं', icon: Video, module: 'live_classes', roles: FAMILY, group: 'My School' },
  { href: '/behaviour', label: 'Behaviour & Skills', labelHi: 'व्यवहार एवं कौशल', icon: Star, module: 'behaviour', roles: FAMILY, group: 'My School' },
  { href: '/transport', label: 'Transport', labelHi: 'परिवहन', icon: Bus, module: 'transport', roles: FAMILY, group: 'My School' },
  { href: '/library', label: 'Library', labelHi: 'पुस्तकालय', icon: Library, module: 'library', roles: FAMILY, group: 'My School' },
  { href: '/hostel', label: 'Hostel', labelHi: 'छात्रावास', icon: BedDouble, module: 'hostel', roles: FAMILY, group: 'My School' },
  { href: '/leave', label: 'Leave', labelHi: 'अवकाश', icon: CalendarOff, module: 'leave', roles: ['PARENT'], group: 'My School' },
  { href: '/online-exams', label: 'Online Exams', labelHi: 'ऑनलाइन परीक्षा', icon: MonitorCheck, module: 'online_exams', roles: FAMILY, group: 'My School' },
  { href: '/discipline', label: 'Discipline', labelHi: 'अनुशासन', icon: Gavel, module: 'discipline', roles: FAMILY, group: 'My School' },
  { href: '/placements', label: 'Placements', labelHi: 'प्लेसमेंट', icon: BriefcaseBusiness, module: 'placements', roles: ['STUDENT'], group: 'My School' },
  { href: '/blog', label: 'News & Blog', labelHi: 'समाचार एवं ब्लॉग', icon: Newspaper, module: 'blog', roles: FAMILY, group: 'My School' },
  { href: '/gallery', label: 'Gallery', labelHi: 'गैलरी', icon: Images, module: 'gallery', roles: FAMILY, group: 'My School' },
  { href: '/polls', label: 'Polls & Forms', labelHi: 'मतदान एवं फ़ॉर्म', icon: Vote, module: 'polls', roles: FAMILY, group: 'My School' },
  { href: '/discussions', label: 'Discussions', labelHi: 'चर्चा मंच', icon: MessageSquare, module: 'discussion', roles: FAMILY, group: 'My School' },
  { href: '/documents', label: 'Documents', labelHi: 'दस्तावेज़', icon: FolderOpen, module: 'documents', roles: FAMILY, group: 'My School' },

  // ---------------- Staff ----------------
  { href: '/admissions', label: 'Admissions', labelHi: 'प्रवेश', icon: UserPlus, module: 'admissions', group: 'Front Office' },
  { href: '/gate', label: 'Gate & Visitors', labelHi: 'गेट एवं आगंतुक', icon: DoorOpen, module: 'gate', group: 'Front Office' },
  { href: '/students', label: 'Students', labelHi: 'छात्र', icon: GraduationCap, module: 'students', hideFor: FAMILY, group: 'People' },
  { href: '/guardians', label: 'Parents & Families', labelHi: 'अभिभावक', icon: HeartHandshake, module: 'guardians', hideFor: FAMILY, group: 'People' },
  { href: '/employees', label: 'Employees', labelHi: 'कर्मचारी', icon: Briefcase, module: 'employees', group: 'People' },
  { href: '/staff-attendance', label: 'Staff Attendance', labelHi: 'कर्मचारी उपस्थिति', icon: ClipboardList, module: 'staff_attendance', group: 'People' },
  { href: '/leave', label: 'Leave', labelHi: 'अवकाश', icon: CalendarOff, module: 'leave', hideFor: FAMILY, group: 'People' },
  { href: '/alumni', label: 'Alumni', labelHi: 'पूर्व छात्र', icon: Contact, module: 'alumni', hideFor: FAMILY, group: 'People' },

  { href: '/academics', label: 'Classes & Subjects', labelHi: 'कक्षाएं एवं विषय', icon: School, module: 'academics', hideFor: FAMILY, group: 'Academics' },
  { href: '/attendance', label: 'Attendance', labelHi: 'उपस्थिति', icon: UserCheck, module: 'attendance', hideFor: FAMILY, group: 'Academics' },
  { href: '/timetable', label: 'Timetable', labelHi: 'समय सारणी', icon: CalendarDays, module: 'timetable', hideFor: FAMILY, group: 'Academics' },
  { href: '/homework', label: 'Homework', labelHi: 'गृहकार्य', icon: BookMarked, module: 'homework', hideFor: FAMILY, group: 'Academics' },
  { href: '/lms', label: 'Study Material', labelHi: 'अध्ययन सामग्री', icon: BookOpen, module: 'lms', hideFor: FAMILY, group: 'Academics' },
  { href: '/live-classes', label: 'Live Classes', labelHi: 'लाइव कक्षाएं', icon: Video, module: 'live_classes', hideFor: FAMILY, group: 'Academics' },

  { href: '/exams', label: 'Exams & Results', labelHi: 'परीक्षा एवं परिणाम', icon: Award, module: 'exams', hideFor: FAMILY, group: 'Examinations' },
  { href: '/class-tests', label: 'Class Tests', labelHi: 'कक्षा परीक्षण', icon: ClipboardCheck, module: 'class_tests', hideFor: FAMILY, group: 'Examinations' },
  { href: '/question-bank', label: 'Question Papers', labelHi: 'प्रश्न पत्र', icon: FileQuestion, module: 'question_bank', group: 'Examinations' },
  { href: '/online-exams', label: 'Online Exams', labelHi: 'ऑनलाइन परीक्षा', icon: MonitorCheck, module: 'online_exams', hideFor: FAMILY, group: 'Examinations' },
  { href: '/behaviour', label: 'Behaviour & Skills', labelHi: 'व्यवहार एवं कौशल', icon: Star, module: 'behaviour', hideFor: FAMILY, group: 'Examinations' },

  { href: '/fees', label: 'Fees', labelHi: 'शुल्क', icon: BadgeIndianRupee, module: 'fees', hideFor: FAMILY, group: 'Finance' },
  { href: '/accounts', label: 'Accounts', labelHi: 'लेखा', icon: Landmark, module: 'accounts', group: 'Finance' },
  { href: '/payroll', label: 'Payroll', labelHi: 'वेतन', icon: Banknote, module: 'payroll', group: 'Finance' },

  { href: '/notices', label: 'Noticeboard', labelHi: 'सूचना पट्ट', icon: Megaphone, module: 'notices', group: 'Communication' },
  { href: '/messages', label: 'Messages', labelHi: 'संदेश', icon: MessagesSquare, module: 'messaging', group: 'Communication' },
  { href: '/sms', label: 'SMS, WhatsApp & Email', labelHi: 'एसएमएस, व्हाट्सएप एवं ईमेल', icon: MessageSquare, module: 'sms', group: 'Communication' },
  { href: '/calendar', label: 'Calendar', labelHi: 'कैलेंडर', icon: CalendarCheck, module: 'events', group: 'Communication' },
  { href: '/meetings', label: 'Parent Meetings', labelHi: 'अभिभावक बैठक', icon: Users, module: 'meetings', group: 'Communication' },
  { href: '/polls', label: 'Polls & Forms', labelHi: 'मतदान एवं फ़ॉर्म', icon: Vote, module: 'polls', hideFor: FAMILY, group: 'Communication' },
  { href: '/discussions', label: 'Discussions', labelHi: 'चर्चा मंच', icon: MessageSquare, module: 'discussion', hideFor: FAMILY, group: 'Communication' },
  { href: '/blog', label: 'News & Blog', labelHi: 'समाचार एवं ब्लॉग', icon: Newspaper, module: 'blog', hideFor: FAMILY, group: 'Communication' },
  { href: '/gallery', label: 'Gallery', labelHi: 'गैलरी', icon: Images, module: 'gallery', hideFor: FAMILY, group: 'Communication' },
  { href: '/reminders', label: 'Reminders', labelHi: 'अनुस्मारक', icon: AlarmClock, module: 'reminders', group: 'Communication' },

  { href: '/transport', label: 'Transport', labelHi: 'परिवहन', icon: Bus, module: 'transport', hideFor: FAMILY, group: 'Operations' },
  { href: '/driver', label: 'Driver mode', labelHi: 'ड्राइवर मोड', icon: Navigation, module: 'transport', driver: true, hideFor: FAMILY, group: 'Operations' },
  { href: '/library', label: 'Library', labelHi: 'पुस्तकालय', icon: Library, module: 'library', hideFor: FAMILY, group: 'Operations' },
  { href: '/store', label: 'Store & POS', labelHi: 'स्टोर', icon: ShoppingCart, module: 'store', group: 'Operations' },
  { href: '/assets', label: 'Assets', labelHi: 'संपत्ति', icon: Package, module: 'inventory', group: 'Operations' },
  { href: '/hostel', label: 'Hostel', labelHi: 'छात्रावास', icon: BedDouble, module: 'hostel', hideFor: FAMILY, group: 'Operations' },

  { href: '/activities', label: 'Clubs & Activities', labelHi: 'क्लब एवं गतिविधियाँ', icon: Trophy, module: 'activities', group: 'Student Life' },
  { href: '/study-tools', label: 'Study Tools', labelHi: 'अध्ययन उपकरण', icon: Timer, module: 'study_tools', group: 'Student Life' },
  { href: '/ai-assistant', label: 'AI Assistant', labelHi: 'एआई सहायक', icon: Sparkles, module: 'ai_assistant', group: 'Student Life' },
  { href: '/discipline', label: 'Discipline', labelHi: 'अनुशासन', icon: Gavel, module: 'discipline', hideFor: FAMILY, group: 'Student Life' },
  { href: '/placements', label: 'Placements', labelHi: 'प्लेसमेंट', icon: BriefcaseBusiness, module: 'placements', hideFor: FAMILY, group: 'Student Life' },

  { href: '/certificates', label: 'Certificates & ID Cards', labelHi: 'प्रमाण पत्र', icon: IdCard, module: 'certificates', group: 'Administration' },
  { href: '/reports', label: 'Reports', labelHi: 'रिपोर्ट', icon: BarChart3, module: 'reports', group: 'Administration' },
  { href: '/tasks', label: 'Tasks', labelHi: 'कार्य', icon: ListTodo, module: 'tasks', group: 'Administration' },
  { href: '/documents', label: 'Documents', labelHi: 'दस्तावेज़', icon: FolderOpen, module: 'documents', hideFor: FAMILY, group: 'Administration' },
  { href: '/settings', label: 'School Settings', labelHi: 'सेटिंग्स', icon: Settings, module: 'settings', group: 'Administration' },
  { href: '/access-control', label: 'Roles & Permissions', labelHi: 'भूमिकाएं एवं अनुमतियाँ', icon: ShieldCheck, module: 'access_control', group: 'Administration' },
  { href: '/audit-logs', label: 'Audit Log', labelHi: 'ऑडिट लॉग', icon: History, module: 'audit_logs', group: 'Administration' },
];

export const EXTRA_ICONS = { Bell, Bot, FileText };

export interface NavContext {
  isDriver?: boolean;
  trackingEnabled?: boolean;
  appCount?: number;
}

/** Whether a driver-only item (Driver mode) is available to this user. */
export function driverAccess(perms: PermissionMap, ctx: NavContext = {}): boolean {
  return !!ctx.trackingEnabled && (!!ctx.isDriver || hasPerm(perms, 'transport', 'edit'));
}

export function navFor(role: AppRole, perms: PermissionMap, ctx: NavContext = {}): NavItem[] {
  const seen = new Set<string>();
  return NAV.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.hideFor?.includes(role)) return false;
    if (item.driver) {
      if (!driverAccess(perms, ctx)) return false;
    } else if (!hasPerm(perms, item.module, 'view')) return false;
    if (item.apps && !ctx.appCount) return false;
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

/** The nav item that owns a pathname (longest matching prefix). */
export function navForPath(pathname: string): NavItem | undefined {
  return [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
}
