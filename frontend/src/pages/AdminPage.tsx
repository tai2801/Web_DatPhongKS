import { useEffect, useState } from 'react';
import { api, fmtVnd, STATUS_LABELS, type SessionUser } from '../api';
import type { Hotel } from '../types';

export default function AdminPage() {
  const [report, setReport] = useState<any>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [r, h, u, t, c] = await Promise.all([
        api<any>('/api/admin/report'),
        api<{ results: Hotel[] }>('/api/admin/hotels'),
        api<{ results: SessionUser[] }>('/api/admin/users'),
        api<{ results: any[] }>('/api/admin/transactions'),
        api<{ results: any[] }>('/api/admin/complaints'),
      ]);
      setReport(r); setHotels(h.results); setUsers(u.results); setTxs(t.results); setComplaints(c.results);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, action: 'approve' | 'reject') {
    try {
      await api(`/api/admin/hotels/${id}/${action}`, { method: 'POST', bodyObj: {} });
      setMsg(action === 'approve' ? 'Đã duyệt khách sạn.' : 'Đã từ chối khách sạn.');
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function resolveComplaint(id: string, status: string) {
    try {
      await api(`/api/admin/complaints/${id}`, { method: 'PUT', bodyObj: { status, adminNote: 'Đã xử lý bởi quản trị Hotelora' } });
      setMsg('Đã cập nhật khiếu nại.');
      load();
    } catch (e: any) { setError(e.message); }
  }

  if (error && !report) return <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Quản trị nền tảng Hotelora</h1>
      {msg && <p className="mb-3 text-sm bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">{msg}</p>}
      {error && <p className="mb-3 text-sm bg-red-50 text-red-600 rounded-lg px-3 py-2">{error}</p>}

      {report && (
        <div className="grid md:grid-cols-4 gap-3 mb-6">
          {[
            ['Tổng doanh thu sàn', report.grossRevenue], ['Hoa hồng sàn (10%)', report.commissionRevenue],
            ['Đã hoàn khách', report.refundTotal], ['Số khách sạn', report.hotelCount],
          ].map(([label, v]) => (
            <div key={label as string} className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-xl font-bold text-sea-700">{label === 'Số khách sạn' ? v : fmtVnd(v as number)}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-lg mb-2">Duyệt đối tác khách sạn</h2>
      <div className="space-y-2 mb-6">
        {hotels.map((h) => (
          <div key={h.id} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap justify-between items-center gap-2">
            <p className="text-sm"><b>{h.name}</b> · {h.city} · <span className="bg-sea-100 text-sea-700 px-2 py-0.5 rounded-full text-xs">{STATUS_LABELS[h.status] || h.status}</span></p>
            {h.status === 'PENDING' && (
              <div className="flex gap-2">
                <button onClick={() => decide(h.id, 'approve')} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Duyệt</button>
                <button onClick={() => decide(h.id, 'reject')} className="border border-red-300 text-red-600 rounded-lg px-3 py-1.5 text-sm">Từ chối</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-semibold text-lg mb-2">Người dùng ({users.length})</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y">
            {users.map((u) => (
              <p key={u.id} className="px-3 py-2 text-sm flex justify-between"><span>{u.name} · {u.email}</span><b>{u.role}</b></p>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-semibold text-lg mb-2">Khiếu nại</h2>
          <div className="space-y-2">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-medium">{c.subject} <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{STATUS_LABELS[c.status] || c.status}</span></p>
                <p className="text-sm text-slate-500">{c.content}</p>
                {c.status !== 'RESOLVED' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => resolveComplaint(c.id, 'IN_PROGRESS')} className="border rounded-lg px-3 py-1 text-sm">Đang xử lý</button>
                    <button onClick={() => resolveComplaint(c.id, 'RESOLVED')} className="bg-sea-600 text-white rounded-lg px-3 py-1 text-sm">Đã giải quyết</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <h2 className="font-semibold text-lg mt-6 mb-2">Giao dịch toàn sàn ({txs.length})</h2>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y max-h-80 overflow-auto">
        {txs.map((t) => (
          <p key={t.id} className="px-3 py-2 text-sm flex justify-between">
            <span>{t.type === 'PAYMENT_SIMULATED' ? 'Thanh toán (mô phỏng)' : 'Hoàn tiền (mô phỏng)'} · đơn {t.bookingId} · {new Date(t.createdAt).toLocaleString('vi-VN')}</span>
            <b>{fmtVnd(t.amount)}</b>
          </p>
        ))}
      </div>
    </div>
  );
}
