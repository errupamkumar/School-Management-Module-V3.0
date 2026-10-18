import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGradeFromPercentage } from '@/utils/helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { examId, subjectId, maxMarks, results: [{ studentId, marksObtained, theoryMarks, practicalMarks, isAbsent }] }

    const results = await prisma.$transaction(
      body.results.map((r: any) => {
        const percentage = (r.marksObtained / body.maxMarks) * 100;
        const grade = r.isAbsent ? 'AB' : getGradeFromPercentage(percentage);

        return prisma.examResult.upsert({
          where: { examId_studentId_subjectId: { examId: body.examId, studentId: r.studentId, subjectId: body.subjectId } },
          create: {
            examId: body.examId,
            studentId: r.studentId,
            subjectId: body.subjectId,
            marksObtained: r.marksObtained,
            theoryMarks: r.theoryMarks || null,
            practicalMarks: r.practicalMarks || null,
            grade,
            isAbsent: r.isAbsent || false,
            remarks: r.remarks || null,
          },
          update: {
            marksObtained: r.marksObtained,
            theoryMarks: r.theoryMarks || null,
            practicalMarks: r.practicalMarks || null,
            grade,
            isAbsent: r.isAbsent || false,
            remarks: r.remarks || null,
          },
        });
      })
    );

    return NextResponse.json({ success: true, data: results, message: `Marks saved for ${results.length} students` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
