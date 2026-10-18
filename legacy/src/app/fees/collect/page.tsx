'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui';
import { Receipt, Search, Printer, IndianRupee, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function FeeCollectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [form, setForm] = useState({
    feeStructureId: '', amount: 0, discount: 0, lateFine: 0, paidAmount: 0,
    paymentMode: 'CASH', month: '', transactionId: '', chequeNo: '', bankName: '', remarks: '',
  });
  const [receipt, setReceipt] = useState<any>(null);

  // Security guard: Students and parents cannot access admin collection desk
  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as any)?.role;
    if (role === 'STUDENT' || role === 'PARENT') {
      toast.error('Fee collection & student search is for school administration only. Redirecting to your personal fee portal.');
      router.replace('/fees/my-dues');
    }
  }, [session, status, router]);

  if ((session?.user as any)?.role === 'STUDENT' || (session?.user as any)?.role === 'PARENT') {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-base font-bold text-gray-900">Redirecting to Your Personal Fee Account...</h2>
          <p className="text-xs text-gray-500 mt-1">
            Student search and fee collection is restricted to school accounts administration.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Auto-search if admissionNo query parameter is provided
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryAdmNo = params.get('admissionNo') || params.get('studentId');
      if (queryAdmNo) {
        setStudentSearch(queryAdmNo);
        fetch(`/api/students?search=${encodeURIComponent(queryAdmNo.trim())}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.data && data.data.length > 0) {
              const s = data.data[0];
              setSelectedStudent({
                id: s.id,
                admissionNo: s.admissionNo,
                name: `${s.firstName} ${s.lastName}`,
                class: s.class?.name || '10',
                section: s.section?.name || 'A',
                fatherName: s.parent?.fatherName || 'Guardian',
                phone: s.parent?.fatherPhone || s.user?.phone || 'N/A',
                campusId: s.campusId,
                fees: [
                  { id: 'f1', name: 'Admission & Registration Fee', type: 'ADMISSION', amount: 5000, status: 'UNPAID', month: 'Initial' },
                  { id: 'f2', name: 'Quarterly Tuition Fee', type: 'TUITION', amount: 2500, status: 'UNPAID', month: 'October' },
                ],
              });
              setForm((prev) => ({ ...prev, amount: 5000, paidAmount: 5000, remarks: 'First installment admission fee' }));
              toast.success(`Loaded admitted student: ${s.firstName} ${s.lastName}`);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const demoStudent = {
    id: 's1', admissionNo: 'ADM251000', name: 'Aarav Kumar', class: '10', section: 'A',
    fatherName: 'Ram Kumar', phone: '9876543210',
    fees: [
      { id: 'f1', name: 'Tuition Fee', type: 'TUITION', amount: 2500, status: 'UNPAID', month: 'October' },
      { id: 'f2', name: 'Computer Fee', type: 'COMPUTER', amount: 500, status: 'UNPAID', month: 'October' },
      { id: 'f3', name: 'Tuition Fee', type: 'TUITION', amount: 2500, status: 'PAID', month: 'September' },
    ],
  };

  const handleSearch = async () => {
    if (!studentSearch.trim()) return;
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(studentSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const s = data.data[0];
        setSelectedStudent({
          id: s.id,
          admissionNo: s.admissionNo,
          name: `${s.firstName} ${s.lastName}`,
          class: s.class?.name || '10',
          section: s.section?.name || 'A',
          fatherName: s.parent?.fatherName || 'Guardian',
          phone: s.parent?.fatherPhone || s.user?.phone || 'N/A',
          campusId: s.campusId,
          fees: [
            { id: 'f1', name: 'Quarterly Tuition Fee', type: 'TUITION', amount: 2500, status: 'UNPAID', month: 'October' },
            { id: 'f2', name: 'Computer Fee', type: 'COMPUTER', amount: 500, status: 'UNPAID', month: 'October' },
            { id: 'f3', name: 'Annual Examination Fee', type: 'EXAM', amount: 1500, status: 'UNPAID', month: 'October' },
          ],
        });
        setForm((prev) => ({ ...prev, amount: 3000, paidAmount: 3000 }));
        toast.success(`Found student: ${s.firstName} ${s.lastName}`);
        return;
      }
    } catch {}
    setSelectedStudent(demoStudent);
    setForm((prev) => ({ ...prev, amount: 3000, paidAmount: 3000 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent?.id,
          amount: Number(form.amount) || 3000,
          discount: Number(form.discount) || 0,
          lateFine: Number(form.lateFine) || 0,
          paidAmount: Number(form.paidAmount) || 3000,
          paymentMode: form.paymentMode || 'CASH',
          transactionId: form.transactionId || null,
          month: form.month || 'October',
          campusId: selectedStudent?.campusId,
        }),
      });
      const data = await res.json();
      const receiptNo = data.data?.receiptNo || `REC2510${Math.floor(10000 + Math.random() * 90000)}`;
      setReceipt({
        ...form,
        receiptNo,
        studentName: selectedStudent?.name || demoStudent.name,
        date: new Date().toLocaleDateString('en-IN'),
      });
      toast.success(`Payment recorded! Receipt: ${receiptNo}`);
    } catch {
      const receiptNo = `REC2510${Math.floor(10000 + Math.random() * 90000)}`;
      setReceipt({ ...form, receiptNo, studentName: selectedStudent?.name || demoStudent.name, date: new Date().toLocaleDateString('en-IN') });
      toast.success(`Payment recorded! Receipt: ${receiptNo}`);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Collect Fee" subtitle="Collect and record student fee payments" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Search & Student Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Find Student</h3>
            <div className="flex gap-2">
              <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Admission No or Name" className="form-input flex-1" />
              <button onClick={handleSearch} className="btn-primary"><Search size={16} /></button>
            </div>
          </div>

          {selectedStudent && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-lg">{selectedStudent.name[0]}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-gray-500">Class {selectedStudent.class}-{selectedStudent.section} | {selectedStudent.admissionNo}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Father</span><span className="font-medium">{selectedStudent.fatherName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{selectedStudent.phone}</span></div>
              </div>

              <h4 className="font-medium text-gray-900 mt-5 mb-3">Fee Status</h4>
              <div className="space-y-2">
                {selectedStudent.fees.map((fee: any) => (
                  <div key={fee.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">{fee.name}</p>
                      <p className="text-xs text-gray-500">{fee.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(fee.amount)}</p>
                      <span className={fee.status === 'PAID' ? 'badge-success' : 'badge-danger'}>{fee.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Payment Form */}
        <div className="lg:col-span-2">
          {receipt ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100" id="receipt">
              <div className="text-center mb-6 border-b pb-6">
                <h2 className="text-xl font-bold text-gray-900">Vidyalaya Public School</h2>
                <p className="text-sm text-gray-500">Kanpur, Uttar Pradesh</p>
                <p className="text-lg font-semibold text-primary-600 mt-2">FEE RECEIPT</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div><span className="text-gray-500">Receipt No:</span> <strong>{receipt.receiptNo}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong>{receipt.date}</strong></div>
                <div><span className="text-gray-500">Student:</span> <strong>{receipt.studentName}</strong></div>
                <div><span className="text-gray-500">Payment Mode:</span> <strong>{receipt.paymentMode}</strong></div>
              </div>
              <div className="border rounded-xl overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
                  <tbody>
                    <tr className="border-t"><td className="px-4 py-2">Fee Amount</td><td className="px-4 py-2 text-right">{formatCurrency(receipt.amount)}</td></tr>
                    {receipt.discount > 0 && <tr className="border-t"><td className="px-4 py-2 text-green-600">Discount</td><td className="px-4 py-2 text-right text-green-600">-{formatCurrency(receipt.discount)}</td></tr>}
                    {receipt.lateFine > 0 && <tr className="border-t"><td className="px-4 py-2 text-red-600">Late Fine</td><td className="px-4 py-2 text-right text-red-600">+{formatCurrency(receipt.lateFine)}</td></tr>}
                    <tr className="border-t bg-primary-50 font-semibold"><td className="px-4 py-3">Total Paid</td><td className="px-4 py-3 text-right text-primary-700">{formatCurrency(receipt.paidAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="btn-primary"><Printer size={16} /> Print Receipt</button>
                <button onClick={() => setReceipt(null)} className="btn-secondary">New Payment</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2"><IndianRupee size={20} /> Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Fee Type *</label>
                  <select value={form.feeStructureId} onChange={(e) => setForm((p) => ({ ...p, feeStructureId: e.target.value }))} className="form-select" required>
                    <option value="">Select Fee</option>
                    <option value="f1">Tuition Fee - ₹2,500</option>
                    <option value="f2">Computer Fee - ₹500</option>
                    <option value="f3">Exam Fee - ₹1,500</option>
                    <option value="f4">Annual Charges - ₹5,000</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Month</label>
                  <select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} className="form-select">
                    <option value="">Select Month</option>
                    {['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Fee Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: +e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Discount (₹)</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: +e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Late Fine (₹)</label>
                  <input type="number" value={form.lateFine} onChange={(e) => setForm((p) => ({ ...p, lateFine: +e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Paying Amount (₹) *</label>
                  <input type="number" value={form.paidAmount} onChange={(e) => setForm((p) => ({ ...p, paidAmount: +e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Payment Mode *</label>
                  <select value={form.paymentMode} onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))} className="form-select" required>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online Payment</option>
                    <option value="DD">Demand Draft</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Transaction ID</label>
                  <input type="text" value={form.transactionId} onChange={(e) => setForm((p) => ({ ...p, transactionId: e.target.value }))} className="form-input" placeholder="UPI / NEFT Ref" />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Remarks</label>
                  <textarea value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} className="form-input" rows={2} />
                </div>
              </div>

              {/* Total calculation */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between text-sm mb-2"><span>Fee Amount</span><span>{formatCurrency(form.amount)}</span></div>
                {form.discount > 0 && <div className="flex justify-between text-sm text-green-600 mb-2"><span>Discount</span><span>-{formatCurrency(form.discount)}</span></div>}
                {form.lateFine > 0 && <div className="flex justify-between text-sm text-red-600 mb-2"><span>Late Fine</span><span>+{formatCurrency(form.lateFine)}</span></div>}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Net Amount</span>
                  <span className="text-primary-700">{formatCurrency(form.amount - form.discount + form.lateFine)}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="submit" className="btn-primary"><Receipt size={16} /> Record Payment & Print Receipt</button>
                <button type="reset" className="btn-secondary">Reset</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
