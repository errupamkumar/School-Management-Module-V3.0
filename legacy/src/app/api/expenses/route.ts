import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');

    const where: any = {};
    if (campusId) where.campusId = campusId;
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' }, take: 100 });
    const total = await prisma.expense.aggregate({ where, _sum: { amount: true } });

    return NextResponse.json({ success: true, data: expenses, totalAmount: total._sum.amount || 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const expense = await prisma.expense.create({
      data: {
        title: body.title,
        category: body.category,
        amount: body.amount,
        date: new Date(body.date || Date.now()),
        description: body.description || null,
        voucherNo: body.voucherNo || null,
        paidTo: body.paidTo || null,
        paymentMode: body.paymentMode || null,
        campusId: body.campusId,
        approvedBy: body.approvedBy || null,
      },
    });
    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
