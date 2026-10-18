'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'hi';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // General / Header
    appName: 'Vidyalaya',
    schoolManagement: 'School Management',
    searchPlaceholder: 'Search students, teachers, classes...',
    downloadApp: 'Download App',
    selectInstitute: 'Select Institute',
    myProfile: 'My Profile',
    settingsAndRoles: 'Settings & Roles',
    logout: 'Logout',
    notifications: 'Notifications',
    chat: 'Messages & Chat',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchLanguage: 'हिंदी में बदलें',

    // Greetings & Hero
    goodMorning: 'Good morning,',
    goodAfternoon: 'Good afternoon,',
    goodEvening: 'Good evening,',
    heroSubtitle: "Here is what's happening at your institute today.",
    instituteVerified: 'Institute verified • Active',
    modernView: 'Modern View',
    classicView: 'Classic View',
    switchView: 'Switch View',

    // Key Stats
    totalStudents: 'Total Students',
    totalEmployees: 'Total Employees',
    todayAttendance: "Today's Attendance",
    feeCollection: 'Fee Collection (Sep)',
    studentsPresent: 'Students Present',
    staffPresent: 'Staff Present',
    thisMonthFee: "This Month's Fee",
    newAdmissions: 'New Admissions',
    admissionsThisMonth: 'Admissions this month:',
    teachingStaff: 'Teaching Staff:',
    nonTeachingStaff: 'Non-Teaching:',
    collectedThisMonth: 'Collected this month:',
    totalPendingDues: 'Total pending dues:',
    newInSeptember: 'New in September',

    // Quick Actions
    quickActions: 'Quick Actions',
    addStudent: 'Add Student',
    collectFee: 'Collect Fee',
    markAttendance: 'Mark Attendance',
    sendSms: 'Send SMS',
    notices: 'Notices',
    homework: 'Homework',
    timetable: 'Timetable',
    examinations: 'Examinations',
    reports: 'Reports',

    // Section Titles
    financialOverview: 'Financial Overview',
    incomeVsExpense: 'Income vs Expense',
    attendanceAnalytics: 'Attendance Analytics',
    feeCollectionStatus: 'Fee Collection Status',
    recentAdmissions: 'Recent Admissions',
    noticeBoard: 'Notice Board',
    quickLinks: 'Quick Navigation Links',
    systemStatus: 'System Status',

    // Common Table & Statuses
    name: 'Name',
    rollNo: 'Roll No',
    class: 'Class',
    section: 'Section',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    action: 'Action',
    viewAll: 'View All',
    paid: 'Paid',
    pending: 'Pending',
    active: 'Active',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    send: 'Send',
    cancel: 'Cancel',
    save: 'Save',
    filter: 'Filter',
    reset: 'Reset',
  },
  hi: {
    // General / Header
    appName: 'विद्यालय',
    schoolManagement: 'स्कूल प्रबंधन प्रणाली',
    searchPlaceholder: 'छात्र, शिक्षक, कक्षा खोजें...',
    downloadApp: 'ऐप डाउनलोड करें',
    selectInstitute: 'संस्थान चुनें',
    myProfile: 'मेरी प्रोफाइल',
    settingsAndRoles: 'सेटिंग्स और भूमिकाएं',
    logout: 'लॉग आउट',
    notifications: 'सूचनाएं एवं अलर्ट',
    chat: 'संदेश और चैट',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    switchLanguage: 'Switch to English',

    // Greetings & Hero
    goodMorning: 'सुप्रभात,',
    goodAfternoon: 'शुभ दोपहर,',
    goodEvening: 'शुभ संध्या,',
    heroSubtitle: 'आज आपके संस्थान में क्या हो रहा है, इसका संपूर्ण विवरण।',
    instituteVerified: 'संस्थान सत्यापित • सक्रिय',
    modernView: 'आधुनिक दृश्य',
    classicView: 'क्लासिक दृश्य',
    switchView: 'दृश्य बदलें',

    // Key Stats
    totalStudents: 'कुल छात्र',
    totalEmployees: 'कुल कर्मचारी',
    todayAttendance: 'आज की उपस्थिति',
    feeCollection: 'शुल्क संग्रह (सितंबर)',
    studentsPresent: 'उपस्थित छात्र',
    staffPresent: 'उपस्थित स्टाफ',
    thisMonthFee: 'इस माह का शुल्क',
    newAdmissions: 'नए प्रवेश',
    admissionsThisMonth: 'इस माह के प्रवेश:',
    teachingStaff: 'शिक्षक वर्ग:',
    nonTeachingStaff: 'गैर-शिक्षण स्टाफ:',
    collectedThisMonth: 'इस माह एकत्रित:',
    totalPendingDues: 'कुल बकाया राशि:',
    newInSeptember: 'सितंबर में नए छात्र',

    // Quick Actions
    quickActions: 'त्वरित कार्य',
    addStudent: 'छात्र जोड़ें',
    collectFee: 'शुल्क जमा करें',
    markAttendance: 'उपस्थिति दर्ज करें',
    sendSms: 'एसएमएस भेजें',
    notices: 'सूचनाएं',
    homework: 'गृहकार्य',
    timetable: 'समय सारणी',
    examinations: 'परीक्षाएं',
    reports: 'रिपोर्ट',

    // Section Titles
    financialOverview: 'वित्तीय अवलोकन',
    incomeVsExpense: 'आय बनाम व्यय',
    attendanceAnalytics: 'उपस्थिति विश्लेषण',
    feeCollectionStatus: 'शुल्क संग्रह स्थिति',
    recentAdmissions: 'हालिया प्रवेश',
    noticeBoard: 'सूचना पट्ट',
    quickLinks: 'त्वरित नेविगेशन लिंक',
    systemStatus: 'सिस्टम स्थिति',

    // Common Table & Statuses
    name: 'नाम',
    rollNo: 'रोल नंबर',
    class: 'कक्षा',
    section: 'अनुभाग',
    date: 'दिनांक',
    amount: 'राशि',
    status: 'स्थिति',
    action: 'कार्रवाई',
    viewAll: 'सभी देखें',
    paid: 'भुगतान पूर्ण',
    pending: 'बकाया',
    active: 'सक्रिय',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    late: 'देरी से',
    send: 'भेजें',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    filter: 'फ़िल्टर करें',
    reset: 'रीसेट',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('school-ms-lang') as Language | null;
    if (storedLang === 'en' || storedLang === 'hi') {
      setLangState(storedLang);
      document.documentElement.lang = storedLang;
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('school-ms-lang', newLang);
    document.documentElement.lang = newLang;
  };

  const toggleLang = () => {
    const nextLang: Language = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[lang] || translations.en;
    if (dict[key]) return dict[key];
    if (translations.en[key]) return translations.en[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
