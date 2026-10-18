import { Role } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  campusId: string | null;
  campusName: string | null;
  language: string;
  avatar: string | null;
}

export interface DashboardStats {
  totalStudents: number;
  totalBoys: number;
  totalGirls: number;
  totalTeachers: number;
  totalMaleStaff: number;
  totalFemaleStaff: number;
  totalParents: number;
  presentToday: number;
  totalDues: number;
  incomeThisMonth: number;
  incomeToday: number;
  incomeThisYear: number;
  expenseThisMonth: number;
  expenseToday: number;
  expenseThisYear: number;
  profitThisMonth: number;
}

export interface SidebarItem {
  title: string;
  titleHi: string;
  href: string;
  icon: string;
  children?: SidebarItem[];
  roles: Role[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeeReport {
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  lastPaymentDate: string | null;
}
