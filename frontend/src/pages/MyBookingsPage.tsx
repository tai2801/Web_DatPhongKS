import { useEffect, useState } from 'react';
import { api, fmtVnd, STATUS_LABELS } from '../api';
import type { Booking } from '../types';

export default function MyBookingsPage({ go }: { go: (v: any) => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [reviewForms, setReviewForms] = useState<Record<string, { rating: number; comment: string }>>({});
  const [complaintForms, setComplaintForms] = useState<Record<string, { subject: string; content: string }>>({});

  async function load() {
    try {
      const r = await api<{ results: Booking[] }>('/api/bookings/mine');
      setBookings(r.results);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function cancel(b: Booking) {
    try {
      const preview = await api<any>(`/api/bookings/${b.id}/refund-preview`);
      const text = b.paymentStatus === 'PAID_SIMULATED'
        ? `Hủy đặt phòng ${b.code}? Bạn sẽ được hoàn ${fmtVnd(preview.refundAmount)} (${preview.refundPercent}%), phí hủy ${fmtVnd(preview.feeAmount)}.`
        : `Hủy đặt phòng ${b.code} (chưa thanh toán, không phát sinh hoàn tiền)?`;
      if (!window.confirm(text)) return;
      const r = await api<{ refund: any }>(`/api/bookings/${b.id}/cancel`, { method: 'POST', bodyObj: {} });
      setMsg(`Đã hủy ${b.code}. Hoàn tiền mô phỏng: ${fmtVnd(r.refund.refundAmount)}.`);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function review(b: Booking) {
    const f = reviewForms[b.id] || { rating: 5, comment: '' };
    try {
      await api('/api/reviews', { method: 'POST', bodyObj: { bookingId: b.id, rating: f.rating, comment: f.comment } });
      setMsg(`Cảm ơn bạn đã đánh giá cho đặt phòng ${b.code}!`);
    } catch (e: any) { setError(e.message); }
  }

  async function complain(b: Booking) {
    const f = complaintForms[b.id] || { subject: '', content: '' };
    try {
      await api('/api/complaints', { method: 'POST', bodyObj: { hotelId: b.hotelId, bookingId: b.id, subject: f.subject, content: f.content } });
      setMsg('Đã gửi khiếu nại, quản trị nền tảng sẽ xử lý.');
      setComplaintForms((s) => ({ ...s, [b.id]: { subject: '', content: '' } }));
    } catch (e: any) { setError(e.message); }
  }

  if (error && bookings.length === 0) return <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Đặt phòng của tôi</h1>
      {msg && <p className="mb-3 text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg px-3 py-2">{msg}</p>}
      {error && <p className="mb-3 text-sm bg-red-50 text-red-600 rounded-lg px-3 py-2">{error}</p>}
      {bookings.length === 0 && <p className="text-slate-500">Bạn chưa có đặt phòng nào. <button className="text-sea-700 underline" onClick={() => go({ name: 'home' })}>Tìm khách sạn ngay</button></p>}
      <div className="space-y-4">
        {bookings.map((b) => {
          const rf = reviewForms[b.id] || { rating: 5, comment: '' };
          const cf = complaintForms[b.id] || { subject: '', content: '' };
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.hotelName} <span className="text-slate-400 font-normal">· {b.hotelCity}</span></p>
                  <p className="text-sm text-slate-500">{b.roomTypeName} · {b.checkin} → {b.checkout} · {b.rooms} phòng · {b.guests} khách</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sea-700">{b.code}</p>
                  <p className="text-sm">{STATUS_LABELS[b.status] || b.status} · <b>{fmtVnd(b.total)}</b></p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {b.status === 'PENDING_PAYMENT' && (
                  <button onClick={() => go({ name: 'checkout', booking: b })} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Thanh toán tiếp</button>
                )}
                {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
                  <button onClick={() => cancel(b)} className="border border-red-300 text-red-600 rounded-lg px-3 py-1.5 text-sm">Hủy đặt phòng</button>
                )}
              </div>

              {b.status === 'CHECKED_OUT' && (
                <div className="mt-3 bg-sea-50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Đánh giá lưu trú của bạn</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select value={rf.rating} onChange={(e) => setReviewForms((s) => ({ ...s, [b.id]: { ...rf, rating: Number(e.target.value) } }))} className="border rounded-lg px-2 py-1.5 text-sm">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                    </select>
                    <input value={rf.comment} onChange={(e) => setReviewForms((s) => ({ ...s, [b.id]: { ...rf, comment: e.target.value } }))} placeholder="Nhận xét của bạn…" className="border rounded-lg px-2 py-1.5 text-sm grow min-w-52" />
                    <button onClick={() => review(b)} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Gửi đánh giá</button>
                  </div>
                </div>
              )}

              <details className="mt-3">
                <summary className="text-sm text-slate-500 cursor-pointer">Gửi khiếu nại về đặt phòng này</summary>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <input value={cf.subject} onChange={(e) => setComplaintForms((s) => ({ ...s, [b.id]: { ...cf, subject: e.target.value } }))} placeholder="Tiêu đề khiếu nại" className="border rounded-lg px-2 py-1.5 text-sm grow min-w-48" />
                  <input value={cf.content} onChange={(e) => setComplaintForms((s) => ({ ...s, [b.id]: { ...cf, content: e.target.value } }))} placeholder="Nội dung chi tiết…" className="border rounded-lg px-2 py-1.5 text-sm grow min-w-64" />
                  <button onClick={() => complain(b)} className="border border-amber-400 text-amber-700 rounded-lg px-3 py-1.5 text-sm">Gửi khiếu nại</button>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
