import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

    const where = campusId ? { campusId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 3, 1); // Indian FY starts April
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalStudents, boys, girls, totalTeachers, totalParents,
      presentToday, incomeThisMonth, incomeToday, incomeThisYear,
      expenseThisMonth, expenseToday, expenseThisYear, totalDues,
    ] = await Promise.all([
      prisma.student.count({ where: { ...where, isActive: true } }),
      prisma.student.count({ where: { ...where, isActive: true, gender: 'MALE' } }),
      prisma.student.count({ where: { ...where, isActive: true, gender: 'FEMALE' } }),
      prisma.teacher.count({ where: { ...where, isActive: true } }),
      prisma.parent.count(),
      prisma.attendance.count({ where: { date: { gte: startOfDay }, status: 'PRESENT' } }),
      prisma.income.aggregate({ where: { ...where, date: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { ...where, date: { gte: startOfDay } }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { ...where, date: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...where, date: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...where, date: { gte: startOfDay } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...where, date: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.feePayment.aggregate({ where: { paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } }, _sum: { balanceAmount: true } }),
    ]);

    const incMonth = incomeThisMonth._sum.amount || 0;
    const expMonth = expenseThisMonth._sum.amount || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents, totalBoys: boys, totalGirls: girls,
        totalTeachers, totalMaleStaff: 0, totalFemaleStaff: 0,
        totalParents, presentToday,
        totalDues: totalDues._sum.balanceAmount || 0,
        incomeThisMonth: incMonth,
        incomeToday: incomeToday._sum.amount || 0,
        incomeThisYear: incomeThisYear._sum.amount || 0,
        expenseThisMonth: expMonth,
        expenseToday: expenseToday._sum.amount || 0,
        expenseThisYear: expenseThisYear._sum.amount || 0,
        profitThisMonth: incMonth - expMonth,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
