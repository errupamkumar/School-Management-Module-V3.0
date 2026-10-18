import { Role } from '@prisma/client';
import { SidebarItem } from '@/types';

export const sidebarItems: SidebarItem[] = [
  // Dashboards per role
  { title: 'Dashboard', titleHi: 'डैशबोर्ड', href: '/dashboard/admin', icon: 'LayoutDashboard', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Dashboard', titleHi: 'डैशबोर्ड', href: '/dashboard/teacher', icon: 'LayoutDashboard', roles: [Role.TEACHER] },
  { title: 'Dashboard', titleHi: 'डैशबोर्ड', href: '/dashboard/parent', icon: 'LayoutDashboard', roles: [Role.PARENT] },
  { title: 'Dashboard', titleHi: 'डैशबोर्ड', href: '/dashboard/student', icon: 'LayoutDashboard', roles: [Role.STUDENT] },

  // AI Assistant
  { title: 'AI Assistant', titleHi: 'एआई सहायक', href: '/ai-assistant', icon: 'Sparkles', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.ACCOUNTANT] },

  // USP: Principal & Leadership Connect (1:1 Meeting Booking) - STRICTLY EXCLUDES STUDENT
  {
    title: 'Principal Connect (1:1)',
    titleHi: 'प्रधानाचार्य संवाद (1:1)',
    href: '/meetings',
    icon: 'CalendarCheck',
    roles: [Role.PARENT, Role.TEACHER, Role.SUPER_ADMIN, Role.ADMIN],
  },

  // USP: Exam Prep Booster (Flashcards, Mock Tests, Syllabus Countdown)
  {
    title: 'Exam Prep Booster',
    titleHi: 'परीक्षा तैयारी बूस्टर',
    href: '/exam-prep',
    icon: 'Zap',
    roles: [Role.STUDENT, Role.PARENT, Role.TEACHER, Role.SUPER_ADMIN, Role.ADMIN],
  },

  // USP: Co-Curricular & Extra Activities Hub
  {
    title: 'Extra Activities & Clubs',
    titleHi: 'अतिरिक्त गतिविधियाँ एवं क्लब',
    href: '/activities',
    icon: 'Trophy',
    roles: [Role.STUDENT, Role.PARENT, Role.TEACHER, Role.SUPER_ADMIN, Role.ADMIN],
  },

  // USP: Pomodoro Focus Studio & Study History Log
  {
    title: 'Focus Studio & Pomodoro',
    titleHi: 'पोमोडोरो अध्ययन स्टूडियो',
    href: '/pomodoro',
    icon: 'Timer',
    roles: [Role.STUDENT, Role.PARENT, Role.TEACHER],
  },

  // Core Academic Navigation
  {
    title: 'Timetable',
    titleHi: 'समय सारणी',
    href: '/timetable',
    icon: 'Clock',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],
  },
  {
    title: 'Daily Homework',
    titleHi: 'दैनिक गृहकार्य',
    href: '/homework',
    icon: 'BookMarked',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],
  },
  {
    title: 'Exam Results & Marks',
    titleHi: 'परीक्षा परिणाम एवं अंक',
    href: '/exams/results',
    icon: 'Award',
    roles: [Role.STUDENT, Role.PARENT],
  },
  {
    title: 'Study Materials (LMS)',
    titleHi: 'अध्ययन सामग्री',
    href: '/lms',
    icon: 'Library',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],
  },
  {
    title: 'Manage Attendance',
    titleHi: 'उपस्थिति',
    href: '/attendance',
    icon: 'CheckSquare',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.PARENT],
  },
  {
    title: 'Online Classes',
    titleHi: 'ऑनलाइन कक्षा',
    href: '/online-class',
    icon: 'Video',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT],
  },

  // Notices & Notifications
  {
    title: 'Noticeboard',
    titleHi: 'सूचना पट्ट',
    href: '/notices',
    icon: 'Megaphone',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],
  },
  {
    title: 'Notifications',
    titleHi: 'अधिसूचनाएं',
    href: '/notifications',
    icon: 'Bell',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.ACCOUNTANT],
  },

  // Administration & Operations
  {
    title: 'Admission Management',
    titleHi: 'प्रवेश प्रबंधन',
    href: '/admission',
    icon: 'UserPlus',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    children: [
      { title: 'New Admission', titleHi: 'नया प्रवेश', href: '/admission/new', icon: 'Plus', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Bulk Admission', titleHi: 'बल्क प्रवेश', href: '/admission/bulk', icon: 'Upload', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Admission Requests', titleHi: 'प्रवेश अनुरोध', href: '/admission/requests', icon: 'ClipboardList', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Inquiries', titleHi: 'पूछताछ', href: '/admission/inquiries', icon: 'HelpCircle', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Print Form', titleHi: 'फॉर्म प्रिंट', href: '/admission/print', icon: 'Printer', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    ],
  },
  {
    title: 'Student Management',
    titleHi: 'छात्र प्रबंधन',
    href: '/students',
    icon: 'GraduationCap',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER],
    children: [
      { title: 'Student Information', titleHi: 'छात्र जानकारी', href: '/students', icon: 'Users', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER] },
      { title: 'Promotion', titleHi: 'प्रोन्नति', href: '/students/promotion', icon: 'ArrowUpCircle', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Transfer', titleHi: 'स्थानांतरण', href: '/students/transfer', icon: 'ArrowRightLeft', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    ],
  },
  { title: 'Parent Accounts', titleHi: 'अभिभावक खाते', href: '/parents', icon: 'Users2', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  {
    title: 'Staff Management',
    titleHi: 'कर्मचारी प्रबंधन',
    href: '/staff',
    icon: 'Briefcase',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    children: [
      { title: 'Teachers', titleHi: 'शिक्षक', href: '/staff/teachers', icon: 'GraduationCap', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Other Staff', titleHi: 'अन्य कर्मचारी', href: '/staff/other', icon: 'UserCog', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    ],
  },
  { title: 'Classes & Sections', titleHi: 'कक्षा और अनुभाग', href: '/classes', icon: 'School', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Subjects', titleHi: 'विषय', href: '/subjects', icon: 'BookOpen', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  {
    title: 'Fee Management',
    titleHi: 'शुल्क प्रबंधन',
    href: '/fees/collect',
    icon: 'IndianRupee',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT],
    children: [
      { title: 'Pay / Collect Fee', titleHi: 'शुल्क भुगतान एवं संग्रह', href: '/fees/collect', icon: 'Receipt', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
      { title: 'Fee Structure', titleHi: 'शुल्क संरचना', href: '/fees/structure', icon: 'Settings', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Fee Report', titleHi: 'शुल्क रिपोर्ट', href: '/fees/report', icon: 'BarChart2', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
      { title: 'Due List', titleHi: 'बकाया सूची', href: '/fees/dues', icon: 'AlertTriangle', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
    ],
  },
  {
    title: 'My School Fees',
    titleHi: 'मेरी स्कूल फीस',
    href: '/fees/my-dues',
    icon: 'IndianRupee',
    roles: [Role.STUDENT],
  },
  {
    title: 'Ward Fee Dues & Pay',
    titleHi: 'छात्र शुल्क एवं भुगतान',
    href: '/fees/my-dues',
    icon: 'IndianRupee',
    roles: [Role.PARENT],
  },
  {
    title: 'Accounting',
    titleHi: 'लेखांकन',
    href: '/accounting',
    icon: 'Calculator',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT],
    children: [
      { title: 'Overview & Ledger', titleHi: 'अवलोकन एवं खाता', href: '/accounting', icon: 'Calculator', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
      { title: 'Expense Manager', titleHi: 'व्यय प्रबंधन', href: '/accounting/expenses', icon: 'TrendingDown', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
      { title: 'Staff Salary', titleHi: 'वेतन प्रबंधन', href: '/salary', icon: 'Wallet', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT] },
    ],
  },
  {
    title: 'Exam Management',
    titleHi: 'परीक्षा प्रबंधन',
    href: '/exams',
    icon: 'FileText',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER],
    children: [
      { title: 'Exams', titleHi: 'परीक्षाएं', href: '/exams', icon: 'FileText', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
      { title: 'Marks Entry', titleHi: 'अंक प्रविष्टि', href: '/exams/marks', icon: 'Edit', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER] },
      { title: 'Results', titleHi: 'परिणाम', href: '/exams/results', icon: 'Award', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER] },
    ],
  },
  { title: 'Certification', titleHi: 'प्रमाण पत्र', href: '/certification', icon: 'Award', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Leave Management', titleHi: 'अवकाश प्रबंधन', href: '/leave', icon: 'CalendarOff', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER] },
  { title: 'Transport', titleHi: 'परिवहन', href: '/transport', icon: 'Bus', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TRANSPORT_MANAGER] },
  { title: 'ID Card Generation', titleHi: 'पहचान पत्र', href: '/idcard', icon: 'CreditCard', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Stock & Inventory', titleHi: 'स्टॉक और इन्वेंटरी', href: '/inventory', icon: 'Package', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Biometric Devices', titleHi: 'बायोमेट्रिक उपकरण', href: '/biometric', icon: 'Fingerprint', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Reports', titleHi: 'रिपोर्ट', href: '/reports', icon: 'PieChart', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { title: 'Manage Campus', titleHi: 'कैम्पस प्रबंधन', href: '/campus', icon: 'Building2', roles: [Role.SUPER_ADMIN] },
  { title: 'Settings', titleHi: 'सेटिंग्स', href: '/settings', icon: 'Settings', roles: [Role.SUPER_ADMIN, Role.ADMIN] },
];

export function getMenuForRole(role: Role): SidebarItem[] {
  return sidebarItems
    .filter((item) => item.roles.includes(role))
    .map((item) => {
      let title = item.title;
      let titleHi = item.titleHi;
      let icon = item.icon;

      if (item.href === '/meetings') {
        if (role === Role.TEACHER) {
          title = 'Teacher Parent Meeting';
          titleHi = 'शिक्षक-अभिभावक बैठक';
          icon = 'Users';
        } else if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
          title = 'Principal Connect & PTM Hub';
          titleHi = 'प्रधानाचार्य संवाद एवं पीटीएम';
          icon = 'CalendarCheck';
        } else if (role === Role.PARENT) {
          title = 'Teacher & Principal Connect';
          titleHi = 'शिक्षक एवं प्रधानाचार्य संवाद';
          icon = 'CalendarCheck';
        }
      }

      return {
        ...item,
        title,
        titleHi,
        icon,
        children: item.children?.filter((child) => child.roles.includes(role)),
      };
    });
}

